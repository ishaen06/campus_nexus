from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks
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

def send_notification_emails(title: str, content: str, attachments: List[dict], db):
    """Background task to send email notifications to all registered users."""
    print("[Background task] Commencing email notification dispatch...")
    
    # Query all users
    users = list(db.users.find({}, {"email": 1, "full_name": 1}))
    emails = [u["email"] for u in users if u.get("email") and u["email"] != "token"]
    
    # Construct email message body
    attachment_sec = ""
    if attachments:
        attachment_sec = "\n\nAttachments:\n"
        for att in attachments:
            # We construct a full URL for downloading. We default to localhost, but let it adapt.
            attachment_sec += f"- {att['name']} (Download Link: http://localhost:8000{att['url']})\n"
            
    email_body = f"""Hello,

College has posted a new notification:

--------------------------------------------------
Subject: {title}
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
            # Send email to each user
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
    files: Optional[List[UploadFile]] = File(None),
    admin = Depends(get_admin_user),
    db = Depends(get_mongo_db)
):
    # Ensure uploads folder exists
    os.makedirs("uploads", exist_ok=True)
    
    saved_attachments = []
    
    if files:
        for file in files:
            # Skip empty files
            if not file.filename:
                continue
                
            # Perform file size verification (25MB limit)
            # Since UploadFile doesn't have an immediate size field, we'll read up to limit
            # Or we can read it to memory, check size, then write
            contents = file.file.read()
            size = len(contents)
            
            if size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File {file.filename} exceeds the maximum size limit of 25MB."
                )
                
            # Reset file pointer or write contents directly
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
            
    # Save notification record in database
    notif_id = get_next_sequence_value("notifications")
    notif_doc = {
        "id": notif_id,
        "title": title,
        "content": content,
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
        db
    )
    
    # Return saved doc (without ObjectId)
    notif_doc.pop("_id", None)
    return notif_doc

@router.get("/has-unread")
def has_unread_notifications(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    """
    Returns { has_unread: bool } by comparing the latest notification ID in the DB
    against the user's last_seen_notif_id stored in their user record.
    This is the server-side approach — reliable across all devices and browser sessions.
    """
    # Get the most recent notification
    latest = db.notifications.find_one({}, sort=[("id", -1)])
    if not latest:
        return {"has_unread": False}
    
    latest_id = latest["id"]
    last_seen = current_user.get("last_seen_notif_id", 0) or 0
    
    return {"has_unread": latest_id > last_seen}


@router.post("/mark-seen")
def mark_notifications_seen(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    """
    Marks all current notifications as seen for this user by recording the latest
    notification ID into their user record (last_seen_notif_id).
    """
    latest = db.notifications.find_one({}, sort=[("id", -1)])
    latest_id = latest["id"] if latest else 0
    
    db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"last_seen_notif_id": latest_id}}
    )
    return {"status": "ok", "last_seen_notif_id": latest_id}


@router.get("", response_model=List[dict])
def get_notifications(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    # Fetch all notifications sorted by id / created_at descending
    notifs = list(db.notifications.find().sort("id", -1))
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
