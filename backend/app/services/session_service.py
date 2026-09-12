import re
import logging
from typing import Optional, List, Dict, Any
from fastapi import Request
from app.database import get_db_connection

logger = logging.getLogger(__name__)

# Regular expression to validate standard MAC addresses (00:11:22:33:44:55 or 00-11-22-33-44-55)
MAC_REGEX = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")


def extract_client_ip(request: Request) -> str:
    """Extracts client IP address from reverse proxy headers or direct socket connection."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For may contain a comma-separated list of IPs: client, proxy1, proxy2
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip and client_ip.lower() != "testclient":
            # Strip port if present in header (e.g. 192.168.1.1:5000)
            if ":" in client_ip and not client_ip.startswith("[") and client_ip.count(":") == 1:
                client_ip = client_ip.split(":")[0]
            return client_ip

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip() and real_ip.lower() != "testclient":
        client_ip = real_ip.strip()
        if ":" in client_ip and not client_ip.startswith("[") and client_ip.count(":") == 1:
            client_ip = client_ip.split(":")[0]
        return client_ip

    if request.client and request.client.host:
        host = request.client.host.strip()
        if host.lower() == "testclient" or host == "::1":
            return "127.0.0.1"
        return host

    return "127.0.0.1"


def normalize_mac_address(mac: Optional[str]) -> Optional[str]:
    """Validates and formats MAC address for PostgreSQL MACADDR type. Returns None if invalid or absent."""
    if not mac or not isinstance(mac, str):
        return None
    cleaned = mac.strip()
    if MAC_REGEX.match(cleaned):
        return cleaned.replace("-", ":").lower()
    return None


class SessionService:
    @staticmethod
    def log_session(
        user_id: str,
        ip_address: str,
        mac_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[str]:
        """Logs or refreshes an active user session.
        
        If an active session already exists for the same user, IP, and User-Agent,
        it refreshes last_active_at on that session instead of creating a duplicate row.
        Any older duplicate active sessions for the exact same device are automatically deactivated.
        """
        valid_mac = normalize_mac_address(mac_address)
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    # Check for existing active session for this exact device and IP
                    cursor.execute(
                        """
                        SELECT id FROM public.user_sessions
                        WHERE user_id = %s 
                          AND ip_address = %s::inet 
                          AND COALESCE(user_agent, '') = COALESCE(%s, '')
                          AND is_active = TRUE
                        ORDER BY last_active_at DESC;
                        """,
                        (user_id, ip_address, user_agent),
                    )
                    existing_rows = cursor.fetchall()
                    if existing_rows:
                        primary_id = str(existing_rows[0]["id"])
                        # If there are multiple active duplicates for the same client, mark older ones as inactive
                        if len(existing_rows) > 1:
                            stale_ids = [str(r["id"]) for r in existing_rows[1:]]
                            cursor.execute(
                                """
                                UPDATE public.user_sessions
                                SET is_active = FALSE
                                WHERE id = ANY(%s::uuid[]);
                                """,
                                (stale_ids,),
                            )
                        # Touch last_active_at on the primary session
                        cursor.execute(
                            """
                            UPDATE public.user_sessions
                            SET last_active_at = NOW()
                            WHERE id = %s;
                            """,
                            (primary_id,),
                        )
                        db.commit()
                        logger.info(f"Refreshed existing session {primary_id} for user {user_id}")
                        return primary_id

                    # If no existing active session for this device, create a new one
                    cursor.execute(
                        """
                        SELECT public.log_user_session(%s, %s::inet, %s::macaddr, %s) AS session_id;
                        """,
                        (user_id, ip_address, valid_mac, user_agent),
                    )
                    row = cursor.fetchone()
                    if row:
                        session_id = str(row["session_id"])
                        db.commit()
                        logger.info(f"Logged new user session {session_id} for user {user_id} from {ip_address}")
                        return session_id
                    return None
        except Exception as e:
            logger.error(f"Error executing log_user_session for user {user_id}: {e}")
            raise e

    @staticmethod
    def get_user_sessions(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetches session audit history for a user using public.get_user_sessions."""
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT 
                            s.session_id,
                            host(s.ip_address) AS ip_address,
                            s.mac_address::text AS mac_address,
                            u.user_agent,
                            s.created_at,
                            s.last_active_at,
                            s.is_active
                        FROM public.get_user_sessions(%s, %s) s
                        LEFT JOIN public.user_sessions u ON u.id = s.session_id;
                        """,
                        (user_id, limit),
                    )
                    rows = cursor.fetchall()
                    return [
                        {
                            "session_id": str(r["session_id"]),
                            "ip_address": r["ip_address"],
                            "mac_address": r["mac_address"],
                            "user_agent": r.get("user_agent") or "Unknown Browser",
                            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                            "last_active_at": r["last_active_at"].isoformat() if r["last_active_at"] else None,
                            "is_active": bool(r["is_active"]),
                            "is_current": False,
                        }
                        for r in rows
                    ]
        except Exception as e:
            logger.error(f"Error fetching user sessions for user {user_id}: {e}")
            raise e

    @staticmethod
    def terminate_session(session_id: str, user_id: str) -> bool:
        """Revokes a specific session row belonging to the user."""
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE public.user_sessions
                        SET is_active = FALSE,
                            last_active_at = NOW()
                        WHERE id = %s AND user_id = %s;
                        """,
                        (session_id, user_id),
                    )
                    success = cursor.rowcount > 0
                    db.commit()
                    return success
        except Exception as e:
            logger.error(f"Error terminating session {session_id} for user {user_id}: {e}")
            raise e

    @staticmethod
    def terminate_all_other_sessions(user_id: str, current_session_id: Optional[str] = None) -> int:
        """Revokes all active sessions for a user, optionally preserving the current active session."""
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    if current_session_id:
                        cursor.execute(
                            """
                            UPDATE public.user_sessions
                            SET is_active = FALSE,
                                last_active_at = NOW()
                            WHERE user_id = %s AND id != %s AND is_active = TRUE;
                            """,
                            (user_id, current_session_id),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE public.user_sessions
                            SET is_active = FALSE,
                                last_active_at = NOW()
                            WHERE user_id = %s AND is_active = TRUE;
                            """,
                            (user_id,),
                        )
                    revoked = cursor.rowcount
                    db.commit()
                    return revoked
        except Exception as e:
            logger.error(f"Error terminating all sessions for user {user_id}: {e}")
            raise e

    @staticmethod
    def terminate_current_session(
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Deactivates the active session for this user on the current device/IP upon logout."""
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    if ip_address:
                        cursor.execute(
                            """
                            UPDATE public.user_sessions
                            SET is_active = FALSE,
                                last_active_at = NOW()
                            WHERE user_id = %s
                              AND ip_address = %s::inet
                              AND COALESCE(user_agent, '') = COALESCE(%s, '')
                              AND is_active = TRUE;
                            """,
                            (user_id, ip_address, user_agent),
                        )
                        if cursor.rowcount > 0:
                            db.commit()
                            logger.info(f"Terminated active session for user {user_id} on IP {ip_address}")
                            return True

                    # Fallback: deactivate latest active session for this user
                    cursor.execute(
                        """
                        UPDATE public.user_sessions
                        SET is_active = FALSE,
                            last_active_at = NOW()
                        WHERE id = (
                            SELECT id FROM public.user_sessions
                            WHERE user_id = %s AND is_active = TRUE
                            ORDER BY last_active_at DESC
                            LIMIT 1
                        );
                        """,
                        (user_id,),
                    )
                    revoked = cursor.rowcount > 0
                    db.commit()
                    logger.info(f"Terminated fallback active session for user {user_id} (success={revoked})")
                    return revoked
        except Exception as e:
            logger.error(f"Error terminating current session for user {user_id}: {e}")
            raise e


