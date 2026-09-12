import logging
from typing import Dict, Any, List
from app.database import get_db_connection
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class MatchService:
    @staticmethod
    def apply_to_request(request_id: str, donor_id: str) -> str:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT public.apply_to_donation_request(%s, %s);",
                        (request_id, donor_id),
                    )
                    match_id = cursor.fetchone()[0]
                    db.commit()
                    return str(match_id)
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error applying to request: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    def get_applications(request_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
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
    def get_donor_matches(donor_id: str, match_status: str = None) -> List[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
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
    def update_match_status(match_id: str, new_status: str, note: str = None):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT public.update_match_status(%s, %s::public.match_status, %s);",
                        (match_id, new_status, note),
                    )
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error updating match status: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    def confirm_donation(match_id: str):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT public.confirm_donation(%s);",
                        (match_id,),
                    )
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error confirming donation: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                    
    @staticmethod
    def withdraw_application(match_id: str):
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute("SELECT status FROM public.donation_matches WHERE id = %s", (match_id,))
                    row = cursor.fetchone()
                    if not row:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
                    if row["status"] != "pending":
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only withdraw pending applications")
                    
                    cursor.execute("DELETE FROM public.donation_matches WHERE id = %s", (match_id,))
                    db.commit()
                except Exception as e:
                    db.rollback()
                    if isinstance(e, HTTPException):
                        raise e
                    logger.error(f"Error withdrawing application: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
