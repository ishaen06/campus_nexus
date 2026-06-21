from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from typing import List, Dict
from datetime import datetime

from database_mongo import get_mongo_db, get_next_sequence_value, MongoUser
from schemas import MessageResponse, GroupChatCreate, GroupChatResponse, GroupMessageResponse, GroupChatUpdate, GroupLeaveRequest, GroupMarksUpdate, MentorActionRequest
from jose import JWTError, jwt
from security import SECRET_KEY, ALGORITHM
from ai_service import analyze_message_content
import json

router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        # Maps connection_id to a list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps group_id to a list of active WebSockets
        self.active_group_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_id: int):
        await websocket.accept()
        if connection_id not in self.active_connections:
            self.active_connections[connection_id] = []
        self.active_connections[connection_id].append(websocket)

    def disconnect(self, websocket: WebSocket, connection_id: int):
        if connection_id in self.active_connections:
            self.active_connections[connection_id].remove(websocket)
            if not self.active_connections[connection_id]:
                del self.active_connections[connection_id]

    async def broadcast_to_connection(self, message: dict, connection_id: int):
        if connection_id in self.active_connections:
            for connection in self.active_connections[connection_id]:
                await connection.send_json(message)

    # Group connections
    async def connect_group(self, websocket: WebSocket, group_id: int):
        await websocket.accept()
        if group_id not in self.active_group_connections:
            self.active_group_connections[group_id] = []
        self.active_group_connections[group_id].append(websocket)

    def disconnect_group(self, websocket: WebSocket, group_id: int):
        if group_id in self.active_group_connections:
            self.active_group_connections[group_id].remove(websocket)
            if not self.active_group_connections[group_id]:
                del self.active_group_connections[group_id]

    async def broadcast_to_group(self, message: dict, group_id: int):
        if group_id in self.active_group_connections:
            for connection in self.active_group_connections[group_id]:
                await connection.send_json(message)

manager = ConnectionManager()

def get_user_from_token(token: str, db):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    except JWTError:
        return None

@router.websocket("/ws/{connection_id}")
async def websocket_chat(websocket: WebSocket, connection_id: int, token: str = Query(...), db = Depends(get_mongo_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return
        
    # Verify they are part of this connection
    conn = db.connections.find_one({"id": connection_id, "status": "ACCEPTED"})
    if not conn or (conn["sender_id"] != user["id"] and conn["receiver_id"] != user["id"]):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, connection_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            
            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")
                
                if msg_type in ["typing", "stop_typing"]:
                    await manager.broadcast_to_connection({
                        "type": msg_type,
                        "sender_id": user["id"]
                    }, connection_id)
                    continue
                    
                if msg_type == "read":
                    # Mark specific message as read
                    msg_id = data.get("message_id")
                    if msg_id:
                        msg_to_update = db.messages.find_one({"id": msg_id})
                        if msg_to_update and msg_to_update["sender_id"] != user["id"]:
                            db.messages.update_one({"id": msg_id}, {"$set": {"is_read": True}})
                            await manager.broadcast_to_connection({
                                "type": "read_receipt",
                                "message_id": msg_id
                            }, connection_id)
                    continue

                if msg_type == "react":
                    msg_id = data.get("message_id")
                    reaction = data.get("reaction")
                    if msg_id and reaction:
                        msg_to_update = db.messages.find_one({"id": msg_id})
                        if msg_to_update:
                            current_reactions = dict(msg_to_update.get("reactions") or {})
                            current_reactions[str(user["id"])] = reaction
                            db.messages.update_one({"id": msg_id}, {"$set": {"reactions": current_reactions}})
                            await manager.broadcast_to_connection({
                                "type": "reaction_update",
                                "message_id": msg_id,
                                "reactions": current_reactions
                            }, connection_id)
                    continue
                    
                content = data.get("content", "")
            except json.JSONDecodeError:
                content = raw_data
                
            if not content:
                continue

            # Run AI Moderation
            analysis = analyze_message_content(content)
            
            if analysis["status"] == "severe":
                db.users.update_one({"id": user["id"]}, {"$set": {"is_banned": True}})
                await websocket.send_json({
                    "type": "system_warning",
                    "message": "Your account has been suspended for severe policy violations."
                })
                await websocket.close(code=1008)
                break
                
            if analysis["status"] == "warning":
                await websocket.send_json({
                    "type": "system_warning",
                    "message": analysis["message"]
                })
                continue # Don't send the message

            # Save message to DB
            new_msg_id = get_next_sequence_value("messages")
            new_msg = {
                "id": new_msg_id,
                "connection_id": connection_id,
                "sender_id": user["id"],
                "content": content,
                "is_read": False,
                "reactions": None,
                "created_at": datetime.utcnow()
            }
            db.messages.insert_one(new_msg)
            
            # Broadcast
            await manager.broadcast_to_connection({
                "type": "message",
                "id": new_msg_id,
                "connection_id": connection_id,
                "sender_id": user["id"],
                "content": content,
                "created_at": new_msg["created_at"].isoformat()
            }, connection_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)

from routers.users import get_current_user

@router.get("/{connection_id}/messages", response_model=List[MessageResponse])
def get_messages(connection_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    conn = db.connections.find_one({"id": connection_id})
    if not conn or (conn["sender_id"] != current_user["id"] and conn["receiver_id"] != current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    messages = list(db.messages.find({"connection_id": connection_id}).sort("created_at", 1))
    
    # Mark unread messages from the other user as read
    unread_message_ids = [m["id"] for m in messages if m["sender_id"] != current_user["id"] and not m.get("is_read", False)]
    if unread_message_ids:
        db.messages.update_many({"id": {"$in": unread_message_ids}}, {"$set": {"is_read": True}})
        # update our list to show read
        for m in messages:
            if m["id"] in unread_message_ids:
                m["is_read"] = True
                
    for m in messages:
        m.pop("_id", None)
    return messages

def validate_team_criteria(member_users: List[dict]) -> tuple[bool, str]:
    student_users = [u for u in member_users if not u.get("is_mentor")]
    size = len(student_users)
    if size < 4 or size > 5:
        return False, f"Team must contain 4 to 5 members (currently has {size})"
    
    p_count = 0
    c_count = 0
    for u in student_users:
        cycle = (u.get("cycle") or "").strip().upper()
        if cycle == "P":
            p_count += 1
        elif cycle == "C":
            c_count += 1
        else:
            return False, f"Member '{u.get('full_name')}' has not selected a P/C cycle"
            
    if size == 4:
        if p_count != 2 or c_count != 2:
            return False, f"Cycle balance criteria failed: A team of 4 must have exactly 2 P-Cycle and 2 C-Cycle members (Found {p_count} P-Cycle, {c_count} C-Cycle)"
    elif size == 5:
        if not ((p_count == 3 and c_count == 2) or (p_count == 2 and c_count == 3)):
            return False, f"Cycle balance criteria failed: A team of 5 must have either (3 P-Cycle + 2 C-Cycle) or (2 P-Cycle + 3 C-Cycle) members (Found {p_count} P-Cycle, {c_count} C-Cycle)"
        
    return True, ""

def build_group_response(group: dict, db) -> dict:
    member_records = list(db.group_members.find({"group_id": group["id"]}))
    member_ids = [m["user_id"] for m in member_records]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    for u in member_users:
        u.pop("_id", None)
    criteria_met, val_error = validate_team_criteria(member_users)
    return {
        "id": group["id"],
        "name": group["name"],
        "created_by": group["created_by"],
        "created_at": group.get("created_at"),
        "is_public": bool(group.get("is_public", False)),
        "project_topic": group.get("project_topic"),
        "member_ids": member_ids,
        "members": member_users,
        "criteria_met": criteria_met,
        "validation_error": val_error if not criteria_met else None,
        "mentor_name": group.get("mentor_name"),
        "mentor_email": group.get("mentor_email"),
        "mentor_status": group.get("mentor_status") or "NOT_SUBMITTED",
        "mentor_rejection_reason": group.get("mentor_rejection_reason"),
        "phase1_marks": group.get("phase1_marks") or 0,
        "phase2_marks": group.get("phase2_marks") or 0,
        "phase3_marks": group.get("phase3_marks") or 0,
        "project_files": group.get("project_files") or [],
        "allow_member_leave": bool(group.get("allow_member_leave", False))
    }

@router.post("/groups", response_model=GroupChatResponse)
def create_group_chat(group_data: GroupChatCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    members_to_add = list(set(group_data.member_ids + [current_user["id"]]))
    
    # Enforce team limit criteria: maximum 5 members
    if len(members_to_add) > 5:
        raise HTTPException(
            status_code=400,
            detail="A team cannot exceed 5 members."
        )
        
    member_users = list(db.users.find({"id": {"$in": members_to_add}}))
    if len(member_users) != len(members_to_add):
        raise HTTPException(
            status_code=400,
            detail="One or more member IDs are invalid."
        )
        
    # Enforce that a user can only be in one team at a time
    for uid in members_to_add:
        existing_membership = db.group_members.find_one({"user_id": uid})
        if existing_membership:
            member_user = db.users.find_one({"id": uid})
            name_str = "You are" if uid == current_user["id"] else f"Member '{member_user.get('full_name')}' is"
            raise HTTPException(
                status_code=400,
                detail=f"{name_str} already in another team. A person can join only 1 team at a time."
            )
        
    # 1. Create group
    new_group_id = get_next_sequence_value("group_chats")
    new_group = {
        "id": new_group_id,
        "name": group_data.name,
        "created_by": current_user["id"],
        "is_public": group_data.is_public,
        "project_topic": group_data.project_topic,
        "created_at": datetime.utcnow(),
        "mentor_status": "NOT_SUBMITTED",
        "phase1_marks": 0,
        "phase2_marks": 0,
        "phase3_marks": 0,
        "project_files": [],
        "allow_member_leave": False
    }
    db.group_chats.insert_one(new_group)
    
    # 2. Add members
    for u in member_users:
        new_member_id = get_next_sequence_value("group_members")
        db.group_members.insert_one({
            "id": new_member_id,
            "group_id": new_group_id,
            "user_id": u["id"]
        })
    
    return build_group_response(new_group, db)

@router.get("/groups", response_model=List[GroupChatResponse])
def get_user_group_chats(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    member_records = list(db.group_members.find({"user_id": current_user["id"]}))
    group_ids = [m["group_id"] for m in member_records]
    groups = list(db.group_chats.find({"id": {"$in": group_ids}}))
    return [build_group_response(g, db) for g in groups]

@router.get("/groups/public", response_model=List[GroupChatResponse])
def get_public_group_chats(db = Depends(get_mongo_db)):
    # Find all public groups
    public_groups = list(db.group_chats.find({"is_public": True}))
    
    results = []
    for g in public_groups:
        resp = build_group_response(g, db)
        # Only show groups that have fewer than 5 members (open to accept people)
        if len(resp["member_ids"]) < 5:
            results.append(resp)
    return results

@router.get("/groups/{group_id}", response_model=GroupChatResponse)
def get_group_details(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    is_approved_mentor = (
        current_user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (current_user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    if not is_member and not is_approved_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")
        
    return build_group_response(group, db)

@router.put("/groups/{group_id}", response_model=GroupChatResponse)
def update_group_chat(group_id: int, group_data: GroupChatUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    # Find group
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Ensure current user is the leader/creator
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can modify group properties")
        
    update_fields = {}
    
    # Update group name if provided
    if group_data.name is not None:
        update_fields["name"] = group_data.name
        
    # Update public/private visibility if provided
    if group_data.is_public is not None:
        update_fields["is_public"] = group_data.is_public
        
    # Update project topic if provided
    if group_data.project_topic is not None:
        update_fields["project_topic"] = group_data.project_topic
        
    # Update members if provided
    if group_data.member_ids is not None:
        # Creator is always a member
        new_members = list(set(group_data.member_ids + [current_user["id"]]))
        
        # Enforce max 5 members limit
        if len(new_members) > 5:
            raise HTTPException(
                status_code=400,
                detail="A team cannot exceed 5 members."
            )
            
        member_users = list(db.users.find({"id": {"$in": new_members}}))
        if len(member_users) != len(new_members):
            raise HTTPException(
                status_code=400,
                detail="One or more member IDs are invalid."
            )
            
        # Enforce that a user can only be in one team at a time
        for uid in new_members:
            existing_membership = db.group_members.find_one({
                "user_id": uid,
                "group_id": {"$ne": group_id}
            })
            if existing_membership:
                member_user = db.users.find_one({"id": uid})
                name_str = "You are" if uid == current_user["id"] else f"Member '{member_user.get('full_name')}' is"
                raise HTTPException(
                    status_code=400,
                    detail=f"{name_str} already in another team. A person can join only 1 team at a time."
                )
            
        # Find mentor users in the DB to check if they are currently members of this group
        mentor_users = list(db.users.find({"is_mentor": True}))
        mentor_ids = [m["id"] for m in mentor_users]
        existing_mentor_memberships = list(db.group_members.find({
            "group_id": group_id,
            "user_id": {"$in": mentor_ids}
        }))
        
        # Delete old members
        db.group_members.delete_many({"group_id": group_id})
        
        # Add new members
        for u in member_users:
            new_member_id = get_next_sequence_value("group_members")
            db.group_members.insert_one({
                "id": new_member_id,
                "group_id": group_id,
                "user_id": u["id"]
            })
            
        # Re-add mentor memberships
        for mm in existing_mentor_memberships:
            new_member_id = get_next_sequence_value("group_members")
            db.group_members.insert_one({
                "id": new_member_id,
                "group_id": group_id,
                "user_id": mm["user_id"]
            })
                
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
        group.update(update_fields)
        
    updated_group = db.group_chats.find_one({"id": group_id})
    return build_group_response(updated_group, db)

@router.get("/groups/{group_id}/messages", response_model=List[GroupMessageResponse])
def get_group_messages(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is member or approved mentor
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    is_approved_mentor = (
        current_user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (current_user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    if not is_member and not is_approved_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to access this group chat")
        
    messages = list(db.group_messages.find({"group_id": group_id}).sort("created_at", 1))
    
    # Pre-fetch senders to optimize
    sender_ids = list(set([m["sender_id"] for m in messages]))
    senders = {u["id"]: u["full_name"] for u in db.users.find({"id": {"$in": sender_ids}})}
    
    results = []
    for m in messages:
        results.append({
            "id": m["id"],
            "group_id": m["group_id"],
            "sender_id": m["sender_id"],
            "content": m["content"],
            "reactions": m.get("reactions"),
            "created_at": m["created_at"],
            "sender_name": senders.get(m["sender_id"], "Unknown")
        })
    return results

@router.post("/groups/{group_id}/leave")
async def leave_group_chat(group_id: int, leave_data: GroupLeaveRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Team admin cannot leave the team. Use disband instead.")
        
    # Block leaving after mentor approval unless explicitly allowed by the team admin
    if group.get("mentor_status") == "APPROVED" and not group.get("allow_member_leave", False):
        raise HTTPException(status_code=400, detail="Leaving the team is locked after mentor approval unless allowed by the admin.")
        
    membership = db.group_members.find_one({
        "group_id": group_id, 
        "user_id": current_user["id"]
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
        
    # Delete membership
    db.group_members.delete_one({"id": membership["id"]})
    
    # Post system notification to chat
    reason_str = f" Reason: {leave_data.reason}" if leave_data.reason else ""
    content = f"⚠️ {current_user['full_name']} has left the team.{reason_str}"
    
    # We save the notification message to the database under the current_user's sender_id
    new_msg_id = get_next_sequence_value("group_messages")
    new_msg = {
        "id": new_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": content,
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(new_msg)
    
    # Broadcast to websocket connections
    await manager.broadcast_to_group({
        "type": "message",
        "id": new_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "content": content,
        "created_at": new_msg["created_at"].isoformat()
    }, group_id)
    
    return {"message": "Left team successfully"}

@router.delete("/groups/{group_id}/disband")
async def disband_group_chat(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can disband the team")
        
    # Post a final disband warning to websocket if any client is connected
    await manager.broadcast_to_group({
        "type": "system_warning",
        "message": "This group chat has been disbanded by the team admin."
    }, group_id)
    
    # Delete all messages, members, and the group itself
    db.group_messages.delete_many({"group_id": group_id})
    db.group_members.delete_many({"group_id": group_id})
    db.group_chats.delete_one({"id": group_id})
    
    return {"message": "Team disbanded successfully"}

# Helper to populate group members for GroupChatResponse
def populate_group_response(group: dict, db) -> dict:
    return build_group_response(group, db)

@router.put("/groups/{group_id}/toggle-leave", response_model=GroupChatResponse)
def toggle_group_leave(group_id: int, allow: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can change this setting")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"allow_member_leave": allow}})
    group["allow_member_leave"] = allow
    return populate_group_response(group, db)

@router.put("/groups/{group_id}/toggle-privacy", response_model=GroupChatResponse)
def toggle_group_privacy(group_id: int, is_public: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can change this setting")
        
    if group.get("mentor_status") == "APPROVED" and is_public:
        raise HTTPException(status_code=400, detail="Cannot make an approved team public")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"is_public": is_public}})
    group["is_public"] = is_public
    return populate_group_response(group, db)

@router.put("/groups/{group_id}/transfer-admin", response_model=GroupChatResponse)
def transfer_group_admin(group_id: int, new_admin_id: int = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can transfer ownership")
        
    # Verify new admin is a member of the group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": new_admin_id})
    if not is_member:
        raise HTTPException(status_code=400, detail="New admin must be a member of this team")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"created_by": new_admin_id}})
    group["created_by"] = new_admin_id
    return populate_group_response(group, db)


# --- Project Dashboard and Mentor Approval Endpoints ---

from fastapi import File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse
import os
import shutil
import uuid

# Helper to sync approved team to CSV/Excel folder
def sync_approved_team_to_csv(group: dict, db):
    import csv
    
    file_dir = "teachers_excel"
    file_path = os.path.join(file_dir, "approved_teams.csv")
    os.makedirs(file_dir, exist_ok=True)
    
    headers = [
        "Team ID", "Team Name", "Project Topic", "Mentor Name", "Mentor Email", "Approved At",
        "Member 1 Name", "Member 1 Email", "Member 1 USN", "Member 1 Cycle",
        "Member 2 Name", "Member 2 Email", "Member 2 USN", "Member 2 Cycle",
        "Member 3 Name", "Member 3 Email", "Member 3 USN", "Member 3 Cycle",
        "Member 4 Name", "Member 4 Email", "Member 4 USN", "Member 4 Cycle",
        "Member 5 Name", "Member 5 Email", "Member 5 USN", "Member 5 Cycle"
    ]
    
    # Get all members
    member_records = list(db.group_members.find({"group_id": group["id"]}))
    member_ids = [m["user_id"] for m in member_records]
    members = list(db.users.find({"id": {"$in": member_ids}})) if member_ids else []
    
    # Build members data
    member_cols = []
    for i in range(5):
        if i < len(members):
            m = members[i]
            member_cols.extend([m.get("full_name"), m.get("email"), m.get("usn") or "N/A", m.get("cycle") or "N/A"])
        else:
            member_cols.extend(["", "", "", ""])
            
    approved_at_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    row_data = [
        str(group["id"]), group["name"], group.get("project_topic") or "", 
        group.get("mentor_name") or "", group.get("mentor_email") or "", approved_at_str
    ] + member_cols
    
    rows = []
    updated = False
    if os.path.exists(file_path):
        with open(file_path, "r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            try:
                file_headers = next(reader)
            except StopIteration:
                file_headers = []
            for row in reader:
                if row and row[0] == str(group["id"]):
                    rows.append(row_data)
                    updated = True
                else:
                    rows.append(row)
                    
    if not updated:
        rows.append(row_data)
        
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

# Update Project Details (Topic, Mentor Name, Mentor Email)
@router.put("/groups/{group_id}/project-details", response_model=GroupChatResponse)
def update_project_details(group_id: int, details: GroupChatUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    update_fields = {}
    
    # Update fields
    if details.project_topic is not None:
        update_fields["project_topic"] = details.project_topic
    if details.mentor_name is not None:
        update_fields["mentor_name"] = details.mentor_name
    if details.mentor_email is not None:
        email_lower = details.mentor_email.lower().strip()
        if not email_lower.endswith("@gmail.com"):
            raise HTTPException(status_code=400, detail="Mentor email must end with @gmail.com")
        
        # Only check the 25-team limit if assigning a NEW mentor
        if group.get("mentor_email") != email_lower:
            active_count = db.group_chats.count_documents({
                "mentor_email": email_lower,
                "mentor_status": {"$in": ["PENDING", "APPROVED"]}
            })
            if active_count >= 25:
                raise HTTPException(
                    status_code=400,
                    detail="This mentor has already reached the maximum limit of 25 teams."
                )
        update_fields["mentor_email"] = email_lower
        
    # Reset status if topic/mentor changes
    update_fields["mentor_status"] = "NOT_SUBMITTED"
    update_fields["mentor_token"] = None
    
    # Remove any mentor user from this group's members since status is reset to NOT_SUBMITTED
    mentor_users = list(db.users.find({"is_mentor": True}))
    mentor_ids = [m["id"] for m in mentor_users]
    db.group_members.delete_many({"group_id": group_id, "user_id": {"$in": mentor_ids}})
    
    db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return build_group_response(updated_group, db)

# Request Mentor Approval
@router.post("/groups/{group_id}/submit-approval")
def submit_mentor_approval(group_id: int, background_tasks: BackgroundTasks, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    if not group.get("project_topic") or not group.get("mentor_name") or not group.get("mentor_email"):
        raise HTTPException(status_code=400, detail="Project topic, mentor name, and mentor email must be provided first.")
        
    # Check 25-team limit for the mentor before submitting
    active_count = db.group_chats.count_documents({
        "mentor_email": group["mentor_email"],
        "mentor_status": {"$in": ["PENDING", "APPROVED"]},
        "id": {"$ne": group_id}
    })
    if active_count >= 25:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit. This mentor has already reached the maximum limit of 25 teams."
        )
        
    # Get members
    member_records = list(db.group_members.find({"group_id": group_id}))
    member_ids = [m["user_id"] for m in member_records]
    members = list(db.users.find({"id": {"$in": member_ids}})) if member_ids else []
    
    # Validate criteria before submitting (filter out mentors)
    students = [m for m in members if not m.get("is_mentor")]
    p_count = len([m for m in students if (m.get("cycle") or '').upper() == 'P'])
    c_count = len([m for m in students if (m.get("cycle") or '').upper() == 'C'])
    size = len(students)
    
    if size < 4 or size > 5:
        raise HTTPException(status_code=400, detail=f"Cannot submit. Team must contain 4 to 5 members (currently has {size})")
    elif size == 4 and (p_count != 2 or c_count != 2):
        raise HTTPException(status_code=400, detail=f"Cannot submit. Cycle balance failed (Found {p_count} P, {c_count} C)")
    elif size == 5 and not ((p_count == 3 and c_count == 2) or (p_count == 2 and c_count == 3)):
        raise HTTPException(status_code=400, detail=f"Cannot submit. Cycle balance failed (Found {p_count} P, {c_count} C)")
        
    # Generate token
    token = str(uuid.uuid4())
    db.group_chats.update_one({"id": group_id}, {"$set": {"mentor_token": token, "mentor_status": "PENDING"}})
    
    # Send email
    from utils import send_email
    subject = f"Mentor Approval Request for Team: {group['name']}"
    
    members_list_str = "\n".join([f"- {m.get('full_name')} ({m.get('email')}, USN: {m.get('usn') or 'N/A'}, Cycle: {m.get('cycle') or 'N/A'})" for m in members])
    
    host = os.getenv("API_HOST", "http://localhost:8000")
    approve_url = f"{host}/api/chat/groups/{group_id}/mentor-approve?token={token}"
    reject_url = f"{host}/api/chat/groups/{group_id}/mentor-reject?token={token}"
    
    body = f"""Dear {group.get('mentor_name')},
    
A student group has requested your approval for their engineering project team.

Team Details:
- Team Name: {group['name']}
- Project Topic: {group.get('project_topic')}

Team Members:
{members_list_str}

Please review their request and click one of the links below to approve or reject:

Approve: {approve_url}

Reject: {reject_url}

Thank you,
EL Platform Team
"""
    
    background_tasks.add_task(send_email, group.get("mentor_email"), subject, body)
    
    return {"message": "Approval request sent to mentor successfully."}

# Mentor Approve (Public Endpoint)
@router.get("/groups/{group_id}/mentor-approve", response_class=HTMLResponse)
def mentor_approve_team(group_id: int, token: str, db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        return HTMLResponse("<h1>Error</h1><p>Group not found</p>", status_code=404)
        
    if not group.get("mentor_token") or group.get("mentor_token") != token:
        return HTMLResponse("<h1>Error</h1><p>Invalid or expired approval token.</p>", status_code=400)
        
    db.group_chats.update_one({"id": group_id}, {"$set": {
        "mentor_status": "APPROVED",
        "mentor_token": None,
        "is_public": False
    }})
    
    group["mentor_status"] = "APPROVED"
    group["mentor_token"] = None
    group["is_public"] = False
    
    # Add mentor to group members
    if group.get("mentor_email"):
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            is_already_member = db.group_members.find_one({"group_id": group_id, "user_id": mentor_user["id"]})
            if not is_already_member:
                new_member_id = get_next_sequence_value("group_members")
                db.group_members.insert_one({
                    "id": new_member_id,
                    "group_id": group_id,
                    "user_id": mentor_user["id"]
                })
    
    # Sync approved details to teacher's excel folder
    sync_approved_team_to_csv(group, db)
    
    html_content = f"""
    <html>
        <head>
            <title>Approval Confirmed</title>
            <style>
                body {{ font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f0fdf4; margin: 0; }}
                .card {{ background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; border: 1px solid #bbf7d0; }}
                h1 {{ color: #166534; margin-top: 0; }}
                p {{ color: #1e293b; font-size: 1.1rem; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✓ Approval Confirmed!</h1>
                <p>You have approved the team <strong>"{group['name']}"</strong> with project topic <strong>"{group.get('project_topic')}"</strong>.</p>
                <p>The approved team data has been successfully compiled and sent to the teachers' database.</p>
            </div>
        </body>
    </html>
    """
    return html_content

# Mentor Reject (Public Endpoint)
@router.get("/groups/{group_id}/mentor-reject", response_class=HTMLResponse)
def mentor_reject_team(group_id: int, token: str, db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        return HTMLResponse("<h1>Error</h1><p>Group not found</p>", status_code=404)
        
    if not group.get("mentor_token") or group.get("mentor_token") != token:
        return HTMLResponse("<h1>Error</h1><p>Invalid or expired approval token.</p>", status_code=400)
        
    db.group_chats.update_one({"id": group_id}, {"$set": {
        "mentor_status": "REJECTED",
        "mentor_token": None
    }})
    
    html_content = f"""
    <html>
        <head>
            <title>Rejection Confirmed</title>
            <style>
                body {{ font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #fef2f2; margin: 0; }}
                .card {{ background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; border: 1px solid #fee2e2; }}
                h1 {{ color: #991b1b; margin-top: 0; }}
                p {{ color: #1e293b; font-size: 1.1rem; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✗ Rejection Registered</h1>
                <p>You have rejected the team request for <strong>"{group['name']}"</strong>.</p>
                <p>The students have been notified of the decision and can modify their topic or details and submit again.</p>
            </div>
        </body>
    </html>
    """
    return html_content

# Project File Upload
@router.post("/groups/{group_id}/files")
def upload_project_file(group_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    # Create uploads directory if not exists
    os.makedirs("uploads", exist_ok=True)
    
    # Save file on disk
    file_id = str(uuid.uuid4())
    safe_filename = f"group_{group_id}_{file_id}_{file.filename}"
    file_path = os.path.join("uploads", safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get metadata
    file_size = os.path.getsize(file_path)
    file_url = f"/api/uploads/{safe_filename}"
    uploaded_at_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    file_info = {
        "id": file_id,
        "name": file.filename,
        "url": file_url,
        "size": file_size,
        "uploaded_by": current_user["full_name"],
        "uploaded_at": uploaded_at_str
    }
    
    # Update DB
    current_files = list(group.get("project_files") or [])
    current_files.append(file_info)
    
    db.group_chats.update_one({"id": group_id}, {"$set": {"project_files": current_files}})
    
    # Post a message to group chat indicating file was uploaded
    notif_msg_id = get_next_sequence_value("group_messages")
    notif_msg = {
        "id": notif_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": f"📎 {current_user['full_name']} uploaded file: {file.filename}",
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(notif_msg)
    
    # Broadcast message to WebSocket via background tasks
    background_tasks.add_task(
        manager.broadcast_to_group,
        {
            "type": "message",
            "id": notif_msg_id,
            "group_id": group_id,
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": notif_msg["content"],
            "created_at": notif_msg["created_at"].isoformat()
        },
        group_id
    )
    
    return current_files

# Delete Project File
@router.delete("/groups/{group_id}/files/{file_id}")
def delete_project_file(group_id: int, file_id: str, background_tasks: BackgroundTasks, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    current_files = list(group.get("project_files") or [])
    file_to_delete = None
    
    for f in current_files:
        if f.get("id") == file_id:
            file_to_delete = f
            break
            
    if not file_to_delete:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Delete from list
    current_files.remove(file_to_delete)
    db.group_chats.update_one({"id": group_id}, {"$set": {"project_files": current_files}})
    
    # Try deleting from disk
    safe_filename = file_to_delete["url"].split("/uploads/")[-1]
    file_path = os.path.join("uploads", safe_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete file from disk: {e}")
            
    # Post a notification in the chat
    notif_msg_id = get_next_sequence_value("group_messages")
    notif_msg = {
        "id": notif_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": f"🗑️ {current_user['full_name']} deleted file: {file_to_delete['name']}",
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(notif_msg)
    
    # Broadcast message to WebSocket via background tasks
    background_tasks.add_task(
        manager.broadcast_to_group,
        {
            "type": "message",
            "id": notif_msg_id,
            "group_id": group_id,
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": notif_msg["content"],
            "created_at": notif_msg["created_at"].isoformat()
        },
        group_id
    )
    
    return current_files

@router.get("/groups/mentor/teams", response_model=List[GroupChatResponse])
def get_mentor_teams(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can access this endpoint")
    groups = list(db.group_chats.find({"mentor_email": current_user["email"]}))
    return [populate_group_response(g, db) for g in groups]

@router.post("/groups/{group_id}/mentor-action", response_model=GroupChatResponse)
def mentor_action(group_id: int, payload: MentorActionRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can approve or reject teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("mentor_email") != current_user["email"]:
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
    
    action = payload.action.upper()
    update_fields = {}
    if action == "APPROVE":
        # Check the 25-team limit before approving
        active_count = db.group_chats.count_documents({
            "mentor_email": group.get("mentor_email"),
            "mentor_status": "APPROVED",
            "id": {"$ne": group_id}
        })
        if active_count >= 25:
            raise HTTPException(status_code=400, detail="Cannot approve. You have already reached the maximum limit of 25 approved teams.")
            
        update_fields["mentor_status"] = "APPROVED"
        update_fields["mentor_token"] = None
        update_fields["mentor_rejection_reason"] = None
        update_fields["is_public"] = False
        
        # We need a copy of the group with updated values to sync to CSV
        group_copy = dict(group)
        group_copy.update(update_fields)
        sync_approved_team_to_csv(group_copy, db)
        
        # Add mentor to group members
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            is_already_member = db.group_members.find_one({"group_id": group_id, "user_id": mentor_user["id"]})
            if not is_already_member:
                new_member_id = get_next_sequence_value("group_members")
                db.group_members.insert_one({
                    "id": new_member_id,
                    "group_id": group_id,
                    "user_id": mentor_user["id"]
                })
    elif action == "REJECT":
        update_fields["mentor_status"] = "REJECTED"
        update_fields["mentor_token"] = None
        update_fields["mentor_rejection_reason"] = payload.rejection_reason
        
        # Remove mentor from group members
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            db.group_members.delete_many({"group_id": group_id, "user_id": mentor_user["id"]})
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use APPROVE or REJECT.")
        
    db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db)

@router.put("/groups/{group_id}/marks", response_model=GroupChatResponse)
def update_group_marks(group_id: int, marks: GroupMarksUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can grade teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("mentor_email") != current_user["email"]:
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
        
    update_fields = {}
    if marks.phase1_marks is not None:
        update_fields["phase1_marks"] = marks.phase1_marks
    if marks.phase2_marks is not None:
        update_fields["phase2_marks"] = marks.phase2_marks
    if marks.phase3_marks is not None:
        update_fields["phase3_marks"] = marks.phase3_marks
        
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
        
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db)

@router.websocket("/ws/group/{group_id}")
async def websocket_group_chat(websocket: WebSocket, group_id: int, token: str = Query(...), db = Depends(get_mongo_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return
        
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        await websocket.close(code=1008)
        return

    # Verify user is member or approved mentor
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": user["id"]})
    is_approved_mentor = (
        user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    if not is_member and not is_approved_mentor:
        await websocket.close(code=1008)
        return

    await manager.connect_group(websocket, group_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")
                
                if msg_type in ["typing", "stop_typing"]:
                    await manager.broadcast_to_group({
                        "type": msg_type,
                        "sender_id": user["id"],
                        "sender_name": user["full_name"]
                    }, group_id)
                    continue
                    
                if msg_type == "react":
                    msg_id = data.get("message_id")
                    reaction = data.get("reaction")
                    if msg_id and reaction:
                        msg_to_update = db.group_messages.find_one({"id": msg_id})
                        if msg_to_update:
                            current_reactions = dict(msg_to_update.get("reactions") or {})
                            current_reactions[str(user["id"])] = reaction
                            db.group_messages.update_one({"id": msg_id}, {"$set": {"reactions": current_reactions}})
                            await manager.broadcast_to_group({
                                "type": "reaction_update",
                                "message_id": msg_id,
                                "reactions": current_reactions
                            }, group_id)
                    continue
                    
                content = data.get("content", "")
            except json.JSONDecodeError:
                content = raw_data
                
            if not content:
                continue

            # Run AI Moderation
            analysis = analyze_message_content(content)
            
            if analysis["status"] == "severe":
                db.users.update_one({"id": user["id"]}, {"$set": {"is_banned": True}})
                await websocket.send_json({
                    "type": "system_warning",
                    "message": "Your account has been suspended for severe policy violations."
                })
                await websocket.close(code=1008)
                break
                
            if analysis["status"] == "warning":
                await websocket.send_json({
                    "type": "system_warning",
                    "message": analysis["message"]
                })
                continue # Don't send

            # Save message to DB
            new_msg_id = get_next_sequence_value("group_messages")
            new_msg = {
                "id": new_msg_id,
                "group_id": group_id,
                "sender_id": user["id"],
                "content": content,
                "created_at": datetime.utcnow()
            }
            db.group_messages.insert_one(new_msg)
            
            # Broadcast
            await manager.broadcast_to_group({
                "type": "message",
                "id": new_msg_id,
                "group_id": group_id,
                "sender_id": user["id"],
                "sender_name": user["full_name"],
                "content": content,
                "created_at": new_msg["created_at"].isoformat()
            }, group_id)
    except WebSocketDisconnect:
        manager.disconnect_group(websocket, group_id)
