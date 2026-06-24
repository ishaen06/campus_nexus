import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import json
import urllib.request
import urllib.error


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

def send_email_via_brevo(to_email: str, subject: str, body_text: str, html_body: str = None) -> bool:
    """Send email via Brevo (formerly Sendinblue) HTTPS API. Works on Render free tier."""
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        print("[BREVO] WARNING: BREVO_API_KEY not set.")
        return False

    sender_email = os.getenv("BREVO_SENDER_EMAIL", "nexus26@gmail.com")
    sender_name  = os.getenv("BREVO_SENDER_NAME", "Campus Nexus")

    key_preview = api_key[:8] + "..." if len(api_key) > 8 else "***"
    print(f"[BREVO] Sending email via Brevo API...")
    print(f"[BREVO] API Key prefix : {key_preview}")
    print(f"[BREVO] From           : {sender_name} <{sender_email}>")
    print(f"[BREVO] To             : {to_email}")

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept":       "application/json",
        "api-key":      api_key,
        "content-type": "application/json",
    }
    payload = {
        "sender":   {"name": sender_name, "email": sender_email},
        "to":       [{"email": to_email}],
        "subject":  subject,
        "textContent": body_text,
    }
    if html_body:
        payload["htmlContent"] = html_body

    try:
        data = json.dumps(payload).encode("utf-8")
        req  = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body    = response.read().decode("utf-8")
            status_code = response.getcode()
            print(f"[BREVO] SUCCESS (HTTP {status_code}): {res_body}")
            return True
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            error_body = "(could not read error body)"
        print(f"[BREVO] HTTP ERROR {e.code}: {e.reason}")
        print(f"[BREVO] Details: {error_body}")
        return False
    except Exception as e:
        print(f"[BREVO] ERROR: {type(e).__name__}: {e}")
        return False



def send_email_via_resend(to_email: str, subject: str, body_text: str, html_body: str = None) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("[RESEND API LOG] WARNING: RESEND_API_KEY is not set in environment.")
        print(f"[RESEND API LOG] All env keys: {[k for k in os.environ.keys() if 'RESEND' in k.upper() or 'SMTP' in k.upper() or 'EMAIL' in k.upper()]}")
        return False
        
    # Mask key for logging (show first 8 chars only)
    key_preview = api_key[:8] + "..." if len(api_key) > 8 else "***"
    print(f"[RESEND API LOG] Initializing email dispatch via Resend REST API...")
    print(f"[RESEND API LOG] API Key prefix: {key_preview}")
    print(f"[RESEND API LOG] Recipient: {to_email}")
    
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "CampusNexus/1.0"
    }
    
    # IMPORTANT: Resend free tier ONLY allows sending from 'onboarding@resend.dev'
    # To use a custom address (e.g. noreply@yourdomain.com), you must add and 
    # verify a custom domain in your Resend dashboard at https://resend.com/domains
    # Gmail addresses (e.g. campusnexes@gmail.com) CANNOT be used as Resend senders.
    from_address = os.getenv("RESEND_FROM", "Campus Nexus <onboarding@resend.dev>")
    print(f"[RESEND API LOG] From address: {from_address}")
    
    payload = {
        "from": from_address,
        "to": [to_email],
        "subject": subject,
        "text": body_text,
    }
    if html_body:
        payload["html"] = html_body
    
    # Log the full payload (minus HTML for brevity)
    log_payload = dict(payload)
    if "html" in log_payload:
        log_payload["html"] = f"<HTML {len(payload['html'])} chars>"
    print(f"[RESEND API LOG] Payload: {json.dumps(log_payload)}")
        
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        print("[RESEND API LOG] Posting request to Resend HTTPS endpoint...")
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            status_code = response.getcode()
            print(f"[RESEND API LOG] SUCCESS (HTTP {status_code}): Email sent. Response: {res_body}")
            return True
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            error_body = "(could not read error body)"
        print(f"[RESEND API LOG] HTTP ERROR {e.code}: {e.reason}")
        print(f"[RESEND API LOG] Error details: {error_body}")
        print(f"[RESEND API LOG] This usually means:")
        if e.code == 403:
            print(f"[RESEND API LOG]   - API key is invalid or revoked")
            print(f"[RESEND API LOG]   - OR the request was blocked by Cloudflare")
        elif e.code == 422:
            print(f"[RESEND API LOG]   - The 'from' address is not verified in Resend")
            print(f"[RESEND API LOG]   - You CANNOT send from Gmail addresses with Resend")
            print(f"[RESEND API LOG]   - Use 'onboarding@resend.dev' or add a verified domain")
        elif e.code == 401:
            print(f"[RESEND API LOG]   - API key is missing or malformed")
        return False
    except urllib.error.URLError as e:
        print(f"[RESEND API LOG] URL ERROR (network issue): {e.reason}")
        return False
    except Exception as e:
        print(f"[RESEND API LOG] UNEXPECTED ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    load_env()

    print(f"[EMAIL] ======= send_email() called =======")
    print(f"[EMAIL] To             : {to_email}")
    print(f"[EMAIL] SMTP_USERNAME  : {bool(os.getenv('SMTP_USERNAME'))}")
    print(f"[EMAIL] BREVO_API_KEY  : {bool(os.getenv('BREVO_API_KEY'))}")
    print(f"[EMAIL] RESEND_API_KEY : {bool(os.getenv('RESEND_API_KEY'))}")

    # 1. PRIMARY: Brevo HTTPS API (recommended, works on all clouds)
    if os.getenv("BREVO_API_KEY"):
        print("[EMAIL] Trying Brevo API (primary)...")
        if send_email_via_brevo(to_email, subject, body, html_body):
            print("[EMAIL] SUCCESS via Brevo.")
            return
        print("[EMAIL] Brevo failed, trying Resend...")

    # 2. SECONDARY: Resend HTTPS API
    if os.getenv("RESEND_API_KEY"):
        print("[EMAIL] Trying Resend API (secondary)...")
        if send_email_via_resend(to_email, subject, body, html_body):
            print("[EMAIL] SUCCESS via Resend.")
            return
        print("[EMAIL] Resend also failed, trying SMTP...")

    # 3. FALLBACK: Gmail SMTP (may be blocked on Render/Heroku outbound port 587)
    smtp_server   = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port     = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if smtp_username and smtp_password:
        print(f"[EMAIL] Trying Gmail SMTP (fallback): {smtp_server}:{smtp_port}...")
        try:
            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_server, port, timeout=30)
            else:
                server = smtplib.SMTP(smtp_server, port, timeout=30)
                server.ehlo()
                server.starttls()
                server.ehlo()
            server.login(smtp_username, smtp_password)
            msg = MIMEMultipart('alternative')
            msg['From']    = f"Campus Nexus <{smtp_username}>"
            msg['To']      = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            if html_body:
                msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            server.send_message(msg)
            server.quit()
            print(f"[EMAIL] SUCCESS via Gmail SMTP to {to_email}")
            return
        except Exception as e:
            print(f"[EMAIL] Gmail SMTP ERROR: {type(e).__name__}: {e}")

    # 4. Last resort - print to logs
    print("=" * 50)
    print(f"MOCK EMAIL TO: {to_email}")
    print(f"SUBJECT: {subject}")
    print(f"BODY: {body}")
    print("=" * 50)

