from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from database_mongo import get_mongo_db
from schemas import (
    ProductCreate, ProductOut,
    ComponentCreate, ComponentOut,
    MilestoneCreate, MilestoneOut,
    UserOut
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Products & Hierarchy"])

def format_component(c: dict) -> ComponentOut:
    return ComponentOut(
        id=str(c.get("_id")),
        product_id=str(c.get("product_id")),
        name=c.get("name"),
        description=c.get("description"),
        default_assignee_id=c.get("default_assignee_id"),
        default_qa_contact_id=c.get("default_qa_contact_id")
    )

def format_milestone(m: dict, db) -> MilestoneOut:
    m_id_str = str(m.get("_id"))
    total = db.bugs.count_documents({"milestone_id": m_id_str})
    open_cnt = db.bugs.count_documents({
        "milestone_id": m_id_str,
        "status": {"$in": ["unconfirmed", "confirmed", "in_progress", "in_review", "reopened"]}
    })
    blockers = db.bugs.count_documents({
        "milestone_id": m_id_str,
        "severity": "blocker",
        "status": {"$nin": ["resolved", "verified", "closed"]}
    })
    
    # Readiness score calculation (0 to 100)
    readiness = 100.0
    if total > 0:
        resolved = total - open_cnt
        readiness = round((resolved / total) * 100, 1)
        if blockers > 0:
            readiness = max(0.0, readiness - (blockers * 20.0))

    return MilestoneOut(
        id=m_id_str,
        product_id=str(m.get("product_id")),
        name=m.get("name"),
        description=m.get("description"),
        target_date=m.get("target_date"),
        status=m.get("status", "open"),
        is_release_blocker=m.get("is_release_blocker", False),
        release_notes=m.get("release_notes"),
        open_defects_count=open_cnt,
        total_defects_count=total,
        readiness_score=readiness
    )

def format_product(p: dict, db) -> ProductOut:
    p_id_str = str(p.get("_id"))
    comps = [format_component(c) for c in db.components.find({"product_id": p_id_str})]
    milestones = [format_milestone(m, db) for m in db.milestones.find({"product_id": p_id_str})]
    
    total_defects = db.bugs.count_documents({"product_id": p_id_str})
    open_defects = db.bugs.count_documents({
        "product_id": p_id_str,
        "status": {"$in": ["unconfirmed", "confirmed", "in_progress", "in_review", "reopened"]}
    })
    
    return ProductOut(
        id=p_id_str,
        name=p.get("name"),
        key_prefix=p.get("key_prefix", "BUG"),
        description=p.get("description"),
        lead_user_id=p.get("lead_user_id"),
        default_assignee_id=p.get("default_assignee_id"),
        versions=p.get("versions", []),
        components=comps,
        milestones=milestones,
        total_defects=total_defects,
        open_defects=open_defects
    )

@router.get("/products", response_model=List[ProductOut])
def get_products():
    db = get_mongo_db()
    prods = db.products.find({})
    return [format_product(p, db) for p in prods]

@router.post("/products", response_model=ProductOut)
def create_product(prod_in: ProductCreate, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    key_prefix = prod_in.key_prefix.strip().upper()
    if db.products.find_one({"key_prefix": key_prefix}):
        raise HTTPException(status_code=400, detail=f"Product with key prefix '{key_prefix}' already exists")
        
    doc = {
        "name": prod_in.name,
        "key_prefix": key_prefix,
        "description": prod_in.description,
        "lead_user_id": prod_in.lead_user_id or current_user.id,
        "default_assignee_id": prod_in.default_assignee_id or current_user.id,
        "versions": prod_in.versions or ["1.0.0"],
        "created_at": datetime.utcnow()
    }
    result = db.products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return format_product(doc, db)

@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: str):
    db = get_mongo_db()
    try:
        doc = db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return format_product(doc, db)

@router.post("/components", response_model=ComponentOut)
def create_component(comp_in: ComponentCreate, current_user: UserOut = Depends(get_current_user)):
    db = get_mongo_db()
    doc = {
        "product_id": comp_in.product_id,
        "name": comp_in.name,
        "description": comp_in.description,
        "default_assignee_id": comp_in.default_assignee_id or current_user.id,
        "default_qa_contact_id": comp_in.default_qa_contact_id
    }
    result = db.components.insert_one(doc)
    doc["_id"] = result.inserted_id
    return format_component(doc)

@router.post("/milestones", response_model=MilestoneOut)
def create_milestone(ms_in: MilestoneCreate):
    db = get_mongo_db()
    doc = {
        "product_id": ms_in.product_id,
        "name": ms_in.name,
        "description": ms_in.description,
        "target_date": ms_in.target_date,
        "status": ms_in.status,
        "is_release_blocker": ms_in.is_release_blocker,
        "release_notes": ms_in.release_notes,
        "created_at": datetime.utcnow()
    }
    result = db.milestones.insert_one(doc)
    doc["_id"] = result.inserted_id
    return format_milestone(doc, db)

@router.get("/milestones/{milestone_id}/changelog")
def generate_milestone_changelog(milestone_id: str):
    db = get_mongo_db()
    try:
        ms = db.milestones.find_one({"_id": ObjectId(milestone_id)})
    except Exception:
        ms = None
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    bugs = list(db.bugs.find({"milestone_id": milestone_id, "status": {"$in": ["resolved", "verified", "closed"]}}))
    
    # Categorize changes
    blockers = [b for b in bugs if b.get("severity") in ["blocker", "critical"]]
    security = [b for b in bugs if b.get("is_security_vulnerability")]
    enhancements = [b for b in bugs if b.get("severity") == "enhancement"]
    regular = [b for b in bugs if b not in blockers and b not in security and b not in enhancements]
    
    changelog = f"# Release Notes: {ms.get('name')}\n"
    changelog += f"**Target Date:** {ms.get('target_date', 'N/A')}  \n"
    changelog += f"**Description:** {ms.get('description', '')}\n\n"
    
    if security:
        changelog += "### 🛡️ Security Vulnerabilities & Hardening\n"
        for b in security:
            changelog += f"- **[{b.get('key')}]** {b.get('title')}\n"
        changelog += "\n"
        
    if blockers:
        changelog += "### 🚨 Critical Fixes & Stability Improvements\n"
        for b in blockers:
            changelog += f"- **[{b.get('key')}]** {b.get('title')}\n"
        changelog += "\n"
        
    if enhancements:
        changelog += "### ✨ Features & Enhancements\n"
        for b in enhancements:
            changelog += f"- **[{b.get('key')}]** {b.get('title')}\n"
        changelog += "\n"
        
    if regular:
        changelog += "### 🐛 Bug Fixes & Refinements\n"
        for b in regular:
            changelog += f"- **[{b.get('key')}]** {b.get('title')}\n"
        changelog += "\n"
        
    return {
        "milestone_name": ms.get("name"),
        "total_resolved": len(bugs),
        "changelog_markdown": changelog
    }
