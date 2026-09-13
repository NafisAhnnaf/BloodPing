import logging
from typing import Dict, Any, List, Optional
from app.database import get_db_connection
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class MatchService:
    @staticmethod
    def apply_to_request(request_id: str, donor_id: Optional[str], user_id: str) -> str:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # 1. Verify donor belongs to caller (accept either donors.id or user_id, or resolve by user_id)
                    if donor_id:
                        cursor.execute(
                            "SELECT id FROM public.donors WHERE (id::text = %s OR user_id::text = %s) AND user_id = %s;",
                            (str(donor_id), str(donor_id), user_id)
                        )
                    else:
                        cursor.execute(
                            "SELECT id FROM public.donors WHERE user_id = %s;",
                            (user_id,)
                        )
                    donor_row = cursor.fetchone()
                    if not donor_row:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Donor profile not found for authenticated user. Please become a donor first."
                        )
                    actual_donor_id = donor_row["id"]

                    # 2. Verify caller is not applying to their own request
                    cursor.execute(
                        """
                        SELECT dr.id 
                        FROM public.donation_requests dr
                        JOIN public.recipients r ON dr.recipient_id = r.id
                        WHERE dr.id = %s AND r.user_id = %s;
                        """,
                        (request_id, user_id)
                    )
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You cannot apply to your own donation request."
                        )

                    cursor.execute(
                        "SELECT (public.apply_to_donation_request(%s, %s)).id AS match_id;",
                        (request_id, actual_donor_id),
                    )
                    row = cursor.fetchone()
                    match_id = row["match_id"] if row else None
                    db.commit()
                    return str(match_id)
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error applying to request: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    def get_applications(request_id: str, user_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                # Enforce that caller is the owner of the request
                cursor.execute(
                    """
                    SELECT dr.id, r.user_id
                    FROM public.donation_requests dr
                    JOIN public.recipients r ON dr.recipient_id = r.id
                    WHERE dr.id = %s;
                    """,
                    (request_id,)
                )
                req_row = cursor.fetchone()
                if not req_row:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")
                if str(req_row["user_id"]) != str(user_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to view applicants for this request."
                    )

                cursor.execute(
                    """
                    SELECT m.id, m.request_id, m.donor_id, m.status, m.applied_at, m.accepted_at, m.confirmed_at,
                           d.user_id, d.blood_group, d.total_donations, d.current_streak, d.rest_period_until,
                           p.full_name, p.username
                    FROM public.donation_matches m
                    JOIN public.donors d ON m.donor_id = d.id
                    JOIN public.profiles p ON d.user_id = p.id
                    WHERE m.request_id = %s;
                    """,
                    (request_id,)
                )
                rows = cursor.fetchall()
                result = []
                for row in rows:
                    result.append({
                        "id": str(row["id"]),
                        "request_id": str(row["request_id"]),
                        "donor_id": str(row["donor_id"]),
                        "status": row["status"],
                        "applied_at": row["applied_at"].isoformat() if row["applied_at"] else None,
                        "accepted_at": row["accepted_at"].isoformat() if row["accepted_at"] else None,
                        "confirmed_at": row["confirmed_at"].isoformat() if row["confirmed_at"] else None,
                        "donor": {
                            "user_id": str(row["user_id"]),
                            "blood_group": row["blood_group"],
                            "total_donations": row["total_donations"],
                            "current_streak": row["current_streak"],
                            "rest_period_until": row["rest_period_until"].isoformat() if row["rest_period_until"] else None,
                            "profile": {
                                "full_name": row["full_name"],
                                "username": row["username"]
                            }
                        }
                    })
                return result

    @staticmethod
    def get_donor_matches(donor_id: str, user_id: str, match_status: str = None) -> List[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute("SELECT id FROM public.donors WHERE id = %s AND user_id = %s;", (donor_id, user_id))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Donor profile does not belong to authenticated user."
                    )
                query = "SELECT * FROM public.donation_matches WHERE donor_id = %s"
                params = [donor_id]
                if match_status:
                    query += " AND status = %s"
                    params.append(match_status)
                
                cursor.execute(query, tuple(params))
                rows = cursor.fetchall()
                result = []
                for row in rows:
                    result.append({
                        "id": str(row["id"]),
                        "request_id": str(row["request_id"]),
                        "donor_id": str(row["donor_id"]),
                        "status": row["status"],
                        "applied_at": row["applied_at"].isoformat() if row["applied_at"] else None,
                        "accepted_at": row["accepted_at"].isoformat() if row["accepted_at"] else None,
                        "confirmed_at": row["confirmed_at"].isoformat() if row["confirmed_at"] else None,
                        "recipient_verification_note": row["recipient_verification_note"]
                    })
                return result
                
    @staticmethod
    def update_match_status(match_id: str, new_status: str, user_id: str, note: str = None):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of the associated donation request
                    cursor.execute(
                        """
                        SELECT dr.id, r.user_id
                        FROM public.donation_matches m
                        JOIN public.donation_requests dr ON m.request_id = dr.id
                        JOIN public.recipients r ON dr.recipient_id = r.id
                        WHERE m.id = %s;
                        """,
                        (match_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found.")
                    if str(row["user_id"]) != str(user_id):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to manage this applicant."
                        )

                    status_map = {
                        "completed": "confirmed",
                        "canceled": "withdrawn",
                        "cancelled": "withdrawn"
                    }
                    normalized_status = status_map.get(str(new_status).lower(), str(new_status).lower())

                    cursor.execute(
                        "SELECT public.update_match_status(%s, %s::text, %s);",
                        (match_id, normalized_status, note),
                    )
                    db.commit()
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error updating match status: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    def confirm_donation(match_id: str, user_id: str):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # Enforce that caller is the owner of the associated donation request
                    cursor.execute(
                        """
                        SELECT dr.id, r.user_id
                        FROM public.donation_matches m
                        JOIN public.donation_requests dr ON m.request_id = dr.id
                        JOIN public.recipients r ON dr.recipient_id = r.id
                        WHERE m.id = %s;
                        """,
                        (match_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found.")
                    if str(row["user_id"]) != str(user_id):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to confirm donation for this request."
                        )

                    cursor.execute(
                        "SELECT public.confirm_donation(%s);",
                        (match_id,),
                    )
                    db.commit()
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error confirming donation: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                    
    @staticmethod
    def withdraw_application(match_id: str, user_id: str):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        """
                        SELECT m.status, d.user_id
                        FROM public.donation_matches m
                        JOIN public.donors d ON m.donor_id = d.id
                        WHERE m.id = %s;
                        """,
                        (match_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
                    if str(row["user_id"]) != str(user_id):
                        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only withdraw your own application.")
                    if row["status"] == "pending":
                        cursor.execute("DELETE FROM public.donation_matches WHERE id = %s", (match_id,))
                    elif row["status"] == "accepted":
                        cursor.execute("SELECT public.update_match_status_with_points(%s, 'withdrawn', 'Donor withdrew accepted application');", (match_id,))
                    else:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot withdraw a match with status '{row['status']}'")
                    
                    db.commit()
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error withdrawing application: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
