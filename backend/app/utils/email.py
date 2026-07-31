import os
import random
import smtplib
import traceback
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# SMTP Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM")

print("SMTP_SERVER:", SMTP_SERVER)
print("SMTP_PORT:", SMTP_PORT)
print("SMTP_USERNAME:", SMTP_USERNAME)
print("EMAIL_FROM:", EMAIL_FROM)
print("SMTP_PASSWORD loaded:", SMTP_PASSWORD is not None)
print("SMTP_PASSWORD length:", len(SMTP_PASSWORD) if SMTP_PASSWORD else 0)
print("SMTP_SERVER ENV:", os.getenv("SMTP_SERVER"))
print("SMTP_SERVER USED:", SMTP_SERVER)


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

        print("\n========== SMTP DEBUG ==========")
        print("SMTP Server:", SMTP_SERVER)
        print("SMTP Port:", SMTP_PORT)
        print("SMTP Username:", SMTP_USERNAME)
        print("Receiver:", receiver_email)
        print("================================")

        print("\n========== NETWORK TEST ==========")

        tests = [
            ("smtp.gmail.com", 587),
            ("smtp.gmail.com", 465),
            ("google.com", 443),
        ]

        for host, port in tests:
            try:
                ip = socket.gethostbyname(host)
                print(f"{host} resolved to {ip}")

                sock = socket.create_connection((host, port), timeout=10)
                sock.close()

                print(f"SUCCESS: Connected to {host}:{port}")

            except Exception as e:
                print(f"FAILED: {host}:{port} -> {repr(e)}")

        print("==================================\n")

        print("Connecting to Gmail SMTP...")

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

        print("✅ Email sent successfully.")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print("SMTP Authentication Error:", e.smtp_code, e.smtp_error)
        return False

    except smtplib.SMTPException as e:
        print("SMTP Exception:", str(e))
        traceback.print_exc()
        return False

    except Exception as e:
        traceback.print_exc()
        print("General Email Error:", repr(e))
        return False