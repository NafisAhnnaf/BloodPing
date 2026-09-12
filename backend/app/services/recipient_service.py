import logging
from typing import Dict, Any
from app.database import get_db_connection

logger = logging.getLogger(__name__)


class RecipientService:
    @staticmethod
    def get_recipient_status(user_id: str) -> Dict[str, Any] | None:
        """Retrieves active recipient registry metadata from the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT id, is_active FROM public.recipients WHERE user_id = %s;",
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    try:
                        cursor.execute(
                            """
                            INSERT INTO public.recipients (user_id, is_active)
                            VALUES (%s, TRUE)
                            RETURNING id, is_active;
                            """,
                            (user_id,),
                        )
                        row = cursor.fetchone()
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error auto-creating recipient status: {e}")
                        return None
                return {
                    "recipient_id": str(row["id"]),
                    "is_active": row["is_active"]
                }

    @staticmethod
    def get_recipient_details(user_id: str) -> Dict[str, Any] | None:
        """Retrieves verified recipient details from the database."""
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT id, user_id, is_active, created_at, updated_at FROM public.recipients WHERE user_id = %s;",
                    (user_id,),
                )
                row = cursor.fetchone()
                if not row:
                    try:
                        cursor.execute(
                            """
                            INSERT INTO public.recipients (user_id, is_active)
                            VALUES (%s, TRUE)
                            RETURNING id, user_id, is_active, created_at, updated_at;
                            """,
                            (user_id,),
                        )
                        row = cursor.fetchone()
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error auto-creating recipient details: {e}")
                        return None
                return {
                    "id": str(row["id"]),
                    "user_id": str(row["user_id"]),
                    "is_active": row["is_active"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                }
