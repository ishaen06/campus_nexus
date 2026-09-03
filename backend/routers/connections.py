from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import List

from database_mongo import get_mongo_db, get_next_sequence_value, MongoUser
from schemas import ConnectionResponse, ConnectionBase, MentorChatRequest
from routers.users import get_current_user
from ai_service import generate_icebreaker

router = APIRouter()

@router.post("/", response_model=ConnectionResponse)
def send_connection_request(conn_data: ConnectionBase, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if conn_data.receiver_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")
        
    receiver = db.users.find_one({"id": conn_data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    if receiver.get("is_mentor", False):
        raise HTTPException(status_code=400, detail="Cannot send connection request to a mentor")

    # Check if a connection already exists
    existing_conn = db.connections.find_one({
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": conn_data.receiver_id},
            {"sender_id": conn_data.receiver_id, "receiver_id": current_user["id"]}
        ]
    })

    if existing_conn:
        if existing_conn["status"] == "ACCEPTED":
            raise HTTPException(status_code=400, detail="Already connected")
        if existing_conn["sender_id"] == current_user["id"]:
            raise HTTPException(status_code=400, detail="Request already sent")
        # If the other person sent it to us, auto-accept!
        if existing_conn["sender_id"] == conn_data.receiver_id:
            db.connections.update_one({"id": existing_conn["id"]}, {"$set": {"status": "ACCEPTED"}})
            
            # Auto-inject AI Icebreaker!
            icebreaker_text = generate_icebreaker(MongoUser(current_user), MongoUser(receiver))
            new_msg_id = get_next_sequence_value("messages")
            db.messages.insert_one({
                "id": new_msg_id,
                "connection_id": existing_conn["id"],
                "sender_id": current_user["id"],
                "content": icebreaker_text,
                "is_read": False,
                "reactions": None,
                "created_at": datetime.utcnow()
            })
            
            updated_conn = db.connections.find_one({"id": existing_conn["id"]})
            updated_conn.pop("_id", None)
            return updated_conn

    # Create new pending request
    new_conn_id = get_next_sequence_value("connections")
    new_conn = {
        "id": new_conn_id,
        "sender_id": current_user["id"],
        "receiver_id": conn_data.receiver_id,
        "status": "PENDING",
        "created_at": datetime.utcnow()
    }
    db.connections.insert_one(new_conn)
    new_conn.pop("_id", None)
    return new_conn

@router.post("/admin-chat", response_model=ConnectionResponse)
def init_admin_chat(conn_data: ConnectionBase, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if conn_data.receiver_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")
        
    existing_conn = db.connections.find_one({
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": conn_data.receiver_id},
            {"sender_id": conn_data.receiver_id, "receiver_id": current_user["id"]}
        ]
    })
    
    if existing_conn:
        db.connections.update_one({"id": existing_conn["id"]}, {"$set": {"status": "ACCEPTED"}})
        updated_conn = db.connections.find_one({"id": existing_conn["id"]})
        updated_conn.pop("_id", None)
        return updated_conn
        
    new_conn_id = get_next_sequence_value("connections")
    new_conn = {
        "id": new_conn_id,
        "sender_id": current_user["id"],
        "receiver_id": conn_data.receiver_id,
        "status": "ACCEPTED",
        "created_at": datetime.utcnow()
    }
    db.connections.insert_one(new_conn)
    new_conn.pop("_id", None)
    return new_conn

@router.post("/mentor-chat", response_model=ConnectionResponse)
def init_mentor_chat(conn_data: MentorChatRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if conn_data.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")
        
    mentor = db.users.find_one({"email": conn_data.email})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not registered on the platform")
        
    existing_conn = db.connections.find_one({
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": mentor["id"]},
            {"sender_id": mentor["id"], "receiver_id": current_user["id"]}
        ]
    })
    
    if existing_conn:
        if existing_conn["status"] != "ACCEPTED":
            db.connections.update_one({"id": existing_conn["id"]}, {"$set": {"status": "ACCEPTED"}})
        updated_conn = db.connections.find_one({"id": existing_conn["id"]})
        updated_conn.pop("_id", None)
        return updated_conn
        
    new_conn_id = get_next_sequence_value("connections")
    new_conn = {
        "id": new_conn_id,
        "sender_id": current_user["id"],
        "receiver_id": mentor["id"],
        "status": "ACCEPTED",
        "created_at": datetime.utcnow()
    }
    db.connections.insert_one(new_conn)
    new_conn.pop("_id", None)
    return new_conn

@router.put("/{conn_id}/accept", response_model=ConnectionResponse)
def accept_connection(conn_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    conn = db.connections.find_one({"id": conn_id})
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if conn["receiver_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
        
    db.connections.update_one({"id": conn_id}, {"$set": {"status": "ACCEPTED"}})
    
    # Auto-inject AI Icebreaker!
    sender = db.users.find_one({"id": conn["sender_id"]})
    icebreaker_text = generate_icebreaker(MongoUser(sender), MongoUser(current_user))
    new_msg_id = get_next_sequence_value("messages")
    db.messages.insert_one({
        "id": new_msg_id,
        "connection_id": conn["id"],
        "sender_id": sender["id"],
        "content": icebreaker_text,
        "is_read": False,
        "reactions": None,
        "created_at": datetime.utcnow()
    })
    
    updated_conn = db.connections.find_one({"id": conn_id})
    updated_conn.pop("_id", None)
    return updated_conn

@router.put("/{conn_id}/reject")
def reject_connection(conn_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    conn = db.connections.find_one({"id": conn_id})
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if conn["receiver_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")
        
    db.connections.delete_one({"id": conn_id})
    return {"message": "Request declined"}

@router.get("/")

def list_connections(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    # Return both pending requests received and accepted matches
    connections = list(db.connections.find({
        "$or": [
            {"receiver_id": current_user["id"], "status": "PENDING"},
            {"status": "ACCEPTED", "$or": [{"sender_id": current_user["id"]}, {"receiver_id": current_user["id"]}]}
        ]
    }))
    
    results = []
    for c in connections:
        other_user_id = c["sender_id"] if c["receiver_id"] == current_user["id"] else c["receiver_id"]
        other_user = db.users.find_one({"id": other_user_id})
        if not other_user:
            continue
            
        other_user_obj = MongoUser(other_user)
        
        # Count unread messages sent by the other user in this connection
        unread_count = db.messages.count_documents({
            "connection_id": c["id"],
            "sender_id": other_user_id,
            "is_read": False
        })
        
        results.append({
            "connection_id": c["id"],
            "status": c["status"],
            "has_unread": unread_count > 0,
            "unread_count": unread_count,
            "other_user": {
                "id": other_user["id"],
                "full_name": other_user["full_name"],
                "is_mentor": other_user.get("is_mentor", False),
                "branch": other_user.get("branch"),
                "year_of_study": other_user.get("year_of_study"),
                "bio": other_user.get("bio", ""),
                "interests": other_user.get("interests", []),
                "goals": other_user.get("goals", []),
                "avatar_config": other_user.get("avatar_config"),
                "is_online": other_user_obj.is_online
            }
        })
    return results
