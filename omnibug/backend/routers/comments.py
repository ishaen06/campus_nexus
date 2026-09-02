from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime

from database_mongo import get_mongo_db
from schemas import CommentCreate, CommentOut, UserOut
from routers.auth import get_current_user
from services.websocket_manager import manager

router = APIRouter(prefix="/api", tags=["Comments & Collaboration"])

def format_comment_out(c: dict, db) -> CommentOut:
    user_doc = db.users.find_one({"_id": ObjectId(c.get("user_id"))}) if c.get("user_id") else None
    return CommentOut(
        id=str(c.get("_id")),
        bug_id=str(c.get("bug_id")),
        user_id=str(c.get("user_id")),
        user_name=user_doc.get("full_name") if user_doc else c.get("user_name", "Anonymous"),
        user_avatar=user_doc.get("avatar_url") if user_doc else c.get("user_avatar"),
        user_role=user_doc.get("role", "developer") if user_doc else "developer",
        content=c.get("content", ""),
        is_internal=c.get("is_internal", False),
        reactions=c.get("reactions", {}),
        attachments=c.get("attachments", []),
        created_at=c.get("created_at", datetime.utcnow()),
        updated_at=c.get("updated_at")
    )

@router.get("/bugs/{bug_id}/comments", response_model=List[CommentOut])
def get_comments(bug_id: str):
    db = get_mongo_db()
    docs = db.comments.find({"bug_id": bug_id}).sort("created_at", 1)
    return [format_comment_out(d, db) for d in docs]

@router.post("/bugs/{bug_id}/comments", response_model=CommentOut)
async def create_comment(
    bug_id: str,
    comment_in: CommentCreate,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_mongo_db()
    bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    now = datetime.utcnow()
    doc = {
        "bug_id": bug_id,
        "user_id": current_user.id,
        "user_name": current_user.full_name,
        "user_avatar": current_user.avatar_url,
        "user_role": current_user.role.value,
        "content": comment_in.content,
        "is_internal": comment_in.is_internal,
        "reactions": {},
        "attachments": comment_in.attachments,
        "created_at": now,
        "updated_at": now
    }
    result = db.comments.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    # Also record in bug activities
    activity_doc = {
        "bug_id": bug_id,
        "bug_key": bug.get("key"),
        "user_id": current_user.id,
        "user_name": current_user.full_name,
        "user_avatar": current_user.avatar_url,
        "action_type": "added_comment",
        "field_name": "comment",
        "old_value": None,
        "new_value": comment_in.content[:80] + ("..." if len(comment_in.content) > 80 else ""),
        "timestamp": now
    }
    db.activities.insert_one(activity_doc)
    
    # Touch updated_at on bug
    db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": {"updated_at": now}})
    
    comment_out = format_comment_out(doc, db)
    await manager.broadcast_global("COMMENT_ADDED", comment_out.dict())
    return comment_out

@router.post("/comments/{comment_id}/react")
async def react_to_comment(
    comment_id: str,
    emoji: str,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_mongo_db()
    try:
        comment = db.comments.find_one({"_id": ObjectId(comment_id)})
    except Exception:
        comment = None
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    reactions = comment.get("reactions", {})
    user_list = reactions.get(emoji, [])
    
    if current_user.id in user_list:
        user_list.remove(current_user.id)
    else:
        user_list.append(current_user.id)
        
    if user_list:
        reactions[emoji] = user_list
    elif emoji in reactions:
        del reactions[emoji]
        
    db.comments.update_one({"_id": ObjectId(comment_id)}, {"$set": {"reactions": reactions}})
    await manager.broadcast_global("REACTION_UPDATED", {"comment_id": comment_id, "reactions": reactions})
    return {"reactions": reactions}

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    try:
        comment = db.comments.find_one({"_id": ObjectId(comment_id)})
    except Exception:
        comment = None
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    if comment.get("user_id") != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
    db.comments.delete_one({"_id": ObjectId(comment_id)})
    return {"message": "Comment deleted"}
