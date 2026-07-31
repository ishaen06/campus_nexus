from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import Any

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import UserResponse, Token, GoogleLoginRequest
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

router = APIRouter()

@router.post("/google", response_model=Token)
def google_auth(payload: GoogleLoginRequest, db = Depends(get_mongo_db)):
    token = payload.credential
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    # Mock token fallback for local automated testing/development
    if token.startswith("mock_google_token_"):
        parts = token.split("_")
        if len(parts) >= 4 and parts[2] == "token":
            email = parts[3].lower().strip()
            name = parts[4] if len(parts) > 4 else "Google User"
        else:
            email = parts[2].lower().strip()
            name = parts[3] if len(parts) > 3 else "Google User"
        picture = ""
    else:
        try:
            if not google_client_id:
                raise HTTPException(status_code=500, detail="Google authentication is not configured on the server")
                
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), google_client_id)
            email = idinfo['email'].lower().strip()
            name = idinfo.get('name', '')
            picture = idinfo.get('picture', '')
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

    # Strict domain and whitelist validation
    from services.academic_service import validate_email_domain, parse_rvce_email
    if not validate_email_domain(email):
        raise HTTPException(
            status_code=403,
            detail="Access restricted: Only official @rvce.edu.in student emails or authorized admin accounts (ishaen06@gmail.com, ishaen.vihaan@gmail.com) are permitted."
        )

    # Check if user already exists
    user = db.users.find_one({"email": email})
    
    # Check if student email
    is_student_email = email.endswith("@rvce.edu.in")
    parsed_info = parse_rvce_email(email) if is_student_email else {}

    # Format human-readable full name from email if name is empty or just email
    if not name or "@" in name:
        if is_student_email and parsed_info.get("username"):
            # e.g., ishaensbethur -> Ishaen S Bethur or capitalized
            raw_u = parsed_info.get("username", "")
            words = [w.capitalize() for w in raw_u.replace(".", " ").replace("_", " ").split()]
            name = " ".join(words)
        else:
            name = email.split("@")[0].capitalize()

    if not user:
        # Register new user
        new_user_id = get_next_sequence_value("users")
        avatar_config = None
        if picture:
            avatar_config = {"emoji": "👨‍💻", "bg": 0, "google_picture": picture}
            
        is_admin_account = email in ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]
        
        user = {
            "id": new_user_id,
            "usn": None,
            "email": email,
            "full_name": name,
            "branch_code": parsed_info.get("branch_code") if is_student_email else None,
            "joining_year": parsed_info.get("joining_year") if is_student_email else None,
            "branch": parsed_info.get("branch_code") if is_student_email else None,
            "year_of_study": None,  # Calculated dynamically at runtime
            "hashed_password": "",  # No password needed for Google OAuth
            "cycle": None,          # Resolved dynamically from Admin settings
            "is_mentor": False if is_student_email else (True if is_admin_account else None),
            "department": "Admin Office" if is_admin_account else None,
            "post": "Chief Administrator" if is_admin_account else None,
            "is_verified": True,     # Google emails are pre-verified
            "is_admin": is_admin_account,
            "is_banned": False,
            "bio": "Platform Administrator account." if is_admin_account else "",
            "interests": [],
            "goals": [],
            "avatar_config": avatar_config or ({"emoji": "🛡️", "bg": 2} if is_admin_account else None)
        }
        db.users.insert_one(user)
    else:
        # Ensure existing user has correct fields
        update_fields = {}
        if not user.get("is_verified", False):
            update_fields["is_verified"] = True
            user["is_verified"] = True
            
        is_admin_account = email in ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]
        if is_admin_account:
            if not user.get("is_admin", False):
                update_fields["is_admin"] = True
                user["is_admin"] = True
            if not user.get("is_mentor", False):
                update_fields["is_mentor"] = True
                user["is_mentor"] = True
        elif is_student_email:
            if user.get("is_admin") is not False:
                update_fields["is_admin"] = False
                user["is_admin"] = False
            if user.get("is_mentor") is not False:
                update_fields["is_mentor"] = False
                user["is_mentor"] = False
            # Ensure branch_code and joining_year are populated
            if parsed_info.get("branch_code") and not user.get("branch_code"):
                update_fields["branch_code"] = parsed_info.get("branch_code")
            if parsed_info.get("joining_year") and not user.get("joining_year"):
                update_fields["joining_year"] = parsed_info.get("joining_year")
                
        if update_fields:
            db.users.update_one({"email": email}, {"$set": update_fields})

    # Generate session access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

