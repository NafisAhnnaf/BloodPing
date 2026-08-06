from fastapi import Request, HTTPException, status

def require_auth(request: Request) -> str:
    """FastAPI Dependency that enforces user authentication.
    
    Verifies that the request state holds a valid user_id resolved by the JWT middleware.
    Returns the user_id if valid, or raises 401 Unauthorized.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token."
        )
    return user_id

# Alias matching both python casing styles
requireAuth = require_auth


def require_donor(request: Request) -> str:
    """Enforces that the user has a record in the public.donors table."""
    user_id = require_auth(request)
    
    from app.database import get_db_connection
    with get_db_connection() as db:
        with db.cursor() as cursor:
            cursor.execute("SELECT 1 FROM public.donors WHERE user_id = %s;", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Donor registration required."
                )
    return user_id

requireDonor = require_donor


def require_recipient(request: Request) -> str:
    """Enforces that the user has a record in the public.recipients table."""
    user_id = require_auth(request)
    
    from app.database import get_db_connection
    with get_db_connection() as db:
        with db.cursor() as cursor:
            cursor.execute("SELECT 1 FROM public.recipients WHERE user_id = %s;", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Recipient registration required."
                )
    return user_id

requireRecipient = require_recipient


def require_admin(request: Request) -> str:
    """Enforces that the user has a record in the public.admins table."""
    user_id = require_auth(request)
    
    from app.database import get_db_connection
    with get_db_connection() as db:
        with db.cursor() as cursor:
            cursor.execute("SELECT 1 FROM public.admins WHERE user_id = %s;", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Platform administrator privileges required."
                )
    return user_id

requireAdmin = require_admin

