import asyncio
import logging
import smtplib
import ssl
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from app.config import settings
from app.database import get_db_connection

logger = logging.getLogger(__name__)


def _render_email_html(
    title: str,
    preheader: str,
    greeting: str,
    body_paragraphs: list[str],
    highlight_boxes: Optional[list[Dict[str, str]]] = None,
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
    badge_text: Optional[str] = None,
    badge_color: str = "#e11d48",
) -> str:
    """Renders a responsive, modern BloodPing branded HTML email template."""
    base_url = settings.FRONTEND_URL.rstrip('/')
    action_link = action_url if action_url else base_url

    paragraphs_html = "".join(
        f'<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">{p}</p>'
        for p in body_paragraphs
    )

    highlights_html = ""
    if highlight_boxes:
        boxes_content = "".join(
            f'''
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">{box.get('label', '')}</span>
                <p style="margin: 4px 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">{box.get('value', '')}</p>
            </div>
            '''
            for box in highlight_boxes
        )
        highlights_html = f'<div style="margin: 20px 0 24px;">{boxes_content}</div>'

    button_html = ""
    if action_label:
        button_html = f'''
        <div style="text-align: center; margin: 28px 0 12px;">
            <a href="{action_link}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
                {action_label}
            </a>
        </div>
        '''

    badge_html = ""
    if badge_text:
        badge_html = f'''
        <div style="display: inline-block; background-color: {badge_color}15; color: {badge_color}; border: 1px solid {badge_color}30; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
            {badge_text}
        </div>
        '''

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="display: none; max-height: 0px; overflow: hidden;">{preheader}</div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f1f5f9; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 32px 28px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
                                Blood<span style="color: #fecdd3;">Ping</span>
                            </h1>
                            <p style="margin: 6px 0 0; color: #ffe4e6; font-size: 13px; font-weight: 500; letter-spacing: 0.2px;">
                                Emergency Blood Donation Network
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 28px 24px;">
                            {badge_html}
                            <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800; line-height: 1.3;">
                                {title}
                            </h2>
                            <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #1e293b;">
                                Hello {greeting},
                            </p>
                            {paragraphs_html}
                            {highlights_html}
                            {button_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 28px; text-align: center;">
                            <p style="margin: 0 0 6px; font-size: 12px; color: #64748b; line-height: 1.5;">
                                This is an automated notification from <strong>BloodPing</strong>.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                To protect your privacy, never share sensitive medical details outside official channels.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def _send_smtp_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Synchronously connects to the configured SMTP server and dispatches an email.
    Safely handles unconfigured environments without crashing.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            f"SMTP is not configured (SMTP_USER or SMTP_PASSWORD empty). Email '{subject}' to <{to_email}> was not sent."
        )
        return False

    try:
        smtp_user = settings.SMTP_USER.strip()
        smtp_password = settings.SMTP_PASSWORD.strip()
        from_email = (settings.EMAILS_FROM_EMAIL.strip() if settings.EMAILS_FROM_EMAIL else None) or smtp_user
        from_header = f"{settings.EMAILS_FROM_NAME} <{from_email}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = to_email

        # Attach text and HTML versions
        plain_text = text_body if text_body else html_body.replace("<br>", "\n")
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Connect with SSL (port 465) or STARTTLS (port 587)
        if settings.SMTP_PORT == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=12) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
                if settings.SMTP_TLS:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                server.login(smtp_user, smtp_password)
                server.send_message(msg)

        logger.info(f"Email successfully sent to <{to_email}> with subject '{subject}'.")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to <{to_email}> via SMTP: {e}")
        return False


def dispatch_email_background(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Dispatches email in a separate background thread without blocking the caller."""
    thread = threading.Thread(
        target=_send_smtp_email,
        args=(to_email, subject, html_body, text_body),
        daemon=True
    )
    thread.start()


class EmailService:
    @staticmethod
    def get_user_contact_info(user_id: str) -> Optional[Dict[str, str]]:
        """Fetches user's full name and email from profiles and auth.users."""
        try:
            with get_db_connection() as db:
                with db.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT p.full_name, p.username, au.email 
                        FROM public.profiles p
                        JOIN auth.users au ON au.id = p.id
                        WHERE p.id = %s;
                        """,
                        (user_id,)
                    )
                    row = cursor.fetchone()
                    if row and row.get("email"):
                        return {
                            "full_name": row.get("full_name") or row.get("username") or "BloodPing User",
                            "email": row["email"]
                        }
        except Exception as e:
            logger.error(f"Error fetching user contact info for {user_id}: {e}")
        return None

    @staticmethod
    def send_donor_application_approved(to_email: str, full_name: str, blood_group: Optional[str] = None):
        """Notifies user that their donor application has been reviewed and approved."""
        subject = "🎉 Congratulations! Your BloodPing Donor Application is Approved"
        preheader = "Your donor application has been verified. You are now an approved BloodPing donor."
        title = "Your Donor Profile is Verified!"

        highlights = []
        if blood_group:
            highlights.append({"label": "Verified Blood Group", "value": blood_group})
        highlights.append({"label": "Status", "value": "Approved & Active"})

        html = _render_email_html(
            title=title,
            preheader=preheader,
            greeting=full_name,
            body_paragraphs=[
                "We are thrilled to inform you that our platform administrators have reviewed and approved your donor verification application.",
                "You are now an active donor on BloodPing! You will receive urgent notifications whenever a patient or hospital nearby requires emergency blood donations matching your blood group.",
                "Thank you for your willingness to step forward and save lives."
            ],
            highlight_boxes=highlights,
            action_url=f"{settings.FRONTEND_URL}/feed",
            action_label="Go to Donor Feed",
            badge_text="Application Approved",
            badge_color="#10b981",
        )
        dispatch_email_background(to_email, subject, html)

    @staticmethod
    def send_donor_application_rejected(to_email: str, full_name: str, reason: Optional[str] = None):
        """Notifies user that their donor application was rejected with a reason."""
        subject = "Update regarding your BloodPing Donor Application"
        preheader = "Important update on your recent BloodPing donor application."
        title = "Donor Application Update"

        highlights = []
        if reason:
            highlights.append({"label": "Reason Provided", "value": reason})

        html = _render_email_html(
            title=title,
            preheader=preheader,
            greeting=full_name,
            body_paragraphs=[
                "Thank you for submitting your verification details to BloodPing.",
                "After reviewing your application, our administrators were unable to verify your donor profile at this time.",
                "Please review the feedback above. If you have updated medical documents or would like to submit a revised application, you can do so anytime from your profile."
            ],
            highlight_boxes=highlights if highlights else None,
            action_url=f"{settings.FRONTEND_URL}/become-donor",
            action_label="Review Application",
            badge_text="Needs Attention",
            badge_color="#f59e0b",
        )
        dispatch_email_background(to_email, subject, html)

    @staticmethod
    def send_new_donor_response(
        to_email: str,
        recipient_name: str,
        donor_name: str,
        hospital_name: str,
        blood_group: str,
        request_id: Optional[str] = None
    ):
        """Notifies recipient that a verified donor has applied to fulfill their request."""
        subject = f"🩸 New Donor Response: {donor_name} has volunteered for your blood request!"
        preheader = f"{donor_name} responded to your request at {hospital_name}."
        title = "A Donor Has Stepped Forward!"

        highlights = [
            {"label": "Volunteer Donor", "value": donor_name},
            {"label": "Hospital / Location", "value": hospital_name},
            {"label": "Blood Group", "value": blood_group},
        ]

        html = _render_email_html(
            title=title,
            preheader=preheader,
            greeting=recipient_name,
            body_paragraphs=[
                f"Great news! <strong>{donor_name}</strong> has responded to your blood request.",
                "Please review the donor application promptly on BloodPing to verify details, coordinate arrival time, and proceed with donation.",
            ],
            highlight_boxes=highlights,
            action_url=f"{settings.FRONTEND_URL}/feed",
            action_label="View Donor in BloodPing",
            badge_text="New Response",
            badge_color="#e11d48",
        )
        dispatch_email_background(to_email, subject, html)

    @staticmethod
    def send_match_accepted_to_donor(
        to_email: str,
        donor_name: str,
        recipient_name: str,
        hospital_name: str,
        contact_number: Optional[str] = None
    ):
        """Notifies donor that the recipient accepted their offer to donate."""
        subject = f"✅ Your Donation Match for {hospital_name} Was Accepted!"
        preheader = f"{recipient_name} accepted your donation offer."
        title = "Donation Match Confirmed"

        highlights = [
            {"label": "Recipient", "value": recipient_name},
            {"label": "Hospital / Center", "value": hospital_name},
        ]
        if contact_number:
            highlights.append({"label": "Contact Number", "value": contact_number})

        html = _render_email_html(
            title=title,
            preheader=preheader,
            greeting=donor_name,
            body_paragraphs=[
                f"Your offer to donate blood at <strong>{hospital_name}</strong> has been accepted by {recipient_name}.",
                "Please head to the designated hospital or contact the recipient to finalize donation arrangements. Your generosity makes an immediate difference."
            ],
            highlight_boxes=highlights,
            action_url=f"{settings.FRONTEND_URL}/history",
            action_label="View Donation Details",
            badge_text="Match Accepted",
            badge_color="#10b981",
        )
        dispatch_email_background(to_email, subject, html)

    @staticmethod
    def send_test_email(to_email: str, user_name: str = "BloodPing User") -> bool:
        """Sends an immediate synchronous test email to verify SMTP credentials."""
        subject = "🧪 BloodPing Email Notification Test"
        preheader = "Your SMTP email configuration is active and working."
        title = "SMTP Setup Successful!"

        html = _render_email_html(
            title=title,
            preheader=preheader,
            greeting=user_name,
            body_paragraphs=[
                "Congratulations! This test email confirms that your Gmail / SMTP configuration for BloodPing is working properly.",
                "Transactional emails for donor applications, match responses, and emergency blood alerts are now active and ready to deliver in real time."
            ],
            highlight_boxes=[
                {"label": "SMTP Host", "value": settings.SMTP_HOST},
                {"label": "Delivery Status", "value": "Delivered successfully"},
            ],
            action_url=f"{settings.FRONTEND_URL}",
            action_label="Open BloodPing",
            badge_text="System Verified",
            badge_color="#10b981",
        )
        return _send_smtp_email(to_email, subject, html)
