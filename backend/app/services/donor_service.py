import logging
from typing import Dict, Any, List
from app.database import get_db_connection
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class DonorService:
    @staticmethod
    def apply_to_be_donor(
        user_id: str, blood_group: str, travel_radius_km: float, document_url: str
    ) -> str:
        """Submits a candidate donor application after validating candidate state."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    # 1. Verify user profile exists
                    cursor.execute("SELECT id FROM public.profiles WHERE id = %s;", (user_id,))
                    if not cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="User profile not found. Please complete profile setup first."
                        )

                    # 2. Check if user is already an approved, verified active donor
                    cursor.execute("SELECT id FROM public.donors WHERE user_id = %s AND is_active = TRUE;", (user_id,))
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You are already an approved and active donor on BloodPing."
                        )

                    # 3. Check if user already has an application under review
                    cursor.execute(
                        "SELECT id FROM public.donor_applications WHERE user_id = %s AND status = 'pending';",
                        (user_id,)
                    )
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You already have a pending donor application under review. Please await admin verification."
                        )

                    # 4. Invoke PL/pgSQL create_donor_application routine
                    cursor.execute(
                        "SELECT public.create_donor_application(%s::UUID, %s::public.blood_group, %s::NUMERIC, %s::TEXT);",
                        (user_id, blood_group, travel_radius_km, document_url),
                    )
                    row = cursor.fetchone()
                    app_id = (row.get("create_donor_application") or list(row.values())[0]) if row else None
                    db.commit()

                    if not app_id:
                        raise Exception("Failed to retrieve application ID after insertion.")

                    return str(app_id)
                except HTTPException:
                    db.rollback()
                    raise
                except Exception as e:
                    db.rollback()
                    err_msg = str(e)
                    logger.error(f"Error in apply_to_be_donor: {err_msg}")
                    if "already exists" in err_msg.lower() or "pending" in err_msg.lower():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="A pending donor application already exists for your account."
                        )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=err_msg
                    )

    @staticmethod
    def get_application_status(user_id: str) -> Dict[str, Any]:
        """Queries the donor_applications table to retrieve the user's latest application status and details."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, status, rejection_reason, blood_group, travel_radius_km, 
                           document_url, created_at, reviewed_at
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
                        "rejection_reason": None,
                        "application_id": None,
                        "blood_group": None,
                        "travel_radius_km": None,
                        "document_url": None,
                        "applied_at": None,
                        "reviewed_at": None,
                    }
                return {
                    "has_applied": True,
                    "status": row["status"],
                    "rejection_reason": row["rejection_reason"],
                    "application_id": str(row["id"]),
                    "blood_group": row["blood_group"],
                    "travel_radius_km": float(row["travel_radius_km"]) if row["travel_radius_km"] is not None else None,
                    "document_url": row["document_url"],
                    "applied_at": row["created_at"].isoformat() if row.get("created_at") else None,
                    "reviewed_at": row["reviewed_at"].isoformat() if row.get("reviewed_at") else None,
                }

    @staticmethod
    def get_donor_details(user_id: str) -> Dict[str, Any] | None:
        """Retrieves verified donor information from the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, blood_group, is_available, is_platform_verified, travel_radius_km, 
                           rest_period_until, total_donations, current_streak, 
                           longest_streak, last_donation_at, total_points, created_at, updated_at
                    FROM public.donors 
                    WHERE user_id = %s AND is_active = TRUE;
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
                    "is_platform_verified": row.get("is_platform_verified", True),
                    "travel_radius_km": float(row["travel_radius_km"]),
                    "rest_period_until": row["rest_period_until"].isoformat() if row.get("rest_period_until") else None,
                    "total_donations": row.get("total_donations", 0),
                    "current_streak": row.get("current_streak", 0),
                    "longest_streak": row.get("longest_streak", 0),
                    "last_donation_at": row["last_donation_at"].isoformat() if row.get("last_donation_at") else None,
                    "total_points": row.get("total_points", 0),
                    "created_at": row["created_at"].isoformat(),
                    "updated_at": row["updated_at"].isoformat(),
                }

    @staticmethod
    def get_donor_documents(user_id: str) -> List[Dict[str, Any]]:
        """Retrieves all medical documents and verification applications for a donor."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM public.get_donor_documents(%s::UUID);",
                    (user_id,),
                )
                rows = cursor.fetchall()
                return [
                    {
                        "id": str(r["id"]),
                        "document_type": r["document_type"],
                        "document_url": r["document_url"],
                        "status": r["status"],
                        "rejection_reason": r.get("rejection_reason"),
                        "document_date": str(r["document_date"]) if r.get("document_date") else None,
                        "uploaded_at": r["uploaded_at"].isoformat() if r.get("uploaded_at") else None,
                        "reviewed_at": r["reviewed_at"].isoformat() if r.get("reviewed_at") else None,
                        "source": r.get("source", "medical_document"),
                    }
                    for r in rows
                ]

    @staticmethod
    def upload_medical_document(
        user_id: str, document_type: str, storage_url: str, document_date: str
    ) -> Dict[str, Any]:
        """Uploads an additional medical document for a registered donor."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                # 1. Verify user is registered as donor
                cursor.execute("SELECT id FROM public.donors WHERE user_id = %s;", (user_id,))
                donor_row = cursor.fetchone()
                if not donor_row:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only registered donors can upload additional medical records.",
                    )
                donor_id = donor_row["id"]

                # 2. Normalize document type enum
                valid_types = {"medical_certificate", "blood_test_report", "identity_proof", "other"}
                clean_type = document_type.lower().replace(" ", "_")
                if clean_type not in valid_types:
                    clean_type = "medical_certificate"

                try:
                    cursor.execute(
                        "CALL public.upload_document(%s::UUID, %s::public.document_type, %s::TEXT, %s::DATE);",
                        (donor_id, clean_type, storage_url, document_date),
                    )
                    db.commit()
                    return {
                        "success": True,
                        "message": "Medical document uploaded successfully and pending verification.",
                    }
                except Exception as e:
                    db.rollback()
                    logger.error(f"Failed to upload medical document: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

    @staticmethod
    def get_donor_availability(user_id: str) -> Dict[str, Any]:
        """Retrieves availability status and rest period for the donor."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT is_available, rest_period_until FROM public.donors WHERE user_id = %s AND is_active = TRUE;",
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Donor profile not found.",
                    )
                return {
                    "is_available": row["is_available"],
                    "rest_period_until": row["rest_period_until"].isoformat() if row.get("rest_period_until") else None,
                    "message": "Donor availability fetched successfully."
                }

    @staticmethod
    def update_donor_availability(user_id: str, is_available: bool) -> Dict[str, Any]:
        """Updates the donor availability toggle in the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.donors
                    SET is_available = %s, updated_at = NOW()
                    WHERE user_id = %s AND is_active = TRUE
                    RETURNING is_available, rest_period_until;
                    """,
                    (is_available, user_id),
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Donor profile not found.",
                    )
                db.commit()
                status_text = "available for emergency requests" if is_available else "paused and unavailable"
                return {
                    "is_available": row["is_available"],
                    "rest_period_until": row["rest_period_until"].isoformat() if row.get("rest_period_until") else None,
                    "message": f"You are now {status_text}."
                }


