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

    # Check if user already exists
    user = db.users.find_one({"email": email})
    
    if not user:
        # If user does not exist, register them as a new user with no role initially
        new_user_id = get_next_sequence_value("users")
        avatar_config = None
        if picture:
            avatar_config = {"emoji": "👨‍💻", "bg": 0, "google_picture": picture}
            
        user = {
            "id": new_user_id,
            "usn": None,
            "email": email,
            "full_name": name,
            "branch": None,
            "year_of_study": None,
            "hashed_password": "",  # No password needed for Google OAuth
            "cycle": None,
            "is_mentor": True if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else None,      # Default admin as mentor role so they see dashboard
            "department": "Admin Office" if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else None,
            "post": "Chief Administrator" if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else None,
            "is_verified": True,     # Google emails are pre-verified
            "is_admin": True if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else False,
            "is_banned": False,
            "bio": "Platform Administrator account." if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else "",
            "interests": [],
            "goals": [],
            "avatar_config": avatar_config or ({"emoji": "🛡️", "bg": 2} if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"] else None)
        }
        db.users.insert_one(user)
    else:
        # Ensure user is marked verified
        update_fields = {}
        if not user.get("is_verified", False):
            update_fields["is_verified"] = True
            user["is_verified"] = True
            
        if email in ["ishaen.vihaan@gmail.com", "ishaensbethur.cs25@rvce.edu.in"]:
            if not user.get("is_admin", False):
                update_fields["is_admin"] = True
                user["is_admin"] = True
            if not user.get("is_mentor", False):
                update_fields["is_mentor"] = True
                user["is_mentor"] = True
                
        if update_fields:
            db.users.update_one({"email": email}, {"$set": update_fields})

    # Generate session access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

