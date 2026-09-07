import random
import os
from html import escape

from dotenv import load_dotenv
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_NAME = os.getenv("SENDER_NAME")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = BREVO_API_KEY

api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)


def generate_otp():
    return str(random.randint(100000, 999999))


def send_email_otp(receiver_email, otp):
    try:
        subject = "Farmland Marketplace - Email Verification OTP"
        body = f"""
        <html>
        <body>
            <h2>🌾 Farmland Marketplace</h2>
            <p>Hello,</p>
            <p>Your OTP is:</p>
            <h1 style="color:green;">{otp}</h1>
            <p>This OTP is valid for <b>10 minutes</b>.</p>
            <br>
            <p>Regards,<br>
            Farmland Marketplace Team</p>
        </body>
        </html>
        """
        email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            to=[{"email": receiver_email}],
            subject=subject,
            html_content=body
        )
        api_instance.send_transac_email(email)
        print("✅ OTP Email Sent Successfully")
        return True
    except ApiException as e:
        print("Brevo API Error:", e)
        return False
    except Exception as e:
        print("General Email Error:", e)
        return False


def send_notification_email(receiver_email, receiver_name, title, message):
    """Send an application notification email through the existing Brevo setup."""
    if not receiver_email or not BREVO_API_KEY or not SENDER_EMAIL:
        return False

    try:
        safe_name = escape(receiver_name or "there")
        safe_title = escape(title or "Farmland Marketplace Notification")
        safe_message = escape(message or "").replace("\n", "<br>")

        body = f"""
        <html>
        <body style="font-family:Arial,sans-serif;line-height:1.6;color:#243024;">
            <h2 style="color:#2e7d32;">🌾 Farmland Marketplace</h2>
            <p>Hello {safe_name},</p>
            <h3>{safe_title}</h3>
            <p>{safe_message}</p>
            <p>Please sign in to Farmland Marketplace to view the notification and take any required action.</p>
            <br>
            <p>Regards,<br>Farmland Marketplace Team</p>
        </body>
        </html>
        """

        email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            to=[{"email": receiver_email}],
            subject=f"Farmland Marketplace - {title}",
            html_content=body
        )
        api_instance.send_transac_email(email)
        print(f"✅ Notification Email Sent: {receiver_email}")
        return True
    except ApiException as e:
        print("Brevo API Error:", e)
        return False
    except Exception as e:
        print("General Notification Email Error:", e)
        return False
