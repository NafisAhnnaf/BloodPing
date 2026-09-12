import logging
from typing import List, Dict, Any
from fastapi import HTTPException, status
from app.database import get_db_connection

logger = logging.getLogger(__name__)


class AdminService:
    @staticmethod
    def _verify_admin_status(cursor, user_id: str) -> None:
        """Helper to check admin status before executing queries."""
        cursor.execute("SELECT 1 FROM public.admins WHERE user_id = %s;", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only platform administrators can perform this action."
            )

    @classmethod
    def get_all_applications(cls, admin_id: str) -> List[Dict[str, Any]]:
        """Retrieves a complete list of donor candidate applications for the admin panel."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cls._verify_admin_status(cursor, admin_id)
                cursor.execute(
                    """
                    SELECT 
                        da.id,
                        da.user_id,
                        p.full_name,
                        au.email,
                        da.blood_group,
                        da.travel_radius_km,
                        da.document_url,
                        da.status,
                        da.created_at
                    FROM public.donor_applications da
                    JOIN public.profiles p ON p.id = da.user_id
                    JOIN auth.users au ON au.id = da.user_id
                    ORDER BY da.created_at DESC;
                    """
                )
                rows = cursor.fetchall()
                return [
                    {
                        "id": str(r["id"]),
                        "user_id": str(r["user_id"]),
                        "full_name": r["full_name"],
                        "email": r["email"],
                        "blood_group": r["blood_group"],
                        "travel_radius_km": float(r["travel_radius_km"]),
                        "document_url": r["document_url"],
                        "status": r["status"],
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None
                    }
                    for r in rows
                ]

    @classmethod
    def review_application(
        cls, admin_id: str, application_id: str, status: str, rejection_reason: str = None
    ) -> None:
        """Executes the review_donor_application PL/pgSQL function to approve or reject a candidate."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cls._verify_admin_status(cursor, admin_id)
                try:
                    cursor.execute(
                        "SELECT public.review_donor_application(%s, %s, %s, %s);",
                        (application_id, admin_id, status, rejection_reason),
                    )
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error reviewing donor application: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to review donor application: {str(e)}"
                    )
