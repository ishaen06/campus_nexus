from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional, Dict, Any
from io import BytesIO
import pandas as pd
from fpdf import FPDF
from fpdf.fonts import FontFace
from datetime import datetime

from database_mongo import get_mongo_db, get_next_sequence_value
from routers.users import get_current_user
from routers.chat import regenerate_approved_teams_csv, regenerate_mentor_marks_csv

from pydantic import BaseModel
import os

class AdminReauthRequest(BaseModel):
    password: str

router = APIRouter()

def get_admin_user(current_user = Depends(get_current_user)):
    email = (current_user.get("email") or "").lower().strip()
    is_admin = current_user.get("is_admin", False) or (email in {"ishaen.vihaan@gmail.com", "ishaen06@gmail.com"})
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/verify-reauth")
def verify_reauth(payload: AdminReauthRequest, admin = Depends(get_admin_user)):
    from utils import load_env
    from security import verify_password, get_password_hash
    load_env()

    # Prefer hashed password (ADMIN_PASSWORD_HASH env var); fall back to plain-text ADMIN_PASSWORD
    hashed = os.getenv("ADMIN_PASSWORD_HASH", "")
    plain  = os.getenv("ADMIN_PASSWORD", "admin123")

    if hashed:
        # Secure bcrypt comparison
        password_ok = verify_password(payload.password, hashed)
    else:
        # Legacy plain-text fallback (still functional, just less secure)
        password_ok = (payload.password == plain)

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid admin security password")

    return {"status": "ok"}

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

@router.post("/reports/{report_id}/dismiss")
def dismiss_report(report_id: str, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from bson import ObjectId
    query_conditions = []
    try:
        numeric_id = int(report_id)
        query_conditions.append({"id": numeric_id})
    except ValueError:
        pass
    query_conditions.append({"id": str(report_id)})
    if ObjectId.is_valid(report_id):
        query_conditions.append({"_id": ObjectId(report_id)})
        
    db.reports.delete_many({"$or": query_conditions})
    return {"message": "Report dismissed successfully"}


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
    total_students = db.users.count_documents({"is_mentor": {"$ne": True}, "is_admin": {"$ne": True}, "email": {"$nin": ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]}})
    total_mentors = db.users.count_documents({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$nin": ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]}})
    total_teams = db.group_chats.count_documents({})
    approved_teams = db.group_chats.count_documents({"mentor_status": "APPROVED"})
    pending_teams = db.group_chats.count_documents({"mentor_status": "PENDING"})
    total_events = db.events.count_documents({})
    total_notifications = db.notifications.count_documents({})

    # Calculated New Counts
    total_projects = db.group_chats.count_documents({"project_topic": {"$ne": None, "$regex": "\\S"}})
    active_projects = db.group_chats.count_documents({"mentor_status": "APPROVED", "project_topic": {"$ne": None, "$regex": "\\S"}})
    pending_approvals = pending_teams
    
    # Students without teams
    in_team_ids = db.group_members.distinct("user_id")
    students_without_teams = db.users.count_documents({
        "is_mentor": {"$ne": True},
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"},
        "id": {"$nin": in_team_ids}
    })
    
    # Teams without mentors
    teams_without_mentors = db.group_chats.count_documents({"mentor_email": {"$in": [None, ""]}})
    
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
    for mentor in db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$nin": ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]}}):
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

    # --- New Chart Datasets ---
    # A. Team Formation Progress
    students_in_teams = db.users.count_documents({
        "is_mentor": {"$ne": True},
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"},
        "id": {"$in": in_team_ids}
    })
    team_formation_progress = {
        "in_teams": students_in_teams,
        "without_teams": students_without_teams
    }

    # B. Project Status Distribution
    completed_projects = db.group_chats.count_documents({"mentor_status": "APPROVED", "phase3_marks": {"$gt": 0}})
    ongoing_projects = db.group_chats.count_documents({"mentor_status": "APPROVED", "phase3_marks": {"$in": [0, None]}})
    pending_projects = db.group_chats.count_documents({"mentor_status": {"$ne": "APPROVED"}})
    project_status_distribution = {
        "Completed": completed_projects,
        "Ongoing": ongoing_projects,
        "Pending": pending_projects
    }

    # C. Monthly Project Creation Trend
    monthly_trend = {}
    groups_list = list(db.group_chats.find())
    
    def get_group_date(g):
        c_at = g.get("created_at")
        if c_at:
            dt = None
            if isinstance(c_at, str):
                try:
                    from dateutil.parser import parse
                    dt = parse(c_at)
                except Exception:
                    pass
                if dt is None:
                    try:
                        import datetime
                        dt = datetime.datetime.fromisoformat(c_at.replace("Z", "+00:00"))
                    except Exception:
                        pass
            elif hasattr(c_at, "strftime"):
                dt = c_at
            
            if dt and hasattr(dt, "tzinfo") and dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            return dt
        return None

    valid_groups = []
    for g in groups_list:
        dt = get_group_date(g)
        if dt:
            valid_groups.append((dt, g))
    valid_groups.sort(key=lambda x: x[0])

    for dt, g in valid_groups:
        if hasattr(dt, "strftime"):
            month_str = dt.strftime("%b %Y")
            monthly_trend[month_str] = monthly_trend.get(month_str, 0) + 1
        
    return {
        "counts": {
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_teams": total_teams,
            "approved_teams": approved_teams,
            "pending_teams": pending_teams,
            "total_events": total_events,
            "total_notifications": total_notifications,
            "total_projects": total_projects,
            "active_projects": active_projects,
            "pending_approvals": pending_approvals,
            "students_without_teams": students_without_teams,
            "teams_without_mentors": teams_without_mentors
        },
        "students_by_branch": branch_counts,
        "teams_by_department": dept_counts,
        "mentor_workload": mentor_workload,
        "project_approval_status": approval_status,
        "event_registrations": event_registrations,
        "team_formation_progress": team_formation_progress,
        "project_status_distribution": project_status_distribution,
        "monthly_project_creation_trend": monthly_trend
    }

@router.get("/users")
def get_all_users(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    """Return all platform users (students + mentors) sorted by role then name."""
    users = list(db.users.find(
        {"email": {"$ne": "ishaen.vihaan@gmail.com"}},
        sort=[("is_mentor", -1), ("full_name", 1)]
    ))
    formatted_users = []
    for u in users:
        group_info = None
        if not u.get("is_mentor"):
            membership = db.group_members.find_one({"user_id": u["id"]})
            if membership:
                group = db.group_chats.find_one({"id": membership["group_id"]})
                if group:
                    group_info = {
                        "id": group["id"],
                        "name": group["name"],
                        "project_topic": group.get("project_topic") or "N/A",
                        "project_sub_topic": group.get("project_sub_topic") or "N/A",
                        "project_theme": group.get("project_theme") or group.get("theme") or "N/A",
                        "mentor_name": group.get("mentor_name") or "Unassigned"
                    }
        formatted_users.append({
            "id": u["id"],
            "full_name": u.get("full_name") or "N/A",
            "email": u.get("email") or "N/A",
            "usn": u.get("usn") or "N/A",
            "branch": u.get("branch") or "N/A",
            "department": u.get("department") or "N/A",
            "post": u.get("post") or "N/A",
            "is_mentor": bool(u.get("is_mentor")),
            "bio": u.get("bio") or "",
            "cycle": u.get("cycle") or "N/A",
            "year_of_study": u.get("year_of_study"),
            "group": group_info
        })
    return formatted_users

@router.get("/search")
def admin_global_search(q: str = "", admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    q = q.strip()
    if not q:
        return {"users": [], "teams": []}
        
    # Check if query is an integer (for Team ID)
    q_is_int = False
    q_int = None
    try:
        q_int = int(q)
        q_is_int = True
    except ValueError:
        pass
        
    # Search Users (Students & Mentors)
    # Search by full_name, usn, branch, or email
    user_query = {
        "$or": [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"usn": {"$regex": q, "$options": "i"}},
            {"branch": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"department": {"$regex": q, "$options": "i"}}
        ],
        "email": {"$ne": "ishaen.vihaan@gmail.com"} # Exclude admin from search results
    }
    
    users = list(db.users.find(user_query).limit(50))
    formatted_users = []
    for u in users:
        # Resolve group membership if student
        group_info = None
        if not u.get("is_mentor"):
            membership = db.group_members.find_one({"user_id": u["id"]})
            if membership:
                group = db.group_chats.find_one({"id": membership["group_id"]})
                if group:
                    group_info = {
                        "id": group["id"],
                        "name": group["name"],
                        "project_topic": group.get("project_topic") or "N/A",
                        "project_sub_topic": group.get("project_sub_topic") or "N/A",
                        "project_theme": group.get("project_theme") or group.get("theme") or "N/A",
                        "mentor_name": group.get("mentor_name") or "Unassigned"
                    }
        formatted_users.append({
            "id": u["id"],
            "full_name": u.get("full_name") or "N/A",
            "email": u.get("email") or "N/A",
            "usn": u.get("usn") or "N/A",
            "branch": u.get("branch") or "N/A",
            "department": u.get("department") or "N/A",
            "post": u.get("post") or "N/A",
            "is_mentor": bool(u.get("is_mentor")),
            "bio": u.get("bio") or "",
            "cycle": u.get("cycle") or "N/A",
            "group": group_info
        })
        
    # Search Teams (Group Chats)
    # Search by name, project_topic, mentor_name, or ID
    team_or_conditions = [
        {"name": {"$regex": q, "$options": "i"}},
        {"project_topic": {"$regex": q, "$options": "i"}},
        {"mentor_name": {"$regex": q, "$options": "i"}}
    ]
    if q_is_int:
        team_or_conditions.append({"id": q_int})
        
    team_query = {"$or": team_or_conditions}
    teams = list(db.group_chats.find(team_query).limit(50))
    formatted_teams = []
    
    for t in teams:
        # Get members details
        member_recs = list(db.group_members.find({"group_id": t["id"]}))
        member_ids = [m["user_id"] for m in member_recs]
        
        # Resolve mentor id
        mentor_email = t.get("mentor_email")
        mentor_id = None
        if mentor_email:
            mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            mentor_id = mentor["id"] if mentor else None
            
        student_ids = [uid for uid in member_ids if uid != mentor_id]
        students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
        
        member_names = [s.get("full_name") for s in students if s.get("full_name")]
        
        formatted_teams.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
            "members": member_names
        })
        
    return {
        "users": formatted_users,
        "teams": formatted_teams
    }

@router.get("/mentors")
def get_admin_mentors(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    mentors = list(db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$nin": ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]}}))
    results = []
    
    for m in mentors:
        email = m.get("email")
        name = m.get("full_name") or email
        
        # Query assigned teams for this mentor
        teams = list(db.group_chats.find({"mentor_email": {"$regex": f"^{email}$", "$options": "i"}}))
        formatted_teams = []
        all_student_names = []
        
        for t in teams:
            # Get members
            member_recs = list(db.group_members.find({"group_id": t["id"]}))
            member_ids = [r["user_id"] for r in member_recs]
            
            # Resolve mentor id
            mentor_user = db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
            mentor_id = mentor_user["id"] if mentor_user else None
            
            student_ids = [uid for uid in member_ids if uid != mentor_id]
            students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
            student_names = [s.get("full_name") or "N/A" for s in students]
            
            all_student_names.extend(student_names)
            
            formatted_teams.append({
                "id": t["id"],
                "name": t.get("name") or "N/A",
                "project_topic": t.get("project_topic") or "N/A",
                "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
                "students": student_names
            })
            
        results.append({
            "id": m["id"],
            "full_name": name,
            "email": email,
            "department": m.get("department") or "N/A",
            "post": m.get("post") or "N/A",
            "bio": m.get("bio") or "",
            "workload": len([t for t in teams if t.get("mentor_status") == "APPROVED"]),
            "assigned_teams": formatted_teams,
            "assigned_students": list(set(all_student_names))
        })
        
    return results

@router.get("/unassigned-teams")
def get_unassigned_teams(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    teams = list(db.group_chats.find())
    results = []
    for t in teams:
        results.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED"
        })
    return results

@router.post("/groups/{group_id}/assign-mentor")
def assign_mentor_to_group(group_id: int, mentor_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    mentor = db.users.find_one({"id": mentor_id, "is_mentor": True})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
        
    # Check workload limit (25 approved teams)
    active_count = db.group_chats.count_documents({
        "mentor_email": {"$regex": f"^{mentor['email']}$", "$options": "i"},
        "mentor_status": "APPROVED",
        "id": {"$ne": group_id}
    })
    
    if active_count >= 25:
        raise HTTPException(status_code=400, detail="Mentor has reached the maximum capacity of 25 approved teams.")
        
    # If the group already has an assigned mentor, remove them from group_members
    current_mentor_email = group.get("mentor_email")
    if current_mentor_email:
        old_mentor = db.users.find_one({"email": {"$regex": f"^{current_mentor_email}$", "$options": "i"}})
        if old_mentor:
            db.group_members.delete_many({"group_id": group_id, "user_id": old_mentor["id"]})
            
    # Update group chat document
    db.group_chats.update_one(
        {"id": group_id},
        {"$set": {
            "mentor_name": mentor.get("full_name") or mentor["email"],
            "mentor_email": mentor["email"],
            "mentor_status": "APPROVED"
        }}
    )
    
    # Add mentor to group_members if not present
    existing_membership = db.group_members.find_one({"group_id": group_id, "user_id": mentor["id"]})
    if not existing_membership:
        new_member_id = get_next_sequence_value("group_members")
        db.group_members.insert_one({
            "id": new_member_id,
            "group_id": group_id,
            "user_id": mentor["id"]
        })
        
    # Regenerate spreadsheet CSV exports
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Mentor assigned successfully"}

@router.post("/groups/{group_id}/remove-mentor")
def remove_mentor_from_group(group_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Remove mentor from group_members
    mentor_email = group.get("mentor_email")
    if mentor_email:
        mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
        if mentor:
            db.group_members.delete_many({"group_id": group_id, "user_id": mentor["id"]})
            
    # Reset group chat fields
    db.group_chats.update_one(
        {"id": group_id},
        {"$set": {
            "mentor_name": "N/A",
            "mentor_email": "N/A",
            "mentor_status": "NOT_SUBMITTED"
        }}
    )
    
    # Regenerate spreadsheet CSV exports
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Mentor removed successfully"}

@router.get("/teams")
def get_admin_teams(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    teams = list(db.group_chats.find())
    results = []
    
    for t in teams:
        # Resolve members
        member_recs = list(db.group_members.find({"group_id": t["id"]}))
        member_ids = [r["user_id"] for r in member_recs]
        
        # Resolve mentor id
        mentor_email = t.get("mentor_email")
        mentor_id = None
        if mentor_email:
            mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            mentor_id = mentor["id"] if mentor else None
            
        student_ids = [uid for uid in member_ids if uid != mentor_id]
        students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
        
        formatted_students = []
        for s in students:
            formatted_students.append({
                "id": s["id"],
                "full_name": s.get("full_name") or "N/A",
                "usn": s.get("usn") or "N/A",
                "email": s.get("email") or "N/A",
                "branch": s.get("branch") or "N/A",
                "cycle": s.get("cycle") or "N/A"
            })
            
        results.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
            "members": formatted_students
        })
        
    return results

@router.post("/groups/{group_id}/dissolve")
def dissolve_group_by_admin(group_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Delete all messages, members, and the group itself
    db.group_messages.delete_many({"group_id": group_id})
    db.group_members.delete_many({"group_id": group_id})
    db.group_chats.delete_one({"id": group_id})
    
    # Regenerate sheets after deletion
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Team dissolved successfully"}

@router.post("/groups/{group_id}/approve")
def approve_project_by_admin(group_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    mentor_email = group.get("mentor_email")
    if not mentor_email or mentor_email == "N/A":
        raise HTTPException(status_code=400, detail="Cannot approve team. No mentor is assigned yet.")
        
    mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
    if not mentor:
        raise HTTPException(status_code=404, detail="Assigned mentor not found in users collection.")
        
    # Check 25 approved teams capacity
    active_count = db.group_chats.count_documents({
        "mentor_email": {"$regex": f"^{mentor_email}$", "$options": "i"},
        "mentor_status": "APPROVED",
        "id": {"$ne": group_id}
    })
    if active_count >= 25:
        raise HTTPException(status_code=400, detail="Mentor has reached the maximum capacity of 25 approved teams.")
        
    # Update group chat status
    db.group_chats.update_one(
        {"id": group_id},
        {"$set": {
            "mentor_status": "APPROVED",
            "mentor_token": None,
            "mentor_rejection_reason": None,
            "is_public": False
        }}
    )
    
    # Add mentor to group members
    existing_membership = db.group_members.find_one({"group_id": group_id, "user_id": mentor["id"]})
    if not existing_membership:
        new_member_id = get_next_sequence_value("group_members")
        db.group_members.insert_one({
            "id": new_member_id,
            "group_id": group_id,
            "user_id": mentor["id"]
        })
        
    # Regenerate sheets
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Project approved successfully"}

@router.post("/groups/{group_id}/reject")
def reject_project_by_admin(group_id: int, rejection_reason: str = "Rejected by administrator", admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Update group chat status to rejected
    db.group_chats.update_one(
        {"id": group_id},
        {"$set": {
            "mentor_status": "REJECTED",
            "mentor_token": None,
            "mentor_rejection_reason": rejection_reason
        }}
    )
    
    # Remove mentor from group members
    mentor_email = group.get("mentor_email")
    if mentor_email:
        mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
        if mentor:
            db.group_members.delete_many({"group_id": group_id, "user_id": mentor["id"]})
            
    # Regenerate sheets
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Project rejected successfully"}

    # Regenerate sheets
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Student moved successfully"}

class BeautifulReportPDF(FPDF):
    def __init__(self, title: str):
        # Landscape
        super().__init__(orientation="L", unit="mm", format="A4")
        self.report_title = title
        self.alias_nb_pages()
        
    def header(self):
        # Top banner background
        self.set_fill_color(30, 58, 138)  # #1e3a8a
        self.rect(0, 0, 297, 15, 'F')
        
        self.set_y(4)
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 10)
        self.cell(0, 5, "CAMPUS NEXUS - ACADEMIC REPORT CENTER", align="C", ln=True)
        self.ln(10)
        
        self.set_text_color(30, 58, 138)
        self.set_font("helvetica", "B", 14)
        self.cell(0, 10, self.report_title, align="L", ln=True)
        self.set_draw_color(30, 58, 138)
        self.line(10, self.get_y(), 287, self.get_y())
        self.ln(5)
        
    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.cell(0, 10, f"Generated on {now_str}  |  Page {self.page_no()}/{{nb}}", align="C")

def fetch_report_dataframe(dataset: str, db) -> tuple:
    if dataset == "students":
        students = list(db.users.find({
            "is_mentor": {"$ne": True},
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        data = []
        for s in students:
            group_id = "N/A"
            group_name = "N/A"
            membership = db.group_members.find_one({"user_id": s["id"]})
            if membership:
                g = db.group_chats.find_one({"id": membership["group_id"]})
                if g:
                    group_id = str(g["id"])
                    group_name = g.get("name") or "N/A"
            data.append({
                "Student ID": s["id"],
                "Student Name": s.get("full_name") or "N/A",
                "Email": s.get("email") or "N/A",
                "USN": s.get("usn") or "N/A",
                "Branch": s.get("branch") or "N/A",
                "Cycle": s.get("cycle") or "N/A",
                "Team ID": group_id,
                "Team Name": group_name
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Student ID", "Student Name", "Email", "USN", "Branch", "Cycle", "Team ID", "Team Name"])
        return df, "Student List Report", (15, 45, 60, 25, 20, 15, 20, 77)

    elif dataset == "mentors":
        mentors = list(db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$nin": ["ishaen.vihaan@gmail.com", "ishaen06@gmail.com"]}}))
        data = []
        for m in mentors:
            count = db.group_chats.count_documents({
                "mentor_email": {"$regex": f"^{m['email']}$", "$options": "i"},
                "mentor_status": "APPROVED"
            })
            data.append({
                "Mentor ID": m["id"],
                "Mentor Name": m.get("full_name") or "N/A",
                "Email": m.get("email") or "N/A",
                "Department": m.get("department") or "N/A",
                "Designation": m.get("post") or "N/A",
                "Active Teams": count,
                "Max Capacity": 25
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Mentor ID", "Mentor Name", "Email", "Department", "Designation", "Active Teams", "Max Capacity"])
        return df, "Mentor Directory Report", (15, 45, 65, 45, 57, 30, 20)

    elif dataset == "teams":
        teams = list(db.group_chats.find())
        data = []
        for t in teams:
            member_recs = list(db.group_members.find({"group_id": t["id"]}))
            member_ids = [r["user_id"] for r in member_recs]
            
            mentor_email = t.get("mentor_email")
            mentor_id = None
            if mentor_email:
                m = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
                mentor_id = m["id"] if m else None
                
            student_ids = [uid for uid in member_ids if uid != mentor_id]
            students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
            
            for s in students:
                data.append({
                    "Team ID": t["id"],
                    "Team Name": t.get("name") or "N/A",
                    "Student ID": s["id"],
                    "Student Name": s.get("full_name") or "N/A",
                    "Student USN": s.get("usn") or "N/A",
                    "Student Branch": s.get("branch") or "N/A",
                    "Student Email": s.get("email") or "N/A"
                })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Team ID", "Team Name", "Student ID", "Student Name", "Student USN", "Student Branch", "Student Email"])
        return df, "Team Roster Assignment Report", (20, 50, 25, 55, 30, 25, 72)

    elif dataset == "marks":
        students = list(db.users.find({
            "is_mentor": {"$ne": True}, 
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        data = []
        for s in students:
            student_id = s.get("id")
            usn = s.get("usn") or "N/A"
            name = s.get("full_name") or "N/A"
            branch = s.get("branch") or "N/A"
            
            group_id = "N/A"
            group_name = "N/A"
            group_doc = None
            
            membership = db.group_members.find_one({"user_id": student_id})
            if membership:
                group_doc = db.group_chats.find_one({"id": membership["group_id"]})
                if group_doc:
                    group_id = str(group_doc.get("id"))
                    group_name = group_doc.get("name") or "N/A"

            # Phase 1 criteria
            p1_problem_def = 0
            p1_objectives = 0
            p1_methodology = 0
            # Phase 2 criteria
            p2_project_exec = 0
            p2_tools_tech = 0
            p2_partial_results = 0
            # Phase 3 criteria
            p3_prototype_demo = 0
            p3_results_disc = 0
            p3_report_poster = 0
            p3_outcome_work = 0

            if group_doc:
                eval_doc = db.evaluations.find_one({"group_id": group_doc.get("id"), "student_id": student_id})
                if eval_doc:
                    p1_det = eval_doc.get("phase1_detail_marks") or {}
                    p1_problem_def   = int(float(p1_det.get("problem_definition", 0) or 0))
                    p1_objectives    = int(float(p1_det.get("objectives", 0) or 0))
                    p1_methodology   = int(float(p1_det.get("methodology", 0) or 0))

                    p2_det = eval_doc.get("phase2_detail_marks") or {}
                    p2_project_exec  = int(float(p2_det.get("project_execution", 0) or 0))
                    p2_tools_tech    = int(float(p2_det.get("tools_techniques", 0) or 0))
                    p2_partial_results = int(float(p2_det.get("partial_results", 0) or 0))

                    p3_det = eval_doc.get("phase3_detail_marks") or {}
                    p3_prototype_demo = int(float(p3_det.get("prototype_demonstration", 0) or 0))
                    p3_results_disc   = int(float(p3_det.get("results_discussions", 0) or 0))
                    p3_report_poster  = int(float(p3_det.get("report_poster_ppt", 0) or 0))
                    p3_outcome_work   = int(float(p3_det.get("outcome_work", 0) or 0))

            p1_total = p1_problem_def + p1_objectives + p1_methodology
            p2_total = p2_project_exec + p2_tools_tech + p2_partial_results
            p3_total = p3_prototype_demo + p3_results_disc + p3_report_poster + p3_outcome_work
            grand_total = p1_total + p2_total + p3_total

            data.append({
                "USN": usn,
                "Student Name": name,
                "Branch": branch,
                "Team ID": group_id,
                "Team Name": group_name,
                # Phase 1 breakdown
                "P1 - Problem Definition": p1_problem_def,
                "P1 - Objectives": p1_objectives,
                "P1 - Methodology": p1_methodology,
                "Phase 1 Total": p1_total,
                # Phase 2 breakdown
                "P2 - Project Execution": p2_project_exec,
                "P2 - Tools & Techniques": p2_tools_tech,
                "P2 - Partial Results": p2_partial_results,
                "Phase 2 Total": p2_total,
                # Phase 3 breakdown
                "P3 - Prototype Demo": p3_prototype_demo,
                "P3 - Results & Discussion": p3_results_disc,
                "P3 - Report/Poster/PPT": p3_report_poster,
                "P3 - Outcome/Work": p3_outcome_work,
                "Phase 3 Total": p3_total,
                # Grand total
                "Total Marks": grand_total
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=[
                "USN", "Student Name", "Branch", "Team ID", "Team Name",
                "P1 - Problem Definition", "P1 - Objectives", "P1 - Methodology", "Phase 1 Total",
                "P2 - Project Execution", "P2 - Tools & Techniques", "P2 - Partial Results", "Phase 2 Total",
                "P3 - Prototype Demo", "P3 - Results & Discussion", "P3 - Report/Poster/PPT", "P3 - Outcome/Work", "Phase 3 Total",
                "Total Marks"
            ])
        return df, "Student Performance Marks Report", (25, 45, 20, 15, 45, 28, 22, 25, 22, 28, 28, 25, 22, 28, 30, 28, 22, 22, 22, 22)

    elif dataset == "projects":
        teams = list(db.group_chats.find())
        data = []
        for t in teams:
            data.append({
                "Team ID": t["id"],
                "Team Name": t.get("name") or "N/A",
                "Project Theme": t.get("project_theme") or "N/A",
                "Project Sub-Topic": t.get("project_sub_topic") or "N/A",
                "Project Topic": t.get("project_topic") or "N/A",
                "Assigned Mentor": t.get("mentor_name") or "N/A",
                "Mentor Email": t.get("mentor_email") or "N/A",
                "Approval Status": t.get("mentor_status") or "NOT_SUBMITTED"
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Team ID", "Team Name", "Project Theme", "Project Sub-Topic", "Project Topic", "Assigned Mentor", "Mentor Email", "Approval Status"])
        return df, "Project Themes & Topic Allocation Report", (20, 50, 40, 45, 55, 45, 55, 30)

    elif dataset == "approvals":
        teams = list(db.group_chats.find())
        data = []
        for t in teams:
            data.append({
                "Team ID": t["id"],
                "Team Name": t.get("name") or "N/A",
                "Project Theme": t.get("project_topic") or "N/A",
                "Mentor Name": t.get("mentor_name") or "N/A",
                "Approval Status": t.get("mentor_status") or "NOT_SUBMITTED",
                "Rejection Reason": t.get("mentor_rejection_reason") or "N/A"
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Team ID", "Team Name", "Project Theme", "Mentor Name", "Approval Status", "Rejection Reason"])
        return df, "Project Approvals & Feedback Report", (20, 50, 77, 45, 35, 50)

    elif dataset == "events":
        events = list(db.events.find())
        data = []
        for e in events:
            data.append({
                "Event ID": e["id"],
                "Event Title": e.get("title") or "N/A",
                "Description": e.get("description") or "N/A",
                "Date": e.get("date") or "N/A",
                "Time": e.get("time") or "N/A",
                "Venue": e.get("location") or "N/A",
                "Total RSVPs": len(e.get("rsvps") or [])
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Event ID", "Event Title", "Description", "Date", "Time", "Venue", "Total RSVPs"])
        return df, "Campus Events & Registration Report", (20, 50, 87, 25, 20, 55, 20)

    elif dataset == "approved_teams":
        approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
        data = []
        for group in approved_groups:
            member_records = list(db.group_members.find({"group_id": group["id"]}))
            member_ids = [m["user_id"] for m in member_records]
            
            mentor_email = group.get("mentor_email")
            mentor_id = None
            if mentor_email:
                mentor_user = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
                mentor_id = mentor_user["id"] if mentor_user else None
            
            student_ids = [uid for uid in member_records if uid["user_id"] != mentor_id]
            # Wait, let's write it cleaner to match the existing schema
            student_ids = [uid for uid in member_ids if uid != mentor_id]
            students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
            
            row_dict = {
                "Team ID": str(group["id"]),
                "Team Name": group["name"],
                "Project Topic": group.get("project_topic") or "N/A",
                "Mentor Name": group.get("mentor_name") or "N/A",
                "Mentor Email": group.get("mentor_email") or "N/A",
                "Approved At": (group.get("approved_at") or "N/A")[:10]
            }
            
            for i in range(1, 6):
                if (i - 1) < len(students):
                    m = students[i - 1]
                    row_dict[f"Member {i} Name"] = m.get("full_name") or ""
                    row_dict[f"Member {i} USN"] = m.get("usn") or "N/A"
                else:
                    row_dict[f"Member {i} Name"] = ""
                    row_dict[f"Member {i} USN"] = ""
            
            data.append(row_dict)
            
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=[
                "Team ID", "Team Name", "Project Topic", "Mentor Name", "Mentor Email", "Approved At",
                "Member 1 Name", "Member 1 USN", "Member 2 Name", "Member 2 USN",
                "Member 3 Name", "Member 3 USN", "Member 4 Name", "Member 4 USN",
                "Member 5 Name", "Member 5 USN"
            ])
        return df, "Approved Project Teams Master Report", (15, 25, 30, 20, 25, 20, 15, 13, 15, 13, 15, 13, 15, 13, 15, 13)

    elif dataset == "student_marks":
        students = list(db.users.find({
            "is_mentor": {"$ne": True}, 
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        data = []
        for s in students:
            student_id = s.get("id")
            usn = s.get("usn") or "N/A"
            name = s.get("full_name") or "N/A"
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
            data.append({
                "USN": usn,
                "Student Name": name,
                "Branch": branch,
                "Sec": section,
                "Semester": year,
                "Team Name": group_name,
                "Mentor": mentor_name,
                "P1 Marks": p1_marks,
                "P1 Observations": p1_obs[:30] + "..." if len(p1_obs) > 30 else p1_obs,
                "P2 Marks": p2_marks,
                "P2 Observations": p2_obs[:30] + "..." if len(p2_obs) > 30 else p2_obs,
                "P3 Marks": p3_marks,
                "P3 Observations": p3_obs[:30] + "..." if len(p3_obs) > 30 else p3_obs,
                "Total Marks": total_marks
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=[
                "USN", "Student Name", "Branch", "Sec", "Semester", "Team Name", "Mentor",
                "P1 Marks", "P1 Observations", "P2 Marks", "P2 Observations", "P3 Marks", "P3 Observations", "Total Marks"
            ])
        return df, "Student Performance Marks & Detailed Observations Report", (20, 30, 20, 10, 10, 25, 20, 15, 30, 15, 30, 15, 30, 15)

    else:
        raise HTTPException(status_code=400, detail="Invalid dataset specified")

@router.get("/reports/preview")
def preview_admin_report(
    dataset: str = Query(...), 
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    df, report_title, col_widths = fetch_report_dataframe(dataset, db)
    preview_df = df.head(10)
    preview_df = preview_df.astype(object).where(pd.notnull(preview_df), None)
    records = preview_df.to_dict(orient="records")
    
    safe_records = []
    for r in records:
        safe_row = {}
        for k, v in r.items():
            if v is None:
                safe_row[k] = ""
            elif isinstance(v, datetime):
                safe_row[k] = v.isoformat()
            else:
                safe_row[k] = str(v)
        safe_records.append(safe_row)
        
    return {
        "title": report_title,
        "columns": list(df.columns),
        "preview": safe_records,
        "total_rows": len(df)
    }

@router.get("/reports/download")
def download_admin_report(
    dataset: str = Query(...), 
    format: str = Query(...), 
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    df, report_title, col_widths = fetch_report_dataframe(dataset, db)
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    if format == "csv":
        csv_data = df.to_csv(index=False)
        filename = f"{dataset}_report_{date_str}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "excel":
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name="Report", index=False)
            
            workbook  = writer.book
            worksheet = writer.sheets["Report"]
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#1E3A8A',
                'font_color': '#FFFFFF',
                'border': 1
            })
            
            # Merged cell format for grouped cells (Team ID / Team Name)
            merge_format = workbook.add_format({
                'valign': 'vcenter',
                'align': 'center',
                'border': 1,
                'bold': True,
                'bg_color': '#EEF2FF',
            })
            
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                max_len = max(
                    df[value].astype(str).map(len).max() if not df.empty else len(value),
                    len(value)
                ) + 3
                worksheet.set_column(col_num, col_num, min(max_len, 50))
            
            # For the teams dataset: merge Team ID (col 0) and Team Name (col 1)
            # for consecutive rows that belong to the same team
            if dataset == "teams" and not df.empty and "Team ID" in df.columns and "Team Name" in df.columns:
                team_id_col = list(df.columns).index("Team ID")
                team_name_col = list(df.columns).index("Team Name")
                
                rows = df.values.tolist()
                i = 0
                while i < len(rows):
                    # Find the run of rows with the same Team ID
                    current_team_id = rows[i][team_id_col]
                    current_team_name = rows[i][team_name_col]
                    j = i + 1
                    while j < len(rows) and rows[j][team_id_col] == current_team_id:
                        j += 1
                    
                    # Excel row index: +1 for header row, +1 because xlsxwriter is 0-indexed
                    start_row = i + 1  # 0-indexed, row 0 is header
                    end_row = j        # exclusive, so last row index is j-1
                    
                    if end_row - start_row > 1:
                        # Merge Team ID cells
                        worksheet.merge_range(
                            start_row, team_id_col,
                            end_row - 1, team_id_col,
                            current_team_id, merge_format
                        )
                        # Merge Team Name cells
                        worksheet.merge_range(
                            start_row, team_name_col,
                            end_row - 1, team_name_col,
                            current_team_name, merge_format
                        )
                    i = j
                
        output.seek(0)
        filename = f"{dataset}_report_{date_str}.xlsx"
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "pdf":
        pdf = BeautifulReportPDF(report_title)
        pdf.add_page()
        pdf.set_font("helvetica", size=8)
        
        headers = list(df.columns)
        rows_data = [headers]
        for idx, row in df.iterrows():
            rows_data.append([str(val) for val in row.values])
            
        style = FontFace(color=(255, 255, 255), fill_color=(30, 58, 138), emphasis="BOLD")
        
        try:
            with pdf.table(
                col_widths=col_widths, 
                headings_style=style,
                cell_fill_color=(245, 247, 250),
                cell_fill_mode="ROWS",
                text_align="LEFT"
            ) as table:
                for r_idx, r_data in enumerate(rows_data):
                    row = table.row()
                    for cell_val in r_data:
                        row.cell(cell_val)
        except Exception as pdf_err:
            raise HTTPException(status_code=500, detail=f"PDF formatting failed: {pdf_err}")
            
        pdf_bytes = pdf.output()
        filename = f"{dataset}_report_{date_str}.pdf"
        return Response(
            content=bytes(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    else:
        raise HTTPException(status_code=400, detail="Invalid format specified. Use csv, excel, or pdf.")


# --- Academic Settings & Cycle Management Endpoints ---

class AcademicSettingsUpdateRequest(BaseModel):
    session_start_month: Optional[int] = None
    branch_mappings: Optional[dict] = None
    cycle_mappings: Optional[dict] = None

class AddBranchRequest(BaseModel):
    code: str
    name: str
    cycle: str

@router.get("/academic-settings")
def get_admin_academic_settings(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from services.academic_service import get_academic_settings, DEFAULT_BRANCH_NAMES, DEFAULT_CYCLE_MAPPINGS
    settings = get_academic_settings(db)
    
    # Calculate student count per branch code
    students = list(db.users.find({"is_mentor": False}))
    branch_counts = {}
    for s in students:
        b_code = (s.get("branch_code") or s.get("branch") or "UNKNOWN").upper().strip()
        branch_counts[b_code] = branch_counts.get(b_code, 0) + 1
        
    return {
        "session_start_month": settings.get("session_start_month", 8),
        "branch_mappings": settings.get("branch_mappings", DEFAULT_BRANCH_NAMES),
        "cycle_mappings": settings.get("cycle_mappings", DEFAULT_CYCLE_MAPPINGS),
        "branch_counts": branch_counts,
        "total_students": len(students)
    }

@router.put("/academic-settings")
def update_admin_academic_settings(payload: AcademicSettingsUpdateRequest, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from services.academic_service import get_academic_settings
    settings = get_academic_settings(db)
    
    update_data = {}
    if payload.session_start_month is not None:
        if not (1 <= payload.session_start_month <= 12):
            raise HTTPException(status_code=400, detail="Session start month must be between 1 and 12")
        update_data["session_start_month"] = payload.session_start_month
        
    if payload.branch_mappings is not None:
        update_data["branch_mappings"] = payload.branch_mappings
        
    if payload.cycle_mappings is not None:
        update_data["cycle_mappings"] = payload.cycle_mappings
        
    if update_data:
        db.academic_settings.update_one({"_id": "global"}, {"$set": update_data}, upsert=True)
        
    updated_settings = get_academic_settings(db)
    return {
        "status": "success",
        "message": "Academic settings updated successfully.",
        "session_start_month": updated_settings.get("session_start_month", 8),
        "branch_mappings": updated_settings.get("branch_mappings", {}),
        "cycle_mappings": updated_settings.get("cycle_mappings", {})
    }

@router.post("/academic-settings/branches")
def add_or_update_branch(payload: AddBranchRequest, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from services.academic_service import get_academic_settings
    code = payload.code.strip().upper()
    name = payload.name.strip()
    cycle = payload.cycle.strip().upper()
    
    if not code or not name:
        raise HTTPException(status_code=400, detail="Branch code and branch name are required")
    if cycle not in ["C", "P"]:
        raise HTTPException(status_code=400, detail="Subject cycle must be 'C' or 'P'")
        
    settings = get_academic_settings(db)
    b_map = dict(settings.get("branch_mappings", {}))
    c_map = dict(settings.get("cycle_mappings", {}))
    
    b_map[code] = name
    c_map[code] = cycle
    
    db.academic_settings.update_one(
        {"_id": "global"}, 
        {"$set": {"branch_mappings": b_map, "cycle_mappings": c_map}}, 
        upsert=True
    )
    
    return {"status": "success", "message": f"Branch '{code}' configured successfully."}

@router.delete("/academic-settings/branches/{code}")
def delete_branch(code: str, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from services.academic_service import get_academic_settings
    branch_code = code.strip().upper()
    settings = get_academic_settings(db)
    
    b_map = dict(settings.get("branch_mappings", {}))
    c_map = dict(settings.get("cycle_mappings", {}))
    
    if branch_code in b_map or branch_code in c_map:
        b_map.pop(branch_code, None)
        c_map.pop(branch_code, None)
        
        db.academic_settings.update_one(
            {"_id": "global"}, 
            {"$set": {"branch_mappings": b_map, "cycle_mappings": c_map}}, 
            upsert=True
        )
        return {"status": "success", "message": f"Branch '{branch_code}' removed successfully."}
    else:
        raise HTTPException(status_code=404, detail=f"Branch code '{branch_code}' not found")


