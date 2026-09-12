import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from app.core.auth import require_auth
from app.schemas.session_schema import (
    SessionRecordPayload,
    PasswordVerifyRequest,
    StandardResponse,
)
from app.services.session_service import SessionService, extract_client_ip
from app.core.supabase_client import supabase
from app.database import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["User Sessions"])


@router.get("/me", response_model=StandardResponse)
def get_my_sessions(
    request: Request,
    limit: int = Query(20, ge=1, le=50, description="Max session records to retrieve"),
    user_id: str = Depends(require_auth),
):
    """Retrieves the recent session audit history for the authenticated user and flags the current device."""
    try:
        current_ip = extract_client_ip(request)
        clean_current_ip = current_ip.split("/")[0] if current_ip else ""
        current_ua = request.headers.get("user-agent") or ""

        # Auto-touch or record current session to keep last_active_at fresh and deactivate older duplicates
        try:
            SessionService.log_session(
                user_id=user_id,
                ip_address=current_ip,
                user_agent=current_ua or "Unknown Browser",
            )
        except Exception as auto_log_err:
            logger.warning(f"Failed to auto-touch session: {auto_log_err}")

        sessions = SessionService.get_user_sessions(user_id=user_id, limit=limit)

        # Initialize is_current = False on all items
        for s in sessions:
            s["is_current"] = False

        # Flag the active session matching current IP & User Agent as the current device
        found_current = False
        for s in sessions:
            if not found_current and s.get("is_active"):
                s_ip = (s.get("ip_address") or "").split("/")[0]
                if (s_ip and s_ip == clean_current_ip) or (current_ua and s.get("user_agent") == current_ua):
                    s["is_current"] = True
                    found_current = True

        # If no exact match found, flag the newest active session as current
        if not found_current and sessions:
            for s in sessions:
                if s.get("is_active"):
                    s["is_current"] = True
                    break

        return StandardResponse(
            success=True,
            code=status.HTTP_200_OK,
            message="User sessions retrieved successfully.",
            payload={"sessions": sessions},
        )
    except Exception as e:
        logger.error(f"Failed to fetch sessions for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session history.",
        )


@router.post("/record", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def record_session(
    request: Request,
    payload: Optional[SessionRecordPayload] = None,
    user_id: str = Depends(require_auth),
):
    """Records an active user session audit record upon login or authentication check."""
    try:
        client_ip = extract_client_ip(request)
        user_agent = request.headers.get("user-agent")
        mac_addr = payload.mac_address if payload else None

        session_id = SessionService.log_session(
            user_id=user_id,
            ip_address=client_ip,
            mac_address=mac_addr,
            user_agent=user_agent,
        )

        return StandardResponse(
            success=True,
            code=status.HTTP_201_CREATED,
            message="User session recorded successfully.",
            payload={"session_id": session_id, "ip_address": client_ip},
        )
    except Exception as e:
        logger.error(f"Failed to record session for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record user session.",
        )


@router.post("/{session_id}/terminate", response_model=StandardResponse)
def terminate_session(
    session_id: str,
    user_id: str = Depends(require_auth),
):
    """Terminates / deactivates a specific remote user session."""
    try:
        success = SessionService.terminate_session(session_id=session_id, user_id=user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or already terminated.",
            )

        return StandardResponse(
            success=True,
            code=status.HTTP_200_OK,
            message="Session terminated successfully.",
            payload={"session_id": session_id},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to terminate session {session_id} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to terminate session.",
        )


@router.post("/terminate-all", response_model=StandardResponse)
def terminate_all_other_sessions(
    request: Request,
    body: PasswordVerifyRequest,
    user_id: str = Depends(require_auth),
):
    """Requires password verification before terminating all other active remote sessions."""
    # 1. Fetch user's email to verify credentials with Supabase Auth
    user_email = None
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute("SELECT email FROM auth.users WHERE id = %s;", (user_id,))
                row = cursor.fetchone()
                if row:
                    user_email = row["email"]
    except Exception as e:
        logger.error(f"Database error fetching user email for {user_id}: {e}")

    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account email could not be resolved.",
        )

    # 2. Verify password with Supabase Auth
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": user_email, "password": body.password}
        )
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password provided.",
            )
    except Exception as auth_err:
        logger.warning(f"Password verification failed for user {user_id}: {auth_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password provided.",
        )

    # 3. Find current session ID to preserve it
    current_ip = extract_client_ip(request)
    clean_current_ip = current_ip.split("/")[0] if current_ip else ""
    current_ua = request.headers.get("user-agent") or ""
    current_session_id = None

    try:
        sessions = SessionService.get_user_sessions(user_id=user_id, limit=20)
        for s in sessions:
            s_ip = (s.get("ip_address") or "").split("/")[0]
            if s.get("is_active") and ((s_ip and s_ip == clean_current_ip) or (current_ua and s.get("user_agent") == current_ua)):
                current_session_id = s["session_id"]
                break

        revoked_count = SessionService.terminate_all_other_sessions(
            user_id=user_id,
            current_session_id=current_session_id,
        )

        return StandardResponse(
            success=True,
            code=status.HTTP_200_OK,
            message=f"Successfully terminated {revoked_count} other active session(s).",
            payload={"revoked_count": revoked_count},
        )
    except Exception as e:
        logger.error(f"Error executing global termination for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to terminate other sessions.",
        )
