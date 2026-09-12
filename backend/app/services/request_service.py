import logging
from typing import Dict, Any, List, Optional
from app.database import get_db_connection
from fastapi import HTTPException, status
from app.schemas.request_schema import BloodRequestCreate, BloodRequestUpdate

logger = logging.getLogger(__name__)


def _format_request_row(row: Dict[str, Any]) -> Dict[str, Any]:
    req_id = row.get("request_id") or row.get("id")
    return {
        "id": str(req_id),
        "recipient_id": str(row["recipient_id"]) if "recipient_id" in row and row["recipient_id"] else None,
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
        "status": row.get("status"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "recipient_name": row.get("recipient_name"),
        "recipient_phone": row.get("recipient_phone"),
    }


class RequestService:
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
    def get_all_requests() -> List[Dict[str, Any]]:
        """Retrieves all donation requests from the database via get_all_donation_requests."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute("SELECT * FROM public.get_all_donation_requests();")
                    rows = cursor.fetchall()
                    return [_format_request_row(r) for r in rows]
                except Exception as e:
                    logger.error(f"Error fetching all requests: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve donation requests."
                    )

    @staticmethod
    def get_active_requests() -> List[Dict[str, Any]]:
        """Retrieves only open, unexpired donation requests via public.get_active_requests."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute("SELECT * FROM public.get_active_requests();")
                    rows = cursor.fetchall()
                    return [_format_request_row(r) for r in rows]
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
                        "SELECT * FROM public.get_recipient_requests(%s::UUID);",
                        (user_id,)
                    )
                    rows = cursor.fetchall()
                    return [_format_request_row(r) for r in rows]
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
    def get_request_by_id(request_id: str) -> Dict[str, Any]:
        """Retrieves a single donation request by ID via public.get_request_by_id."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT * FROM public.get_request_by_id(%s::UUID);",
                        (request_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donation request not found."
                        )
                    return _format_request_row(row)
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
    def create_request(user_id: str, request_data: BloodRequestCreate) -> Dict[str, Any]:
        """Resolves recipient profile and calls create_blood_request PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
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
                            request_data.required_by,
                        ),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from create_blood_request")

                    return _format_request_row(row)
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
                    recipient_id = RequestService._resolve_recipient_id(cursor, user_id, auto_create=False)
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
                            request_data.required_by,
                        ),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from update_blood_request")

                    return _format_request_row(row)
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
                    recipient_id = RequestService._resolve_recipient_id(cursor, user_id, auto_create=False)
                    cursor.execute(
                        "SELECT * FROM public.cancel_request(%s::UUID, %s::UUID);",
                        (request_id, recipient_id),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from cancel_request")

                    return _format_request_row(row)
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
    def mark_request_fulfilled(user_id: str, request_id: str) -> Dict[str, Any]:
        """Validates recipient ownership and calls public.mark_request_fulfilled PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    recipient_id = RequestService._resolve_recipient_id(cursor, user_id, auto_create=False)
                    cursor.execute(
                        "SELECT * FROM public.mark_request_fulfilled(%s::UUID, %s::UUID);",
                        (request_id, recipient_id),
                    )
                    row = cursor.fetchone()
                    db.commit()

                    if not row:
                        raise Exception("No data returned from mark_request_fulfilled")

                    return _format_request_row(row)
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
    def get_request_history(request_id: str) -> List[Dict[str, Any]]:
        """Retrieves all donor applicants for the request via public.get_request_history."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
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
                        SELECT * FROM public.get_personalized_feed(
                            %s::UUID,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::NUMERIC,
                            %s::public.blood_group,
                            %s::INTEGER,
                            %s::INTEGER
                        );
                        """,
                        (user_id, lat, lng, radius_km, blood_group, limit, offset),
                    )
                    rows = cursor.fetchall()
                    result = []
                    for r in rows:
                        row_dict = _format_request_row(r)
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

