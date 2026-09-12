from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.auth import requireAuth
from app.database import get_db_connection

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    success: bool = True
    payload: Optional[Any] = None
    message: str = ""


@router.get("/me", response_model=NotificationResponse)
async def get_my_notifications(user_id: str = Depends(requireAuth)):
    """
    Retrieve all notifications for the authenticated user ordered by creation time (newest first).
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, title, message, type, is_read, created_at
                    FROM public.notifications
                    WHERE user_id = %s
                    ORDER BY created_at DESC;
                    """,
                    (user_id,)
                )
                rows = cursor.fetchall()
                notifications = [
                    {
                        "id": str(r["id"]),
                        "user_id": str(r["user_id"]),
                        "title": r["title"],
                        "message": r["message"],
                        "type": r["type"],
                        "is_read": bool(r["is_read"]),
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    }
                    for r in rows
                ]
                return NotificationResponse(
                    success=True,
                    payload=notifications,
                    message="Notifications retrieved successfully.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notifications: {str(e)}",
        )


@router.patch("/mark-read", response_model=NotificationResponse)
async def mark_notifications_as_read(user_id: str = Depends(requireAuth)):
    """
    Mark all unread notifications as read for the authenticated user.
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.notifications
                    SET is_read = TRUE
                    WHERE user_id = %s AND is_read = FALSE;
                    """,
                    (user_id,)
                )
                return NotificationResponse(
                    success=True,
                    payload=None,
                    message="All notifications marked as read.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notifications status: {str(e)}",
        )
