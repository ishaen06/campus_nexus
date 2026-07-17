from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks, Response
from typing import List, Dict
from datetime import datetime
import base64
from io import BytesIO
from fpdf import FPDF
from fpdf.fonts import FontFace


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
    if size < 3 or size > 5:
        return False, f"Team must contain 3 to 5 members (currently has {size})"
    
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

def build_group_response(group: dict, db, current_user = None) -> dict:
    member_records = list(db.group_members.find({"group_id": group["id"]}))
    member_ids = [m["user_id"] for m in member_records]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    for u in member_users:
        u.pop("_id", None)
    criteria_met, val_error = validate_team_criteria(member_users)
    
    # Query evaluations from evaluations collection
    print(f"Database query executed: fetching evaluations for group_id: {group['id']}")
    evaluations = list(db.evaluations.find({"group_id": group["id"]}))
    print(f"Query result: found {len(evaluations)} evaluations")
    
    student_evaluations_dict = {}
    for ev in evaluations:
        print(f"Existing evaluation found for student {ev['student_id']}")
        student_evaluations_dict[str(ev["student_id"])] = {
            "phase1_detail_marks": ev.get("phase1_detail_marks") or {},
            "phase1_observations": ev.get("phase1_observations") or "",
            "phase2_detail_marks": ev.get("phase2_detail_marks") or {},
            "phase2_observations": ev.get("phase2_observations") or "",
            "phase3_detail_marks": ev.get("phase3_detail_marks") or {},
            "phase3_observations": ev.get("phase3_observations") or "",
            "evaluator_id": ev.get("evaluator_id")
        }
        
    print(f"[Backend build_group_response] student_evaluations_dict: {student_evaluations_dict}")

    return {
        "id": group["id"],
        "name": group["name"],
        "created_by": group["created_by"],
        "created_at": group.get("created_at"),
        "is_public": bool(group.get("is_public", False)),
        "project_topic": group.get("project_topic"),
        "project_sub_topic": group.get("project_sub_topic"),
        "project_theme": group.get("project_theme"),
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
        "allow_member_leave": bool(group.get("allow_member_leave", False)),
        "chief_mentor_name": group.get("chief_mentor_name") or "DR SUBRAMANYA KN",
        "chief_mentor_designation": group.get("chief_mentor_designation") or "PRINCIPAL",
        "chief_mentor_department": group.get("chief_mentor_department") or "",
        "evaluators": group.get("evaluators") or ["", "", "", ""],
        "phase1_detail_marks": group.get("phase1_detail_marks") or {"problem_definition": 0, "objectives": 0, "methodology": 0},
        "phase2_detail_marks": group.get("phase2_detail_marks") or {"project_execution": 0, "tools_techniques": 0, "partial_results": 0},
        "phase3_detail_marks": group.get("phase3_detail_marks") or {"prototype_demonstration": 0, "results_discussions": 0, "report_poster_ppt": 0, "outcome_work": 0},
        "phase1_observations": group.get("phase1_observations") or "",
        "phase2_observations": group.get("phase2_observations") or "",
        "phase3_observations": group.get("phase3_observations") or "",
        "student_evaluations": student_evaluations_dict
    }

def populate_group_response(group: dict, db, current_user = None) -> dict:
    return build_group_response(group, db, current_user)

@router.post("/groups", response_model=GroupChatResponse)
def create_group_chat(group_data: GroupChatCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    members_to_add = list(set(group_data.member_ids + [current_user["id"]]))
    
    # Enforce team limit criteria: maximum 5 members (Only enforced when submitting for mentor approval)
    pass

        
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
        "project_sub_topic": group_data.project_sub_topic,
        "project_theme": group_data.project_theme,
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
    
    return build_group_response(new_group, db, current_user)

@router.get("/groups", response_model=List[GroupChatResponse])
def get_user_group_chats(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    member_records = list(db.group_members.find({"user_id": current_user["id"]}))
    group_ids = [m["group_id"] for m in member_records]
    groups = list(db.group_chats.find({"id": {"$in": group_ids}}))
    return [build_group_response(g, db, current_user) for g in groups]

@router.get("/groups/public", response_model=List[GroupChatResponse])
def get_public_group_chats(db = Depends(get_mongo_db)):
    # Find all public groups
    public_groups = list(db.group_chats.find({"is_public": True}))
    
    results = []
    for g in public_groups:
        resp = build_group_response(g, db, None)
        # Only show groups that have fewer than 5 members (open to accept people)
        if len(resp["member_ids"]) < 5:
            results.append(resp)
    return results

@router.get("/groups/mentor/teams", response_model=List[GroupChatResponse])
def get_mentor_teams(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can access this endpoint")
    groups = list(db.group_chats.find({"mentor_email": {"$regex": f"^{current_user['email']}$", "$options": "i"}}))
    return [populate_group_response(g, db, current_user) for g in groups]

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
        
    return build_group_response(group, db, current_user)

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
    if group_data.project_sub_topic is not None:
        update_fields["project_sub_topic"] = group_data.project_sub_topic
    if group_data.project_theme is not None:
        update_fields["project_theme"] = group_data.project_theme
        
    # Update members if provided
    if group_data.member_ids is not None:
        # Creator is always a member
        new_members = list(set(group_data.member_ids + [current_user["id"]]))
        
        # Enforce max 5 members limit (Only enforced when submitting for mentor approval)
        pass

            
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
    return build_group_response(updated_group, db, current_user)

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
        
    # Block leaving after mentor approval
    if group.get("mentor_status") == "APPROVED":
        raise HTTPException(status_code=400, detail="Leaving the team is locked after mentor approval.")
        
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
    
    # Regenerate sheets after deletion
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"message": "Team disbanded successfully"}

@router.put("/groups/{group_id}/toggle-leave", response_model=GroupChatResponse)
def toggle_group_leave(group_id: int, allow: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can change this setting")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"allow_member_leave": allow}})
    group["allow_member_leave"] = allow
    return populate_group_response(group, db, current_user)

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
    return populate_group_response(group, db, current_user)

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
    return populate_group_response(group, db, current_user)


# --- Project Dashboard and Mentor Approval Endpoints ---

from fastapi import File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse
import os
import shutil
import uuid

# Helper to sync approved team to CSV/Excel folder
def regenerate_approved_teams_csv(db):
    import csv
    import os
    from datetime import datetime
    
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
    
    approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
    rows = []
    
    for group in approved_groups:
        # Get all members
        member_records = list(db.group_members.find({"group_id": group["id"]}))
        member_ids = [m["user_id"] for m in member_records]
        
        # Exclude the mentor from member columns if they are in group_members
        mentor_email = group.get("mentor_email")
        if mentor_email:
            mentor_user = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            mentor_id = mentor_user["id"] if mentor_user else None
        else:
            mentor_id = None
        
        student_ids = [uid for uid in member_ids if uid != mentor_id]
        students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
        
        # Build member columns
        member_cols = []
        for i in range(5):
            if i < len(students):
                m = students[i]
                member_cols.extend([
                    m.get("full_name") or "",
                    m.get("email") or "",
                    m.get("usn") or "N/A",
                    m.get("cycle") or "N/A"
                ])
            else:
                member_cols.extend(["", "", "", ""])
                
        approved_at_str = group.get("approved_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        row_data = [
            str(group["id"]), group["name"], group.get("project_topic") or "",
            group.get("mentor_name") or "", group.get("mentor_email") or "", approved_at_str
        ] + member_cols
        rows.append(row_data)
        
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

def regenerate_mentor_marks_csv(db):
    import csv
    import os
    
    file_dir = "teachers_excel"
    file_path = os.path.join(file_dir, "student_phase_marks.csv")
    os.makedirs(file_dir, exist_ok=True)
    
    headers = [
        "USN", "Student Name", "Student Email", "Branch", "Section", "Year of Study",
        "Team ID", "Team Name", "Mentor Name",
        "Phase 1 Marks", "Phase 1 Observations",
        "Phase 2 Marks", "Phase 2 Observations",
        "Phase 3 Marks", "Phase 3 Observations",
        "Total Marks"
    ]
    
    students = list(db.users.find({
        "is_mentor": {"$ne": True}, 
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"}
    }))
    
    rows = []
    for s in students:
        student_id = s.get("id")
        usn = s.get("usn") or "N/A"
        name = s.get("full_name") or "N/A"
        email = s.get("email") or "N/A"
        branch = s.get("branch") or "N/A"
        section = s.get("section") or "N/A"
        year = s.get("year_of_study") or "N/A"
        
        group_id = "N/A"
        group_name = "N/A"
        mentor_name = "N/A"
        group_doc = None
        
        membership = db.group_members.find_one({"user_id": student_id})
        if membership:
            group_doc = db.group_chats.find_one({"id": membership["group_id"]})
            if group_doc:
                group_id = str(group_doc.get("id"))
                group_name = group_doc.get("name") or "N/A"
                mentor_name = group_doc.get("mentor_name") or "N/A"
                    
        p1_marks = 0
        p1_obs = ""
        p2_marks = 0
        p2_obs = ""
        p3_marks = 0
        p3_obs = ""
        
        if group_doc:
            eval_doc = db.evaluations.find_one({"group_id": group_doc.get("id"), "student_id": student_id})
            if eval_doc:
                p1_det = eval_doc.get("phase1_detail_marks") or {}
                p1_marks = sum(int(float(v or 0)) for v in p1_det.values())
                p1_obs = eval_doc.get("phase1_observations") or ""
                
                p2_det = eval_doc.get("phase2_detail_marks") or {}
                p2_marks = sum(int(float(v or 0)) for v in p2_det.values())
                p2_obs = eval_doc.get("phase2_observations") or ""
                
                p3_det = eval_doc.get("phase3_detail_marks") or {}
                p3_marks = sum(int(float(v or 0)) for v in p3_det.values())
                p3_obs = eval_doc.get("phase3_observations") or ""
                
        total_marks = p1_marks + p2_marks + p3_marks
        
        row = [
            usn, name, email, branch, section, year,
            group_id, group_name, mentor_name,
            p1_marks, p1_obs,
            p2_marks, p2_obs,
            p3_marks, p3_obs,
            total_marks
        ]
        rows.append(row)
        
    with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

def sync_approved_team_to_csv(group: dict, db):
    regenerate_approved_teams_csv(db)

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
    primary_change = False
    
    if details.project_topic is not None:
        update_fields["project_topic"] = details.project_topic
        if details.project_topic != group.get("project_topic"):
            primary_change = True
            
    if details.project_sub_topic is not None:
        update_fields["project_sub_topic"] = details.project_sub_topic
        if details.project_sub_topic != group.get("project_sub_topic"):
            primary_change = True
            
    if details.project_theme is not None:
        update_fields["project_theme"] = details.project_theme
        if details.project_theme != group.get("project_theme"):
            primary_change = True
            
    if details.mentor_name is not None:
        update_fields["mentor_name"] = details.mentor_name
        if details.mentor_name != group.get("mentor_name"):
            primary_change = True
            
    if details.mentor_email is not None:
        email_lower = details.mentor_email.lower().strip()
        if not email_lower.endswith("@gmail.com"):
            raise HTTPException(status_code=400, detail="Mentor email must end with @gmail.com")
        
        # Only check the 25-team limit if assigning a NEW mentor
        if group.get("mentor_email") != email_lower:
            primary_change = True
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

    if details.chief_mentor_name is not None:
        update_fields["chief_mentor_name"] = details.chief_mentor_name
    if details.chief_mentor_designation is not None:
        update_fields["chief_mentor_designation"] = details.chief_mentor_designation
    if details.chief_mentor_department is not None:
        update_fields["chief_mentor_department"] = details.chief_mentor_department
    if details.evaluators is not None:
        update_fields["evaluators"] = details.evaluators
        
    if primary_change:
        # Reset status if topic/mentor changes
        update_fields["mentor_status"] = "NOT_SUBMITTED"
        update_fields["mentor_token"] = None
        
        # Remove any mentor user from this group's members since status is reset to NOT_SUBMITTED
        mentor_users = list(db.users.find({"is_mentor": True}))
        mentor_ids = [m["id"] for m in mentor_users]
        db.group_members.delete_many({"group_id": group_id, "user_id": {"$in": mentor_ids}})
    
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
        regenerate_approved_teams_csv(db)
        regenerate_mentor_marks_csv(db)
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return build_group_response(updated_group, db, current_user)

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
    
    if size < 3 or size > 5:
        raise HTTPException(status_code=400, detail=f"Cannot submit. Team must contain 3 to 5 members (currently has {size})")
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

@router.post("/groups/{group_id}/mentor-action", response_model=GroupChatResponse)
def mentor_action(group_id: int, payload: MentorActionRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can approve or reject teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if (group.get("mentor_email") or "").lower().strip() != (current_user.get("email") or "").lower().strip():
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
    
    # Regenerate spreadsheets to reflect approval/rejection state
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db, current_user)

@router.put("/groups/{group_id}/marks", response_model=GroupChatResponse)
def update_group_marks(group_id: int, marks: GroupMarksUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can grade teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if (group.get("mentor_email") or "").lower().strip() != (current_user.get("email") or "").lower().strip():
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
        
    update_fields = {}
    if marks.phase1_detail_marks is not None:
        update_fields["phase1_detail_marks"] = marks.phase1_detail_marks
        update_fields["phase1_marks"] = sum(int(float(v or 0)) for v in marks.phase1_detail_marks.values())
    elif marks.phase1_marks is not None:
        update_fields["phase1_marks"] = marks.phase1_marks
        
    if marks.phase2_detail_marks is not None:
        update_fields["phase2_detail_marks"] = marks.phase2_detail_marks
        update_fields["phase2_marks"] = sum(int(float(v or 0)) for v in marks.phase2_detail_marks.values())
    elif marks.phase2_marks is not None:
        update_fields["phase2_marks"] = marks.phase2_marks
        
    if marks.phase3_detail_marks is not None:
        update_fields["phase3_detail_marks"] = marks.phase3_detail_marks
        update_fields["phase3_marks"] = sum(int(float(v or 0)) for v in marks.phase3_detail_marks.values())
    elif marks.phase3_marks is not None:
        update_fields["phase3_marks"] = marks.phase3_marks

    if marks.phase1_observations is not None:
        update_fields["phase1_observations"] = marks.phase1_observations
    if marks.phase2_observations is not None:
        update_fields["phase2_observations"] = marks.phase2_observations
    if marks.phase3_observations is not None:
        update_fields["phase3_observations"] = marks.phase3_observations

    if marks.chief_mentor_name is not None:
        update_fields["chief_mentor_name"] = marks.chief_mentor_name
    if marks.chief_mentor_designation is not None:
        update_fields["chief_mentor_designation"] = marks.chief_mentor_designation
    if marks.chief_mentor_department is not None:
        update_fields["chief_mentor_department"] = marks.chief_mentor_department

    if marks.evaluators is not None:
        update_fields["evaluators"] = marks.evaluators

    if marks.student_evaluations is not None:
        print(f"[Backend Save Logic] Save request started for group_id: {group_id} by evaluator_id: {current_user['id']}")
        # Save individual student evaluations to evaluations collection
        for student_id_str, eval_data in marks.student_evaluations.items():
            try:
                student_id = int(student_id_str)
            except (ValueError, TypeError):
                continue
                
            print(f"[Backend Save Logic] Checking existing evaluation for student_id: {student_id}")
            # Perform an INSERT only if no evaluation exists, otherwise UPDATE
            existing = db.evaluations.find_one({"group_id": group_id, "student_id": student_id})
            eval_doc = {
                "group_id": group_id,
                "student_id": student_id,
                "evaluator_id": current_user["id"],
                "phase1_detail_marks": eval_data.get("phase1_detail_marks") or {"problem_definition": 0, "objectives": 0, "methodology": 0},
                "phase1_observations": eval_data.get("phase1_observations") or "",
                "phase2_detail_marks": eval_data.get("phase2_detail_marks") or {"project_execution": 0, "tools_techniques": 0, "partial_results": 0},
                "phase2_observations": eval_data.get("phase2_observations") or "",
                "phase3_detail_marks": eval_data.get("phase3_detail_marks") or {"prototype_demonstration": 0, "results_discussions": 0, "report_poster_ppt": 0, "outcome_work": 0},
                "phase3_observations": eval_data.get("phase3_observations") or ""
            }
            if existing:
                print(f"[Backend Save Logic] [UPDATE] performed for student_id: {student_id}")
                up_res = db.evaluations.update_one(
                    {"group_id": group_id, "student_id": student_id},
                    {"$set": {
                        "evaluator_id": current_user["id"],
                        "phase1_detail_marks": eval_doc["phase1_detail_marks"],
                        "phase1_observations": eval_doc["phase1_observations"],
                        "phase2_detail_marks": eval_doc["phase2_detail_marks"],
                        "phase2_observations": eval_doc["phase2_observations"],
                        "phase3_detail_marks": eval_doc["phase3_detail_marks"],
                        "phase3_observations": eval_doc["phase3_observations"]
                    }}
                )
                print(f"[Backend Save Logic] [UPDATE RESULT] matched={up_res.matched_count}, modified={up_res.modified_count}")
            else:
                print(f"[Backend Save Logic] [INSERT] performed for student_id: {student_id}")
                eval_doc["id"] = get_next_sequence_value("evaluations")
                ins_res = db.evaluations.insert_one(eval_doc)
                print(f"[Backend Save Logic] [INSERT RESULT] acknowledged={ins_res.acknowledged}, inserted_id={ins_res.inserted_id}")
                
            # Verify immediately by querying MongoDB
            confirm_doc = db.evaluations.find_one({"group_id": group_id, "student_id": student_id})
            print(f"[Backend Save Logic] [DATABASE CONFIRMATION QUERY] Retrieved doc for student {student_id}: {confirm_doc}")
            
        print(f"[Backend Save Logic] All evaluations saved successfully for group_id: {group_id}")

        # Calculate overall phase marks by taking the average of all students' total marks
        try:
            p1_sums = []
            p2_sums = []
            p3_sums = []
            for stud_id, eval_data in marks.student_evaluations.items():
                if not eval_data or not isinstance(eval_data, dict):
                    continue
                p1_det = eval_data.get("phase1_detail_marks") or {}
                if isinstance(p1_det, dict):
                    p1_sums.append(sum(int(float(v or 0)) for v in p1_det.values() if v is not None))
                
                p2_det = eval_data.get("phase2_detail_marks") or {}
                if isinstance(p2_det, dict):
                    p2_sums.append(sum(int(float(v or 0)) for v in p2_det.values() if v is not None))
                
                p3_det = eval_data.get("phase3_detail_marks") or {}
                if isinstance(p3_det, dict):
                    p3_sums.append(sum(int(float(v or 0)) for v in p3_det.values() if v is not None))
                
            if p1_sums:
                update_fields["phase1_marks"] = int(sum(p1_sums) / len(p1_sums))
            if p2_sums:
                update_fields["phase2_marks"] = int(sum(p2_sums) / len(p2_sums))
            if p3_sums:
                update_fields["phase3_marks"] = int(sum(p3_sums) / len(p3_sums))
        except Exception as calc_err:
            import logging
            logging.warning(f"Phase mark calculation failed for group {group_id}: {calc_err}")
        
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    
    # Regenerate marks sheet after saving
    regenerate_mentor_marks_csv(db)
        
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db, current_user)

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


LOGO_BASE64 = (
    "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"
    "Jggg=="
)

class EvaluationPDF(FPDF):
    def __init__(self, title: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.report_title = title
        self.set_margins(12, 12, 12)
        self.alias_nb_pages()

    def header(self):
        try:
            logo_bytes = base64.b64decode(LOGO_BASE64)
            self.image(BytesIO(logo_bytes), x=12, y=8, h=15)
        except Exception:
            self.set_font("times", "B", 14)
            self.set_text_color(31, 78, 120)
            self.text(12, 18, "R. V. COLLEGE OF ENGINEERING")
        
        self.set_draw_color(31, 78, 120)
        self.set_line_width(0.6)
        self.line(12, 25, 198, 25)
        self.ln(18)

    def footer(self):
        self.set_y(-15)
        self.set_font("times", "I", 8)
        self.set_text_color(128, 128, 128)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.cell(0, 10, f"Generated on {now_str}  |  Page {self.page_no()}/{{nb}}", align="C")

def draw_two_col_row(pdf, col1_text, col2_text, col1_width=65, col2_width=121, col1_color=(192, 0, 0), col2_color=(47, 85, 151)):
    x_start = pdf.get_x()
    y_start = pdf.get_y()
    
    pdf.set_text_color(*col1_color)
    pdf.set_font("times", "B", 10)
    pdf.set_xy(x_start, y_start)
    pdf.multi_cell(col1_width, 5, col1_text, border=0)
    y1 = pdf.get_y()
    
    pdf.set_text_color(*col2_color)
    pdf.set_font("times", "B", 10)
    pdf.set_xy(x_start + col1_width, y_start)
    pdf.multi_cell(col2_width, 5, col2_text, border=0)
    y2 = pdf.get_y()
    
    max_h = max(y1, y2)
    row_height = max_h - y_start
    
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.2)
    pdf.rect(x_start, y_start, col1_width + col2_width, row_height)
    pdf.line(x_start + col1_width, y_start, x_start + col1_width, max_h)
    
    pdf.set_xy(x_start, max_h)

def draw_four_col_row(pdf, vals, widths=[40, 70, 30, 46]):
    x_start = pdf.get_x()
    y_start = pdf.get_y()
    
    heights = []
    pdf.set_font("times", "B", 10)
    pdf.set_text_color(0, 0, 0)
    for i, val in enumerate(vals):
        pdf.set_xy(x_start + sum(widths[:i]), y_start)
        pdf.multi_cell(widths[i], 5, val, border=0)
        heights.append(pdf.get_y() - y_start)
        
    max_h = max(heights)
    
    for i, val in enumerate(vals):
        pdf.set_xy(x_start + sum(widths[:i]), y_start)
        pdf.multi_cell(widths[i], 5, val, border=0)
        pdf.rect(x_start + sum(widths[:i]), y_start, widths[i], max_h)
        
    pdf.set_xy(x_start, y_start + max_h)

def draw_member_row(pdf, col_widths, vals):
    x_start = pdf.get_x()
    y_start = pdf.get_y()
    
    heights = []
    pdf.set_font("times", "", 8)
    pdf.set_text_color(0, 0, 0)
    for i, val in enumerate(vals):
        pdf.set_xy(x_start + sum(col_widths[:i]), y_start)
        pdf.multi_cell(col_widths[i], 5, val, border=0)
        heights.append(pdf.get_y() - y_start)
        
    max_h = max(heights)
    
    for i, val in enumerate(vals):
        pdf.set_xy(x_start + sum(col_widths[:i]), y_start)
        pdf.multi_cell(col_widths[i], 5, val, border=0, align="C" if i < 3 else "L")
        pdf.rect(x_start + sum(col_widths[:i]), y_start, col_widths[i], max_h)
        
    pdf.set_xy(x_start, y_start + max_h)

def safe_upper(val) -> str:
    if not val:
        return ""
    return str(val).upper()

def draw_evaluators_signatures_table(pdf, mentor_name, evaluators):
    pdf.set_text_color(31, 78, 120)
    pdf.set_font("times", "B", 9)
    pdf.cell(0, 5, "Mentors / Evaluators Name and Signature", ln=True)
    pdf.ln(2)
    
    col_widths = [15, 116, 55]
    pdf.set_text_color(0, 0, 0)
    
    x_start = pdf.get_x()
    y_start = pdf.get_y()
    pdf.set_font("times", "", 9)
    pdf.cell(col_widths[0], 6, "1.", border=1, align="C")
    pdf.set_font("times", "B", 9)
    pdf.set_text_color(47, 85, 151)
    mentor_display = safe_upper(mentor_name)
    pdf.cell(col_widths[1], 6, f" {mentor_display}  (Faculty Mentor)", border=1)
    pdf.set_font("times", "I", 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(col_widths[2], 6, "Digitally Signed", border=1, align="R")
    pdf.ln(6)
    
    active_evals = [e for e in (evaluators or []) if e and str(e).strip()]
    for idx in range(3):
        row_num = idx + 2
        name_val = ""
        sign_val = ""
        if idx < len(active_evals):
            name_val = safe_upper(active_evals[idx])
            sign_val = "Digitally Signed"
            
        pdf.set_font("times", "", 9)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(col_widths[0], 6, f"{row_num}.", border=1, align="C")
        pdf.set_font("times", "B", 9)
        pdf.set_text_color(47, 85, 151)
        pdf.cell(col_widths[1], 6, f" {name_val}", border=1)
        pdf.set_font("times", "I", 8)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(col_widths[2], 6, sign_val, border=1, align="R")
        pdf.ln(6)

@router.get("/groups/{group_id}/evaluation-pdf")
def get_group_evaluation_pdf(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    is_approved_mentor = (
        current_user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (current_user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    is_admin = current_user.get("is_admin", False)
    
    if not is_member and not is_approved_mentor and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this group evaluations")
        
    group_details = build_group_response(group, db, current_user)
    
    pdf = EvaluationPDF("Experiential Learning Evaluation Sheets")
    
    # PAGE 1: COVER PAGE
    pdf.add_page()
    
    pdf.set_fill_color(226, 240, 217)
    pdf.set_draw_color(56, 87, 35)
    pdf.set_line_width(0.8)
    pdf.rect(20, pdf.get_y() + 5, 170, 18, style="DF")
    pdf.set_xy(20, pdf.get_y() + 10)
    pdf.set_font("times", "B", 13)
    pdf.set_text_color(31, 78, 120)
    pdf.cell(170, 8, "EXPERIENTIAL LEARNING OBSERVATION RECORD", align="C")
    pdf.ln(18)
    
    pdf.set_font("times", "B", 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 5, "For the II Semester B.E PROGRAMS, 2025 batch", align="C", ln=True)
    pdf.ln(10)
    
    pdf.set_font("times", "B", 11)
    pdf.cell(0, 5, "Title of the project", align="C", ln=True)
    pdf.set_text_color(192, 0, 0)
    pdf.set_font("times", "B", 12)
    pdf.multi_cell(0, 5, (group_details.get("project_topic") or "").upper(), align="C")
    pdf.ln(4)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("times", "B", 11)
    pdf.cell(0, 5, "Theme", align="C", ln=True)
    pdf.set_text_color(192, 0, 0)
    pdf.set_font("times", "B", 12)
    pdf.multi_cell(0, 5, (group_details.get("project_theme") or "Not Specified").upper(), align="C")
    pdf.ln(4)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("times", "B", 11)
    pdf.cell(0, 5, "Team Name", align="C", ln=True)
    pdf.set_text_color(192, 0, 0)
    pdf.set_font("times", "B", 12)
    pdf.multi_cell(0, 5, (group_details.get("name") or "").upper(), align="C")
    pdf.ln(8)
    
    students = [m for m in group_details.get("members", []) if not m.get("is_mentor")]
    students_text = ""
    for s in students:
        students_text += f"{safe_upper(s.get('full_name'))}  ({safe_upper(s.get('usn') or 'N/A')})\n"
        
    mentor_info = f"{safe_upper(group_details.get('mentor_name'))}\n"
    if students and students[0].get("department"):
        mentor_info += f"DEPARTMENT OF {safe_upper(students[0].get('department'))}"
    else:
        mentor_info += "FACULTY ADVISOR"
        
    chief_mentor_info = f"{safe_upper(group_details.get('chief_mentor_name'))}\n"
    chief_mentor_info += f"{safe_upper(group_details.get('chief_mentor_designation'))}"
    if group_details.get("chief_mentor_department"):
        chief_mentor_info += f" • DEPARTMENT OF {safe_upper(group_details.get('chief_mentor_department'))}"
        
    draw_two_col_row(pdf, "Name of the students\n(In Capitals) with USN", students_text.strip())
    draw_two_col_row(pdf, "Name of the faculty Mentor with Designation and Department", chief_mentor_info.strip() if not group_details.get("mentor_name") else mentor_info.strip())
    draw_two_col_row(pdf, "Name of the Chief Faculty Mentor with Designation and Department", chief_mentor_info.strip())
    
    # PAGE 2: TEAM INFO & SIGNATURES
    pdf.add_page()
    pdf.set_font("times", "B", 18)
    pdf.set_text_color(192, 0, 0)
    pdf.cell(0, 8, "EXPERIENTIAL LEARNING", align="C", ln=True)
    pdf.set_font("times", "B", 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 5, "For the II Semester B.E PROGRAMS", align="C", ln=True)
    pdf.ln(5)
    
    draw_two_col_row(pdf, "Team Name", safe_upper(group_details.get("name")), col1_width=50, col2_width=136, col1_color=(31, 78, 120), col2_color=(47, 85, 151))
    draw_two_col_row(pdf, "Theme", (group_details.get("project_theme") or "N/A"), col1_width=50, col2_width=136, col1_color=(31, 78, 120), col2_color=(0, 0, 0))
    draw_two_col_row(pdf, "Team ID", f"EL-2026-TEAM-{group_id}", col1_width=50, col2_width=136, col1_color=(31, 78, 120), col2_color=(0, 0, 0))
    draw_two_col_row(pdf, "Topic", safe_upper(group_details.get("project_topic") or "N/A"), col1_width=50, col2_width=136, col1_color=(31, 78, 120), col2_color=(192, 0, 0))
    leader_name = students[0].get("full_name", "N/A") if students else "N/A"
    draw_two_col_row(pdf, "Team Leader Name", safe_upper(leader_name), col1_width=50, col2_width=136, col1_color=(31, 78, 120), col2_color=(47, 85, 151))
    pdf.ln(8)
    
    pdf.set_font("times", "B", 10)
    pdf.set_text_color(31, 78, 120)
    pdf.cell(0, 5, "Details of the Group Members", align="C", ln=True)
    pdf.ln(3)
    
    col_widths = [12, 20, 20, 38, 46, 50]
    headers = ["Sl. No.", "Program", "Cycle", "USN/Reg. Number", "Name", "RVCE Email Id"]
    pdf.set_fill_color(242, 242, 242)
    pdf.set_font("times", "B", 9)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 7, h, border=1, align="C", fill=True)
    pdf.ln(7)
    
    pdf.set_font("times", "", 8)
    pdf.set_text_color(0, 0, 0)
    for idx in range(4):
        if idx < len(students):
            s = students[idx]
            vals = [
                f"{idx + 1}.",
                "B.E",
                f"{safe_upper(s.get('cycle') or 'P')}-Cycle",
                safe_upper(s.get('usn') or 'N/A'),
                safe_upper(s.get('full_name')),
                s.get('email', '')
            ]
        else:
            vals = [f"{idx + 1}.", "", "", "", "", ""]
        draw_member_row(pdf, col_widths, vals)
        
    y_sig = pdf.get_y() + 25
    col_w = 40
    gap = 8
    pdf.set_font("times", "B", 8)
    for idx, s in enumerate(students[:4]):
        x_col = 12 + idx * (col_w + gap)
        pdf.set_xy(x_col, y_sig)
        pdf.line(x_col, y_sig, x_col + col_w, y_sig)
        pdf.set_xy(x_col, y_sig + 1)
        pdf.cell(col_w, 4, f"Student-{idx + 1} Signature", align="C")
        pdf.set_xy(x_col, y_sig + 5)
        pdf.set_font("times", "", 7)
        pdf.cell(col_w, 4, safe_upper(s.get('full_name')), align="C")
        pdf.set_font("times", "B", 8)
        
    y_sig2 = y_sig + 25
    labels = ["Faculty Mentor", "Chief Faculty Mentor", "Dean Academics", "Vice Principal"]
    for idx, label in enumerate(labels):
        x_col = 12 + idx * (col_w + gap)
        pdf.set_xy(x_col, y_sig2)
        pdf.line(x_col, y_sig2, x_col + col_w, y_sig2)
        pdf.set_xy(x_col, y_sig2 + 1)
        pdf.cell(col_w, 4, label, align="C")
        
    student_evals = group_details.get("student_evaluations") or {}
    evaluators = group_details.get("evaluators") or ["", "", "", ""]
    team_mentor_name = group_details.get("mentor_name") or "Faculty Mentor"
    team_theme = group_details.get("project_theme") or "N/A"
    team_name = group_details.get("name") or "N/A"
    team_topic = group_details.get("project_topic") or "N/A"
    team_id = group_details.get("id")
    
    for stud in students:
        eval_data = student_evals.get(str(stud["id"])) or {}
        
        # --- PHASE I ---
        pdf.add_page()
        pdf.set_font("times", "B", 12)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(0, 6, "PHASE -1 EVALUATION – 40 MARKS", align="C", ln=True)
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "EXPERIENTIAL LEARNING EVALUATION SHEET", align="C", ln=True)
        pdf.ln(2)
        
        draw_two_col_row(pdf, "Theme:", team_theme or "N/A", col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_four_col_row(pdf, ["Team Name:", safe_upper(team_name), "Team No:", f"EL-{team_id}"])
        draw_two_col_row(pdf, "Title:", safe_upper(team_topic or "N/A"), col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(3)
        
        draw_two_col_row(pdf, "USN", safe_upper(stud.get("usn") or "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "NAME (in Capitals)", safe_upper(stud.get("full_name")), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "Mobile No.", stud.get("mobile_no", "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_two_col_row(pdf, "Email Id", stud.get("email", ""), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(4)
        
        pdf.set_fill_color(242, 242, 242)
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(116, 6, "Parameter", border=1, fill=True)
        pdf.cell(35, 6, "Maximum", border=1, align="C", fill=True)
        pdf.cell(35, 6, "Obtained", border=1, align="C", fill=True)
        pdf.ln(6)
        
        p1_det = eval_data.get("phase1_detail_marks") or {}
        p1_prob = p1_det.get("problem_definition", 0)
        p1_obj = p1_det.get("objectives", 0)
        p1_meth = p1_det.get("methodology", 0)
        p1_total = p1_prob + p1_obj + p1_meth
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Problem Definition", border=1)
        pdf.cell(35, 5.5, "10", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p1_prob), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Objectives", border=1)
        pdf.cell(35, 5.5, "10", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p1_obj), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Methodology", border=1)
        pdf.cell(35, 5.5, "20", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p1_meth), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(116, 5.5, "Total", border=1)
        pdf.cell(35, 5.5, "40", border=1, align="C")
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p1_total), border=1, align="C")
        pdf.ln(7)
        
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "Observations by the Faculty Mentors / Evaluators:", ln=True)
        pdf.set_font("times", "I", 9)
        pdf.cell(0, 4, "(Suggestions and Guidelines to be included)", ln=True)
        
        obs_y = pdf.get_y() + 2
        pdf.rect(12, obs_y, 186, 16)
        pdf.set_xy(14, obs_y + 2)
        pdf.set_text_color(47, 85, 151)
        pdf.set_font("times", "BI", 9)
        pdf.multi_cell(182, 4, eval_data.get("phase1_observations") or "")
        pdf.set_y(obs_y + 18)
        
        draw_evaluators_signatures_table(pdf, team_mentor_name, evaluators)
        
        # --- PHASE II ---
        pdf.add_page()
        pdf.set_font("times", "B", 12)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(0, 6, "PHASE -II EVALUATION – 50 MARKS", align="C", ln=True)
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "EXPERIENTIAL LEARNING EVALUATION SHEET", align="C", ln=True)
        pdf.ln(2)
        
        draw_two_col_row(pdf, "Theme:", team_theme or "N/A", col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_four_col_row(pdf, ["Team Name:", safe_upper(team_name), "Team No:", f"EL-{team_id}"])
        draw_two_col_row(pdf, "Title:", safe_upper(team_topic or "N/A"), col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(3)
        
        draw_two_col_row(pdf, "USN", safe_upper(stud.get("usn") or "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "NAME (in Capitals)", safe_upper(stud.get("full_name")), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "Mobile No.", stud.get("mobile_no", "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_two_col_row(pdf, "Email Id", stud.get("email", ""), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(4)
        
        pdf.set_fill_color(242, 242, 242)
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(116, 6, "Parameter", border=1, fill=True)
        pdf.cell(35, 6, "Maximum", border=1, align="C", fill=True)
        pdf.cell(35, 6, "Obtained", border=1, align="C", fill=True)
        pdf.ln(6)
        
        p2_det = eval_data.get("phase2_detail_marks") or {}
        p2_exec = p2_det.get("project_execution", 0)
        p2_tools = p2_det.get("tools_techniques", 0)
        p2_res = p2_det.get("partial_results", 0)
        p2_total = p2_exec + p2_tools + p2_res
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Project Execution", border=1)
        pdf.cell(35, 5.5, "20", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p2_exec), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Tools and Techniques Used", border=1)
        pdf.cell(35, 5.5, "15", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p2_tools), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Partial Results (mentors can Gauge the status)", border=1)
        pdf.cell(35, 5.5, "15", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p2_res), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(116, 5.5, "Total", border=1)
        pdf.cell(35, 5.5, "50", border=1, align="C")
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p2_total), border=1, align="C")
        pdf.ln(7)
        
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "Observations by the Faculty Mentors / Evaluators:", ln=True)
        pdf.set_font("times", "I", 9)
        pdf.cell(0, 4, "(Suggestions and Guidelines to be included)", ln=True)
        
        obs_y = pdf.get_y() + 2
        pdf.rect(12, obs_y, 186, 16)
        pdf.set_xy(14, obs_y + 2)
        pdf.set_text_color(47, 85, 151)
        pdf.set_font("times", "BI", 9)
        pdf.multi_cell(182, 4, eval_data.get("phase2_observations") or "")
        pdf.set_y(obs_y + 18)
        
        draw_evaluators_signatures_table(pdf, team_mentor_name, evaluators)
        
        # --- PHASE III ---
        pdf.add_page()
        pdf.set_font("times", "B", 12)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(0, 6, "PHASE -III EVALUATION – 50 MARKS", align="C", ln=True)
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "EXPERIENTIAL LEARNING EVALUATION SHEET", align="C", ln=True)
        pdf.ln(2)
        
        draw_two_col_row(pdf, "Theme:", team_theme or "N/A", col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_four_col_row(pdf, ["Team Name:", safe_upper(team_name), "Team No:", f"EL-{team_id}"])
        draw_two_col_row(pdf, "Title:", safe_upper(team_topic or "N/A"), col1_width=40, col2_width=146, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(3)
        
        draw_two_col_row(pdf, "USN", safe_upper(stud.get("usn") or "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "NAME (in Capitals)", safe_upper(stud.get("full_name")), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(47, 85, 151))
        draw_two_col_row(pdf, "Mobile No.", stud.get("mobile_no", "N/A"), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        draw_two_col_row(pdf, "Email Id", stud.get("email", ""), col1_width=50, col2_width=136, col1_color=(0,0,0), col2_color=(0,0,0))
        pdf.ln(4)
        
        pdf.set_fill_color(242, 242, 242)
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(31, 78, 120)
        pdf.cell(116, 6, "Parameter", border=1, fill=True)
        pdf.cell(35, 6, "Maximum", border=1, align="C", fill=True)
        pdf.cell(35, 6, "Obtained", border=1, align="C", fill=True)
        pdf.ln(6)
        
        p3_det = eval_data.get("phase3_detail_marks") or {}
        p3_proto = p3_det.get("prototype_demonstration", 0)
        p3_disc = p3_det.get("results_discussions", 0)
        p3_rept = p3_det.get("report_poster_ppt", 0)
        p3_out = p3_det.get("outcome_work", 0)
        p3_total = p3_proto + p3_disc + p3_rept + p3_out
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Complete prototype demonstration", border=1)
        pdf.cell(35, 5.5, "5", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p3_proto), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Results & Discussions", border=1)
        pdf.cell(35, 5.5, "5", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p3_disc), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Report, Poster and PPT demonstration", border=1)
        pdf.cell(35, 5.5, "10", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p3_rept), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "", 9)
        pdf.cell(116, 5.5, "Outcome of the work (Publication/Product Development/Patenting)", border=1)
        pdf.cell(35, 5.5, "30", border=1, align="C")
        pdf.set_font("times", "B", 10)
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p3_out), border=1, align="C")
        pdf.ln(5.5)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(116, 5.5, "Total", border=1)
        pdf.cell(35, 5.5, "50", border=1, align="C")
        pdf.set_text_color(192, 0, 0)
        pdf.cell(35, 5.5, str(p3_total), border=1, align="C")
        pdf.ln(7)
        
        pdf.set_text_color(192, 0, 0)
        pdf.set_font("times", "B", 10)
        pdf.cell(0, 5, "Observations by the Faculty Mentors / Evaluators:", ln=True)
        pdf.set_font("times", "I", 9)
        pdf.cell(0, 4, "(Suggestions and Guidelines to be included)", ln=True)
        
        obs_y = pdf.get_y() + 2
        pdf.rect(12, obs_y, 186, 16)
        pdf.set_xy(14, obs_y + 2)
        pdf.set_text_color(47, 85, 151)
        pdf.set_font("times", "BI", 9)
        pdf.multi_cell(182, 4, eval_data.get("phase3_observations") or "")
        pdf.set_y(obs_y + 18)
        
        draw_evaluators_signatures_table(pdf, team_mentor_name, evaluators)
        
    pdf_bytes = pdf.output()
    filename = f"observation_record_team_{group_id}.pdf"
    
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

