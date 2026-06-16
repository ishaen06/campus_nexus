from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import ReportResponse
from routers.users import get_current_user

router = APIRouter()

def get_admin_user(current_user = Depends(get_current_user)):
    if not current_user.get("is_admin", False):
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
