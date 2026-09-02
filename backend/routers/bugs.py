from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Any, Dict
from bson import ObjectId
from datetime import datetime, timedelta
import re

from database_mongo import get_mongo_db, get_next_bug_key
from schemas import (
    BugCreate, BugUpdate, BugOut, BugTransitionRequest, BugBulkAction,
    BugStatus, BugResolution, BugSeverity, BugPriority, UserOut,
    ActivityLogOut
)
from routers.auth import get_current_user
from services.websocket_manager import manager

router = APIRouter(prefix="/api/bugs", tags=["Bugs & Defects Lifecycle"])

def format_bug_out(b: dict, db) -> BugOut:
    b_id_str = str(b.get("_id"))
    
    # Resolve names
    reporter_doc = db.users.find_one({"_id": ObjectId(b.get("reporter_id"))}) if b.get("reporter_id") else None
    assignee_doc = db.users.find_one({"_id": ObjectId(b.get("assignee_id"))}) if b.get("assignee_id") else None
    qa_doc = db.users.find_one({"_id": ObjectId(b.get("qa_contact_id"))}) if b.get("qa_contact_id") else None
    
    prod_doc = db.products.find_one({"_id": ObjectId(b.get("product_id"))}) if b.get("product_id") else None
    comp_doc = db.components.find_one({"_id": ObjectId(b.get("component_id"))}) if b.get("component_id") else None
    ms_doc = db.milestones.find_one({"_id": ObjectId(b.get("milestone_id"))}) if b.get("milestone_id") else None
    
    # Counts
    comments_cnt = db.comments.count_documents({"bug_id": b_id_str})
    commits_cnt = db.commits.count_documents({"bug_id": b_id_str})
    duplicates_cnt = db.bugs.count_documents({"duplicate_of": b.get("key")})
    
    # SLA calculation
    created_at = b.get("created_at", datetime.utcnow())
    sla_due_hours = b.get("sla_due_hours", 48)
    sla_deadline = created_at + timedelta(hours=sla_due_hours)
    now = datetime.utcnow()
    
    is_closed = b.get("status") in ["resolved", "verified", "closed"]
    sla_time_left = None
    sla_breached = False
    
    if not is_closed:
        time_diff = (sla_deadline - now).total_seconds() / 3600.0
        sla_time_left = round(time_diff, 1)
        sla_breached = time_diff < 0
    
    return BugOut(
        id=b_id_str,
        key=b.get("key", "BUG-000"),
        title=b.get("title", ""),
        description=b.get("description", ""),
        product_id=str(b.get("product_id", "")),
        component_id=str(b.get("component_id", "")),
        severity=b.get("severity", BugSeverity.NORMAL),
        priority=b.get("priority", BugPriority.P3_MEDIUM),
        status=b.get("status", BugStatus.UNCONFIRMED),
        resolution=b.get("resolution"),
        milestone_id=str(b.get("milestone_id")) if b.get("milestone_id") else None,
        version=b.get("version", "1.0.0"),
        reporter_id=str(b.get("reporter_id", "")),
        reporter_name=reporter_doc.get("full_name") if reporter_doc else "Unknown Reporter",
        reporter_avatar=reporter_doc.get("avatar_url") if reporter_doc else None,
        assignee_id=str(b.get("assignee_id")) if b.get("assignee_id") else None,
        assignee_name=assignee_doc.get("full_name") if assignee_doc else "Unassigned",
        assignee_avatar=assignee_doc.get("avatar_url") if assignee_doc else None,
        qa_contact_id=str(b.get("qa_contact_id")) if b.get("qa_contact_id") else None,
        qa_contact_name=qa_doc.get("full_name") if qa_doc else None,
        cc_user_ids=[str(u) for u in b.get("cc_user_ids", [])],
        product_name=prod_doc.get("name") if prod_doc else None,
        component_name=comp_doc.get("name") if comp_doc else None,
        milestone_name=ms_doc.get("name") if ms_doc else None,
        tags=b.get("tags", []),
        is_security_vulnerability=b.get("is_security_vulnerability", False),
        environment=b.get("environment", {}),
        reproduction_steps=b.get("reproduction_steps", []),
        stack_trace=b.get("stack_trace"),
        root_cause_analysis=b.get("root_cause_analysis"),
        blocks=b.get("blocks", []),
        depends_on=b.get("depends_on", []),
        duplicate_of=b.get("duplicate_of"),
        duplicates_count=duplicates_cnt,
        estimated_hours=b.get("estimated_hours", 0.0),
        spent_hours=b.get("spent_hours", 0.0),
        remaining_hours=b.get("remaining_hours", 0.0),
        sla_due_hours=sla_due_hours,
        sla_breached=sla_breached,
        sla_time_left_hours=sla_time_left,
        flags=b.get("flags", {}),
        comments_count=comments_cnt,
        commits_count=commits_cnt,
        created_at=created_at,
        updated_at=b.get("updated_at", created_at),
        resolved_at=b.get("resolved_at")
    )

def log_activity(db, bug_id: str, bug_key: str, user: UserOut, action: str, field: str = None, old_val: Any = None, new_val: Any = None):
    activity_doc = {
        "bug_id": bug_id,
        "bug_key": bug_key,
        "user_id": user.id,
        "user_name": user.full_name,
        "user_avatar": user.avatar_url,
        "action_type": action,
        "field_name": field,
        "old_value": str(old_val) if old_val is not None else None,
        "new_value": str(new_val) if new_val is not None else None,
        "timestamp": datetime.utcnow()
    }
    db.activities.insert_one(activity_doc)

@router.get("", response_model=List[BugOut])
def list_bugs(
    product_id: Optional[str] = None,
    component_id: Optional[str] = None,
    milestone_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None,
    reporter_id: Optional[str] = None,
    is_security: Optional[bool] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    db = get_mongo_db()
    query: Dict[str, Any] = {}
    
    if product_id and product_id != "all":
        query["product_id"] = product_id
    if component_id and component_id != "all":
        query["component_id"] = component_id
    if milestone_id and milestone_id != "all":
        query["milestone_id"] = milestone_id
    if is_security is not None:
        query["is_security_vulnerability"] = is_security
    if tag:
        query["tags"] = tag
        
    if status and status != "all":
        statuses = [s.strip() for s in status.split(",")]
        query["status"] = {"$in": statuses} if len(statuses) > 1 else statuses[0]
        
    if severity and severity != "all":
        severities = [s.strip() for s in severity.split(",")]
        query["severity"] = {"$in": severities} if len(severities) > 1 else severities[0]
        
    if priority and priority != "all":
        priorities = [p.strip() for p in priority.split(",")]
        query["priority"] = {"$in": priorities} if len(priorities) > 1 else priorities[0]
        
    if assignee_id and assignee_id != "all":
        query["assignee_id"] = assignee_id
    if reporter_id and reporter_id != "all":
        query["reporter_id"] = reporter_id
        
    if search:
        # Full-text regex search across title, description, key, tags
        regex = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"title": {"$regex": regex}},
            {"description": {"$regex": regex}},
            {"key": {"$regex": regex}},
            {"tags": {"$regex": regex}},
            {"stack_trace": {"$regex": regex}}
        ]
        
    docs = db.bugs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return [format_bug_out(d, db) for d in docs]

@router.post("", response_model=BugOut)
async def create_bug(bug_in: BugCreate, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    
    # Retrieve product prefix
    prod = db.products.find_one({"_id": ObjectId(bug_in.product_id)}) if bug_in.product_id else None
    prefix = prod.get("key_prefix", "BUG") if prod else "BUG"
    
    # Generate sequential unique key
    bug_key = get_next_bug_key(prefix)
    
    # Derive SLA due hours based on severity
    sla_map = {
        BugSeverity.BLOCKER: 12,
        BugSeverity.CRITICAL: 24,
        BugSeverity.MAJOR: 48,
        BugSeverity.NORMAL: 72,
        BugSeverity.MINOR: 120,
        BugSeverity.TRIVIAL: 240,
        BugSeverity.ENHANCEMENT: 360
    }
    sla_hours = bug_in.sla_due_hours or sla_map.get(bug_in.severity, 48)
    
    now = datetime.utcnow()
    doc = bug_in.dict()
    doc["key"] = bug_key
    doc["reporter_id"] = current_user.id
    doc["sla_due_hours"] = sla_hours
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["resolved_at"] = None
    
    result = db.bugs.insert_one(doc)
    doc["_id"] = result.inserted_id
    bug_id_str = str(result.inserted_id)
    
    # Log activity
    log_activity(db, bug_id_str, bug_key, current_user, "created", "status", None, bug_in.status.value)
    
    bug_out = format_bug_out(doc, db)
    # Broadcast live update
    await manager.broadcast_global("BUG_CREATED", bug_out.dict())
    
    return bug_out

@router.get("/{bug_id_or_key}", response_model=BugOut)
def get_bug(bug_id_or_key: str):
    db = get_mongo_db()
    doc = None
    try:
        doc = db.bugs.find_one({"_id": ObjectId(bug_id_or_key)})
    except Exception:
        pass
    if not doc:
        doc = db.bugs.find_one({"key": bug_id_or_key.upper().strip()})
    if not doc:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    return format_bug_out(doc, db)

@router.put("/{bug_id}", response_model=BugOut)
async def update_bug(bug_id: str, bug_in: BugUpdate, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    try:
        existing = db.bugs.find_one({"_id": ObjectId(bug_id)})
    except Exception:
        existing = None
    if not existing:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    updates = {}
    now = datetime.utcnow()
    
    for field, val in bug_in.dict(exclude_unset=True).items():
        if val is not None:
            old_val = existing.get(field)
            if old_val != val:
                updates[field] = val
                log_activity(db, bug_id, existing.get("key"), current_user, "updated_field", field, old_val, val)
                
    if updates:
        updates["updated_at"] = now
        db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": updates})
        
    updated_doc = db.bugs.find_one({"_id": ObjectId(bug_id)})
    bug_out = format_bug_out(updated_doc, db)
    await manager.broadcast_global("BUG_UPDATED", bug_out.dict())
    return bug_out

@router.post("/{bug_id}/transition", response_model=BugOut)
async def transition_bug_status(
    bug_id: str,
    trans_in: BugTransitionRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Executes validated defect workflow transition with resolution & audit recording."""
    db = get_mongo_db()
    try:
        bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    except Exception:
        bug = None
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    old_status = bug.get("status")
    new_status = trans_in.to_status.value
    now = datetime.utcnow()
    
    update_fields: Dict[str, Any] = {
        "status": new_status,
        "updated_at": now
    }
    
    # Validation rules
    if new_status in ["resolved", "verified", "closed"]:
        if not trans_in.resolution and not bug.get("resolution"):
            raise HTTPException(status_code=400, detail="Resolution (e.g., FIXED, DUPLICATE, WONTFIX) is required when resolving a bug.")
        update_fields["resolution"] = trans_in.resolution.value if trans_in.resolution else bug.get("resolution")
        update_fields["resolved_at"] = now
        
        # Handle Duplicate Linking
        if update_fields["resolution"] == "duplicate" and trans_in.duplicate_of:
            update_fields["duplicate_of"] = trans_in.duplicate_of.upper().strip()
            # Also log comment on parent
            parent_bug = db.bugs.find_one({"key": update_fields["duplicate_of"]})
            if parent_bug:
                dup_comment = {
                    "bug_id": str(parent_bug["_id"]),
                    "user_id": current_user.id,
                    "user_name": current_user.full_name,
                    "user_avatar": current_user.avatar_url,
                    "user_role": current_user.role.value,
                    "content": f"📎 Defect **{bug.get('key')}** was marked as a duplicate of this issue.",
                    "reactions": {},
                    "is_internal": False,
                    "attachments": [],
                    "created_at": now
                }
                db.comments.insert_one(dup_comment)

    elif new_status in ["reopened", "unconfirmed", "confirmed", "in_progress"]:
        update_fields["resolution"] = None
        update_fields["resolved_at"] = None

    if trans_in.root_cause_category:
        rc = bug.get("root_cause_analysis") or {}
        rc["category"] = trans_in.root_cause_category
        update_fields["root_cause_analysis"] = rc

    db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": update_fields})
    
    # Record transition activity
    log_activity(db, bug_id, bug.get("key"), current_user, "transition", "status", old_status, new_status)
    
    # Optional comment
    if trans_in.comment:
        comment_doc = {
            "bug_id": bug_id,
            "user_id": current_user.id,
            "user_name": current_user.full_name,
            "user_avatar": current_user.avatar_url,
            "user_role": current_user.role.value,
            "content": f"**Status changed to `{new_status.upper()}`**: {trans_in.comment}",
            "reactions": {},
            "is_internal": False,
            "attachments": [],
            "created_at": now
        }
        db.comments.insert_one(comment_doc)
        
    updated_doc = db.bugs.find_one({"_id": ObjectId(bug_id)})
    bug_out = format_bug_out(updated_doc, db)
    await manager.broadcast_global("STATUS_CHANGED", bug_out.dict())
    return bug_out

@router.post("/bulk")
async def bulk_action(action_in: BugBulkAction, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    obj_ids = []
    for bid in action_in.bug_ids:
        try:
            obj_ids.append(ObjectId(bid))
        except Exception:
            pass
            
    if not obj_ids:
        raise HTTPException(status_code=400, detail="No valid bug IDs provided")
        
    now = datetime.utcnow()
    update_data = {"updated_at": now}
    
    if action_in.action == "set_status":
        update_data["status"] = action_in.value
        if action_in.value in ["resolved", "closed"]:
            update_data["resolution"] = "fixed"
            update_data["resolved_at"] = now
    elif action_in.action == "set_priority":
        update_data["priority"] = action_in.value
    elif action_in.action == "set_severity":
        update_data["severity"] = action_in.value
    elif action_in.action == "assign":
        update_data["assignee_id"] = action_in.value
    elif action_in.action == "set_milestone":
        update_data["milestone_id"] = action_in.value
    elif action_in.action == "delete":
        db.bugs.delete_many({"_id": {"$in": obj_ids}})
        return {"message": f"Successfully deleted {len(obj_ids)} defects"}
        
    res = db.bugs.update_many({"_id": {"$in": obj_ids}}, {"$set": update_data})
    
    for oid in obj_ids:
        log_activity(db, str(oid), "BULK", current_user, "bulk_update", action_in.action, None, str(action_in.value))
        
    await manager.broadcast_global("BULK_UPDATED", {"count": res.modified_count, "action": action_in.action})
    return {"message": f"Successfully updated {res.modified_count} defects", "modified_count": res.modified_count}

@router.post("/{bug_id}/reproduction-steps/{step_num}/toggle")
def toggle_repro_step(bug_id: str, step_num: int, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    steps = bug.get("reproduction_steps", [])
    found = False
    for s in steps:
        if s.get("step_number") == step_num:
            s["is_verified"] = not s.get("is_verified", False)
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Reproduction step number not found")
        
    db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": {"reproduction_steps": steps, "updated_at": datetime.utcnow()}})
    log_activity(db, bug_id, bug.get("key"), current_user, "qa_verification", f"step_{step_num}", None, "toggled")
    return {"reproduction_steps": steps}

@router.post("/{bug_id}/time")
def log_time(bug_id: str, spent_hours: float, remaining_hours: Optional[float] = None, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    current_spent = bug.get("spent_hours", 0.0) + spent_hours
    updates = {"spent_hours": current_spent, "updated_at": datetime.utcnow()}
    if remaining_hours is not None:
        updates["remaining_hours"] = remaining_hours
        
    db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": updates})
    log_activity(db, bug_id, bug.get("key"), current_user, "time_logged", "spent_hours", bug.get("spent_hours"), current_spent)
    return {"spent_hours": current_spent, "remaining_hours": updates.get("remaining_hours", bug.get("remaining_hours"))}

@router.post("/{bug_id}/link-dependency")
async def link_dependency(bug_id: str, target_key: str, relation: str = Query(..., pattern="^(blocks|depends_on)$"), current_user: UserOut = Depends(get_current_user)):
    """Links 'blocks' or 'depends_on' relationship between defects."""
    db = get_mongo_db()
    bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    target_key = target_key.upper().strip()
    target_bug = db.bugs.find_one({"key": target_key})
    if not target_bug:
        raise HTTPException(status_code=404, detail=f"Target defect with key '{target_key}' not found")
        
    if bug.get("key") == target_key:
        raise HTTPException(status_code=400, detail="Cannot link defect to itself")
        
    current_rel = bug.get(relation, [])
    if target_key not in current_rel:
        current_rel.append(target_key)
        db.bugs.update_one({"_id": ObjectId(bug_id)}, {"$set": {relation: current_rel, "updated_at": datetime.utcnow()}})
        
        # Reciprocal link
        reciprocal_rel = "depends_on" if relation == "blocks" else "blocks"
        target_list = target_bug.get(reciprocal_rel, [])
        if bug.get("key") not in target_list:
            target_list.append(bug.get("key"))
            db.bugs.update_one({"_id": target_bug["_id"]}, {"$set": {reciprocal_rel: target_list, "updated_at": datetime.utcnow()}})
            
        log_activity(db, bug_id, bug.get("key"), current_user, "linked_dependency", relation, None, target_key)
        
    return {"message": f"Successfully linked {relation} {target_key}", "blocks": current_rel if relation == "blocks" else bug.get("blocks", []), "depends_on": current_rel if relation == "depends_on" else bug.get("depends_on", [])}

@router.delete("/{bug_id}")
def delete_bug(bug_id: str, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    res = db.bugs.delete_one({"_id": ObjectId(bug_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bug not found")
    db.comments.delete_many({"bug_id": bug_id})
    db.activities.delete_many({"bug_id": bug_id})
    db.commits.delete_many({"bug_id": bug_id})
    return {"message": "Bug and associated records deleted"}
