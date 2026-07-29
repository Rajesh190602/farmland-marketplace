from app.utils.email import generate_otp, send_email_otp

otp = generate_otp()
print("Generated OTP:", otp)

result = send_email_otp("marthavasavi19@gmail.com", otp)
print("Result:", result)