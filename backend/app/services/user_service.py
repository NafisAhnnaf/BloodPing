import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.schemas.user_schema import UserDetails
from app.database import get_db_connection

logger = logging.getLogger(__name__)


class UserService:
    @staticmethod
    def get_all_users() -> List[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT p.full_name, p.username, au.email 
                    FROM public.profiles p
                    JOIN auth.users au ON au.id = p.id;
                    """
                )
                rows = cursor.fetchall()
                return [{"full_name": r["full_name"], "username": r["username"], "email": r["email"]} for r in rows]

    @staticmethod
    def get_user_by_id(user_id: str) -> Dict[str, Any] | None:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 
                        p.full_name, 
                        p.username, 
                        au.email,
                        p.avatar_url,
                        p.date_of_birth,
                        p.phone,
                        p.bio,
                        COALESCE(ul.location_name, p.location_name) as location_name,
                        COALESCE(ST_Y(ul.location::geometry), ST_Y(p.location::geometry)) as latitude,
                        COALESCE(ST_X(ul.location::geometry), ST_X(p.location::geometry)) as longitude,
                        d.blood_group,
                        d.travel_radius_km,
                        public.get_user_role(p.id) as system_role,
                        COALESCE(uac.total_donations, 0) as total_donations,
                        COALESCE(uac.total_requests, 0) as total_requests
                    FROM public.profiles p
                    JOIN auth.users au ON au.id = p.id
                    LEFT JOIN public.donors d ON d.user_id = p.id
                    LEFT JOIN public.user_locations ul ON ul.user_id = p.id AND ul.is_primary = TRUE
                    LEFT JOIN LATERAL public.get_user_activity_counts(p.id) uac ON TRUE
                    WHERE p.id = %s;
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return {
                    "username": row["username"],
                    "email": row["email"],
                    "full_name": row["full_name"],
                    "avatar_url": row["avatar_url"],
                    "date_of_birth": str(row["date_of_birth"]) if row["date_of_birth"] else None,
                    "phone": row["phone"],
                    "bio": row["bio"],
                    "blood_group": row["blood_group"],
                    "travel_radius_km": float(row["travel_radius_km"]) if row["travel_radius_km"] is not None else None,
                    "location_name": row["location_name"],
                    "latitude": float(row["latitude"]) if row["latitude"] is not None else None,
                    "longitude": float(row["longitude"]) if row["longitude"] is not None else None,
                    "role": row["system_role"],
                    "total_donations": int(row["total_donations"]) if row.get("total_donations") is not None else 0,
                    "total_requests": int(row["total_requests"]) if row.get("total_requests") is not None else 0,
                }

    @staticmethod
    def create_user(u: UserDetails) -> Dict[str, Any]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                # Check if email exists in auth.users
                cursor.execute("SELECT id FROM auth.users WHERE email = %s;", (u.email,))
                existing_user = cursor.fetchone()
                if existing_user:
                    user_id = existing_user["id"]
                else:
                    cursor.execute(
                        "INSERT INTO auth.users (email) VALUES (%s) RETURNING id;",
                        (u.email,)
                    )
                    user_id = cursor.fetchone()["id"]

                dob = u.date_of_birth if u.date_of_birth else "2000-01-01"
                full_name = u.full_name if u.full_name else u.username

                # Upsert profile record
                cursor.execute(
                    """
                    INSERT INTO profiles (id, username, full_name, avatar_url, date_of_birth, phone, bio, location_name, location)
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s,
                        CASE 
                            WHEN %s IS NOT NULL AND %s IS NOT NULL THEN ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography 
                            ELSE NULL 
                        END
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        username = EXCLUDED.username,
                        full_name = EXCLUDED.full_name,
                        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
                        date_of_birth = EXCLUDED.date_of_birth,
                        phone = EXCLUDED.phone,
                        bio = EXCLUDED.bio,
                        location_name = EXCLUDED.location_name,
                        location = COALESCE(EXCLUDED.location, profiles.location)
                    RETURNING id, username;
                    """,
                    (
                        user_id,
                        u.username,
                        full_name,
                        u.avatar_url,
                        dob,
                        u.phone,
                        u.bio,
                        u.location_name,
                        u.longitude,
                        u.latitude,
                        u.longitude,
                        u.latitude,
                    ),
                )
                new_user = cursor.fetchone()

                # Always insert into recipients table to grant recipient privileges by default
                cursor.execute(
                    """
                    INSERT INTO recipients (user_id, is_active)
                    VALUES (%s, TRUE)
                    ON CONFLICT (user_id) DO NOTHING;
                    """,
                    (user_id,),
                )

                # If donor attributes supplied, upsert donors table
                if u.blood_group:
                    cursor.execute(
                        """
                        INSERT INTO donors (user_id, blood_group, travel_radius_km, is_available)
                        VALUES (%s, %s::public.blood_group, COALESCE(%s, 15.0), TRUE)
                        ON CONFLICT (user_id) DO UPDATE SET
                            blood_group = EXCLUDED.blood_group,
                            travel_radius_km = COALESCE(EXCLUDED.travel_radius_km, donors.travel_radius_km);
                        """,
                        (user_id, u.blood_group, u.travel_radius_km),
                    )

                # If coordinates supplied, invoke PL/pgSQL upsert_user_location procedure
                if u.latitude is not None and u.longitude is not None:
                    cursor.execute(
                        """
                        CALL public.upsert_user_location(
                            %s::UUID,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::TEXT,
                            'Primary',
                            %s::TEXT,
                            %s::DOUBLE PRECISION,
                            TRUE
                        );
                        """,
                        (
                            user_id,
                            u.latitude,
                            u.longitude,
                            u.location_name,
                            u.location_source or "browser_gps",
                            u.accuracy_meters,
                        ),
                    )

                db.commit()
                if new_user is None:
                    raise ValueError("Failed to create or update user profile.")
                return {"id": str(new_user["id"]), "username": new_user["username"], "email": u.email}

    @staticmethod
    def update_user(
        user_id: str, u: UserDetails
    ) -> Optional[Dict[str, Any]]:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute("SELECT full_name, date_of_birth FROM profiles WHERE id = %s;", (user_id,))
                current = cursor.fetchone()
                if not current:
                    return None
                    
                full_name = u.full_name if u.full_name is not None else current["full_name"]
                dob = u.date_of_birth if u.date_of_birth is not None else current["date_of_birth"]

                cursor.execute(
                    """
                    UPDATE profiles 
                    SET username = %s, 
                        full_name = %s, 
                        avatar_url = %s, 
                        date_of_birth = %s, 
                        phone = %s, 
                        bio = %s, 
                        location_name = %s, 
                        location = CASE 
                            WHEN %s IS NOT NULL AND %s IS NOT NULL THEN ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography 
                            ELSE location 
                        END 
                    WHERE id = %s 
                    RETURNING id, username;
                    """,
                    (
                        u.username,
                        full_name,
                        u.avatar_url,
                        dob,
                        u.phone,
                        u.bio,
                        u.location_name,
                        u.longitude,
                        u.latitude,
                        u.longitude,
                        u.latitude,
                        user_id,
                    ),
                )
                updated_user = cursor.fetchone()

                # Update donor preferences if provided
                if u.blood_group or u.travel_radius_km:
                    cursor.execute(
                        """
                        INSERT INTO donors (user_id, blood_group, travel_radius_km, is_available)
                        VALUES (%s, COALESCE(%s::public.blood_group, 'O+'::public.blood_group), COALESCE(%s, 15.0), TRUE)
                        ON CONFLICT (user_id) DO UPDATE SET
                            blood_group = COALESCE(EXCLUDED.blood_group, donors.blood_group),
                            travel_radius_km = COALESCE(EXCLUDED.travel_radius_km, donors.travel_radius_km);
                        """,
                        (user_id, u.blood_group, u.travel_radius_km),
                    )

                # If coordinates provided, invoke PL/pgSQL upsert_user_location procedure
                if u.latitude is not None and u.longitude is not None:
                    cursor.execute(
                        """
                        CALL public.upsert_user_location(
                            %s::UUID,
                            %s::DOUBLE PRECISION,
                            %s::DOUBLE PRECISION,
                            %s::TEXT,
                            'Primary',
                            %s::TEXT,
                            %s::DOUBLE PRECISION,
                            TRUE
                        );
                        """,
                        (
                            user_id,
                            u.latitude,
                            u.longitude,
                            u.location_name,
                            u.location_source or "browser_gps",
                            u.accuracy_meters,
                        ),
                    )

                db.commit()
                return (
                    {
                        "id": str(updated_user["id"]),
                        "username": updated_user["username"],
                        "email": u.email,
                    }
                    if updated_user
                    else None
                )

    @staticmethod
    def export_user_data(user_id: str) -> Dict[str, Any]:
        """Collects personal profile, donor metrics, and donation records for GDPR data portability."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT p.id, p.full_name, p.username, au.email, p.date_of_birth, 
                           p.phone, p.bio, p.location_name, p.created_at, p.updated_at
                    FROM public.profiles p
                    JOIN auth.users au ON au.id = p.id
                    WHERE p.id = %s;
                    """,
                    (user_id,),
                )
                profile = cursor.fetchone()
                if not profile:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")

                cursor.execute(
                    """
                    SELECT blood_group, is_available, travel_radius_km, total_donations, 
                           current_streak, longest_streak, total_points, rest_period_until, 
                           last_donation_at, created_at
                    FROM public.donors WHERE user_id = %s;
                    """,
                    (user_id,),
                )
                donor = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT dr.blood_group, dr.units_required, dr.units_fulfilled, 
                           dr.hospital_name, dr.hospital_address, dr.status, dr.created_at
                    FROM public.donation_requests dr
                    JOIN public.recipients r ON dr.recipient_id = r.id
                    WHERE r.user_id = %s
                    ORDER BY dr.created_at DESC;
                    """,
                    (user_id,),
                )
                requests = cursor.fetchall()

                cursor.execute("SELECT * FROM public.get_user_activity_counts(%s::UUID);", (user_id,))
                counts = cursor.fetchone()

                return {
                    "export_timestamp": datetime.now(timezone.utc).isoformat(),
                    "user_id": str(profile["id"]),
                    "profile": {
                        "full_name": profile["full_name"],
                        "username": profile["username"],
                        "email": profile["email"],
                        "date_of_birth": str(profile["date_of_birth"]) if profile.get("date_of_birth") else None,
                        "phone": profile["phone"],
                        "bio": profile["bio"],
                        "location_name": profile["location_name"],
                        "member_since": profile["created_at"].isoformat() if profile.get("created_at") else None,
                    },
                    "donor_record": {
                        "blood_group": donor["blood_group"],
                        "is_available": donor["is_available"],
                        "travel_radius_km": float(donor["travel_radius_km"]),
                        "total_donations": donor["total_donations"],
                        "current_streak": donor["current_streak"],
                        "longest_streak": donor["longest_streak"],
                        "total_points": donor["total_points"],
                        "rest_period_until": donor["rest_period_until"].isoformat() if donor.get("rest_period_until") else None,
                    } if donor else None,
                    "donation_requests": [
                        {
                            "blood_group": r["blood_group"],
                            "units_required": r["units_required"],
                            "units_fulfilled": r["units_fulfilled"],
                            "hospital_name": r["hospital_name"],
                            "hospital_address": r["hospital_address"],
                            "status": r["status"],
                            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                        }
                        for r in requests
                    ],
                    "activity_summary": {
                        "total_donations": counts["total_donations"] if counts else 0,
                        "total_requests": counts["total_requests"] if counts else 0,
                    },
                }

    @staticmethod
    def delete_user_account(user_id: str) -> Dict[str, Any]:
        """Hard deletes a user profile and cascades through related records."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                try:
                    cursor.execute("CALL public.delete_user_account(%s::UUID);", (user_id,))
                    db.commit()
                    return {"success": True, "message": "User account successfully deleted."}
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error in delete_user_account: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to delete account: {str(e)}",
                    )


