from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database_mongo import get_mongo_db, get_next_sequence_value
from routers.users import get_current_user
from routers.chat import regenerate_approved_teams_csv, regenerate_mentor_marks_csv

router = APIRouter()

def get_admin_user(current_user = Depends(get_current_user)):
    email = (current_user.get("email") or "").lower().strip()
    if not current_user.get("is_admin", False) and email != "ishaen.vihaan@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/reports", response_model=List[dict])
def get_reports(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    reports = list(db.reports.find())
    results = []
    for r in reports:
        reporter = db.users.find_one({"id": r["reporter_id"]})
        reported = db.users.find_one({"id": r["reported_id"]})
        
        reporter_data = {"id": reporter["id"], "name": reporter["full_name"]} if reporter else None
        reported_data = {"id": reported["id"], "name": reported["full_name"]} if reported else None
        
        results.append({
            "id": r["id"],
            "reporter": reporter_data,
            "reported": reported_data,
            "reason": r["reason"],
            "created_at": r["created_at"]
        })
    return results

@router.post("/ban/{user_id}")
def ban_user(user_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.users.update_one({"id": user_id}, {"$set": {"is_banned": True}})
    return {"message": f"User {user['full_name']} has been banned."}


from fastapi.responses import FileResponse
import os

@router.get("/download-approved-teams")
def download_approved_teams(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    regenerate_approved_teams_csv(db)
    file_path = "teachers_excel/approved_teams.csv"
    return FileResponse(path=file_path, filename="approved_teams.csv", media_type="text/csv")

@router.get("/download-student-marks")
def download_student_marks(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    regenerate_mentor_marks_csv(db)
    file_path = "teachers_excel/student_phase_marks.csv"
    return FileResponse(path=file_path, filename="student_phase_marks.csv", media_type="text/csv")

@router.get("/analytics")
def get_admin_analytics(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    # 1. Basic Counts
    total_students = db.users.count_documents({"is_mentor": {"$ne": True}, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}})
    total_mentors = db.users.count_documents({"is_mentor": True})
    total_teams = db.group_chats.count_documents({})
    approved_teams = db.group_chats.count_documents({"mentor_status": "APPROVED"})
    pending_teams = db.group_chats.count_documents({"mentor_status": "PENDING"})
    total_events = db.events.count_documents({})
    total_notifications = db.notifications.count_documents({})
    
    # 2. Students by Branch (normalized)
    branch_counts = {}
    for s in db.users.find({"is_mentor": {"$ne": True}, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}}):
        branch = (s.get("branch") or "N/A").strip().upper()
        branch_counts[branch] = branch_counts.get(branch, 0) + 1
        
    # 3. Teams by Department (normalized)
    dept_counts = {}
    for group in db.group_chats.find():
        dept = "N/A"
        mentor_email = group.get("mentor_email")
        if mentor_email:
            mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            if mentor and mentor.get("department"):
                dept = mentor.get("department").strip().upper()
                
        if dept == "N/A":
            member_rec = db.group_members.find_one({"group_id": group["id"]})
            if member_rec:
                member = db.users.find_one({"id": member_rec["user_id"]})
                if member and member.get("branch"):
                    dept = member.get("branch").strip().upper()
                    
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        
    # 4. Mentor Workload
    mentor_workload = {}
    for mentor in db.users.find({"is_mentor": True}):
        email = mentor.get("email")
        name = mentor.get("full_name") or email
        count = db.group_chats.count_documents({"mentor_email": email, "mentor_status": "APPROVED"})
        if count > 0:
            mentor_workload[name] = count
            
    # 5. Project Approval Status
    approval_status = {
        "APPROVED": approved_teams,
        "PENDING": pending_teams,
        "REJECTED": db.group_chats.count_documents({"mentor_status": "REJECTED"}),
        "NOT SUBMITTED": db.group_chats.count_documents({"mentor_status": {"$in": ["NOT_SUBMITTED", None]}})
    }
    
    # 6. Event Registration Count
    event_registrations = {}
    for e in db.events.find():
        title = e.get("title") or "Unnamed Event"
        event_registrations[title] = len(e.get("rsvps") or [])
        
    return {
        "counts": {
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_teams": total_teams,
            "approved_teams": approved_teams,
            "pending_teams": pending_teams,
            "total_events": total_events,
            "total_notifications": total_notifications
        },
        "students_by_branch": branch_counts,
        "teams_by_department": dept_counts,
        "mentor_workload": mentor_workload,
        "project_approval_status": approval_status,
        "event_registrations": event_registrations
    }
