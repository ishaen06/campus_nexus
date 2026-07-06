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
                        "project_topic": group.get("project_topic") or "N/A"
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
    mentors = list(db.users.find({"is_mentor": True}))
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

@router.post("/groups/move-student")
def move_student_between_teams(student_id: int, target_group_id: int, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    student = db.users.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Remove student from any current group memberships
    db.group_members.delete_many({"user_id": student_id})
    
    # If target group id is specified, add them
    if target_group_id > 0:
        target_group = db.group_chats.find_one({"id": target_group_id})
        if not target_group:
            raise HTTPException(status_code=404, detail="Target team not found")
            
        new_member_id = get_next_sequence_value("group_members")
        db.group_members.insert_one({
            "id": new_member_id,
            "group_id": target_group_id,
            "user_id": student_id
        })
        
    # Regenerate sheets
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"detail": "Student moved successfully"}
