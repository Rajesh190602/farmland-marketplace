import os
import random
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("RESEND_FROM")


def generate_otp():
    return str(random.randint(100000, 999999))


def send_email_otp(receiver_email, otp):
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [receiver_email],
            "subject": "Farmland Marketplace - Email Verification OTP",
            "html": f"""
                <h2>Email Verification</h2>
                <p>Your OTP is:</p>
                <h1>{otp}</h1>
                <p>This OTP is valid for 10 minutes.</p>
                <p>Do not share this OTP with anyone.</p>
                <br>
                <b>Farmland Marketplace Team</b>
            """
        })

        print("Email sent successfully.")
        return True

    except Exception as e:
        print("Email Error:", e)
        return False