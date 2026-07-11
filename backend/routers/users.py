from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

from database_mongo import get_mongo_db, get_next_sequence_value, MongoUser
from schemas import UserResponse, ProfileUpdate, DiscoveryUserResponse, ReportCreate
from security import SECRET_KEY, ALGORITHM
from ai_service import calculate_compatibility

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_mongo_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid auth credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid auth credentials")
        
    user = db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Your account has been banned due to policy violations.")
        
    # Mark user as active/online
    from security import mark_user_active
    mark_user_active(user["id"])
    
    # We clean it so returned dict doesn't have _id
    user_clean = dict(user)
    user_clean.pop("_id", None)
    return user_clean

@router.get("/me", response_model=UserResponse)
def get_me(current_user = Depends(get_current_user)):
    return current_user

@router.put("/me/profile", response_model=UserResponse)
def update_profile(profile_data: ProfileUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    update_data = {}
    
    # Determine role (either currently in DB or being set now)
    is_mentor = current_user.get("is_mentor")
    
    # Strictly assign as student if email ends with @rvce.edu.in
    user_email = current_user.get("email", "").lower().strip()
    if user_email.endswith("@rvce.edu.in"):
        if profile_data.is_mentor is True:
            raise HTTPException(status_code=400, detail="Users with @rvce.edu.in email addresses are strictly assigned as students and cannot choose the mentor role.")
        is_mentor = False
        update_data["is_mentor"] = False
    
    # If role is not set yet in DB, allow setting it once
    elif is_mentor is None:
        if profile_data.is_mentor is not None:
            is_mentor = profile_data.is_mentor
            update_data["is_mentor"] = is_mentor
            
    if is_mentor is True:
        if profile_data.department is not None:
            dep_clean = profile_data.department.strip()
            if not dep_clean:
                raise HTTPException(status_code=400, detail="Department cannot be empty")
            update_data["department"] = dep_clean
            
        if profile_data.post is not None:
            post_clean = profile_data.post.strip()
            if not post_clean:
                raise HTTPException(status_code=400, detail="Post/Designation cannot be empty")
            update_data["post"] = post_clean
            
        # Ensure student fields are cleared
        update_data["usn"] = None
        update_data["branch"] = None
        update_data["year_of_study"] = None
        update_data["cycle"] = None
        update_data["interests"] = None
        update_data["goals"] = None
        
    elif is_mentor is False:
        if profile_data.usn is not None:
            usn_clean = profile_data.usn.strip().lower()
            if usn_clean:
                import re
                pattern = re.compile(r"^(1rv|1rz)\d{2}[a-z]{2,3}\d{3}$", re.IGNORECASE)
                if not pattern.match(usn_clean):
                    raise HTTPException(status_code=400, detail="USN must start with '1rv' or '1rz', have 2-digit year, 2 to 3 letter branch, and end with a 3-digit number (e.g. 1RV22CS001)")
                
                existing = db.users.find_one({
                    "usn": {"$regex": f"^{usn_clean}$", "$options": "i"},
                    "id": {"$ne": current_user["id"]}
                })
                if existing:
                    raise HTTPException(status_code=400, detail="USN already registered")
                
                update_data["usn"] = profile_data.usn.upper()
            else:
                update_data["usn"] = None
                
        if profile_data.branch is not None:
            update_data["branch"] = profile_data.branch
        if profile_data.year_of_study is not None:
            update_data["year_of_study"] = profile_data.year_of_study
        if profile_data.interests is not None:
            update_data["interests"] = profile_data.interests
        if profile_data.goals is not None:
            update_data["goals"] = profile_data.goals
        if profile_data.cycle is not None:
            update_data["cycle"] = profile_data.cycle
            
        # Ensure mentor fields are cleared
        update_data["department"] = None
        update_data["post"] = None

    if profile_data.bio is not None:
        update_data["bio"] = profile_data.bio
    if profile_data.avatar_config is not None:
        update_data["avatar_config"] = profile_data.avatar_config
        
    if update_data:
        db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
        
    updated_user = db.users.find_one({"id": current_user["id"]})
    updated_user.pop("_id", None)
    return updated_user

@router.get("/discovery", response_model=List[DiscoveryUserResponse])
def get_discovery(
    branch: Optional[str] = None,
    year_of_study: Optional[int] = None,
    current_user = Depends(get_current_user), 
    db = Depends(get_mongo_db)
):
    # Filter out users we're already connected with
    connected_list = []
    connections = list(db.connections.find({
        "$or": [
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]
    }))
    for conn in connections:
        connected_list.append(conn["sender_id"])
        connected_list.append(conn["receiver_id"])

    # Filter out blocked users (both ways)
    blocked_list = []
    blocks = list(db.blocked_users.find({
        "$or": [
            {"blocker_id": current_user["id"]},
            {"blocked_id": current_user["id"]}
        ]
    }))
    for b in blocks:
        blocked_list.append(b["blocker_id"])
        blocked_list.append(b["blocked_id"])

    # Filter out users who are already in a mentor-approved group
    approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
    approved_group_ids = [g["id"] for g in approved_groups]
    approved_members = list(db.group_members.find({"group_id": {"$in": approved_group_ids}}))
    approved_member_ids = [m["user_id"] for m in approved_members]

    # Combine all exclusions (do NOT exclude dismissed_list so rejected students can reappear)
    exclude_ids = list(set([current_user["id"]] + connected_list + blocked_list + approved_member_ids))

    # Base query
    query_filter = {
        "id": {"$nin": exclude_ids},
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False
    }
    
    # Apply smart cycle matchmaking filter if user is a team admin
    active_teams = list(db.group_chats.find({"created_by": current_user["id"]}))
    if active_teams:
        for team in active_teams:
            member_records = list(db.group_members.find({"group_id": team["id"]}))
            member_ids = [m["user_id"] for m in member_records]
            if member_ids:
                member_users = list(db.users.find({"id": {"$in": member_ids}}))
                p_count = 0
                c_count = 0
                for mu in member_users:
                    if mu.get("is_mentor"):
                        continue
                    cycle = (mu.get("cycle") or "").strip().upper()
                    if cycle == "P":
                        p_count += 1
                    elif cycle == "C":
                        c_count += 1
                
                if p_count > c_count:
                    query_filter["cycle"] = "C"
                    break
                elif c_count > p_count:
                    query_filter["cycle"] = "P"
                    break

    if branch:
        query_filter["branch"] = branch
    if year_of_study:
        query_filter["year_of_study"] = year_of_study
        
    users = list(db.users.find(query_filter).limit(20))
    
    discovery_feed = []
    current_user_obj = MongoUser(current_user)
    
    for u in users:
        u_obj = MongoUser(u)
        ai_data = calculate_compatibility(current_user_obj, u_obj)
        user_dict = dict(u)
        user_dict.pop("_id", None)
        user_dict["is_online"] = u_obj.is_online
        
        # We still sort by score, but don't expose it to the user.
        score = ai_data.get("score") if ai_data else 0
        discovery_feed.append((user_dict, score))
        
    discovery_feed.sort(key=lambda x: x[1] or 0, reverse=True)
    return [user for user, score in discovery_feed]

@router.post("/{user_id}/report")
def report_user(user_id: int, report_data: ReportCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
        
    reported_user = db.users.find_one({"id": user_id})
    if not reported_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_report_id = get_next_sequence_value("reports")
    new_report = {
        "id": new_report_id,
        "reporter_id": current_user["id"],
        "reported_id": user_id,
        "reason": report_data.reason,
        "created_at": datetime.utcnow()
    }
    db.reports.insert_one(new_report)
    return {"message": "Report submitted successfully"}

@router.post("/{user_id}/block")
def block_user(user_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if already blocked
    existing_block = db.blocked_users.find_one({
        "blocker_id": current_user["id"],
        "blocked_id": user_id
    })
    if existing_block:
        return {"message": "User is already blocked"}
        
    new_block_id = get_next_sequence_value("blocked_users")
    new_block = {
        "id": new_block_id,
        "blocker_id": current_user["id"],
        "blocked_id": user_id,
        "created_at": datetime.utcnow()
    }
    db.blocked_users.insert_one(new_block)
    
    # Sever connections immediately
    db.connections.delete_many({
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user["id"]}
        ]
    })
    
    return {"message": "User blocked successfully"}

@router.post("/{user_id}/dismiss")
def dismiss_user(user_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot dismiss yourself")
    
    existing = db.dismissed_users.find_one({
        "user_id": current_user["id"],
        "dismissed_id": user_id
    })
    if existing:
        return {"message": "Already dismissed"}
        
    new_dismiss_id = get_next_sequence_value("dismissed_users")
    dismiss = {
        "id": new_dismiss_id,
        "user_id": current_user["id"],
        "dismissed_id": user_id,
        "created_at": datetime.utcnow()
    }
    db.dismissed_users.insert_one(dismiss)
    return {"message": "User dismissed from feed"}
