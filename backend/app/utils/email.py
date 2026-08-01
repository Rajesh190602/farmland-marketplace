import random
import os

from dotenv import load_dotenv
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

# ==============================
# Load Environment Variables
# ==============================

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_NAME = os.getenv("SENDER_NAME")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")

# ==============================
# Configure Brevo
# ==============================

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = BREVO_API_KEY

api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)

# ==============================
# Generate OTP
# ==============================

def generate_otp():
    return str(random.randint(100000, 999999))

# ==============================
# Send OTP
# ==============================

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
            sender={
                "name": SENDER_NAME,
                "email": SENDER_EMAIL
            },
            to=[
                {
                    "email": receiver_email
                }
            ],
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