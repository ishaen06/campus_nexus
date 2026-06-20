import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_SERVER   = "smtp.gmail.com"
SMTP_PORT     = 587
SMTP_USERNAME = "nexus2026.otp@gmail.com"
SMTP_PASSWORD = "yzfmvtrckywlgqxe"
TO_EMAIL      = "ishaen.vihaan@gmail.com"

print(f"[TEST] Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30)
    server.ehlo()
    server.starttls()
    server.ehlo()
    print("[TEST] TLS established. Logging in...")
    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    print("[TEST] Login successful!")

    msg = MIMEMultipart('alternative')
    msg['From']    = f"Campus Nexus <{SMTP_USERNAME}>"
    msg['To']      = TO_EMAIL
    msg['Subject'] = "OTP Test - CampusNexus Gmail SMTP"
    msg.attach(MIMEText("Your test OTP is: 999888", 'plain'))
    msg.attach(MIMEText("<h2>Campus Nexus</h2><p>Your OTP is: <b>999888</b></p>", 'html'))

    server.send_message(msg)
    server.quit()
    print(f"[TEST] SUCCESS: Email sent to {TO_EMAIL}")
except Exception as e:
    print(f"[TEST] FAILED: {type(e).__name__}: {e}")
