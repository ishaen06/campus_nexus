from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import auth, users, connections, chat, communities, events, admin
import os

app = FastAPI(title="Engineering Link (EL) API")

# Ensure uploads directory exists and mount it
os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(communities.router, prefix="/api/communities", tags=["communities"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "Welcome to EL API"}

@app.get("/api/debug/email-config")
def debug_email_config():
    """Diagnostic endpoint to check email configuration (does NOT expose secrets)."""
    from utils import load_env
    load_env()
    resend_key = os.getenv("RESEND_API_KEY", "")
    smtp_user  = os.getenv("SMTP_USERNAME", "")
    smtp_pass  = os.getenv("SMTP_PASSWORD", "")
    resend_from = os.getenv("RESEND_FROM", "")
    return {
        "RESEND_API_KEY_set": bool(resend_key),
        "RESEND_API_KEY_prefix": resend_key[:8] + "..." if len(resend_key) > 8 else "(not set)",
        "RESEND_FROM": resend_from if resend_from else "(using default: onboarding@resend.dev)",
        "SMTP_USERNAME_set": bool(smtp_user),
        "SMTP_USERNAME_value": smtp_user if smtp_user else "(not set)",
        "SMTP_PASSWORD_set": bool(smtp_pass),
        "SMTP_SERVER": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        "SMTP_PORT": os.getenv("SMTP_PORT", "587"),
        "env_keys_with_email": [k for k in os.environ.keys() if any(x in k.upper() for x in ["RESEND", "SMTP", "EMAIL", "MAIL"])],
    }

@app.get("/api/debug/test-email")
def test_email_send(to: str = "ishaen.vihaan@gmail.com"):
    """
    Sends a real test email and returns the result as JSON.
    Usage: /api/debug/test-email?to=yourtest@gmail.com
    """
    import smtplib
    import traceback
    from utils import load_env
    load_env()

    smtp_server   = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port_str = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    result = {
        "to": to,
        "smtp_server": smtp_server,
        "smtp_port": smtp_port_str,
        "smtp_username_set": bool(smtp_username),
        "smtp_username": smtp_username,
        "smtp_password_set": bool(smtp_password),
        "success": False,
        "error": None,
        "error_type": None,
    }

    if not smtp_username or not smtp_password:
        result["error"] = "SMTP_USERNAME or SMTP_PASSWORD not set in environment"
        return result

    try:
        port = int(smtp_port_str)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_server, port, timeout=30)
        else:
            server = smtplib.SMTP(smtp_server, port, timeout=30)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_username, smtp_password)

        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        msg = MIMEMultipart('alternative')
        msg['From']    = f"Campus Nexus <{smtp_username}>"
        msg['To']      = to
        msg['Subject'] = "CampusNexus - Test Email (Debug)"
        msg.attach(MIMEText("This is a test email from CampusNexus backend. SMTP is working!", 'plain'))

        server.send_message(msg)
        server.quit()
        result["success"] = True

    except Exception as e:
        result["error"] = str(e)
        result["error_type"] = type(e).__name__
        result["traceback"] = traceback.format_exc()

    return result

