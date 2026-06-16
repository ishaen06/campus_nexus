from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import Any

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import UserCreate, UserResponse, OTPVerify, Token
from security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from utils import generate_otp, send_mock_email

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db = Depends(get_mongo_db)):
    email_lower = user_in.email.lower().strip()
    if user_in.is_mentor:
        if not email_lower.endswith("@gmail.com"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mentor email addresses must end with @gmail.com"
            )
    else:
        if not (email_lower.endswith("@rvce.edu.in") or email_lower.endswith("@gmail.com")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student email addresses must end with @rvce.edu.in or @gmail.com"
            )
        
    # Check if user exists
    user_by_email = db.users.find_one({"email": user_in.email})
    if user_by_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_in.usn:
        user_by_usn = db.users.find_one({"usn": user_in.usn})
        if user_by_usn:
            raise HTTPException(status_code=400, detail="USN already registered")
        
    hashed_password = get_password_hash(user_in.password)
    new_user_id = get_next_sequence_value("users")
    
    new_user = {
        "id": new_user_id,
        "usn": user_in.usn,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "branch": user_in.branch,
        "year_of_study": user_in.year_of_study,
        "hashed_password": hashed_password,
        "cycle": user_in.cycle,
        "is_mentor": user_in.is_mentor,
        "is_verified": False,
        "is_admin": False,
        "is_banned": False,
        "bio": "",
        "interests": [],
        "goals": [],
        "avatar_config": None
    }
    
    db.users.insert_one(new_user)
    
    # Generate and send OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    otp_record = {
        "email": new_user["email"],
        "otp": otp,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    db.otp_codes.insert_one(otp_record)
    
    # Mock send email
    send_mock_email(
        to_email=new_user["email"],
        subject="Verify your EL Account",
        body=f"Your OTP for Engineering Link is: {otp}. It expires in 10 minutes."
    )
    
    # Clean output dictionary for serialization
    user_out = dict(new_user)
    user_out.pop("_id", None)
    return user_out

@router.post("/verify-otp")
def verify_otp(otp_data: OTPVerify, db = Depends(get_mongo_db)):
    # Master OTP bypass for development/testing
    if otp_data.otp == "123456":
        user = db.users.find_one({"email": otp_data.email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        db.users.update_one({"email": otp_data.email}, {"$set": {"is_verified": True}})
        return {"message": "Account verified successfully (Master OTP)"}

    import pymongo
    otp_record = db.otp_codes.find_one(
        {"email": otp_data.email, "otp": otp_data.otp},
        sort=[("created_at", pymongo.DESCENDING)]
    )
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    user = db.users.find_one({"email": otp_data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.users.update_one({"email": otp_data.email}, {"$set": {"is_verified": True}})
    db.otp_codes.delete_one({"_id": otp_record["_id"]})  # Clean up OTP after use
    
    return {"message": "Account verified successfully"}

from fastapi.security import OAuth2PasswordRequestForm

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_mongo_db)):
    # form_data.username will be used as email
    user = db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your email with OTP."
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import BaseModel, EmailStr

class ResendOTPRequest(BaseModel):
    email: EmailStr

@router.post("/resend-otp")
def resend_otp(payload: ResendOTPRequest, db = Depends(get_mongo_db)):
    email_lower = payload.email.lower().strip()
    user = db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="Account already verified")
        
    db.otp_codes.delete_many({"email": email_lower})
    
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    otp_record = {
        "email": email_lower,
        "otp": otp,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    db.otp_codes.insert_one(otp_record)
    
    send_mock_email(
        to_email=email_lower,
        subject="Verify your EL Account",
        body=f"Your new OTP for Engineering Link is: {otp}. It expires in 10 minutes."
    )
    return {"message": "OTP resent successfully"}

