import logging
from typing import List, Dict, Any, Optional
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
                        p.location_name,
                        ST_Y(p.location::geometry) as latitude,
                        ST_X(p.location::geometry) as longitude,
                        d.blood_group,
                        d.travel_radius_km,
                        public.get_user_role(p.id) as system_role
                    FROM public.profiles p
                    JOIN auth.users au ON au.id = p.id
                    LEFT JOIN public.donors d ON d.user_id = p.id
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

