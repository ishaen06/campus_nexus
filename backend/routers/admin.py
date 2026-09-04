from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional, Dict, Any
from io import BytesIO
import pandas as pd
from fpdf import FPDF
from fpdf.fonts import FontFace
from datetime import datetime

from database_mongo import get_mongo_db, get_next_sequence_value
from routers.users import get_current_user
from routers.chat import (
    regenerate_approved_teams_csv,
    regenerate_mentor_marks_csv,
    validate_team_criteria,
    _extract_user_academic_info,
    BRANCH_CLUSTERS
)

from pydantic import BaseModel
import os

class AdminReauthRequest(BaseModel):
    password: str

router = APIRouter()

def get_admin_user(current_user = Depends(get_current_user)):
    email = (current_user.get("email") or "").lower().strip()
    is_admin = current_user.get("is_admin", False) or (email == "ishaen.vihaan@gmail.com")
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
def get_reports(year: Optional[int] = Query(None), admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    reports = list(db.reports.find())
    results = []
    for r in reports:
        reporter = db.users.find_one({"id": r["reporter_id"]})
        reported = db.users.find_one({"id": r["reported_id"]})
        
        # Filter by year if requested
        if year is not None and year in [1, 2, 3, 4]:
            match_year = False
            if reporter and not reporter.get("is_mentor"):
                _, _, y = _extract_user_academic_info(reporter)
                if y == year:
                    match_year = True
            if reported and not reported.get("is_mentor"):
                _, _, y = _extract_user_academic_info(reported)
                if y == year:
                    match_year = True
            if not match_year:
                continue

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
def download_approved_teams(
    year: Optional[int] = Query(None, description="Year of study: 1, 2, 3 or None for all"),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    regenerate_approved_teams_csv(db, year=year)
    file_path = f"teachers_excel/approved_teams_year{year}.csv" if year else "teachers_excel/approved_teams.csv"
    filename = f"approved_teams_year{year}.csv" if year else "approved_teams.csv"
    return FileResponse(path=file_path, filename=filename, media_type="text/csv")


@router.get("/download-student-marks")
def download_student_marks(
    year: Optional[int] = Query(None, description="Year of study: 1, 2, 3 or None for all"),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    regenerate_mentor_marks_csv(db, year=year)
    file_path = f"teachers_excel/student_phase_marks_year{year}.csv" if year else "teachers_excel/student_phase_marks.csv"
    filename = f"student_phase_marks_year{year}.csv" if year else "student_phase_marks.csv"
    return FileResponse(path=file_path, filename=filename, media_type="text/csv")


@router.get("/analytics")
def get_admin_analytics(
    year: Optional[int] = Query(None, description="Year of study: 1, 2, 3 or None for all"),
    admin = Depends(get_admin_user),
    db = Depends(get_mongo_db)
):
    # 1. Fetch all student accounts and calculate academic info
    all_students = list(db.users.find({
        "is_mentor": {"$ne": True},
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"}
    }))
    
    student_map = {}
    year_student_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    for s in all_students:
        s.pop("_id", None)
        _, _, y_study = _extract_user_academic_info(s)
        s["year_of_study"] = y_study
        student_map[s["id"]] = s
        if y_study in year_student_counts:
            year_student_counts[y_study] += 1

    # Filter students by year if requested
    if year is not None and year in [1, 2, 3, 4]:
        filtered_students = [s for s in all_students if s.get("year_of_study") == year]
    else:
        filtered_students = all_students
    filtered_student_ids = set(s["id"] for s in filtered_students)

    # 2. Fetch all groups and members to resolve team year
    all_groups = list(db.group_chats.find())
    all_members = list(db.group_members.find())

    group_members_map = {}
    for m in all_members:
        gid = m.get("group_id")
        uid = m.get("user_id")
        if gid not in group_members_map:
            group_members_map[gid] = []
        group_members_map[gid].append(uid)

    group_year_map = {}
    year_team_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    for g in all_groups:
        gid = g["id"]
        m_uids = group_members_map.get(gid, [])
        years = []
        for uid in m_uids:
            if uid in student_map:
                years.append(student_map[uid]["year_of_study"])
        if not years and g.get("created_by") in student_map:
            years.append(student_map[g["created_by"]]["year_of_study"])

        # Default to 2 if unknown
        team_year = years[0] if years else 2
        group_year_map[gid] = team_year
        if team_year in year_team_counts:
            year_team_counts[team_year] += 1

    # Filter groups by year if requested
    if year is not None and year in [1, 2, 3, 4]:
        filtered_groups = [g for g in all_groups if group_year_map.get(g["id"]) == year]
    else:
        filtered_groups = all_groups
    filtered_group_ids = set(g["id"] for g in filtered_groups)

    # 3. Calculate metrics for the selected year scope
    total_students = len(filtered_students)
    total_mentors = db.users.count_documents({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}})
    total_teams = len(filtered_groups)
    approved_teams = len([g for g in filtered_groups if g.get("mentor_status") == "APPROVED"])
    pending_teams = len([g for g in filtered_groups if g.get("mentor_status") == "PENDING"])
    total_events = db.events.count_documents({})
    total_notifications = db.notifications.count_documents({})

    total_projects = len([g for g in filtered_groups if g.get("project_topic") and str(g.get("project_topic")).strip()])
    active_projects = len([g for g in filtered_groups if g.get("mentor_status") == "APPROVED" and g.get("project_topic") and str(g.get("project_topic")).strip()])
    pending_approvals = pending_teams

    # Students with / without teams in this scope
    students_in_teams_ids = set()
    for gid in filtered_group_ids:
        for uid in group_members_map.get(gid, []):
            if uid in filtered_student_ids:
                students_in_teams_ids.add(uid)
    students_in_teams = len(students_in_teams_ids)
    students_without_teams = max(0, total_students - students_in_teams)

    teams_without_mentors = len([g for g in filtered_groups if not g.get("mentor_email")])
    evaluations_completed = len([g for g in filtered_groups if g.get("mentor_status") == "COMPLETED"])

    # Branch distribution for this scope
    branch_counts = {}
    for s in filtered_students:
        branch = (s.get("branch") or s.get("branch_code") or "N/A").strip().upper()
        branch_counts[branch] = branch_counts.get(branch, 0) + 1

    # Team department distribution
    dept_counts = {}
    for group in filtered_groups:
        dept = "N/A"
        mentor_email = group.get("mentor_email")
        if mentor_email:
            mentor = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            if mentor and mentor.get("department"):
                dept = mentor.get("department").strip().upper()
        if dept == "N/A":
            m_uids = group_members_map.get(group["id"], [])
            if m_uids and m_uids[0] in student_map:
                dept = (student_map[m_uids[0]].get("branch") or student_map[m_uids[0]].get("branch_code") or "N/A").strip().upper()
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    # Mentor workload for this scope
    mentor_workload = {}
    for mentor in db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}}):
        email = mentor.get("email")
        name = mentor.get("full_name") or email
        count = len([g for g in filtered_groups if (g.get("mentor_email") or "").lower() == (email or "").lower() and g.get("mentor_status") == "APPROVED"])
        if count > 0:
            mentor_workload[name] = count

    # Approval status
    approval_status = {
        "APPROVED": approved_teams,
        "PENDING": pending_teams,
        "REJECTED": len([g for g in filtered_groups if g.get("mentor_status") == "REJECTED"]),
        "NOT SUBMITTED": len([g for g in filtered_groups if g.get("mentor_status") in ["NOT_SUBMITTED", None]])
    }

    # Event registration count
    event_registrations = {}
    for e in db.events.find():
        title = e.get("title") or "Unnamed Event"
        event_registrations[title] = len(e.get("rsvps") or [])

    team_formation_progress = {
        "in_teams": students_in_teams,
        "without_teams": students_without_teams
    }

    completed_projects = len([g for g in filtered_groups if g.get("mentor_status") == "APPROVED" and (g.get("phase3_marks") or 0) > 0])
    ongoing_projects = len([g for g in filtered_groups if g.get("mentor_status") == "APPROVED" and not (g.get("phase3_marks") or 0) > 0])
    pending_projects = len([g for g in filtered_groups if g.get("mentor_status") != "APPROVED"])
    project_status_distribution = {
        "Completed": completed_projects,
        "Ongoing": ongoing_projects,
        "Pending": pending_projects
    }

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

    monthly_trend = {}
    valid_groups = []
    for g in filtered_groups:
        dt = get_group_date(g)
        if dt:
            valid_groups.append((dt, g))
    valid_groups.sort(key=lambda x: x[0])

    for dt, g in valid_groups:
        if hasattr(dt, "strftime"):
            month_str = dt.strftime("%b %Y")
            monthly_trend[month_str] = monthly_trend.get(month_str, 0) + 1

    # Build list of students with team info for the selected scope
    user_team_map = {}
    for g in all_groups:
        for uid in group_members_map.get(g["id"], []):
            user_team_map[uid] = {
                "team_id": g["id"],
                "team_name": g.get("name"),
                "mentor_name": g.get("mentor_name") or "Unassigned"
            }

    students_list = []
    for s in filtered_students:
        uid = s["id"]
        t_info = user_team_map.get(uid)
        students_list.append({
            "id": uid,
            "full_name": s.get("full_name") or "N/A",
            "usn": s.get("usn") or "N/A",
            "email": s.get("email") or "N/A",
            "branch": (s.get("branch") or s.get("branch_code") or "N/A").strip().upper(),
            "year_of_study": s.get("year_of_study") or 1,
            "cycle": (s.get("cycle") or "N/A") if s.get("year_of_study") == 1 else "N/A",
            "has_team": t_info is not None,
            "team_id": t_info["team_id"] if t_info else None,
            "team_name": t_info["team_name"] if t_info else "No Team",
            "mentor_name": t_info["mentor_name"] if t_info else None
        })

    # Build list of teams for the selected scope
    teams_list = []
    for g in filtered_groups:
        gid = g["id"]
        m_uids = group_members_map.get(gid, [])
        members_summary = []
        for mid in m_uids:
            if mid in student_map:
                st = student_map[mid]
                members_summary.append({
                    "id": mid,
                    "name": st.get("full_name") or "N/A",
                    "usn": st.get("usn") or "N/A",
                    "branch": (st.get("branch") or st.get("branch_code") or "N/A").strip().upper()
                })
        teams_list.append({
            "id": gid,
            "name": g.get("name") or f"Team #{gid}",
            "project_topic": g.get("project_topic") or "Topic not submitted",
            "project_theme": g.get("project_theme") or g.get("theme") or "N/A",
            "mentor_name": g.get("mentor_name") or "Unassigned",
            "mentor_status": g.get("mentor_status") or "NOT_SUBMITTED",
            "member_count": len(members_summary),
            "members": members_summary,
            "team_year": group_year_map.get(gid, 2)
        })

    return {
        "selected_year": year,
        "year_breakdown": {
            "all": {"students": len(all_students), "teams": len(all_groups)},
            "1": {"students": year_student_counts[1], "teams": year_team_counts[1]},
            "2": {"students": year_student_counts[2], "teams": year_team_counts[2]},
            "3": {"students": year_student_counts[3], "teams": year_team_counts[3]}
        },
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
            "teams_without_mentors": teams_without_mentors,
            "evaluations_completed": evaluations_completed
        },
        "students_by_branch": branch_counts,
        "teams_by_department": dept_counts,
        "mentor_workload": mentor_workload,
        "project_approval_status": approval_status,
        "event_registrations": event_registrations,
        "team_formation_progress": team_formation_progress,
        "project_status_distribution": project_status_distribution,
        "monthly_project_creation_trend": monthly_trend,
        "students": students_list,
        "teams": teams_list
    }



@router.get("/users")
def get_all_users(year: Optional[int] = Query(None), admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    """Return all platform users (students + mentors) sorted by role then name."""
    users = list(db.users.find(
        {"email": {"$ne": "ishaen.vihaan@gmail.com"}},
        sort=[("is_mentor", -1), ("full_name", 1)]
    ))
    formatted_users = []
    for u in users:
        is_mentor = bool(u.get("is_mentor"))
        user_year = None
        if not is_mentor:
            _, _, y_study = _extract_user_academic_info(u)
            user_year = y_study
            if year is not None and year in [1, 2, 3, 4] and user_year != year:
                continue

        group_info = None
        if not is_mentor:
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
            "is_mentor": is_mentor,
            "bio": u.get("bio") or "",
            "cycle": (u.get("cycle") or "N/A") if user_year == 1 else "N/A",
            "year_of_study": user_year if not is_mentor else None,
            "group": group_info
        })
    return formatted_users

@router.get("/search")
def admin_global_search(q: str = "", year: Optional[int] = Query(None), admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
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
        is_mentor = bool(u.get("is_mentor"))
        user_year = None
        if not is_mentor:
            _, _, y_study = _extract_user_academic_info(u)
            user_year = y_study
            if year is not None and year in [1, 2, 3, 4] and user_year != year:
                continue

        # Resolve group membership if student
        group_info = None
        if not is_mentor:
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
            "is_mentor": is_mentor,
            "bio": u.get("bio") or "",
            "cycle": (u.get("cycle") or "N/A") if user_year == 1 else "N/A",
            "year_of_study": user_year if not is_mentor else None,
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
        
        team_years = []
        for s in students:
            _, _, y = _extract_user_academic_info(s)
            team_years.append(y)
        if not team_years:
            creator = db.users.find_one({"id": t.get("created_by")})
            if creator:
                _, _, cy = _extract_user_academic_info(creator)
                team_years.append(cy)
        team_year = team_years[0] if team_years else 2

        if year is not None and year in [1, 2, 3, 4] and team_year != year:
            continue

        member_names = [s.get("full_name") for s in students if s.get("full_name")]
        
        formatted_teams.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
            "team_year": team_year,
            "members": member_names
        })
        
    return {
        "users": formatted_users,
        "teams": formatted_teams
    }


@router.get("/mentors")
def get_admin_mentors(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    mentors = list(db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}}))
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
def get_unassigned_teams(year: Optional[int] = Query(None), admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    teams = list(db.group_chats.find())
    results = []
    for t in teams:
        member_recs = list(db.group_members.find({"group_id": t["id"]}))
        member_ids = [r["user_id"] for r in member_recs]
        students = list(db.users.find({"id": {"$in": member_ids}, "is_mentor": {"$ne": True}})) if member_ids else []
        team_years = []
        for s in students:
            _, _, y = _extract_user_academic_info(s)
            team_years.append(y)
        if not team_years:
            creator = db.users.find_one({"id": t.get("created_by")})
            if creator:
                _, _, cy = _extract_user_academic_info(creator)
                team_years.append(cy)
        team_year = team_years[0] if team_years else 2

        if year is not None and year in [1, 2, 3, 4] and team_year != year:
            continue

        results.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
            "team_year": team_year
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
def get_admin_teams(year: Optional[int] = Query(None), admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
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
        
        team_years = []
        for s in students:
            _, _, y = _extract_user_academic_info(s)
            team_years.append(y)
        if not team_years:
            creator = db.users.find_one({"id": t.get("created_by")})
            if creator:
                _, _, cy = _extract_user_academic_info(creator)
                team_years.append(cy)
        team_year = team_years[0] if team_years else 2

        if year is not None and year in [1, 2, 3, 4] and team_year != year:
            continue

        formatted_students = []
        for s in students:
            _, _, sy = _extract_user_academic_info(s)
            formatted_students.append({
                "id": s["id"],
                "full_name": s.get("full_name") or "N/A",
                "usn": s.get("usn") or "N/A",
                "email": s.get("email") or "N/A",
                "branch": s.get("branch") or "N/A",
                "cycle": (s.get("cycle") or "N/A") if sy == 1 else "N/A",
                "year_of_study": sy
            })
            
        results.append({
            "id": t["id"],
            "name": t.get("name") or "N/A",
            "project_topic": t.get("project_topic") or "N/A",
            "mentor_name": t.get("mentor_name") or "N/A",
            "mentor_email": t.get("mentor_email") or "N/A",
            "mentor_status": t.get("mentor_status") or "NOT_SUBMITTED",
            "team_year": team_year,
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

def _update_team_criteria_by_id(group_id: int, db):
    member_records = list(db.group_members.find({"group_id": group_id}))
    member_ids = [m["user_id"] for m in member_records]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    for mu in member_users:
        mu.pop("_id", None)
        b_code, j_yr, y_study = _extract_user_academic_info(mu)
        mu["branch_code"] = b_code
        mu["joining_year"] = j_yr
        mu["year_of_study"] = y_study
        mu["cluster"] = BRANCH_CLUSTERS.get(b_code)
    
    crit_met, val_err = validate_team_criteria(member_users)
    db.group_chats.update_one({"id": group_id}, {
        "$set": {
            "criteria_met": crit_met,
            "validation_error": val_err if not crit_met else None
        }
    })

@router.post("/groups/move-student")
def move_student_by_admin(
    student_id: int = Query(...),
    target_group_id: int = Query(...),
    admin = Depends(get_admin_user),
    db = Depends(get_mongo_db)
):
    student = db.users.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student_name = student.get("full_name") or f"Student #{student_id}"

    # 1. Find student's current team (if any)
    current_membership = db.group_members.find_one({"user_id": student_id})
    old_group_id = current_membership["group_id"] if current_membership else None

    # Case A: target_group_id == 0 -> Remove student from team (No Team)
    if target_group_id == 0:
        if not current_membership:
            return {"detail": f"{student_name} is not currently in any team."}
            
        # Delete from group_members
        db.group_members.delete_many({"user_id": student_id})
        
        # Check old group
        old_group = db.group_chats.find_one({"id": old_group_id})
        if old_group:
            # If student was creator, reassign created_by to another remaining student member if available
            if old_group.get("created_by") == student_id:
                remaining_member = db.group_members.find_one({"group_id": old_group_id})
                if remaining_member:
                    db.group_chats.update_one({"id": old_group_id}, {"$set": {"created_by": remaining_member["user_id"]}})
            
            # Recalculate team criteria for old group
            _update_team_criteria_by_id(old_group_id, db)
            
            # Post a system message in old group chat
            new_msg_id = get_next_sequence_value("group_messages")
            db.group_messages.insert_one({
                "id": new_msg_id,
                "group_id": old_group_id,
                "sender_id": admin["id"],
                "content": f"ℹ️ Admin removed {student_name} from the team.",
                "created_at": datetime.utcnow()
            })
            
        regenerate_approved_teams_csv(db)
        regenerate_mentor_marks_csv(db)
        return {"detail": f"{student_name} has been removed from their team."}

    # Case B: target_group_id > 0 -> Move student to target team
    if student.get("is_admin") or (student.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
        raise HTTPException(status_code=400, detail="Administrators cannot be added or assigned to a student project team.")
    if student.get("is_mentor"):
        raise HTTPException(status_code=400, detail="Mentors cannot be added as student project team members.")

    target_group = db.group_chats.find_one({"id": target_group_id})
    if not target_group:
        raise HTTPException(status_code=404, detail="Target team not found")
        
    if old_group_id == target_group_id:
        return {"detail": f"{student_name} is already in {target_group['name']}."}

        
    # Check target team capacity (max 5 members)
    target_members = list(db.group_members.find({"group_id": target_group_id}))
    target_member_uids = [m["user_id"] for m in target_members]
    target_member_users = list(db.users.find({"id": {"$in": target_member_uids}}))
    non_mentor_count = len([u for u in target_member_users if not u.get("is_mentor")])
    if non_mentor_count >= 5:
        raise HTTPException(status_code=400, detail=f"Target team '{target_group['name']}' already has the maximum capacity of 5 members.")
        
    # Remove from previous group if any
    if current_membership:
        db.group_members.delete_many({"user_id": student_id})
        old_group = db.group_chats.find_one({"id": old_group_id})
        if old_group:
            if old_group.get("created_by") == student_id:
                remaining_member = db.group_members.find_one({"group_id": old_group_id})
                if remaining_member:
                    db.group_chats.update_one({"id": old_group_id}, {"$set": {"created_by": remaining_member["user_id"]}})
            _update_team_criteria_by_id(old_group_id, db)
            
            new_msg_id = get_next_sequence_value("group_messages")
            db.group_messages.insert_one({
                "id": new_msg_id,
                "group_id": old_group_id,
                "sender_id": admin["id"],
                "content": f"ℹ️ Admin transferred {student_name} to team '{target_group['name']}'.",
                "created_at": datetime.utcnow()
            })
            
    # Add to target group
    new_member_id = get_next_sequence_value("group_members")
    db.group_members.insert_one({
        "id": new_member_id,
        "group_id": target_group_id,
        "user_id": student_id
    })
    
    # Recalculate target group criteria
    _update_team_criteria_by_id(target_group_id, db)
    
    # Post system message in target group chat
    new_msg_id = get_next_sequence_value("group_messages")
    db.group_messages.insert_one({
        "id": new_msg_id,
        "group_id": target_group_id,
        "sender_id": admin["id"],
        "content": f"🎉 Admin transferred {student_name} into this team.",
        "created_at": datetime.utcnow()
    })
    
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    return {"detail": f"{student_name} has been transferred to {target_group['name']}."}

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

def _group_belongs_to_year(group, year: int, db) -> bool:
    if isinstance(group, dict):
        g = group
        gid = g.get("id")
    else:
        gid = group
        try:
            num_gid = int(gid)
        except (ValueError, TypeError):
            num_gid = gid
        g = db.group_chats.find_one({"id": gid})
        if not g and str(gid) != gid:
            g = db.group_chats.find_one({"id": str(gid)})
        if not g and num_gid != gid:
            g = db.group_chats.find_one({"id": num_gid})

    try:
        num_gid = int(gid)
    except (ValueError, TypeError):
        num_gid = gid

    member_recs = list(db.group_members.find({"group_id": gid}))
    if not member_recs and str(gid) != gid:
        member_recs = list(db.group_members.find({"group_id": str(gid)}))
    if not member_recs and num_gid != gid:
        member_recs = list(db.group_members.find({"group_id": num_gid}))
    m_uids = [r.get("user_id") for r in member_recs if r.get("user_id") is not None]

    
    if g and g.get("created_by") is not None:
        m_uids.append(g["created_by"])
    stus = list(db.users.find({"id": {"$in": m_uids}, "is_mentor": {"$ne": True}, "is_admin": {"$ne": True}}))
    for s in stus:
        if _extract_user_academic_info(s)[2] == year:
            return True
    return False

def fetch_report_dataframe(dataset: str, db, year: Optional[int] = None) -> tuple:
    year_labels = {
        1: "1st Year (2026 Batch)",
        2: "2nd Year (2025 Batch)",
        3: "3rd Year (2024 Batch)",
        4: "4th Year (2023 Batch)"
    }
    year_suffix = f" - {year_labels.get(year, f'Year {year} Cohort')}" if year else " - All Years (Separated)"

    if dataset == "students":
        students = list(db.users.find({
            "is_mentor": {"$ne": True},
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        if year is not None:
            students = [s for s in students if _extract_user_academic_info(s)[2] == year]
        else:
            students = sorted(students, key=lambda s: _extract_user_academic_info(s)[2])
        data = []
        for s in students:
            _, _, s_yr = _extract_user_academic_info(s)
            y_badge = year_labels.get(s_yr, f"Year {s_yr}")
            group_id = "N/A"
            group_name = "N/A"
            membership = db.group_members.find_one({"user_id": s["id"]})
            if membership:
                g = db.group_chats.find_one({"id": membership["group_id"]})
                if g:
                    group_id = str(g["id"])
                    group_name = g.get("name") or "N/A"
            data.append({
                "Academic Year": y_badge,
                "Student ID": s["id"],
                "Student Name": s.get("full_name") or "N/A",
                "Email": s.get("email") or "N/A",
                "USN": s.get("usn") or "N/A",
                "Branch": s.get("branch") or "N/A",
                "Cycle": (s.get("cycle") or "N/A") if y_study == 1 else "N/A",
                "Team ID": group_id,
                "Team Name": group_name
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Academic Year", "Student ID", "Student Name", "Email", "USN", "Branch", "Cycle", "Team ID", "Team Name"])
        return df, f"Student List Report{year_suffix}", (30, 15, 40, 55, 25, 20, 15, 20, 60)

    elif dataset == "mentors":
        mentors = list(db.users.find({"is_mentor": True, "is_admin": {"$ne": True}, "email": {"$ne": "ishaen.vihaan@gmail.com"}}))
        data = []
        for m in mentors:
            approved_chats = list(db.group_chats.find({
                "mentor_email": {"$regex": f"^{m['email']}$", "$options": "i"},
                "mentor_status": "APPROVED"
            }))
            if year is not None:
                count = len([c for c in approved_chats if _group_belongs_to_year(c, year, db)])
                if count == 0:
                    continue
                y_badge = year_labels.get(year, f"Year {year}")
            else:
                count = len(approved_chats)
                y_badge = "All Assigned Cohorts"

            data.append({
                "Academic Year": y_badge,
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
            df = pd.DataFrame(columns=["Academic Year", "Mentor ID", "Mentor Name", "Email", "Department", "Designation", "Active Teams", "Max Capacity"])
        return df, f"Mentor Directory Report{year_suffix}", (30, 15, 40, 55, 40, 45, 25, 20)

    elif dataset == "teams":
        teams = list(db.group_chats.find())
        if year is not None:
            teams = [t for t in teams if _group_belongs_to_year(t, year, db)]
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
            if year is not None:
                students = [s for s in students if _extract_user_academic_info(s)[2] == year]
                if not students:
                    continue
            
            for s in students:
                _, _, s_yr = _extract_user_academic_info(s)
                y_badge = year_labels.get(s_yr, f"Year {s_yr}")
                data.append({
                    "Academic Year": y_badge,
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
            df = pd.DataFrame(columns=["Academic Year", "Team ID", "Team Name", "Student ID", "Student Name", "Student USN", "Student Branch", "Student Email"])
        return df, f"Team Roster Assignment Report{year_suffix}", (30, 20, 45, 20, 45, 25, 20, 60)

    elif dataset == "marks":
        students = list(db.users.find({
            "is_mentor": {"$ne": True}, 
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        if year is not None:
            students = [s for s in students if _extract_user_academic_info(s)[2] == year]
        else:
            students = sorted(students, key=lambda s: _extract_user_academic_info(s)[2])
        data = []
        for s in students:
            student_id = s.get("id")
            usn = s.get("usn") or "N/A"
            name = s.get("full_name") or "N/A"
            branch = s.get("branch") or "N/A"
            _, _, s_yr = _extract_user_academic_info(s)
            y_badge = year_labels.get(s_yr, f"Year {s_yr}")
            
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
                "Academic Year": y_badge,
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
                "Academic Year", "USN", "Student Name", "Branch", "Team ID", "Team Name",
                "P1 - Problem Definition", "P1 - Objectives", "P1 - Methodology", "Phase 1 Total",
                "P2 - Project Execution", "P2 - Tools & Techniques", "P2 - Partial Results", "Phase 2 Total",
                "P3 - Prototype Demo", "P3 - Results & Discussion", "P3 - Report/Poster/PPT", "P3 - Outcome/Work", "Phase 3 Total",
                "Total Marks"
            ])
        return df, f"Student Performance Marks Report{year_suffix}", (28, 20, 35, 18, 15, 35, 22, 18, 20, 18, 22, 22, 20, 18, 22, 22, 22, 18, 18, 18)

    elif dataset == "projects":
        teams = list(db.group_chats.find())
        if year is not None:
            teams = [t for t in teams if _group_belongs_to_year(t, year, db)]
        data = []
        for t in teams:
            t_yr = year
            if t_yr is None:
                for y_check in [1, 2, 3]:
                    if _group_belongs_to_year(t, y_check, db):
                        t_yr = y_check
                        break
            y_badge = year_labels.get(t_yr, f"Year {t_yr}") if t_yr else "N/A"
            data.append({
                "Academic Year": y_badge,
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
            df = pd.DataFrame(columns=["Academic Year", "Team ID", "Team Name", "Project Theme", "Project Sub-Topic", "Project Topic", "Assigned Mentor", "Mentor Email", "Approval Status"])
        return df, f"Project Themes & Topic Allocation Report{year_suffix}", (28, 15, 40, 35, 40, 45, 35, 50, 25)

    elif dataset == "approvals":
        teams = list(db.group_chats.find())
        if year is not None:
            teams = [t for t in teams if _group_belongs_to_year(t, year, db)]
        data = []
        for t in teams:
            t_yr = year
            if t_yr is None:
                for y_check in [1, 2, 3]:
                    if _group_belongs_to_year(t, y_check, db):
                        t_yr = y_check
                        break
            y_badge = year_labels.get(t_yr, f"Year {t_yr}") if t_yr else "N/A"
            data.append({
                "Academic Year": y_badge,
                "Team ID": t["id"],
                "Team Name": t.get("name") or "N/A",
                "Project Theme": t.get("project_topic") or "N/A",
                "Mentor Name": t.get("mentor_name") or "N/A",
                "Approval Status": t.get("mentor_status") or "NOT_SUBMITTED",
                "Rejection Reason": t.get("mentor_rejection_reason") or "N/A"
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Academic Year", "Team ID", "Team Name", "Project Theme", "Mentor Name", "Approval Status", "Rejection Reason"])
        return df, f"Project Approvals & Feedback Report{year_suffix}", (28, 18, 40, 60, 40, 30, 45)

    elif dataset == "events":
        events = list(db.events.find())
        data = []
        for ev in events:
            data.append({
                "Event ID": ev.get("id") or str(ev.get("_id")),
                "Title": ev.get("title") or "N/A",
                "Phase": ev.get("phase") or "N/A",
                "Category": ev.get("category") or "N/A",
                "Date": ev.get("date") or "N/A",
                "Time": ev.get("time") or "N/A",
                "Venue": ev.get("venue") or "N/A",
                "Audience": ev.get("audience") or "All Students"
            })
        df = pd.DataFrame(data)
        if df.empty:
            df = pd.DataFrame(columns=["Event ID", "Title", "Phase", "Category", "Date", "Time", "Venue", "Audience"])
        return df, f"Master Academic Schedule & Events Calendar{year_suffix}", (20, 50, 20, 25, 25, 25, 40, 40)

    elif dataset == "approved_teams":
        approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
        if year is not None:
            approved_groups = [g for g in approved_groups if _group_belongs_to_year(g, year, db)]

        data = []
        for group in approved_groups:
            group_yr = year
            if group_yr is None:
                for y_check in [1, 2, 3]:
                    if _group_belongs_to_year(group, y_check, db):
                        group_yr = y_check
                        break
            y_badge = year_labels.get(group_yr, f"Year {group_yr}") if group_yr else "N/A"

            member_records = list(db.group_members.find({"group_id": group["id"]}))
            member_ids = [m["user_id"] for m in member_records]
            
            mentor_email = group.get("mentor_email")
            mentor_id = None
            if mentor_email:
                mentor_user = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
                mentor_id = mentor_user["id"] if mentor_user else None
            
            student_ids = [uid for uid in member_ids if uid != mentor_id]
            students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
            if year is not None:
                students = [s for s in students if _extract_user_academic_info(s)[2] == year]
            
            row_dict = {
                "Academic Year": y_badge,
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
                "Academic Year", "Team ID", "Team Name", "Project Topic", "Mentor Name", "Mentor Email", "Approved At",
                "Member 1 Name", "Member 1 USN", "Member 2 Name", "Member 2 USN",
                "Member 3 Name", "Member 3 USN", "Member 4 Name", "Member 4 USN",
                "Member 5 Name", "Member 5 USN"
            ])
        return df, f"Approved Project Teams Master Report{year_suffix}", (28, 15, 25, 30, 20, 25, 20, 15, 13, 15, 13, 15, 13, 15, 13, 15, 13)

    elif dataset == "student_marks":
        students = list(db.users.find({
            "is_mentor": {"$ne": True}, 
            "is_admin": {"$ne": True},
            "email": {"$ne": "ishaen.vihaan@gmail.com"}
        }))
        if year is not None:
            students = [s for s in students if _extract_user_academic_info(s)[2] == year]
        else:
            students = sorted(students, key=lambda s: _extract_user_academic_info(s)[2])
        data = []
        for s in students:
            student_id = s.get("id")
            usn = s.get("usn") or "N/A"
            name = s.get("full_name") or "N/A"
            branch = s.get("branch") or "N/A"
            section = s.get("section") or "N/A"
            _, _, y_study = _extract_user_academic_info(s)
            y_badge = year_labels.get(y_study, f"Year {y_study}")
            if y_study == 1:
                semester = "1st Sem"
            elif y_study == 2:
                semester = "3rd Sem"
            elif y_study == 3:
                semester = "5th Sem"
            elif y_study == 4:
                semester = "7th Sem"
            else:
                semester = "N/A"
            
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
                "Academic Year": y_badge,
                "USN": usn,
                "Student Name": name,
                "Branch": branch,
                "Sec": section,
                "Semester": semester,
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
                "Academic Year", "USN", "Student Name", "Branch", "Sec", "Semester", "Team Name", "Mentor",
                "P1 Marks", "P1 Observations", "P2 Marks", "P2 Observations", "P3 Marks", "P3 Observations", "Total Marks"
            ])
        return df, f"Student Performance Marks & Detailed Observations Report{year_suffix}", (28, 18, 30, 18, 10, 10, 25, 20, 12, 28, 12, 28, 12, 28, 12)

    else:
        raise HTTPException(status_code=400, detail="Invalid dataset specified")

@router.get("/reports/preview")
def preview_admin_report(
    dataset: str = Query(...), 
    year: Optional[int] = Query(None, description="Cohort year: 1, 2, 3, 4 or None"),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    active_year = year if year is not None else 1
    df, report_title, col_widths = fetch_report_dataframe(dataset, db, year=active_year)
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
        "total_rows": len(df),
        "year": active_year
    }

@router.get("/reports/download")
def download_admin_report(
    dataset: str = Query(...), 
    format: str = Query(...), 
    year: Optional[int] = Query(None, description="Cohort year: 1, 2, 3, 4 or None"),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    year_labels = {
        1: "1st Year (2026 Batch)",
        2: "2nd Year (2025 Batch)",
        3: "3rd Year (2024 Batch)",
        4: "4th Year (2023 Batch)"
    }
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    if format == "csv":
        active_year = year if year is not None else 1
        df, report_title, _ = fetch_report_dataframe(dataset, db, year=active_year)
        csv_data = df.to_csv(index=False)
        filename = f"{dataset}_report_year{active_year}_{date_str}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "excel":
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            workbook  = writer.book
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#1E3A8A',
                'font_color': '#FFFFFF',
                'border': 1
            })
            merge_format = workbook.add_format({
                'valign': 'vcenter',
                'align': 'center',
                'border': 1,
                'bold': True,
                'bg_color': '#EEF2FF',
            })

            # Never combine data across years! If no year specified, generate 3 separate sheets.
            years_to_export = [year] if year is not None else [1, 2, 3]
            for y_val in years_to_export:
                df_y, _, _ = fetch_report_dataframe(dataset, db, year=y_val)
                # Excel sheet name max length 31 chars
                sheet_title = f"{year_labels.get(y_val, f'Year {y_val}')[:31]}"
                df_y.to_excel(writer, sheet_name=sheet_title, index=False)
                worksheet = writer.sheets[sheet_title]
                
                for col_num, value in enumerate(df_y.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                    max_len = max(
                        df_y[value].astype(str).map(len).max() if not df_y.empty else len(value),
                        len(value)
                    ) + 3
                    worksheet.set_column(col_num, col_num, min(max_len, 50))
                
                if dataset == "teams" and not df_y.empty and "Team ID" in df_y.columns and "Team Name" in df_y.columns:
                    team_id_col = list(df_y.columns).index("Team ID")
                    team_name_col = list(df_y.columns).index("Team Name")
                    rows = df_y.values.tolist()
                    i = 0
                    while i < len(rows):
                        current_team_id = rows[i][team_id_col]
                        current_team_name = rows[i][team_name_col]
                        j = i + 1
                        while j < len(rows) and rows[j][team_id_col] == current_team_id:
                            j += 1
                        start_row = i + 1
                        end_row = j
                        if end_row - start_row > 1:
                            worksheet.merge_range(start_row, team_id_col, end_row - 1, team_id_col, current_team_id, merge_format)
                            worksheet.merge_range(start_row, team_name_col, end_row - 1, team_name_col, current_team_name, merge_format)
                        i = j
                
        output.seek(0)
        filename = f"{dataset}_report_year{year}_{date_str}.xlsx" if year else f"{dataset}_report_all_years_separated_{date_str}.xlsx"
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "pdf":
        active_year = year if year is not None else 1
        df, report_title, col_widths = fetch_report_dataframe(dataset, db, year=active_year)
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
                    for c_idx, cell_value in enumerate(r_data):
                        row.cell(cell_value)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF rendering error: {str(e)}")
            
        filename = f"{dataset}_report_year{active_year}_{date_str}.pdf"
        return Response(
            content=bytes(pdf.output()),
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
    cluster_mappings: Optional[dict] = None
    cluster_themes: Optional[dict] = None
    year: Optional[int] = None

class ThemeRequest(BaseModel):
    cluster: str
    theme: str

class AddBranchRequest(BaseModel):
    code: str
    name: str
    cycle: Optional[str] = "P"
    cluster: Optional[str] = "CS"

@router.get("/academic-settings")
def get_admin_academic_settings(
    year: Optional[int] = Query(None, description="Cohort year: 1, 2, 3, 4 or None"),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    from services.academic_service import (
        get_academic_settings, 
        DEFAULT_BRANCH_NAMES, 
        DEFAULT_CYCLE_MAPPINGS, 
        DEFAULT_CLUSTER_MAPPINGS,
        DEFAULT_CLUSTER_THEMES
    )
    settings = get_academic_settings(db)
    
    # Calculate student count per branch code
    students = list(db.users.find({
        "is_mentor": {"$ne": True},
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"}
    }))
    if year is not None:
        students = [s for s in students if _extract_user_academic_info(s)[2] == year]

    branch_counts = {}
    for s in students:
        b_code, _, _ = _extract_user_academic_info(s)
        branch_counts[b_code] = branch_counts.get(b_code, 0) + 1
        
    can_edit_cycles = (year == 1 or year is None)
    cycle_restriction_message = ""
    if year in [2, 3]:
        cycle_restriction_message = f"Subject cycle modifications are restricted for Year {year}. Physics and Chemistry cycles apply exclusively to 1st Year students."

    return {
        "session_start_month": settings.get("session_start_month", 8),
        "branch_mappings": settings.get("branch_mappings", DEFAULT_BRANCH_NAMES),
        "cycle_mappings": settings.get("cycle_mappings", DEFAULT_CYCLE_MAPPINGS),
        "cluster_mappings": settings.get("cluster_mappings", DEFAULT_CLUSTER_MAPPINGS),
        "cluster_themes": settings.get("cluster_themes", DEFAULT_CLUSTER_THEMES),
        "branch_counts": branch_counts,
        "total_students": len(students),
        "year": year,
        "can_edit_cycles": can_edit_cycles,
        "cycle_restriction_message": cycle_restriction_message
    }

@router.put("/academic-settings")
def update_admin_academic_settings(
    payload: AcademicSettingsUpdateRequest, 
    year: Optional[int] = Query(None),
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    from services.academic_service import get_academic_settings, DEFAULT_CLUSTER_MAPPINGS, DEFAULT_CLUSTER_THEMES
    settings = get_academic_settings(db)
    
    target_year = payload.year if payload.year is not None else year
    if payload.cycle_mappings is not None and target_year in [2, 3]:
        raise HTTPException(
            status_code=400, 
            detail=f"Subject cycle modifications are restricted for {target_year}{'nd' if target_year == 2 else 'rd'} Year students. Physics and Chemistry cycles apply exclusively to 1st Year students."
        )

    update_data = {}
    if payload.session_start_month is not None:
        if not (1 <= payload.session_start_month <= 12):
            raise HTTPException(status_code=400, detail="Session start month must be between 1 and 12")
        update_data["session_start_month"] = payload.session_start_month
        
    if payload.branch_mappings is not None:
        update_data["branch_mappings"] = payload.branch_mappings
        
    if payload.cycle_mappings is not None:
        update_data["cycle_mappings"] = payload.cycle_mappings

    if payload.cluster_mappings is not None:
        update_data["cluster_mappings"] = payload.cluster_mappings

    if payload.cluster_themes is not None:
        update_data["cluster_themes"] = payload.cluster_themes
        
    if update_data:
        db.academic_settings.update_one({"_id": "global"}, {"$set": update_data}, upsert=True)
        
    updated_settings = get_academic_settings(db)
    return {
        "status": "success",
        "message": "Academic settings updated successfully.",
        "session_start_month": updated_settings.get("session_start_month", 8),
        "branch_mappings": updated_settings.get("branch_mappings", {}),
        "cycle_mappings": updated_settings.get("cycle_mappings", {}),
        "cluster_mappings": updated_settings.get("cluster_mappings", DEFAULT_CLUSTER_MAPPINGS),
        "cluster_themes": updated_settings.get("cluster_themes", DEFAULT_CLUSTER_THEMES),
        "can_edit_cycles": (target_year == 1 or target_year is None)
    }

@router.post("/academic-settings/themes")
def add_cluster_theme(
    payload: ThemeRequest, 
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    from services.academic_service import get_academic_settings, DEFAULT_CLUSTER_THEMES
    cluster = payload.cluster.strip().upper()
    theme = payload.theme.strip()
    
    if not theme:
        raise HTTPException(status_code=400, detail="Theme name cannot be empty.")
    if cluster not in ["CS", "EC", "ME", "CV"]:
        raise HTTPException(status_code=400, detail="Invalid cluster. Must be CS, EC, ME, or CV.")
        
    settings = get_academic_settings(db)
    themes_map = dict(settings.get("cluster_themes", DEFAULT_CLUSTER_THEMES))
    cluster_list = list(themes_map.get(cluster, []))
    
    if any(t.lower() == theme.lower() for t in cluster_list):
        raise HTTPException(status_code=400, detail=f"Theme '{theme}' already exists in {cluster} cluster.")
        
    cluster_list.append(theme)
    themes_map[cluster] = cluster_list
    
    db.academic_settings.update_one(
        {"_id": "global"},
        {"$set": {"cluster_themes": themes_map}},
        upsert=True
    )
    return {
        "status": "success",
        "message": f"Theme '{theme}' added to {cluster} cluster successfully.",
        "cluster": cluster,
        "themes": cluster_list,
        "cluster_themes": themes_map
    }

@router.delete("/academic-settings/themes")
def delete_cluster_theme(
    payload: ThemeRequest, 
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    from services.academic_service import get_academic_settings, DEFAULT_CLUSTER_THEMES
    cluster = payload.cluster.strip().upper()
    theme = payload.theme.strip()
    
    if cluster not in ["CS", "EC", "ME", "CV"]:
        raise HTTPException(status_code=400, detail="Invalid cluster. Must be CS, EC, ME, or CV.")
        
    settings = get_academic_settings(db)
    themes_map = dict(settings.get("cluster_themes", DEFAULT_CLUSTER_THEMES))
    cluster_list = list(themes_map.get(cluster, []))
    
    updated_list = [t for t in cluster_list if t.lower() != theme.lower()]
    themes_map[cluster] = updated_list
    
    db.academic_settings.update_one(
        {"_id": "global"},
        {"$set": {"cluster_themes": themes_map}},
        upsert=True
    )
    return {
        "status": "success",
        "message": f"Theme '{theme}' removed from {cluster} cluster successfully.",
        "cluster": cluster,
        "themes": updated_list,
        "cluster_themes": themes_map
    }

@router.post("/academic-settings/themes/delete")
def delete_cluster_theme_post(
    payload: ThemeRequest, 
    admin = Depends(get_admin_user), 
    db = Depends(get_mongo_db)
):
    return delete_cluster_theme(payload, admin, db)

@router.post("/academic-settings/branches")
def add_or_update_branch(payload: AddBranchRequest, admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    from services.academic_service import get_academic_settings, DEFAULT_CLUSTER_MAPPINGS
    code = payload.code.strip().upper()
    name = payload.name.strip()
    cycle = (payload.cycle or "P").strip().upper()
    cluster = (payload.cluster or "CS").strip().upper()
    
    if not code or not name:
        raise HTTPException(status_code=400, detail="Branch code and branch name are required")
    if cycle not in ["C", "P"]:
        raise HTTPException(status_code=400, detail="Subject cycle must be 'C' or 'P'")
    if cluster not in ["CS", "EC", "ME", "CV"]:
        cluster = "CS"
        
    settings = get_academic_settings(db)
    b_map = dict(settings.get("branch_mappings", {}))
    c_map = dict(settings.get("cycle_mappings", {}))
    cl_map = dict(settings.get("cluster_mappings", DEFAULT_CLUSTER_MAPPINGS))
    
    b_map[code] = name
    c_map[code] = cycle
    cl_map[code] = cluster
    
    db.academic_settings.update_one(
        {"_id": "global"}, 
        {"$set": {"branch_mappings": b_map, "cycle_mappings": c_map, "cluster_mappings": cl_map}}, 
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
    cl_map = dict(settings.get("cluster_mappings", {}))
    
    if branch_code in b_map or branch_code in c_map or branch_code in cl_map:
        b_map.pop(branch_code, None)
        c_map.pop(branch_code, None)
        cl_map.pop(branch_code, None)
        
        db.academic_settings.update_one(
            {"_id": "global"}, 
            {"$set": {"branch_mappings": b_map, "cycle_mappings": c_map, "cluster_mappings": cl_map}}, 
            upsert=True
        )
        return {"status": "success", "message": f"Branch '{branch_code}' removed successfully."}
    else:
        raise HTTPException(status_code=404, detail=f"Branch code '{branch_code}' not found")


