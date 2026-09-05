from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import io
import csv

from database_mongo import get_mongo_db
from routers.users import get_current_user
from routers.chat import _extract_user_academic_info

router = APIRouter()

def check_admin(user: dict):
    is_admin = user.get("is_admin") or (user.get("email") or "").strip().lower() == "ishaen.vihaan@gmail.com"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Access denied. Only the platform administrator can view feedback responses.")

class FeedbackSubmission(BaseModel):
    overall_rating: int = Field(..., ge=1, le=5, description="Overall satisfaction rating from 1 to 5")
    nps_score: Optional[int] = Field(None, ge=1, le=10, description="NPS recommendation score from 1 to 10")
    device_used: Optional[str] = "Laptop / Desktop"
    feature_ratings: Optional[Dict[str, int]] = Field(default_factory=dict, description="Ratings (1-5) for discovery, teams, chat, notifications, projects")
    ui_satisfaction: Optional[int] = Field(None, ge=1, le=5)
    speed_performance: Optional[str] = "Good & Smooth"
    bugs_encountered: Optional[str] = "No, everything worked smoothly"
    bug_details: Optional[str] = ""
    best_feature: Optional[str] = ""
    suggested_improvements: Optional[str] = ""
    additional_comments: Optional[str] = ""
    is_anonymous: Optional[bool] = False

@router.post("")
@router.post("/")
def submit_feedback(
    data: FeedbackSubmission,
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Students and users submit comprehensive app feedback."""
    user_id = current_user["id"]
    email = (current_user.get("email") or "").strip().lower()
    full_name = current_user.get("full_name") or current_user.get("name") or email.split("@")[0]
    usn = (current_user.get("usn") or "").strip().upper()
    
    # Extract academic info (branch, cohort/year)
    branch = ""
    year_of_study = None
    try:
        b_code, _, y_study = _extract_user_academic_info(current_user)
        branch = b_code
        year_of_study = y_study
    except Exception:
        branch = (current_user.get("branch_code") or current_user.get("branch") or current_user.get("department") or "").strip().upper()
        year_of_study = current_user.get("year_of_study")

    is_mentor = bool(current_user.get("is_mentor"))

    feedback_doc = {
        "user_id": user_id,
        "user_email": email if not data.is_anonymous else f"Anonymous ({email.split('@')[-1] if '@' in email else 'student'})",
        "actual_email": email, # Retained for admin identity verification if needed
        "user_name": full_name if not data.is_anonymous else "Anonymous Student",
        "usn": usn if not data.is_anonymous else "",
        "branch": branch,
        "year_of_study": year_of_study,
        "is_mentor": is_mentor,
        "overall_rating": data.overall_rating,
        "nps_score": data.nps_score,
        "device_used": data.device_used,
        "feature_ratings": data.feature_ratings or {},
        "ui_satisfaction": data.ui_satisfaction,
        "speed_performance": data.speed_performance,
        "bugs_encountered": data.bugs_encountered,
        "bug_details": (data.bug_details or "").strip(),
        "best_feature": (data.best_feature or "").strip(),
        "suggested_improvements": (data.suggested_improvements or "").strip(),
        "additional_comments": (data.additional_comments or "").strip(),
        "is_anonymous": bool(data.is_anonymous),
        "updated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

    res = db.app_feedback.find_one_and_update(
        {"user_id": user_id},
        {
            "$set": feedback_doc,
            "$setOnInsert": {
                "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }
        },
        upsert=True,
        return_document=True
    )

    clean_res = dict(res) if res else feedback_doc
    clean_res.pop("_id", None)
    clean_res.pop("actual_email", None)

    return {
        "success": True,
        "message": "Your feedback has been recorded successfully. Thank you for helping us improve Campus Nexus!",
        "feedback": clean_res
    }

@router.get("/my-submission")
def get_my_submission(
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Retrieve the current user's previous feedback submission if any."""
    doc = db.app_feedback.find_one({"user_id": current_user["id"]})
    if not doc:
        return {"has_submitted": False, "feedback": None}
    doc.pop("_id", None)
    doc.pop("actual_email", None)
    return {"has_submitted": True, "feedback": doc}

@router.get("/admin/summary")
def get_feedback_summary_for_admin(
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Admin-only: Aggregated metrics, charts, and breakdown across all feedback responses."""
    check_admin(current_user)

    all_feedback = list(db.app_feedback.find({}, {"_id": 0}))
    total_count = len(all_feedback)

    if total_count == 0:
        return {
            "total_responses": 0,
            "average_overall": 0.0,
            "nps_average": 0.0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "feature_averages": {},
            "speed_distribution": {},
            "device_distribution": {},
            "cohort_distribution": {},
            "bugs_count": 0,
            "recent_responses": []
        }

    # Calculations
    ratings = [f.get("overall_rating", 0) for f in all_feedback if f.get("overall_rating")]
    avg_overall = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    nps_scores = [f.get("nps_score") for f in all_feedback if f.get("nps_score") is not None]
    avg_nps = round(sum(nps_scores) / len(nps_scores), 1) if nps_scores else 0.0

    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        if r in rating_dist:
            rating_dist[r] += 1

    feature_totals: Dict[str, List[int]] = {}
    speed_dist: Dict[str, int] = {}
    device_dist: Dict[str, int] = {}
    cohort_dist: Dict[str, int] = {}
    bugs_count = 0

    for f in all_feedback:
        # Feature ratings
        for feat, val in f.get("feature_ratings", {}).items():
            if isinstance(val, (int, float)) and 1 <= val <= 5:
                feature_totals.setdefault(feat, []).append(int(val))

        # Speed
        sp = f.get("speed_performance") or "Unknown"
        speed_dist[sp] = speed_dist.get(sp, 0) + 1

        # Device
        dev = f.get("device_used") or "Laptop / Desktop"
        device_dist[dev] = device_dist.get(dev, 0) + 1

        # Cohort
        yr = f.get("year_of_study")
        yr_label = f"{yr}st Year" if yr == 1 else f"{yr}nd Year" if yr == 2 else f"{yr}rd Year" if yr == 3 else f"{yr}th Year" if yr else "Other"
        cohort_dist[yr_label] = cohort_dist.get(yr_label, 0) + 1

        # Bugs
        bugs = (f.get("bugs_encountered") or "").lower()
        if "yes" in bugs or f.get("bug_details"):
            bugs_count += 1

    feature_averages = {
        k: round(sum(v) / len(v), 2) for k, v in feature_totals.items() if v
    }

    # Most recent 10 responses
    recent = sorted(all_feedback, key=lambda x: x.get("updated_at", ""), reverse=True)[:10]

    return {
        "total_responses": total_count,
        "average_overall": avg_overall,
        "nps_average": avg_nps,
        "rating_distribution": rating_dist,
        "feature_averages": feature_averages,
        "speed_distribution": speed_dist,
        "device_distribution": device_dist,
        "cohort_distribution": cohort_dist,
        "bugs_count": bugs_count,
        "recent_responses": recent
    }

@router.get("/admin/responses")
def get_all_responses_for_admin(
    cohort: Optional[int] = Query(None),
    branch: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Admin-only: Retrieve all full individual feedback responses."""
    check_admin(current_user)

    query = {}
    if cohort is not None:
        query["year_of_study"] = cohort
    if branch:
        query["branch"] = {"$regex": f"^{branch}$", "$options": "i"}

    docs = list(db.app_feedback.find(query, {"_id": 0}).sort([("updated_at", -1)]))
    return {"count": len(docs), "responses": docs}

@router.delete("/admin/responses/{user_id}")
def delete_feedback_response(
    user_id: int,
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Admin-only: Remove a response record."""
    check_admin(current_user)
    res = db.app_feedback.delete_one({"user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback record not found")
    return {"status": "ok", "message": "Feedback record removed successfully"}

@router.get("/admin/export-csv")
def export_feedback_csv(
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Admin-only: Export all feedback responses to a CSV spreadsheet."""
    check_admin(current_user)

    docs = list(db.app_feedback.find({}, {"_id": 0}).sort([("updated_at", -1)]))

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Submission Date",
        "Student Name",
        "Email",
        "USN",
        "Branch",
        "Academic Year",
        "Overall Rating (1-5)",
        "NPS Score (1-10)",
        "Device Used",
        "Discovery Rating",
        "Team Formation Rating",
        "Chat Rating",
        "Notifications Rating",
        "Project Dashboard Rating",
        "UI Satisfaction (1-5)",
        "Speed / Performance",
        "Bugs Encountered?",
        "Bug Details",
        "Best Feature",
        "Suggested Improvements",
        "Additional Comments",
        "Anonymous Submission"
    ])

    for d in docs:
        feats = d.get("feature_ratings", {})
        writer.writerow([
            d.get("updated_at", ""),
            d.get("user_name", ""),
            d.get("actual_email") or d.get("user_email", ""),
            d.get("usn", ""),
            d.get("branch", ""),
            f"{d.get('year_of_study')} Year" if d.get("year_of_study") else "N/A",
            d.get("overall_rating", ""),
            d.get("nps_score", ""),
            d.get("device_used", ""),
            feats.get("discovery", ""),
            feats.get("teams", ""),
            feats.get("chat", ""),
            feats.get("notifications", ""),
            feats.get("projects", ""),
            d.get("ui_satisfaction", ""),
            d.get("speed_performance", ""),
            d.get("bugs_encountered", ""),
            d.get("bug_details", ""),
            d.get("best_feature", ""),
            d.get("suggested_improvements", ""),
            d.get("additional_comments", ""),
            "Yes" if d.get("is_anonymous") else "No"
        ])

    csv_content = output.getvalue()
    filename = f"Campus_Nexus_App_Feedback_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
