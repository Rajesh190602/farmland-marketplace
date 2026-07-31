import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SMTP_USERNAME = os.getenv("EMAIL_USER")
SMTP_PASSWORD = os.getenv("EMAIL_PASSWORD")

EMAIL_FROM = SMTP_USERNAME


def generate_otp():
    return str(random.randint(100000, 999999))


def send_email_otp(receiver_email, otp):
    try:
        subject = "Farmland Marketplace - Email Verification OTP"

        body = f"""
Hello,

Your OTP is: {otp}

This OTP is valid for 10 minutes.

Regards,
Farmland Marketplace Team
"""

        message = MIMEMultipart()
        message["From"] = EMAIL_FROM
        message["To"] = receiver_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))

        print("========== SMTP DEBUG ==========")
        print("SMTP Server:", SMTP_SERVER)
        print("SMTP Port:", SMTP_PORT)
        print("SMTP Username:", SMTP_USERNAME)
        print("Receiver:", receiver_email)
        print("Password Loaded:", SMTP_PASSWORD is not None)
        print("Password Length:", len(SMTP_PASSWORD) if SMTP_PASSWORD else 0)
        print("================================")

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as server:
            server.set_debuglevel(1)

            server.ehlo()
            server.starttls()
            server.ehlo()

            print("Logging in...")
            server.login(SMTP_USERNAME, SMTP_PASSWORD)

            print("Sending email...")
            server.sendmail(
                EMAIL_FROM,
                receiver_email,
                message.as_string()
            )

        print("Email sent successfully.")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print("SMTP Authentication Error:", e.smtp_code, e.smtp_error)
        return False

    except smtplib.SMTPException as e:
        print("SMTP Exception:", str(e))
        return False

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("General Email Error:", str(e))
        return False