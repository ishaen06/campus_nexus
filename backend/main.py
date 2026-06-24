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
    brevo_key  = os.getenv("BREVO_API_KEY", "")
    resend_key = os.getenv("RESEND_API_KEY", "")
    smtp_user  = os.getenv("SMTP_USERNAME", "")
    smtp_pass  = os.getenv("SMTP_PASSWORD", "")
    resend_from = os.getenv("RESEND_FROM", "")
    return {
        "BREVO_API_KEY_set": bool(brevo_key),
        "BREVO_API_KEY_prefix": brevo_key[:8] + "..." if len(brevo_key) > 8 else "(not set)",
        "RESEND_API_KEY_set": bool(resend_key),
        "RESEND_API_KEY_prefix": resend_key[:8] + "..." if len(resend_key) > 8 else "(not set)",
        "RESEND_FROM": resend_from if resend_from else "(using default: onboarding@resend.dev)",
        "SMTP_USERNAME_set": bool(smtp_user),
        "SMTP_USERNAME_value": smtp_user if smtp_user else "(not set)",
        "SMTP_PASSWORD_set": bool(smtp_pass),
        "SMTP_SERVER": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        "SMTP_PORT": os.getenv("SMTP_PORT", "587"),
        "env_keys_with_email": [k for k in os.environ.keys() if any(x in k.upper() for x in ["BREVO", "RESEND", "SMTP", "EMAIL", "MAIL"])],
    }

@app.get("/api/debug/test-email")
def test_email_send(to: str = "ishaen.vihaan@gmail.com"):
    """
    Sends a real test email using the unified send_email utility and returns status.
    Usage: /api/debug/test-email?to=yourtest@gmail.com
    """
    from utils import load_env, send_email
    load_env()

    result = {
        "to": to,
        "BREVO_API_KEY_set": bool(os.getenv("BREVO_API_KEY")),
        "RESEND_API_KEY_set": bool(os.getenv("RESEND_API_KEY")),
        "SMTP_USERNAME_set": bool(os.getenv("SMTP_USERNAME")),
        "success": False,
        "error": None,
    }

    try:
        send_email(
            to_email=to,
            subject="CampusNexus - Production Email Dispatch Test",
            body="This is a test email sent from the CampusNexus backend using the unified priority dispatcher.",
            html_body="<h2>CampusNexus</h2><p>This is a test email sent from the CampusNexus backend using the <b>unified priority dispatcher</b>.</p>"
        )
        result["success"] = True
    except Exception as e:
        import traceback
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()

    return result

