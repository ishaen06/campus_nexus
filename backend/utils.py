import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    val = val.strip().strip("'\"")
                    os.environ[key.strip()] = val

def send_mock_email(to_email: str, subject: str, body: str):
    load_env()
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    if smtp_username and smtp_password:
        try:
            port = int(smtp_port)
            server = smtplib.SMTP(smtp_server, port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            server.send_message(msg)
            server.quit()
            print(f"REAL EMAIL SENT TO: {to_email}")
            return
        except Exception as e:
            print(f"Failed to send real email via SMTP: {e}")
            print("Falling back to print mock email.")

    # Fallback mock print
    print("=" * 50)
    print(f"MOCK EMAIL SENT TO: {to_email}")
    print(f"SUBJECT: {subject}")
    print(f"BODY:\n{body}")
    print("=" * 50)
