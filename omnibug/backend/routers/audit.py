from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from bson import ObjectId

from database_mongo import get_mongo_db
from schemas import ActivityLogOut

router = APIRouter(prefix="/api/audit", tags=["Audit Trails & History"])

def format_activity(a: dict) -> ActivityLogOut:
    return ActivityLogOut(
        id=str(a.get("_id")),
        bug_id=str(a.get("bug_id")),
        bug_key=a.get("bug_key"),
        user_id=str(a.get("user_id")),
        user_name=a.get("user_name", "System"),
        user_avatar=a.get("user_avatar"),
        action_type=a.get("action_type", "updated"),
        field_name=a.get("field_name"),
        old_value=a.get("old_value"),
        new_value=a.get("new_value"),
        timestamp=a.get("timestamp")
    )

@router.get("/activities", response_model=List[ActivityLogOut])
def get_global_activity_feed(limit: int = 50):
    db = get_mongo_db()
    docs = db.activities.find({}).sort("timestamp", -1).limit(limit)
    return [format_activity(d) for d in docs]

@router.get("/bugs/{bug_id}", response_model=List[ActivityLogOut])
def get_bug_activity_history(bug_id: str):
    db = get_mongo_db()
    docs = db.activities.find({"bug_id": bug_id}).sort("timestamp", -1)
    return [format_activity(d) for d in docs]
