from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.auth import requireAuth
from app.database import get_db_connection
from app.services.email_service import EmailService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    success: bool = True
    payload: Optional[Any] = None
    message: str = ""


@router.get("/me", response_model=NotificationResponse)
async def get_my_notifications(user_id: str = Depends(requireAuth)):
    """
    Retrieve all notifications for the authenticated user ordered by creation time (newest first).
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, title, message, type, is_read, created_at
                    FROM public.notifications
                    WHERE user_id = %s
                    ORDER BY created_at DESC;
                    """,
                    (user_id,)
                )
                rows = cursor.fetchall()
                notifications = [
                    {
                        "id": str(r["id"]),
                        "user_id": str(r["user_id"]),
                        "title": r["title"],
                        "message": r["message"],
                        "type": r["type"],
                        "is_read": bool(r["is_read"]),
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    }
                    for r in rows
                ]
                return NotificationResponse(
                    success=True,
                    payload=notifications,
                    message="Notifications retrieved successfully.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notifications: {str(e)}",
        )


@router.patch("/mark-read", response_model=NotificationResponse)
async def mark_notifications_as_read(user_id: str = Depends(requireAuth)):
    """
    Mark all unread notifications as read for the authenticated user.
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.notifications
                    SET is_read = TRUE
                    WHERE user_id = %s AND is_read = FALSE;
                    """,
                    (user_id,)
                )
                db.commit()
                return NotificationResponse(
                    success=True,
                    payload=None,
                    message="All notifications marked as read.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notifications status: {str(e)}",
        )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_single_notification_as_read(notification_id: str, user_id: str = Depends(requireAuth)):
    """
    Mark a specific notification as read for the authenticated user.
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.notifications
                    SET is_read = TRUE
                    WHERE id = %s AND user_id = %s
                    RETURNING id;
                    """,
                    (notification_id, user_id)
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
                db.commit()
                return NotificationResponse(
                    success=True,
                    payload={"id": notification_id},
                    message="Notification marked as read.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}",
        )


@router.delete("/clear-all", response_model=NotificationResponse)
async def clear_all_notifications(user_id: str = Depends(requireAuth)):
    """
    Clear/delete all notifications for the authenticated user.
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM public.notifications
                    WHERE user_id = %s;
                    """,
                    (user_id,)
                )
                db.commit()
                return NotificationResponse(
                    success=True,
                    payload=None,
                    message="All notifications cleared.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear notifications: {str(e)}",
        )


@router.delete("/{notification_id}", response_model=NotificationResponse)
async def delete_notification(notification_id: str, user_id: str = Depends(requireAuth)):
    """
    Delete a specific notification for the authenticated user.
    """
    try:
        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM public.notifications
                    WHERE id = %s AND user_id = %s
                    RETURNING id;
                    """,
                    (notification_id, user_id)
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
                db.commit()
                return NotificationResponse(
                    success=True,
                    payload={"id": notification_id},
                    message="Notification deleted successfully.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}",
        )


class TestNotificationRequest(BaseModel):
    title: Optional[str] = "Live Notification Test"
    message: Optional[str] = "This is a real-time notification to test your live notification stack and sound!"
    type: Optional[str] = "system"


@router.post("/test", response_model=NotificationResponse)
async def create_test_notification(
    data: Optional[TestNotificationRequest] = None,
    user_id: str = Depends(requireAuth)
):
    """
    Generate a test notification for the authenticated user to verify live WebSocket and stack flow.
    """
    try:
        title = data.title if data and data.title else "Live Notification Test"
        message = data.message if data and data.message else "This is a real-time notification to test your live notification stack and sound!"
        notif_type = data.type if data and data.type in ['application_approved', 'application_rejected', 'account_banned', 'system'] else 'system'

        with get_db_connection() as db:
            with db.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO public.notifications (user_id, title, message, type)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, user_id, title, message, type, is_read, created_at;
                    """,
                    (user_id, title, message, notif_type)
                )
                row = cursor.fetchone()
                db.commit()
                created_notif = {
                    "id": str(row["id"]),
                    "user_id": str(row["user_id"]),
                    "title": row["title"],
                    "message": row["message"],
                    "type": row["type"],
                    "is_read": bool(row["is_read"]),
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                return NotificationResponse(
                    success=True,
                    payload=created_notif,
                    message="Test notification created successfully.",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test notification: {str(e)}",
        )


class TestEmailRequest(BaseModel):
    to_email: Optional[str] = None


@router.post("/test-email", response_model=NotificationResponse)
async def send_test_email_endpoint(
    data: Optional[TestEmailRequest] = None,
    user_id: str = Depends(requireAuth)
):
    """
    Sends a test email to verify SMTP / Gmail credentials.
    If 'to_email' is omitted, sends to the authenticated user's registered email address.
    """
    try:
        user_info = EmailService.get_user_contact_info(user_id)
        recipient_email = data.to_email if data and data.to_email else (user_info.get("email") if user_info else None)

        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient email could not be determined. Please pass 'to_email' in the request body."
            )

        user_name = user_info.get("full_name") if user_info else "BloodPing Member"
        sent = EmailService.send_test_email(to_email=recipient_email, user_name=user_name)

        if not sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send test email. Please check your SMTP credentials (SMTP_USER, SMTP_PASSWORD) in .env."
            )

        return NotificationResponse(
            success=True,
            payload={"delivered_to": recipient_email},
            message=f"Test email successfully sent to {recipient_email}.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending test email: {str(e)}",
        )


