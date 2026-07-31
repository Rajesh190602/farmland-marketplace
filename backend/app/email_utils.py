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

# Generate 6-digit OTP
def generate_otp():
    return str(random.randint(100000, 999999))


# Send OTP Email
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

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()

            print("SMTP_USERNAME:", repr(SMTP_USERNAME))
            print("SMTP_PASSWORD length:", len(SMTP_PASSWORD) if SMTP_PASSWORD else 0)

            server.login(SMTP_USERNAME, SMTP_PASSWORD)

            server.sendmail(
                EMAIL_FROM,
                receiver_email,
                message.as_string()
            )

        print("Email sent successfully.")
        return True

    except Exception as e:
        print("Email Error:", e)
        return False