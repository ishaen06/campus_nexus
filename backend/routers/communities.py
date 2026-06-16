from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import CommunityCreate, CommunityResponse
from routers.users import get_current_user

router = APIRouter()

@router.post("/", response_model=CommunityResponse)
def create_community(comm: CommunityCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    # Check if name exists
    existing = db.communities.find_one({"name": comm.name})
    if existing:
        raise HTTPException(status_code=400, detail="Community name already exists")
        
    new_comm_id = get_next_sequence_value("communities")
    new_comm = {
        "id": new_comm_id,
        "name": comm.name,
        "description": comm.description,
        "category": comm.category,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow()
    }
    db.communities.insert_one(new_comm)
    
    # Auto-join the creator as admin
    new_member_id = get_next_sequence_value("community_members")
    db.community_members.insert_one({
        "id": new_member_id,
        "community_id": new_comm_id,
        "user_id": current_user["id"],
        "role": "ADMIN"
    })
    
    new_comm.pop("_id", None)
    return new_comm

@router.get("/", response_model=List[CommunityResponse])
def get_communities(db = Depends(get_mongo_db)):
    comms = list(db.communities.find())
    for c in comms:
        c.pop("_id", None)
    return comms

@router.post("/{community_id}/join")
def join_community(community_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    comm = db.communities.find_one({"id": community_id})
    if not comm:
        raise HTTPException(status_code=404, detail="Community not found")
        
    existing_member = db.community_members.find_one({
        "community_id": community_id, 
        "user_id": current_user["id"]
    })
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member")
        
    new_member_id = get_next_sequence_value("community_members")
    db.community_members.insert_one({
        "id": new_member_id,
        "community_id": community_id,
        "user_id": current_user["id"],
        "role": "MEMBER"
    })
    return {"message": "Successfully joined community"}

@router.get("/{community_id}/members")
def get_community_members(community_id: int, db = Depends(get_mongo_db)):
    members = list(db.community_members.find({"community_id": community_id}))
    results = []
    for m in members:
        user = db.users.find_one({"id": m["user_id"]})
        if user:
            results.append({
                "id": user["id"],
                "full_name": user["full_name"],
                "role": m["role"]
            })
    return results
