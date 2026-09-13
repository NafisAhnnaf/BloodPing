import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, time
from app.database import get_db_connection
from fastapi import HTTPException, status
from app.schemas.request_schema import BloodRequestCreate, BloodRequestUpdate

logger = logging.getLogger(__name__)


def _fetch_matches_by_requests(cursor, request_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    if not request_ids:
        return {}
    try:
        cursor.execute(
            """
            SELECT 
                m.id AS match_id,
                m.request_id,
                m.donor_id,
                m.status AS match_status,
                m.recipient_verification_note,
                m.applied_at,
                m.accepted_at,
                m.confirmed_at,
                d.user_id AS donor_user_id,
                p.full_name AS donor_name,
                d.blood_group AS donor_blood_group,
                p.phone AS donor_phone
            FROM public.donation_matches m
            JOIN public.donors d ON m.donor_id = d.id
            JOIN public.profiles p ON d.user_id = p.id
            WHERE m.request_id = ANY(%s::uuid[]);
            """,
            (request_ids,)
        )
        rows = cursor.fetchall()
        matches_by_req: Dict[str, List[Dict[str, Any]]] = {}
        for r in rows:
            req_id_str = str(r["request_id"])
            if req_id_str not in matches_by_req:
                matches_by_req[req_id_str] = []
            matches_by_req[req_id_str].append({
                "id": str(r["match_id"]),
                "matchId": str(r["match_id"]),
                "donorId": str(r["donor_user_id"]),
                "donorUserId": str(r["donor_user_id"]),
                "donorProfileId": str(r["donor_id"]),
                "donorName": r["donor_name"],
                "donorPhone": r["donor_phone"],
                "bloodGroup": r["donor_blood_group"],
                "status": str(r["match_status"]),
                "recipient_verification_note": r["recipient_verification_note"],
                "appliedAt": r["applied_at"].isoformat() if r["applied_at"] else None,
                "acceptedAt": r["accepted_at"].isoformat() if r["accepted_at"] else None,
                "confirmedAt": r["confirmed_at"].isoformat() if r["confirmed_at"] else None,
            })
        return matches_by_req
    except Exception as e:
        logger.warning(f"Failed to fetch matches for requests: {e}")
        return {}


def _format_request_row(
    row: Dict[str, Any], 
    current_user_id: Optional[str] = None,
    matches_by_request: Optional[Dict[str, List[Dict[str, Any]]]] = None
) -> Dict[str, Any]:
    req_id = row.get("request_id") or row.get("id")
    req_id_str = str(req_id)
    recipient_user_id = str(row["recipient_user_id"]) if "recipient_user_id" in row and row["recipient_user_id"] else None
    is_owner = bool(current_user_id and recipient_user_id and str(current_user_id) == str(recipient_user_id))
    req_status = row.get("status")
    required_by_val = row.get("required_by")
    if req_status == "open" and required_by_val:
        try:
            now_utc = datetime.now(timezone.utc)
            req_dt = required_by_val if isinstance(required_by_val, datetime) else datetime.fromisoformat(str(required_by_val).replace("Z", "+00:00"))
            if req_dt.tzinfo is None:
                req_dt = req_dt.replace(tzinfo=timezone.utc)
            if req_dt < now_utc:
                req_status = "expired"
        except Exception:
            pass
    applications = matches_by_request.get(req_id_str, []) if matches_by_request else []

    return {
        "id": req_id_str,
        "recipient_id": str(row["recipient_id"]) if "recipient_id" in row and row["recipient_id"] else None,
        "recipient_user_id": recipient_user_id,
        "owner_id": recipient_user_id,
        "is_owner": is_owner,
        "blood_group": row.get("blood_group"),
        "units_required": row.get("units_required"),
        "units_fulfilled": row.get("units_fulfilled", 0),
        "hospital_name": row.get("hospital_name"),
        "hospital_lat": row.get("hospital_lat"),
        "hospital_lng": row.get("hospital_lng"),
        "hospital_address": row.get("hospital_address"),
        "search_radius_km": float(row["search_radius_km"]) if row.get("search_radius_km") is not None else 10.0,
        "is_urgent": row.get("is_urgent") if "is_urgent" in row else row.get("urgent", False),
        "notes": row.get("notes"),
        "required_by": row["required_by"].isoformat() if row.get("required_by") else None,
        "status": req_status,
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "recipient_name": row.get("recipient_name"),
        "recipient_phone": row.get("recipient_phone"),
        "applicants": len(applications),
        "applications": applications,
    }


class RequestService:
    @staticmethod
    def verify_request_owner(cursor, request_id: str, user_id: str) -> str:
        """Verifies that the donation request exists and that user_id is the recipient owner.
        
        Returns recipient_id on success.
        Raises 404 NOT FOUND if request does not exist.
        Raises 403 FORBIDDEN if the authenticated user is not the owner.
        """
        cursor.execute(
            """
            SELECT dr.id, dr.recipient_id, r.user_id, r.is_active
            FROM public.donation_requests dr
            JOIN public.recipients r ON r.id = dr.recipient_id
            WHERE dr.id = %s;
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation request not found."
            )
        
        if str(row["user_id"]) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to manage this donation request. Only the request owner can manage, edit, or cancel it."
            )
            
        if not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient account is inactive."
            )
            
        return str(row["recipient_id"])

    @staticmethod
    def _resolve_recipient_id(cursor, user_id: str, auto_create: bool = False) -> str:
        """Helper to resolve recipient_id from auth user_id, optionally creating the recipient record."""
        cursor.execute(
            "SELECT id, is_active FROM public.recipients WHERE user_id = %s;",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            if auto_create:
                cursor.execute(
                    """
                    INSERT INTO public.recipients (user_id, is_active)
                    VALUES (%s, TRUE)
                    RETURNING id, is_active;
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipient profile not found."
                )
        if not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient account is inactive."
            )
        return str(row["id"])

    @staticmethod
    def get_all_requests(current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves all donation requests from the database via get_all_donation_requests."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT 
                            req.*,
                            dr.recipient_id,
                            r.user_id AS recipient_user_id
                        FROM public.get_all_donation_requests() req
                        JOIN public.donation_requests dr ON dr.id = req.request_id
                        JOIN public.recipients r ON r.id = dr.recipient_id;
                        """
                    )
                    rows = cursor.fetchall()
                    req_ids = [str(r.get("request_id") or r.get("id")) for r in rows if r]
                    matches = _fetch_matches_by_requests(cursor, req_ids)
                    return [_format_request_row(r, current_user_id, matches) for r in rows]
                except Exception as e:
                    logger.error(f"Error fetching all requests: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve donation requests."
                    )

    @staticmethod
    def get_active_requests(current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves only open, unexpired donation requests via public.get_active_requests."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT 
                            req.*,
                            dr.recipient_id,
                            r.user_id AS recipient_user_id
                        FROM public.get_active_requests() req
                        JOIN public.donation_requests dr ON dr.id = req.request_id
                        JOIN public.recipients r ON r.id = dr.recipient_id;
                        """
                    )
                    rows = cursor.fetchall()
                    req_ids = [str(r.get("request_id") or r.get("id")) for r in rows if r]
                    matches = _fetch_matches_by_requests(cursor, req_ids)
                    return [_format_request_row(r, current_user_id, matches) for r in rows]
                except Exception as e:
                    err_msg = str(e)
                    if "No active requests found" in err_msg:
                        return []
                    logger.error(f"Error fetching active requests: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve active donation requests."
                    )

    @staticmethod
    def get_recipient_requests(user_id: str) -> List[Dict[str, Any]]:
        """Retrieves all donation requests created by the specified recipient via public.get_recipient_requests."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT 
                            req.*,
                            dr.recipient_id,
                            r.user_id AS recipient_user_id
                        FROM public.get_recipient_requests(%s::UUID) req
                        JOIN public.donation_requests dr ON dr.id = req.request_id
                        JOIN public.recipients r ON r.id = dr.recipient_id;
                        """,
                        (user_id,)
                    )
                    rows = cursor.fetchall()
                    req_ids = [str(r.get("request_id") or r.get("id")) for r in rows if r]
                    matches = _fetch_matches_by_requests(cursor, req_ids)
                    return [_format_request_row(r, user_id, matches) for r in rows]
                except Exception as e:
                    err_msg = str(e)
                    if "No requests found for user" in err_msg:
                        return []
                    logger.error(f"Error fetching recipient requests for user {user_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve your donation requests."
                    )

    @staticmethod
    def get_request_by_id(request_id: str, current_user_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieves a single donation request by ID via public.get_request_by_id."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT 
                            req.*,
                            dr.recipient_id,
                            r.user_id AS recipient_user_id
                        FROM public.get_request_by_id(%s::UUID) req
                        JOIN public.donation_requests dr ON dr.id = req.request_id
                        JOIN public.recipients r ON r.id = dr.recipient_id;
                        """,
                        (request_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )
                    matches = _fetch_matches_by_requests(cursor, [request_id])
                    return _format_request_row(row, current_user_id, matches)
                except HTTPException:
                    raise
                except Exception as e:
                    err_msg = str(e)
                    if "not found" in err_msg.lower():
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )
                    logger.error(f"Error fetching request {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve donation request."
                    )

    @staticmethod
    def _validate_required_by(required_by: datetime) -> datetime:
        """Validates that required_by is today or a future date.
        If a past date is provided, raises 400 Bad Request.
        If today's date is provided with a time in the past or midnight,
        adjusts to end of day so Postgres CHECK (required_by > created_at) passes.
        """
        if required_by.tzinfo is None:
            required_by = required_by.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)

        if required_by.date() < now.date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Required by date cannot be in the past. Please select today or a future date."
            )

        if required_by <= now:
            required_by = datetime.combine(now.date(), time(23, 59, 59), tzinfo=timezone.utc)

        return required_by

    @staticmethod
    def create_request(user_id: str, request_data: BloodRequestCreate) -> Dict[str, Any]:
        """Resolves recipient profile and calls create_blood_request PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    validated_required_by = RequestService._validate_required_by(request_data.required_by)
                    recipient_id = RequestService._resolve_recipient_id(cursor, user_id, auto_create=True)
                    cursor.execute(
                        """
                        SELECT * FROM public.create_blood_request(
                            %s::UUID,
                            %s::public.blood_group,
                            %s::SMALLINT,
                            %s::TEXT,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::TEXT,
                            %s::NUMERIC(5,2),
                            %s::BOOLEAN,
                            %s::TEXT,
                            %s::TIMESTAMPTZ
                        );
                        """,
                        (
                            recipient_id,
                            request_data.blood_group,
                            request_data.units_required,
                            request_data.hospital_name,
                            request_data.hospital_lat,
                            request_data.hospital_lng,
                            request_data.hospital_address,
                            request_data.search_radius_km,
                            request_data.is_urgent,
                            request_data.notes,
                            validated_required_by,
                        ),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from create_blood_request")

                    result = _format_request_row(row, user_id)
                    result["recipient_user_id"] = str(user_id)
                    result["owner_id"] = str(user_id)
                    result["is_owner"] = True
                    return result
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error creating blood request in DB: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def update_request(user_id: str, request_id: str, request_data: BloodRequestUpdate) -> Dict[str, Any]:
        """Validates recipient ownership and calls public.update_blood_request PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of this request
                    validated_required_by = RequestService._validate_required_by(request_data.required_by)
                    recipient_id = RequestService.verify_request_owner(cursor, request_id, user_id)
                    cursor.execute(
                        """
                        SELECT * FROM public.update_blood_request(
                            %s::UUID,
                            %s::UUID,
                            %s::public.blood_group,
                            %s::SMALLINT,
                            %s::TEXT,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::TEXT,
                            %s::NUMERIC(5,2),
                            %s::BOOLEAN,
                            %s::TEXT,
                            %s::TIMESTAMPTZ
                        );
                        """,
                        (
                            request_id,
                            recipient_id,
                            request_data.blood_group,
                            request_data.units_required,
                            request_data.hospital_name,
                            request_data.hospital_lat,
                            request_data.hospital_lng,
                            request_data.hospital_address,
                            request_data.search_radius_km,
                            request_data.is_urgent,
                            request_data.notes,
                            validated_required_by,
                        ),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from update_blood_request")

                    result = _format_request_row(row, user_id)
                    result["recipient_user_id"] = str(user_id)
                    result["owner_id"] = str(user_id)
                    result["is_owner"] = True
                    return result
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error updating blood request {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def cancel_request(user_id: str, request_id: str) -> Dict[str, Any]:
        """Validates recipient ownership and calls public.cancel_request PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of this request
                    recipient_id = RequestService.verify_request_owner(cursor, request_id, user_id)
                    
                    # Check if already cancelled
                    cursor.execute(
                        "SELECT status FROM public.donation_requests WHERE id = %s;",
                        (request_id,)
                    )
                    curr = cursor.fetchone()
                    if curr and curr.get("status") == "cancelled":
                        cursor.execute(
                            """
                            SELECT req.*, dr.recipient_id, r.user_id AS recipient_user_id
                            FROM public.get_request_by_id(%s::UUID) req
                            JOIN public.donation_requests dr ON dr.id = req.request_id
                            JOIN public.recipients r ON r.id = dr.recipient_id;
                            """,
                            (request_id,)
                        )
                        row = cursor.fetchone()
                        if row:
                            result = _format_request_row(row, user_id)
                            result["recipient_user_id"] = str(user_id)
                            result["owner_id"] = str(user_id)
                            result["is_owner"] = True
                            return result
                        return {"id": request_id, "status": "cancelled", "recipient_user_id": str(user_id), "owner_id": str(user_id), "is_owner": True}

                    cursor.execute(
                        "SELECT * FROM public.cancel_request(%s::UUID, %s::UUID);",
                        (request_id, recipient_id),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from cancel_request")

                    result = _format_request_row(row, user_id)
                    result["recipient_user_id"] = str(user_id)
                    result["owner_id"] = str(user_id)
                    result["is_owner"] = True
                    return result
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error cancelling blood request {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def delete_request(user_id: str, request_id: str) -> Dict[str, Any]:
        """Permanently deletes a donation request owned by user_id."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of this request
                    recipient_id = RequestService.verify_request_owner(cursor, request_id, user_id)
                    
                    cursor.execute(
                        "SELECT status, units_fulfilled FROM public.donation_requests WHERE id = %s;",
                        (request_id,)
                    )
                    req_row = cursor.fetchone()
                    if req_row and (req_row.get("units_fulfilled") or 0) > 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot delete a donation request that has already fulfilled units."
                        )

                    cursor.execute(
                        "DELETE FROM public.donation_requests WHERE id = %s AND recipient_id = %s RETURNING id;",
                        (request_id, recipient_id)
                    )
                    deleted = cursor.fetchone()
                    if not deleted:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )

                    # Deduct 5 points penalty if user is a donor
                    cursor.execute("SELECT id, total_points FROM public.donors WHERE user_id = %s;", (user_id,))
                    donor_row = cursor.fetchone()
                    points_deducted = 0
                    if donor_row:
                        try:
                            cursor.execute(
                                """
                                SELECT * FROM public.award_points(
                                    %s::UUID, 
                                    NULL, 
                                    'CANCELLATION_PENALTY', 
                                    -5, 
                                    'Penalty for deleting blood donation request'
                                );
                                """,
                                (donor_row["id"],)
                            )
                            points_deducted = 5
                        except Exception as pe:
                            logger.warning(f"Could not deduct points on request deletion: {pe}")

                    db.commit()
                    return {
                        "id": request_id, 
                        "status": "deleted",
                        "points_deducted": points_deducted,
                        "message": "Donation request deleted successfully (5 points deducted)." if points_deducted > 0 else "Donation request deleted successfully."
                    }
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error deleting blood request {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def mark_request_fulfilled(user_id: str, request_id: str) -> Dict[str, Any]:
        """Validates recipient ownership and calls public.mark_request_fulfilled PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of this request
                    recipient_id = RequestService.verify_request_owner(cursor, request_id, user_id)
                    cursor.execute(
                        "SELECT * FROM public.mark_request_fulfilled(%s::UUID, %s::UUID);",
                        (request_id, recipient_id),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from mark_request_fulfilled")

                    result = _format_request_row(row, user_id)
                    result["recipient_user_id"] = str(user_id)
                    result["owner_id"] = str(user_id)
                    result["is_owner"] = True
                    return result
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error marking request {request_id} fulfilled: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def get_request_status(request_id: str) -> Dict[str, Any]:
        """Retrieves live aggregate status and donor counts via public.get_request_status."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT * FROM public.get_request_status(%s::UUID);",
                        (request_id,),
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )
                    return {
                        "request_status": row["request_status"],
                        "units_required": row["units_required"],
                        "units_fulfilled": row["units_fulfilled"],
                        "pending_donors_count": row["pending_donors_count"],
                        "accepted_donors_count": row["accepted_donors_count"],
                    }
                except HTTPException:
                    raise
                except Exception as e:
                    err_msg = str(e)
                    if "not found" in err_msg.lower():
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )
                    logger.error(f"Error fetching request status for {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve request status."
                    )

    @staticmethod
    def get_request_history(request_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves all donor applicants for the request (restricted to owning recipient)."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of this request
                    RequestService.verify_request_owner(cursor, request_id, user_id)
                    cursor.execute(
                        "SELECT * FROM public.get_request_history(%s::UUID);",
                        (request_id,),
                    )
                    rows = cursor.fetchall()
                    result = []
                    for r in rows:
                        result.append({
                            "match_id": str(r["match_id"]),
                            "donor_id": str(r["donor_id"]),
                            "donor_name": r["donor_name"],
                            "donor_blood_group": r["donor_blood_group"],
                            "match_status": r["match_status"],
                            "applied_at": r["applied_at"].isoformat() if r.get("applied_at") else None,
                            "accepted_at": r["accepted_at"].isoformat() if r.get("accepted_at") else None,
                            "confirmed_at": r["confirmed_at"].isoformat() if r.get("confirmed_at") else None,
                        })
                    return result
                except HTTPException:
                    raise
                except Exception as e:
                    err_msg = str(e)
                    if "No history found" in err_msg:
                        return []
                    logger.error(f"Error fetching request history for {request_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve request applicant history."
                    )

    @staticmethod
    def get_feed(
        user_id: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: Optional[float] = None,
        blood_group: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Retrieves proximity-ranked blood donation feed via public.get_personalized_feed."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT 
                            feed.*,
                            dr.recipient_id,
                            r.user_id AS recipient_user_id
                        FROM public.get_personalized_feed(
                            %s::UUID,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::NUMERIC,
                            %s::public.blood_group,
                            %s::INTEGER,
                            %s::INTEGER
                        ) feed
                        JOIN public.donation_requests dr ON dr.id = feed.request_id
                        JOIN public.recipients r ON r.id = dr.recipient_id;
                        """,
                        (user_id, lat, lng, radius_km, blood_group, limit, offset),
                    )
                    rows = cursor.fetchall()
                    req_ids = [str(r.get("request_id") or r.get("id")) for r in rows if r]
                    matches = _fetch_matches_by_requests(cursor, req_ids)
                    result = []
                    for r in rows:
                        row_dict = _format_request_row(r, current_user_id=user_id, matches_by_request=matches)
                        row_dict["distance"] = float(r.get("distance_km", 0.0))
                        row_dict["distance_km"] = float(r.get("distance_km", 0.0))
                        row_dict["match_score"] = float(r.get("match_score", 0.0)) if r.get("match_score") is not None else None
                        result.append(row_dict)
                    return result
                except Exception as e:
                    logger.error(f"Error fetching personalized feed for user {user_id}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve donation feed."
                    )
