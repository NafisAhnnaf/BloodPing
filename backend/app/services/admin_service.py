import math
import logging
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.core.supabase_client import supabase
from app.database import get_db_connection
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class AdminService:
    @staticmethod
    async def admin_login(email: str, password: str) -> Dict[str, Any]:
        """
        Verifies administrator credentials against Supabase Auth and checks admin privileges.

        Args:
            email (str): Administrator email address.
            password (str): Administrator password.

        Returns:
            Dict[str, Any]: Authentication token and user metadata.
        """
        try:
            auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})
            if not auth_response.user or not auth_response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials provided."
                )

            user_id = auth_response.user.id

            # Verify user exists in public.admins table
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM public.admins WHERE user_id = %s;", (user_id,))
                    if not cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied. Administrator privileges required."
                        )

            return {
                "access_token": auth_response.session.access_token,
                "token_type": "bearer",
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during admin login for {email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )

    @staticmethod
    async def get_applications(
        status_filter: Optional[str] = "pending",
        sort: Optional[str] = "newest",
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves donor candidate applications with filtering, sorting, and search capabilities.

        Args:
            status_filter (Optional[str]): Filter status ('pending', 'approved', 'rejected', or 'all').
            sort (Optional[str]): Sorting order ('newest' or 'oldest').
            search (Optional[str]): Search term for full_name, email, or blood_group.

        Returns:
            List[Dict[str, Any]]: List of application objects.
        """
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    query = """
                        SELECT 
                            da.id,
                            da.user_id,
                            p.full_name,
                            au.email,
                            da.blood_group,
                            da.travel_radius_km,
                            da.document_url,
                            da.status,
                            da.rejection_reason,
                            da.created_at,
                            da.updated_at
                        FROM public.donor_applications da
                        JOIN public.profiles p ON p.id = da.user_id
                        JOIN auth.users au ON au.id = da.user_id
                        WHERE 1=1
                    """
                    params = []

                    if status_filter and status_filter.lower() != 'all':
                        query += " AND da.status = %s"
                        params.append(status_filter.lower())

                    if search and search.strip():
                        term = f"%{search.strip().lower()}%"
                        query += " AND (LOWER(p.full_name) LIKE %s OR LOWER(au.email) LIKE %s OR LOWER(da.blood_group::text) LIKE %s)"
                        params.extend([term, term, term])

                    if sort and sort.lower() == 'oldest':
                        query += " ORDER BY da.created_at ASC"
                    else:
                        query += " ORDER BY da.created_at DESC"

                    cursor.execute(query, tuple(params))
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
                            "rejection_reason": r["rejection_reason"],
                            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
                        }
                        for r in rows
                    ]
        except Exception as e:
            logger.error(f"Error fetching donor applications: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch applications: {str(e)}"
            )

    @staticmethod
    async def review_application(
        application_id: str,
        admin_id: str,
        status_val: str,
        rejection_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reviews a donor application (approve/reject) and generates notifications.

        Calls 'review_donor_application' PL/pgSQL function via Supabase RPC.

        Args:
            application_id (str): Application UUID.
            admin_id (str): Reviewing admin UUID.
            status_val (str): Target status ('approved' or 'rejected').
            rejection_reason (Optional[str]): Rejection reason if applicable.

        Returns:
            Dict[str, Any]: Operation response.
        """
        try:
            params = {
                'p_application_id': application_id,
                'p_admin_id': admin_id,
                'p_status': status_val,
                'p_rejection_reason': rejection_reason
            }
            supabase.rpc('review_donor_application', params).execute()

            # Trigger email notification asynchronously
            try:
                with get_db_connection() as db:
                    with db.cursor() as cursor:
                        cursor.execute(
                            """
                            SELECT da.user_id, da.blood_group, p.full_name, au.email
                            FROM public.donor_applications da
                            JOIN public.profiles p ON p.id = da.user_id
                            JOIN auth.users au ON au.id = da.user_id
                            WHERE da.id = %s;
                            """,
                            (application_id,)
                        )
                        app_info = cursor.fetchone()
                        if app_info and app_info.get("email"):
                            applicant_email = app_info["email"]
                            applicant_name = app_info.get("full_name") or "Donor Applicant"
                            blood_grp = app_info.get("blood_group")

                            if status_val == "approved":
                                EmailService.send_donor_application_approved(
                                    to_email=applicant_email,
                                    full_name=applicant_name,
                                    blood_group=blood_grp
                                )
                            elif status_val == "rejected":
                                EmailService.send_donor_application_rejected(
                                    to_email=applicant_email,
                                    full_name=applicant_name,
                                    reason=rejection_reason
                                )
            except Exception as email_err:
                logger.warning(f"Failed to dispatch email for application review {application_id}: {email_err}")

            return {"success": True, "message": f"Application {status_val} successfully."}
        except Exception as e:
            logger.error(f"Error reviewing donor application {application_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to review application: {str(e)}"
            )

    @staticmethod
    async def get_users(
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        filter_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Retrieves paginated user accounts with role & status filters and search capability.

        Args:
            page (int): Page number (1-indexed).
            limit (int): Items per page.
            search (Optional[str]): Search string matching name, username, or email.
            filter_type (str): Filter ('all', 'active', 'banned', 'donors', 'recipients').

        Returns:
            Dict[str, Any]: Paginated dictionary containing users, total_count, and total_pages.
        """
        try:
            page = max(1, page)
            limit = max(1, min(100, limit))
            offset = (page - 1) * limit

            with get_db_connection() as db:
                with db.cursor() as cursor:
                    base_query = """
                        FROM public.profiles p
                        JOIN auth.users au ON au.id = p.id
                        LEFT JOIN public.donors d ON d.user_id = p.id
                        LEFT JOIN public.recipients r ON r.user_id = p.id
                        LEFT JOIN public.admins a ON a.user_id = p.id
                        WHERE 1=1
                    """
                    params = []

                    # Apply filter_type
                    if filter_type == 'active':
                        base_query += " AND (p.is_banned IS FALSE OR p.is_banned IS NULL)"
                    elif filter_type == 'banned':
                        base_query += " AND p.is_banned IS TRUE"
                    elif filter_type == 'donors':
                        base_query += " AND d.id IS NOT NULL AND d.is_active IS TRUE"
                    elif filter_type == 'recipients':
                        base_query += " AND r.id IS NOT NULL AND r.is_active IS TRUE"

                    # Apply search filter
                    if search and search.strip():
                        term = f"%{search.strip().lower()}%"
                        base_query += " AND (LOWER(p.full_name) LIKE %s OR LOWER(p.username) LIKE %s OR LOWER(au.email) LIKE %s)"
                        params.extend([term, term, term])

                    # 1. Count total matching rows
                    count_sql = f"SELECT COUNT(DISTINCT p.id) as total {base_query};"
                    cursor.execute(count_sql, tuple(params))
                    total_count = cursor.fetchone()["total"]

                    # 2. Select paginated user data
                    select_sql = f"""
                        SELECT 
                            p.id,
                            p.full_name,
                            p.username,
                            au.email,
                            p.avatar_url,
                            p.phone,
                            p.is_banned,
                            p.ban_reason,
                            p.banned_at,
                            p.created_at,
                            (d.id IS NOT NULL AND d.is_active IS TRUE) as is_donor,
                            (r.id IS NOT NULL AND r.is_active IS TRUE) as is_recipient,
                            (a.id IS NOT NULL) as is_admin,
                            d.is_active as donor_active,
                            r.is_active as recipient_active,
                            d.blood_group,
                            d.total_donations,
                            d.total_points
                        {base_query}
                        ORDER BY COALESCE(au.last_sign_in_at, p.created_at) DESC
                        LIMIT %s OFFSET %s;
                    """
                    exec_params = list(params) + [limit, offset]
                    cursor.execute(select_sql, tuple(exec_params))
                    rows = cursor.fetchall()

                    users = [
                        {
                            "id": str(r["id"]),
                            "full_name": r["full_name"],
                            "username": r["username"],
                            "email": r["email"],
                            "avatar_url": r["avatar_url"],
                            "phone": r["phone"],
                            "is_banned": bool(r["is_banned"]),
                            "ban_reason": r["ban_reason"],
                            "banned_at": r["banned_at"].isoformat() if r["banned_at"] else None,
                            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                            "is_donor": bool(r["is_donor"]),
                            "is_recipient": bool(r["is_recipient"]),
                            "donor_active": bool(r["donor_active"]) if r["donor_active"] is not None else False,
                            "recipient_active": bool(r["recipient_active"]) if r["recipient_active"] is not None else False,
                            "roles": [
                                role for role, active in [
                                    ("admin", r["is_admin"]),
                                    ("donor", r["is_donor"]),
                                    ("recipient", r["is_recipient"])
                                ] if active
                            ] or ["user"],
                            "donor_stats": {
                                "blood_group": r["blood_group"],
                                "total_donations": r["total_donations"] if r["total_donations"] is not None else 0,
                                "total_points": r["total_points"] if r["total_points"] is not None else 0,
                            } if r["is_donor"] else None
                        }
                        for r in rows
                    ]

                    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

                    return {
                        "users": users,
                        "total_count": total_count,
                        "page": page,
                        "limit": limit,
                        "total_pages": total_pages
                    }
        except Exception as e:
            logger.error(f"Error fetching users in AdminService: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch users: {str(e)}"
            )

    @staticmethod
    async def ban_user(user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """
        Bans a target user, revokes active sessions, and logs ban notification.

        Calls 'ban_user' PL/pgSQL function via Supabase RPC.

        Args:
            user_id (str): Target user UUID to ban.
            admin_id (str): Banning admin UUID.
            reason (str): Reason for the ban.

        Returns:
            Dict[str, Any]: Result payload.
        """
        try:
            params = {
                'p_target_user_id': user_id,
                'p_admin_id': admin_id,
                'p_ban_reason': reason
            }
            response = supabase.rpc('ban_user', params).execute()
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {"success": True, "message": "User banned successfully."}
        except Exception as e:
            logger.error(f"Error banning user {user_id} by admin {admin_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to ban user: {str(e)}"
            )

    @staticmethod
    async def unban_user(user_id: str, admin_id: str) -> Dict[str, Any]:
        """
        Unbans a target user and sends a restoration notification.

        Calls 'unban_user' PL/pgSQL function via Supabase RPC.

        Args:
            user_id (str): Target user UUID to unban.
            admin_id (str): Unbanning admin UUID.

        Returns:
            Dict[str, Any]: Result payload.
        """
        try:
            params = {
                'p_target_user_id': user_id,
                'p_admin_id': admin_id
            }
            response = supabase.rpc('unban_user', params).execute()
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {"success": True, "message": "User unbanned successfully."}
        except Exception as e:
            logger.error(f"Error unbanning user {user_id} by admin {admin_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to unban user: {str(e)}"
            )

    @staticmethod
    async def remove_donor_role(user_id: str, admin_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Deactivates donor privileges for a user, updates application state, and sends notification.
        """
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    # 1. Check user exists and has donor record
                    cursor.execute(
                        "SELECT id, is_active FROM public.donors WHERE user_id = %s;",
                        (user_id,)
                    )
                    donor_row = cursor.fetchone()
                    if not donor_row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Donor record not found for this user."
                        )

                    # 2. Deactivate in public.donors
                    cursor.execute(
                        """
                        UPDATE public.donors 
                        SET is_active = FALSE, is_available = FALSE, updated_at = NOW() 
                        WHERE user_id = %s;
                        """,
                        (user_id,)
                    )

                    # 3. Update donor application status if exists
                    revocation_note = reason.strip() if reason and reason.strip() else "Donor privileges revoked by platform administration."
                    cursor.execute(
                        """
                        UPDATE public.donor_applications
                        SET status = 'rejected',
                            rejection_reason = %s,
                            reviewed_by = %s,
                            reviewed_at = NOW(),
                            updated_at = NOW()
                        WHERE user_id = %s;
                        """,
                        (
                            revocation_note,
                            admin_id,
                            user_id
                        )
                    )

                    # 4. Create notification for user
                    cursor.execute(
                        """
                        INSERT INTO public.notifications (user_id, title, message, type)
                        VALUES (%s, %s, %s, 'system');
                        """,
                        (
                            user_id,
                            "Donor Privileges Revoked",
                            revocation_note
                        )
                    )
                    db.commit()

            return {"success": True, "message": "Donor role removed successfully."}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error removing donor role for user {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove donor role: {str(e)}"
            )

    @staticmethod
    async def remove_recipient_role(user_id: str, admin_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Deactivates recipient privileges for a user and sends notification.
        """
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    # 1. Check user exists and has recipient record
                    cursor.execute(
                        "SELECT id, is_active FROM public.recipients WHERE user_id = %s;",
                        (user_id,)
                    )
                    rec_row = cursor.fetchone()
                    if not rec_row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Recipient record not found for this user."
                        )

                    # 2. Deactivate in public.recipients
                    cursor.execute(
                        """
                        UPDATE public.recipients 
                        SET is_active = FALSE, updated_at = NOW() 
                        WHERE user_id = %s;
                        """,
                        (user_id,)
                    )

                    # 3. Create notification for user
                    revocation_note = reason.strip() if reason and reason.strip() else "Your recipient requesting privileges have been deactivated by platform administrators."
                    cursor.execute(
                        """
                        INSERT INTO public.notifications (user_id, title, message, type)
                        VALUES (%s, %s, %s, 'system');
                        """,
                        (
                            user_id,
                            "Recipient Privileges Revoked",
                            revocation_note
                        )
                    )
                    db.commit()

            return {"success": True, "message": "Recipient role removed successfully."}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error removing recipient role for user {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove recipient role: {str(e)}"
            )

