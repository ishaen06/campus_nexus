from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks, Query
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil
import logging

from database_mongo import get_mongo_db, get_next_sequence_value
from routers.users import get_current_user
from routers.admin import get_admin_user
from utils import send_email

router = APIRouter()

# Max file limit: 25MB
MAX_FILE_SIZE = 25 * 1024 * 1024

def send_notification_emails(title: str, content: str, attachments: List[dict], db, target_department: str = "ALL", target_year: Optional[int] = None):
    """Background task to send email notifications to all or department/cohort-specific registered users."""
    print(f"[Background task] Commencing email notification dispatch (Target Dept: {target_department}, Target Cohort: {target_year})...")
    
    target_clean = (target_department or "ALL").strip().upper()
    users = list(db.users.find({}, {"email": 1, "full_name": 1, "branch": 1, "branch_code": 1, "department": 1, "usn": 1}))
    
    if target_clean != "ALL":
        filtered_users = []
        for u in users:
            u_dept = (u.get("branch_code") or u.get("branch") or u.get("department") or "").strip().upper()
            if u_dept == target_clean or target_clean in u_dept or u_dept in target_clean:
                filtered_users.append(u)
        users = filtered_users

    if target_year is not None:
        from routers.chat import _extract_user_academic_info
        filtered_users = []
        for u in users:
            try:
                _, _, u_year = _extract_user_academic_info(u)
                if u_year == target_year:
                    filtered_users.append(u)
            except Exception:
                pass
        users = filtered_users

    emails = [u["email"] for u in users if u.get("email") and u["email"] != "token"]
    
    # Construct email message body
    attachment_sec = ""
    if attachments:
        attachment_sec = "\n\nAttachments:\n"
        for att in attachments:
            attachment_sec += f"- {att['name']} (Download Link: http://localhost:8000{att['url']})\n"
            
    cohort_str = f"{target_year}{'st' if target_year == 1 else 'nd' if target_year == 2 else 'rd'} Year" if target_year else "All Cohorts"
    dept_str = target_department if target_clean != 'ALL' else 'All Students & Mentors'

    email_body = f"""Hello,

College has posted a new notification:

--------------------------------------------------
Subject: {title}
Audience: {dept_str} • {cohort_str}
Date: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")} UTC
--------------------------------------------------

{content}
{attachment_sec}

Best regards,
Campus Nexus Team
"""
    
    success_count = 0
    fail_count = 0
    
    for dest_email in emails:
        try:
            send_email(
                to_email=dest_email,
                subject=f"[Notification] {title}",
                body=email_body
            )
            success_count += 1
        except Exception as e:
            logging.error(f"Failed to send email to {dest_email}: {e}")
            fail_count += 1
            
    print(f"[Background task] Finished. Dispatched successfully to {success_count} users, failed: {fail_count}.")

@router.post("")
def create_notification(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    content: str = Form(...),
    target_department: Optional[str] = Form("ALL"),
    target_year: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    admin = Depends(get_admin_user),
    db = Depends(get_mongo_db)
):
    # Ensure uploads folder exists
    os.makedirs("uploads", exist_ok=True)
    
    saved_attachments = []
    
    if files:
        for file in files:
            if not file.filename:
                continue
                
            contents = file.file.read()
            size = len(contents)
            
            if size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File {file.filename} exceeds the maximum size limit of 25MB."
                )
                
            file_id = str(uuid.uuid4())
            safe_filename = f"notification_{file_id}_{file.filename}"
            file_path = os.path.join("uploads", safe_filename)
            
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
                
            file_url = f"/api/uploads/{safe_filename}"
            saved_attachments.append({
                "id": file_id,
                "name": file.filename,
                "url": file_url,
                "size": size
            })
            
    # Parse target_year
    target_year_int = None
    if target_year and str(target_year).strip() and str(target_year).strip().upper() != "ALL":
        try:
            val = int(str(target_year).strip())
            if 1 <= val <= 4:
                target_year_int = val
        except (ValueError, TypeError):
            target_year_int = None

    # Save notification record in database
    notif_id = get_next_sequence_value("notifications")
    dept_target = (target_department or "ALL").strip().upper()
    notif_doc = {
        "id": notif_id,
        "title": title,
        "content": content,
        "target_department": dept_target,
        "target_year": target_year_int,
        "files": saved_attachments,
        "sender_email": admin["email"],
        "sender_name": admin["full_name"],
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    db.notifications.insert_one(notif_doc)
    
    # Trigger background tasks to send email notification
    background_tasks.add_task(
        send_notification_emails, 
        title, 
        content, 
        saved_attachments, 
        db,
        dept_target,
        target_year_int
    )
    
    notif_doc.pop("_id", None)
    return notif_doc

@router.get("/has-unread")
def has_unread_notifications(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    is_admin = current_user.get("is_admin", False) or (current_user.get("email") == "ishaen.vihaan@gmail.com")
    query = {}
    if not is_admin:
        u_dept = (current_user.get("branch_code") or current_user.get("branch") or current_user.get("department") or "").strip().upper()
        dept_cond = {
            "$or": [
                {"target_department": {"$in": ["ALL", None, ""]}},
                {"target_department": {"$regex": f"^{u_dept}$", "$options": "i"}}
            ]
        }
        from routers.chat import _extract_user_academic_info
        try:
            _, _, u_year = _extract_user_academic_info(current_user)
        except Exception:
            u_year = None
        if u_year:
            year_cond = {
                "$or": [
                    {"target_year": None},
                    {"target_year": {"$exists": False}},
                    {"target_year": u_year}
                ]
            }
            query = {"$and": [dept_cond, year_cond]}
        else:
            query = dept_cond
        
    latest = db.notifications.find_one(query, sort=[("id", -1)])
    if not latest:
        return {"has_unread": False}
    
    latest_id = latest["id"]
    last_seen = current_user.get("last_seen_notif_id", 0) or 0
    
    return {"has_unread": latest_id > last_seen}


@router.post("/mark-seen")
def mark_notifications_seen(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    latest = db.notifications.find_one({}, sort=[("id", -1)])
    latest_id = latest["id"] if latest else 0
    
    db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"last_seen_notif_id": latest_id}}
    )
    return {"status": "ok", "last_seen_notif_id": latest_id}


@router.get("", response_model=List[dict])
def get_notifications(
    year: Optional[int] = Query(None),
    current_user = Depends(get_current_user), 
    db = Depends(get_mongo_db)
):
    is_admin = current_user.get("is_admin", False) or (current_user.get("email") == "ishaen.vihaan@gmail.com")
    query = {}
    if not is_admin:
        u_dept = (current_user.get("branch_code") or current_user.get("branch") or current_user.get("department") or "").strip().upper()
        dept_cond = {
            "$or": [
                {"target_department": {"$in": ["ALL", None, ""]}},
                {"target_department": {"$regex": f"^{u_dept}$", "$options": "i"}}
            ]
        }
        from routers.chat import _extract_user_academic_info
        try:
            _, _, u_year = _extract_user_academic_info(current_user)
        except Exception:
            u_year = None
        if u_year:
            year_cond = {
                "$or": [
                    {"target_year": None},
                    {"target_year": {"$exists": False}},
                    {"target_year": u_year}
                ]
            }
            query = {"$and": [dept_cond, year_cond]}
        else:
            query = dept_cond
    else:
        if year is not None:
            query = {
                "$or": [
                    {"target_year": year},
                    {"target_year": None},
                    {"target_year": {"$exists": False}}
                ]
            }
        
    notifs = list(db.notifications.find(query).sort("id", -1))
    for n in notifs:
        n.pop("_id", None)
    return notifs

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    notif = db.notifications.find_one({"id": notification_id})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Delete associated files from the uploads directory
    files = notif.get("files", [])
    for f in files:
        url = f.get("url", "")
        if url.startswith("/api/uploads/"):
            filename = url.replace("/api/uploads/", "")
            file_path = os.path.join("uploads", filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logging.error(f"Failed to delete attachment file {file_path}: {e}")
                    
    db.notifications.delete_one({"id": notification_id})
    return {"status": "ok", "message": "Notification deleted successfully"}
