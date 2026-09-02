from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from bson import ObjectId

from database_mongo import get_mongo_db
from schemas import (
    AITriageRequest, AITriageResponse,
    DuplicateCheckRequest, DuplicateCheckResponse,
    NLSearchRequest, UserOut
)
from routers.auth import get_current_user
from services.ai_engine import AIEngine

router = APIRouter(prefix="/api/ai", tags=["AI Triage & Root Cause Analysis"])

@router.post("/triage", response_model=AITriageResponse)
def triage_defect(request: AITriageRequest):
    """Deep AI root cause analysis, fix suggestion, and unified diff patch generator."""
    db = get_mongo_db()
    product_name = "Core Software System"
    if request.product_id:
        prod = db.products.find_one({"_id": ObjectId(request.product_id)})
        if prod:
            product_name = prod.get("name", product_name)
            
    res = AIEngine.analyze_root_cause(
        title=request.title,
        description=request.description,
        stack_trace=request.stack_trace,
        product_name=product_name
    )
    return AITriageResponse(**res)

@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_duplicates(request: DuplicateCheckRequest):
    """Scans repository for duplicate or highly correlated bugs with similarity confidence scores."""
    db = get_mongo_db()
    query = {}
    if request.product_id and request.product_id != "all":
        query["product_id"] = request.product_id
        
    existing_bugs = list(db.bugs.find(query, {"_id": 1, "key": 1, "title": 1, "description": 1, "status": 1, "component_id": 1, "severity": 1}))
    
    # Map component names if available
    comp_map = {str(c["_id"]): c["name"] for c in db.components.find({})}
    for b in existing_bugs:
        b["component_name"] = comp_map.get(str(b.get("component_id")), "")
        
    result = AIEngine.find_duplicates(
        title=request.title,
        description=request.description,
        existing_bugs=existing_bugs
    )
    return DuplicateCheckResponse(**result)

@router.post("/nl-search")
def natural_language_search(request: NLSearchRequest):
    """Parses natural language queries (e.g. 'P1 blockers in auth') into database filter criteria."""
    filters = AIEngine.parse_natural_language_search(request.query)
    return {"query": request.query, "interpreted_filters": filters}
