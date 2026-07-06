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
