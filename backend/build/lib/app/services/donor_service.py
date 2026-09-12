import logging
from typing import Dict, Any
from app.database import get_db_connection

logger = logging.getLogger(__name__)


class DonorService:
    @staticmethod
    def apply_to_be_donor(
        user_id: str, blood_group: str, travel_radius_km: float, document_url: str
    ) -> str:
        """Invokes the create_donor_application PL/pgSQL routine to submit a candidate donor application."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute(
                        "SELECT public.create_donor_application(%s, %s::public.blood_group, %s, %s);",
                        (user_id, blood_group, travel_radius_km, document_url),
                    )
                    app_id = cursor.fetchone()[0]
                    db.commit()
                    return str(app_id)
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error applying to be donor: {e}")
                    raise e

    @staticmethod
    def get_application_status(user_id: str) -> Dict[str, Any]:
        """Queries the donor_applications table to retrieve the user's latest application status."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT status, rejection_reason 
                    FROM public.donor_applications 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1;
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return {
                        "has_applied": False,
                        "status": None,
                        "rejection_reason": None
                    }
                return {
                    "has_applied": True,
                    "status": row["status"],
                    "rejection_reason": row["rejection_reason"]
                }

    @staticmethod
    def get_donor_details(user_id: str) -> Dict[str, Any] | None:
        """Retrieves verified donor information from the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, blood_group, is_available, travel_radius_km, 
                           rest_period_until, total_donations, current_streak, 
                           longest_streak, last_donation_at, created_at, updated_at
                    FROM public.donors 
                    WHERE user_id = %s;
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return {
                    "id": str(row["id"]),
                    "user_id": str(row["user_id"]),
                    "blood_group": row["blood_group"],
                    "is_available": row["is_available"],
                    "travel_radius_km": float(row["travel_radius_km"]),
                    "rest_period_until": row["rest_period_until"].isoformat() if row["rest_period_until"] else None,
                    "total_donations": row["total_donations"],
                    "current_streak": row["current_streak"],
                    "longest_streak": row["longest_streak"],
                    "last_donation_at": row["last_donation_at"].isoformat() if row["last_donation_at"] else None,
                    "created_at": row["created_at"].isoformat(),
                    "updated_at": row["updated_at"].isoformat(),
                }
