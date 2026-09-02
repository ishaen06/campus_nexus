from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime
import re
import hashlib

from database_mongo import get_mongo_db
from schemas import GitCommitModel, GitWebhookPayload, UserOut
from routers.auth import get_current_user
from services.websocket_manager import manager

router = APIRouter(prefix="/api/git", tags=["Git & CI/CD Integration"])

def format_commit(c: dict) -> GitCommitModel:
    return GitCommitModel(
        id=str(c.get("_id")),
        bug_id=str(c.get("bug_id")),
        commit_sha=c.get("commit_sha"),
        message=c.get("message"),
        author=c.get("author"),
        branch=c.get("branch", "main"),
        repo_name=c.get("repo_name", "core-engine"),
        diff_snippet=c.get("diff_snippet"),
        web_url=c.get("web_url"),
        created_at=c.get("created_at")
    )

def extract_bug_keys_and_actions(commit_msg: str):
    """Extracts bug keys and determines if it should auto-resolve."""
    # Pattern to find keys like GEC-101, NEX-102, #GEC-101
    key_pattern = r'(?:#)?([A-Z]{2,6}-\d+)'
    matches = re.findall(key_pattern, commit_msg)
    
    # Check for resolution keywords: fix, fixes, fixed, close, closes, closed, resolve, resolves, resolved
    resolve_pattern = r'\b(fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\s+(?:#)?([A-Z]{2,6}-\d+)'
    resolve_matches = [m[1] for m in re.findall(resolve_pattern, commit_msg, re.IGNORECASE)]
    
    return list(set(matches)), list(set(resolve_matches))

@router.get("/bugs/{bug_id}/commits", response_model=List[GitCommitModel])
def get_bug_commits(bug_id: str):
    db = get_mongo_db()
    docs = db.commits.find({"bug_id": bug_id}).sort("created_at", -1)
    return [format_commit(d) for d in docs]

@router.get("/commits", response_model=List[GitCommitModel])
def list_all_commits(limit: int = 50):
    db = get_mongo_db()
    docs = db.commits.find({}).sort("created_at", -1).limit(limit)
    return [format_commit(d) for d in docs]

@router.post("/simulate-commit", response_model=Dict[str, Any])
async def simulate_git_commit(
    commit_msg: str,
    repo_name: str = "gecko-render-core",
    branch: str = "main",
    diff_snippet: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user)
):
    """Interactive commit simulation: links commits to issues and executes automated lifecycle updates."""
    db = get_mongo_db()
    bug_keys, auto_resolve_keys = extract_bug_keys_and_actions(commit_msg)
    
    if not bug_keys:
        # Check if there are any bugs we can attach to if not specified
        first_bug = db.bugs.find_one({})
        if first_bug:
            bug_keys = [first_bug.get("key")]
        else:
            raise HTTPException(status_code=400, detail="No issue key (e.g. GEC-101) detected in commit message.")
            
    now = datetime.utcnow()
    # Generate unique sha
    sha_hash = hashlib.sha1(f"{commit_msg}{now.isoformat()}".encode()).hexdigest()
    
    default_diff = diff_snippet or f"""diff --git a/src/core/handler.ts b/src/core/handler.ts
index e69de29..b2d3e11 100644
--- a/src/core/handler.ts
+++ b/src/core/handler.ts
@@ -18,6 +18,10 @@ export function processEvent(event: SystemEvent) {{
+  // Guard condition added for {commit_msg[:30]}
+  if (!event || !event.payload) {{
+    return {{ status: "skipped", reason: "empty_payload" }};
+  }}
   return executeTransaction(event.payload);
 }}"""

    linked_bugs = []
    for key in bug_keys:
        bug = db.bugs.find_one({"key": key})
        if bug:
            bug_id_str = str(bug["_id"])
            commit_doc = {
                "bug_id": bug_id_str,
                "commit_sha": sha_hash,
                "message": commit_msg,
                "author": f"{current_user.full_name} <{current_user.email}>",
                "branch": branch,
                "repo_name": repo_name,
                "diff_snippet": default_diff,
                "web_url": f"https://github.com/omnibug/{repo_name}/commit/{sha_hash[:8]}",
                "created_at": now
            }
            db.commits.insert_one(commit_doc)
            
            # Log Activity
            activity_doc = {
                "bug_id": bug_id_str,
                "bug_key": key,
                "user_id": current_user.id,
                "user_name": current_user.full_name,
                "user_avatar": current_user.avatar_url,
                "action_type": "linked_commit",
                "field_name": "commit",
                "old_value": None,
                "new_value": f"{sha_hash[:7]}: {commit_msg}",
                "timestamp": now
            }
            db.activities.insert_one(activity_doc)
            
            # Auto-resolve if keyword detected
            if key in auto_resolve_keys or any(k in auto_resolve_keys for k in [key, f"#{key}"]):
                db.bugs.update_one(
                    {"_id": bug["_id"]},
                    {"$set": {
                        "status": "resolved",
                        "resolution": "fixed",
                        "resolved_at": now,
                        "updated_at": now
                    }}
                )
                
            db.bugs.update_one({"_id": bug["_id"]}, {"$set": {"updated_at": now}})
            linked_bugs.append(key)
            
    await manager.broadcast_global("COMMIT_LINKED", {
        "commit_sha": sha_hash[:8],
        "message": commit_msg,
        "linked_bugs": linked_bugs
    })
    
    return {
        "commit_sha": sha_hash,
        "linked_bugs": linked_bugs,
        "auto_resolved": auto_resolve_keys,
        "message": f"Successfully linked commit {sha_hash[:8]} to {len(linked_bugs)} defect(s)."
    }

@router.post("/branch-name/{bug_id}")
def generate_branch_name(bug_id: str):
    db = get_mongo_db()
    bug = None
    try:
        bug = db.bugs.find_one({"_id": ObjectId(bug_id)})
    except Exception:
        bug = db.bugs.find_one({"key": bug_id.upper().strip()})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
        
    title_slug = re.sub(r'[^a-zA-Z0-9]+', '-', bug.get('title', '')).strip('-').lower()[:40]
    branch = f"fix/{bug.get('key').lower()}-{title_slug}"
    return {"branch_name": branch, "git_command": f"git checkout -b {branch}"}
