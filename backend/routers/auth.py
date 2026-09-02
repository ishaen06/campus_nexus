from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from jose import JWTError, jwt
import secrets

from database_mongo import get_mongo_db
from schemas import (
    UserCreate, UserLogin, UserOut, Token, UserRole,
    VerifyEmailRequest, ResendCodeRequest, AuthMessageResponse,
    RegisterInitRequest, SetPasswordWithTokenRequest, ValidateTokenResponse
)
from security import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM
from services.seed_data import seed_database

router = APIRouter(prefix="/api/auth", tags=["Authentication & Identity"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def format_user_out(user_doc: dict) -> UserOut:
    return UserOut(
        id=str(user_doc.get("_id")),
        email=user_doc.get("email"),
        username=user_doc.get("username"),
        full_name=user_doc.get("full_name"),
        role=user_doc.get("role", UserRole.DEVELOPER),
        avatar_url=user_doc.get("avatar_url"),
        team=user_doc.get("team", "Engineering"),
        email_verified=user_doc.get("email_verified", True),
        created_at=user_doc.get("created_at")
    )

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserOut:
    if not token:
        db = get_mongo_db()
        admin_doc = db.users.find_one({"role": "admin"}) or db.users.find_one({})
        if admin_doc:
            return format_user_out(admin_doc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token validation failed")
        
    db = get_mongo_db()
    try:
        user_doc = db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = None
        
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return format_user_out(user_doc)

@router.post("/register-init", response_model=AuthMessageResponse)
def register_init(reg_in: RegisterInitRequest):
    """Step 1: Register initial email and dispatch secure set-password link."""
    db = get_mongo_db()
    email_clean = reg_in.email.lower().strip()
    username_clean = (reg_in.username or email_clean.split("@")[0]).lower().strip()

    existing_user = db.users.find_one({"email": email_clean})
    if existing_user and existing_user.get("hashed_password") and existing_user.get("email_verified"):
        raise HTTPException(status_code=400, detail="An active account with this email already exists. Please log in.")

    # Generate secure URL-safe verification token (valid for 2 hours)
    verification_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=2)
    verification_link = f"http://localhost:5173/set-password?token={verification_token}&email={email_clean}"

    if existing_user:
        db.users.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {
                "full_name": reg_in.full_name.strip(),
                "username": username_clean,
                "role": reg_in.role.value,
                "team": reg_in.team or "Quality Assurance",
                "verification_token": verification_token,
                "verification_expires_at": expires_at,
                "email_verified": False
            }}
        )
        existing_user["verification_token"] = verification_token
        user_out = format_user_out(existing_user)
    else:
        doc = {
            "email": email_clean,
            "username": username_clean,
            "full_name": reg_in.full_name.strip(),
            "role": reg_in.role.value,
            "team": reg_in.team or "Quality Assurance",
            "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={username_clean}",
            "hashed_password": None,
            "email_verified": False,
            "verification_token": verification_token,
            "verification_expires_at": expires_at,
            "created_at": datetime.utcnow()
        }
        result = db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        user_out = format_user_out(doc)

    print(f"[EMAIL SIMULATOR] Password Setup Link for {email_clean}: {verification_link}")

    return AuthMessageResponse(
        message=f"Verification email sent to {email_clean}",
        email=email_clean,
        verification_link=verification_link,
        verification_token=verification_token,
        user=user_out
    )

@router.get("/validate-token", response_model=ValidateTokenResponse)
def validate_token(email: str, token: str):
    """Validate verification token from link before showing password form."""
    db = get_mongo_db()
    email_clean = email.lower().strip()
    token_clean = token.strip()

    user_doc = db.users.find_one({"email": email_clean})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")

    stored_token = user_doc.get("verification_token")
    expires_at = user_doc.get("verification_expires_at")

    if not stored_token or stored_token != token_clean:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link. Please request a new link.")

    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification link has expired. Please request a new one.")

    return ValidateTokenResponse(
        valid=True,
        email=email_clean,
        full_name=user_doc.get("full_name"),
        message="Verification token valid. You may set your password."
    )

@router.post("/set-password-with-token", response_model=Token)
def set_password_with_token(req: SetPasswordWithTokenRequest):
    """Set account password via verification link token and log in."""
    db = get_mongo_db()
    email_clean = req.email.lower().strip()
    token_clean = req.token.strip()

    user_doc = db.users.find_one({"email": email_clean})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")

    stored_token = user_doc.get("verification_token")
    expires_at = user_doc.get("verification_expires_at")

    if not stored_token or stored_token != token_clean:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification link has expired.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    # Hash and save password, mark user as verified
    hashed_pwd = get_password_hash(req.password)
    db.users.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {
            "hashed_password": hashed_pwd,
            "email_verified": True,
            "verification_token": None,
            "verification_expires_at": None
        }}
    )

    user_doc["hashed_password"] = hashed_pwd
    user_doc["email_verified"] = True
    user_out = format_user_out(user_doc)
    token = create_access_token({"sub": str(user_doc["_id"]), "role": user_doc.get("role", "developer")})

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.post("/resend-link", response_model=AuthMessageResponse)
def resend_link(resend_in: ResendCodeRequest):
    db = get_mongo_db()
    email_clean = resend_in.email.lower().strip()

    user_doc = db.users.find_one({"email": email_clean})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")

    new_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=2)
    verification_link = f"http://localhost:5173/set-password?token={new_token}&email={email_clean}"

    db.users.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"verification_token": new_token, "verification_expires_at": expires_at}}
    )

    print(f"[EMAIL SIMULATOR] Resent Password Setup Link for {email_clean}: {verification_link}")

    return AuthMessageResponse(
        message=f"New password setup link sent to {email_clean}",
        email=email_clean,
        verification_link=verification_link,
        verification_token=new_token,
        user=format_user_out(user_doc)
    )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin):
    db = get_mongo_db()
    identifier = login_in.email_or_username.lower().strip()

    user_doc = db.users.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })

    if not user_doc or not user_doc.get("hashed_password") or not verify_password(login_in.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password"
        )

    user_out = format_user_out(user_doc)
    token = create_access_token({"sub": str(user_doc["_id"]), "role": user_doc.get("role", "developer")})

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.post("/demo-login/{role_name}", response_model=Token)
def demo_login(role_name: str):
    db = get_mongo_db()
    role_map = {
        "admin": "admin",
        "dev": "developer",
        "lead_dev": "lead_dev",
        "qa": "qa_engineer",
        "qa_engineer": "qa_engineer",
        "reporter": "reporter"
    }
    target_role = role_map.get(role_name.lower(), "developer")
    user_doc = db.users.find_one({"role": target_role})
    if not user_doc:
        user_doc = db.users.find_one({})

    if not user_doc:
        raise HTTPException(status_code=404, detail="No demo personas found. Reseed database.")

    user_out = format_user_out(user_doc)
    token = create_access_token({"sub": str(user_doc["_id"]), "role": user_doc.get("role", "developer")})

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_users():
    db = get_mongo_db()
    users = list(db.users.find({}))
    return [format_user_out(u) for u in users]

@router.post("/reseed")
def reseed():
    db = get_mongo_db()
    seed_database(db)
    return {"message": "Database successfully reseeded with test records"}
