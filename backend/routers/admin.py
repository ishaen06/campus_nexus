from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import ReportResponse
from routers.users import get_current_user

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
def download_approved_teams(admin = Depends(get_admin_user)):
    file_path = "teachers_excel/approved_teams.csv"
    if not os.path.exists(file_path):
        os.makedirs("teachers_excel", exist_ok=True)
        headers = [
            "Team ID", "Team Name", "Project Topic", "Mentor Name", "Mentor Email", "Approved At",
            "Member 1 Name", "Member 1 Email", "Member 1 USN", "Member 1 Cycle",
            "Member 2 Name", "Member 2 Email", "Member 2 USN", "Member 2 Cycle",
            "Member 3 Name", "Member 3 Email", "Member 3 USN", "Member 3 Cycle",
            "Member 4 Name", "Member 4 Email", "Member 4 USN", "Member 4 Cycle",
            "Member 5 Name", "Member 5 Email", "Member 5 USN", "Member 5 Cycle"
        ]
        import csv
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
    return FileResponse(path=file_path, filename="approved_teams.csv", media_type="text/csv")

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/download-student-marks")
def download_student_marks(admin = Depends(get_admin_user), db = Depends(get_mongo_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "USN", "Student Name", "Student Email", "Branch", "Section", "Year of Study",
        "Team ID", "Team Name", "Mentor Name",
        "Phase 1 Marks", "Phase 1 Observations",
        "Phase 2 Marks", "Phase 2 Observations",
        "Phase 3 Marks", "Phase 3 Observations",
        "Total Marks"
    ]
    writer.writerow(headers)
    
    students = list(db.users.find({
        "is_mentor": {"$ne": True}, 
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"}
    }))
    
    for s in students:
        student_id = s.get("id")
        usn = s.get("usn") or "N/A"
        name = s.get("full_name") or "N/A"
        email = s.get("email") or "N/A"
        branch = s.get("branch") or "N/A"
        section = s.get("section") or "N/A"
        year = s.get("year_of_study") or "N/A"
        
        group = db.groups.find_one({"members": student_id})
        
        group_id = "N/A"
        group_name = "N/A"
        mentor_name = "N/A"
        
        if group:
            group_id = str(group.get("id"))
            group_name = group.get("name") or "N/A"
            
            mentor_id = group.get("mentor_id")
            if mentor_id:
                mentor = db.users.find_one({"id": mentor_id})
                if mentor:
                    mentor_name = mentor.get("full_name") or "N/A"
                    
        p1_marks = 0
        p1_obs = ""
        p2_marks = 0
        p2_obs = ""
        p3_marks = 0
        p3_obs = ""
        
        if group:
            eval_doc = db.evaluations.find_one({"group_id": group.get("id"), "student_id": student_id})
            if eval_doc:
                # Sum the detail marks since phase1_marks is computed from detail marks
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
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_phase_marks.csv"}
    )
