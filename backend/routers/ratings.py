from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from database_mongo import get_mongo_db
from routers.users import get_current_user

router = APIRouter()

class RatingSubmission(BaseModel):
    score: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    feedback: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = Field(default_factory=list)
    category: Optional[str] = "general"

@router.post("/")
def submit_rating(
    data: RatingSubmission,
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    user_id = current_user["id"]
    email = (current_user.get("email") or "").strip().lower()
    user_name = current_user.get("full_name") or current_user.get("name") or email.split("@")[0]

    rating_doc = {
        "user_id": user_id,
        "user_email": email,
        "user_name": user_name,
        "score": data.score,
        "feedback": (data.feedback or "").strip(),
        "tags": data.tags or [],
        "category": data.category or "general",
        "updated_at": datetime.utcnow().isoformat()
    }

    res = db.app_ratings.find_one_and_update(
        {"user_id": user_id},
        {
            "$set": rating_doc,
            "$setOnInsert": {"created_at": datetime.utcnow().isoformat()}
        },
        upsert=True,
        return_document=True
    )

    clean_res = dict(res) if res else rating_doc
    clean_res.pop("_id", None)

    return {
        "success": True,
        "message": "Thank you for rating Campus Nexus!",
        "rating": clean_res
    }

@router.get("/me")
def get_my_rating(
    current_user = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    user_id = current_user["id"]
    rating = db.app_ratings.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "has_rated": rating is not None,
        "rating": rating
    }

@router.get("/summary")
def get_ratings_summary(
    db = Depends(get_mongo_db)
):
    pipeline = [
        {
            "$group": {
                "_id": None,
                "average_score": {"$avg": "$score"},
                "total_ratings": {"$sum": 1}
            }
        }
    ]
    agg = list(db.app_ratings.aggregate(pipeline))
    avg = round(agg[0]["average_score"], 2) if agg and agg[0].get("average_score") else 5.0
    total = agg[0]["total_ratings"] if agg else 0

    breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for item in db.app_ratings.find({}, {"score": 1}):
        s = item.get("score")
        if s in breakdown:
            breakdown[s] += 1

    recent = list(db.app_ratings.find(
        {"feedback": {"$ne": ""}},
        {"_id": 0, "user_name": 1, "score": 1, "feedback": 1, "tags": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(10))

    return {
        "average_score": avg,
        "total_ratings": total,
        "breakdown": breakdown,
        "recent_reviews": recent
    }
