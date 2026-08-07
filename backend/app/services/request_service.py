import logging
from typing import Dict, Any, List
from app.database import get_db_connection
from fastapi import HTTPException, status
from app.schemas.request_schema import BloodRequestCreate

logger = logging.getLogger(__name__)

class RequestService:
    @staticmethod
    def get_all_requests() -> List[Dict[str, Any]]:
        """Retrieves all donation requests from the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute("SELECT * FROM public.get_all_donation_requests();")
                    rows = cursor.fetchall()
                    result = []
                    for row in rows:
                        result.append({
                            "id": str(row["request_id"]),
                            "blood_group": row["blood_group"],
                            "units_required": row["units_required"],
                            "units_fulfilled": row["units_fulfilled"],
                            "hospital_name": row["hospital_name"],
                            "hospital_lat": row["hospital_lat"],
                            "hospital_lng": row["hospital_lng"],
                            "hospital_address": row["hospital_address"],
                            "search_radius_km": float(row["search_radius_km"]) if row["search_radius_km"] is not None else 10.0,
                            "is_urgent": row["is_urgent"],
                            "notes": row["notes"],
                            "required_by": row["required_by"].isoformat() if row["required_by"] else None,
                            "status": row["status"],
                            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                            "recipient_name": row["recipient_name"],
                            "recipient_phone": row["recipient_phone"]
                        })
                    return result
                except Exception as e:
                    logger.error(f"Error fetching all requests: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve donation requests."
                    )

    @staticmethod
    def create_request(user_id: str, request_data: BloodRequestCreate) -> Dict[str, Any]:
        """Resolves recipient profile and calls create_blood_request PL/pgSQL function."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                # 1. Resolve recipient_id from user_id
                cursor.execute(
                    "SELECT id, is_active FROM public.recipients WHERE user_id = %s;",
                    (user_id,),
                )
                recipient_row = cursor.fetchone()
                if not recipient_row:
                    try:
                        cursor.execute(
                            """
                            INSERT INTO public.recipients (user_id, is_active)
                            VALUES (%s, TRUE)
                            RETURNING id, is_active;
                            """,
                            (user_id,),
                        )
                        recipient_row = cursor.fetchone()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error auto-creating recipient in request creation: {e}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to register user as recipient on-the-fly."
                        )
                if not recipient_row["is_active"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Recipient account is inactive."
                    )
                
                recipient_id = recipient_row["id"]
                
                # 2. Call create_blood_request function
                try:
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
                            request_data.required_by
                        )
                    )
                    row = cursor.fetchone()
                    db.commit()
                    
                    if not row:
                        raise Exception("No data returned from create_blood_request")
                        
                    return {
                        "id": str(row["id"]),
                        "recipient_id": str(row["recipient_id"]),
                        "blood_group": row["blood_group"],
                        "units_required": row["units_required"],
                        "units_fulfilled": row["units_fulfilled"],
                        "hospital_name": row["hospital_name"],
                        "hospital_address": row["hospital_address"],
                        "search_radius_km": float(row["search_radius_km"]) if row["search_radius_km"] is not None else 10.0,
                        "is_urgent": row["is_urgent"] if "is_urgent" in row else (row["urgent"] if "urgent" in row else False),
                        "notes": row["notes"],
                        "required_by": row["required_by"].isoformat() if row["required_by"] else None,
                        "status": row["status"],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None
                    }
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error creating blood request in DB: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e)
                    )
