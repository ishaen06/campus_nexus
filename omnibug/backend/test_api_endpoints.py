import sys
import os
import io

# Set UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints():
    print("[TEST] Running OmniBug API Endpoint Integration Suite...")
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("   [OK] /api/health PASSED")

    # 2. Demo Persona Login
    res = client.post("/api/auth/demo-login/admin")
    assert res.status_code == 200, f"Admin demo login failed: {res.text}"
    data = res.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   [OK] Logged in as: {data['user']['full_name']} ({data['user']['role']})")

    # 3. List Products
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) >= 4, "Should return at least 4 products"
    prod_id = products[0]["id"]
    comp_id = products[0]["components"][0]["id"]
    print(f"   [OK] /api/products PASSED ({len(products)} products found)")

    # 4. List Bugs
    res = client.get("/api/bugs")
    assert res.status_code == 200
    bugs = res.json()
    assert len(bugs) >= 6, "Should return seeded bugs"
    first_bug = bugs[0]
    print(f"   [OK] /api/bugs PASSED ({len(bugs)} defects found, first: {first_bug['key']})")

    # 5. Create Bug
    new_bug_payload = {
        "title": "API Gateway throttles valid webhook signature requests with 429",
        "description": "Under burst traffic (>500 req/sec), Redis rate limit counter window calculation truncates millisecond precision.",
        "product_id": prod_id,
        "component_id": comp_id,
        "severity": "critical",
        "priority": "p1_urgent",
        "status": "unconfirmed",
        "reproduction_steps": [
            {"step_number": 1, "action": "Run load test script", "expected": "200 OK", "actual": "429 Too Many Requests", "is_verified": False}
        ],
        "tags": ["rate-limiter", "redis", "http-429"]
    }
    res = client.post("/api/bugs", json=new_bug_payload, headers=headers)
    assert res.status_code == 200, f"Bug creation failed: {res.text}"
    created_bug = res.json()
    bug_id = created_bug["id"]
    bug_key = created_bug["key"]
    print(f"   [OK] Created new bug: {bug_key} (ID: {bug_id})")

    # 6. Status Workflow Transition (UNCONFIRMED -> IN_PROGRESS -> RESOLVED)
    res = client.post(
        f"/api/bugs/{bug_id}/transition",
        json={"to_status": "in_progress", "comment": "Investigating Redis lua script"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"
    print(f"   [OK] Transitioned {bug_key} to IN_PROGRESS")

    res = client.post(
        f"/api/bugs/{bug_id}/transition",
        json={"to_status": "resolved", "resolution": "fixed", "comment": "Fixed rate limiter window rounding in commit"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"
    assert res.json()["resolution"] == "fixed"
    print(f"   [OK] Transitioned {bug_key} to RESOLVED (fixed)")

    # 7. Add Comment
    res = client.post(
        f"/api/bugs/{bug_id}/comments",
        json={"content": "Verified in staging environment with 20,000 req/sec benchmark.", "is_internal": False},
        headers=headers
    )
    assert res.status_code == 200
    print("   [OK] Added collaboration comment to defect")

    # 8. Git Commit Simulation
    res = client.post(
        f"/api/git/simulate-commit?commit_msg=fix(rate-limit):+fix+sliding+window+precision+(fixes+{bug_key})",
        headers=headers
    )
    assert res.status_code == 200, f"Git commit failed: {res.text}"
    print(f"   [OK] Git commit simulated and linked to {bug_key}")

    # 9. AI Triage
    res = client.post(
        "/api/ai/triage",
        json={
            "title": "Null pointer in token verification",
            "description": "JWT parser crashes when authorization header is empty",
            "stack_trace": "TypeError: Cannot read properties of undefined (reading 'split')\nat AuthMiddleware.verifyToken (auth.ts:45)"
        }
    )
    assert res.status_code == 200
    triage_data = res.json()
    assert triage_data["root_cause_hypothesis"] is not None
    print(f"   [OK] AI Triage generated fix strategy and diff patch")

    # 10. BI Analytics Summary
    res = client.get("/api/analytics/dashboard-summary")
    assert res.status_code == 200
    summary = res.json()
    print(f"   [OK] Analytics: Total={summary['total_defects']}, Open={summary['open_defects']}, MTTR={summary['mttr_hours']}h")

    print("\n[SUCCESS] ALL API ENDPOINT INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_endpoints()
