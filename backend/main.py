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
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    resend_from = os.getenv("RESEND_FROM", "")
    return {
        "RESEND_API_KEY_set": bool(resend_key),
        "RESEND_API_KEY_prefix": resend_key[:8] + "..." if len(resend_key) > 8 else "(not set)",
        "RESEND_FROM": resend_from if resend_from else "(using default: onboarding@resend.dev)",
        "SMTP_USERNAME_set": bool(smtp_user),
        "SMTP_PASSWORD_set": bool(smtp_pass),
        "SMTP_SERVER": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        "SMTP_PORT": os.getenv("SMTP_PORT", "587"),
        "env_keys_with_email": [k for k in os.environ.keys() if any(x in k.upper() for x in ["RESEND", "SMTP", "EMAIL", "MAIL"])],
    }
