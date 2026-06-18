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

def get_otp_html_template(otp: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }}
    .container {{
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #000814 0%, #001d3d 100%);
      padding: 32px;
      text-align: center;
    }}
    .logo {{
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }}
    .logo span {{
      color: #818cf8;
    }}
    .content {{
      padding: 40px 32px;
      color: #334155;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }}
    p {{
      font-size: 15px;
      line-height: 24px;
      margin: 0 0 24px 0;
    }}
    .otp-container {{
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #1e3a8a;
      margin: 0;
    }}
    .warning-text {{
      font-size: 13px;
      color: #64748b;
      line-height: 20px;
      margin-bottom: 0;
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }}
    .footer-text {{
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      line-height: 18px;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 class="logo">Campus<span>Nexus</span></h2>
      </div>
      <div class="content">
        <h1>Verify Your Account</h1>
        <p>Thank you for registering on Campus Nexus. Use the verification code below to activate your account and complete your profile setup:</p>
        <div class="otp-container">
          <h2 class="otp-code">{otp}</h2>
        </div>
        <p class="warning-text">⚠️ This code is valid for 10 minutes. If you did not request this code, please ignore this email or secure your account.</p>
      </div>
      <div class="footer">
        <p class="footer-text">© 2026 Campus Nexus. All rights reserved.<br>Empowering academic collaborations.</p>
      </div>
    </div>
  </div>
</body>
</html>"""

def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    load_env()
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    print("[SMTP LOG] Initializing email dispatch...")
    print(f"[SMTP LOG] Recipient: {to_email}")
    print(f"[SMTP LOG] Configured Server: {smtp_server}:{smtp_port}")
    print(f"[SMTP LOG] Configured Username: {smtp_username}")
    
    if smtp_username and smtp_password:
        try:
            port = int(smtp_port)
            print(f"[SMTP LOG] Connecting to server {smtp_server} on port {port}...")
            
            if port == 465:
                print("[SMTP LOG] Using SSL (smtplib.SMTP_SSL)...")
                server = smtplib.SMTP_SSL(smtp_server, port)
            else:
                print("[SMTP LOG] Using TLS (smtplib.SMTP)...")
                server = smtplib.SMTP(smtp_server, port)
                print("[SMTP LOG] Starting TLS handshake...")
                server.starttls()
                
            print("[SMTP LOG] Attempting login...")
            server.login(smtp_username, smtp_password)
            print("[SMTP LOG] Login successful.")
            
            # Use alternative format for HTML support
            msg = MIMEMultipart('alternative')
            msg['From'] = smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach plain text fallback
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach HTML content
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            print("[SMTP LOG] Sending message...")
            server.send_message(msg)
            server.quit()
            print(f"[SMTP LOG] SUCCESS: REAL EMAIL SENT TO: {to_email}")
            return
        except Exception as e:
            print(f"[SMTP LOG] ERROR: Failed to send real email via SMTP: {e}")
            print("[SMTP LOG] Fallback: printing mock email instead.")
    else:
        print("[SMTP LOG] WARNING: SMTP_USERNAME or SMTP_PASSWORD is not set.")
        print("[SMTP LOG] Fallback: printing mock email instead.")

    # Fallback mock print
    print("=" * 50)
    print(f"MOCK EMAIL SENT TO: {to_email}")
    print(f"SUBJECT: {subject}")
    print(f"BODY:\n{body}")
    if html_body:
        print(f"HTML BODY ENABLED (length: {len(html_body)} characters)")
    print("=" * 50)
