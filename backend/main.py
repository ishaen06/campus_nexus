from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from routers import auth, users, connections, chat, communities, events, admin, notifications
import os, traceback

app = FastAPI(title="Engineering Link (EL) API")

@app.on_event("startup")
async def startup_event():
    from database_mongo import init_db
    init_db()

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

# Global error handler — ensures all unhandled exceptions return JSON with detail
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}", "traceback": tb[-1500:]}
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(communities.router, prefix="/api/communities", tags=["communities"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.get("/")
def read_root():
    return {"message": "Welcome to EL API"}

@app.get("/api/ping")
def ping():
    """Lightweight keepalive — used to wake Render from cold sleep before requests."""
    return {"status": "ok"}

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
    Diagnostic endpoint to test and compare multiple email methods (SMTP 587, SMTPS 465, Brevo).
    """
    import smtplib
    import traceback
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from utils import load_env, send_email_via_brevo
    load_env()

    results = {
        "to": to,
        "smtp_587": {"success": False, "error": None},
        "smtp_465": {"success": False, "error": None},
        "brevo": {"success": False, "error": None},
    }

    # 1. Test Brevo
    try:
        if send_email_via_brevo(to, "CampusNexus - Brevo Test", "Test via Brevo"):
            results["brevo"]["success"] = True
        else:
            results["brevo"]["error"] = "Brevo helper returned False"
    except Exception as e:
        results["brevo"]["error"] = f"{type(e).__name__}: {e}"

    # SMTP credentials
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_user   = os.getenv("SMTP_USERNAME", "")
    smtp_pass   = os.getenv("SMTP_PASSWORD", "")

    # 2. Test SMTP 587
    if smtp_user and smtp_pass:
        try:
            server = smtplib.SMTP(smtp_server, 587, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Campus Nexus <{smtp_user}>"
            msg['To'] = to
            msg['Subject'] = "CampusNexus - SMTP 587 Test"
            msg.attach(MIMEText("Test via SMTP 587", 'plain'))
            server.send_message(msg)
            server.quit()
            results["smtp_587"]["success"] = True
        except Exception as e:
            results["smtp_587"]["error"] = f"{type(e).__name__}: {e}"

        # 3. Test SMTP 465 (SSL)
        try:
            server = smtplib.SMTP_SSL(smtp_server, 465, timeout=10)
            server.login(smtp_user, smtp_pass)
            
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Campus Nexus <{smtp_user}>"
            msg['To'] = to
            msg['Subject'] = "CampusNexus - SMTP 465 Test"
            msg.attach(MIMEText("Test via SMTP 465", 'plain'))
            server.send_message(msg)
            server.quit()
            results["smtp_465"]["success"] = True
        except Exception as e:
            results["smtp_465"]["error"] = f"{type(e).__name__}: {e}"
    else:
        results["smtp_587"]["error"] = "No SMTP credentials set"
        results["smtp_465"]["error"] = "No SMTP credentials set"

    return results

