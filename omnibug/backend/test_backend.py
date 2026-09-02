import sys
import os
import io

# Set UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database_mongo import init_db, get_mongo_db
from services.seed_data import seed_database
from services.ai_engine import AIEngine
from schemas import BugSeverity, BugPriority

def run_tests():
    print("[TEST] Running OmniBug Backend Verification Suite...")
    
    # 1. Test Database Init & Seeding
    print("1. Testing DB Init & Seeding...")
    init_db()
    seed_database(force_reseed=True)
    db = get_mongo_db()
    
    user_count = db.users.count_documents({})
    prod_count = db.products.count_documents({})
    comp_count = db.components.count_documents({})
    ms_count = db.milestones.count_documents({})
    bug_count = db.bugs.count_documents({})
    
    print(f"   Users: {user_count}, Products: {prod_count}, Components: {comp_count}, Milestones: {ms_count}, Bugs: {bug_count}")
    assert user_count >= 5, "Users not seeded properly"
    assert prod_count >= 4, "Products not seeded properly"
    assert bug_count >= 6, "Bugs not seeded properly"
    print("   [OK] DB Seeding PASSED!")

    # 2. Test AI Triage Engine & Stack Trace Parser
    print("2. Testing AI Triage & Stack Trace Analysis...")
    stack = """#0 0x00007ffff7a12bc4 in nsFlexContainerFrame::DoLayout at /src/layout/generic/nsFlexContainerFrame.cpp:4821
#1 PresShell::DoReflow at /src/layout/base/PresShell.cpp:9430"""
    
    triage_res = AIEngine.analyze_root_cause(
        title="Segmentation fault in flexbox reflow",
        description="Iframe inside flex container triggers null deref during font swap",
        stack_trace=stack,
        product_name="Gecko Render Core"
    )
    print(f"   Predicted Severity: {triage_res.get('predicted_severity')}")
    print(f"   Detected Error: {triage_res.get('detected_error_type')}")
    print(f"   Root Cause Hypothesis: {triage_res.get('root_cause_hypothesis')[:80]}...")
    assert triage_res.get("detected_error_type") is not None
    assert triage_res.get("suggested_diff_patch") is not None
    print("   [OK] AI Triage PASSED!")

    # 3. Test Duplicate Detection Engine
    print("3. Testing NLP Duplicate Detection...")
    existing = list(db.bugs.find({}, {"_id": 1, "key": 1, "title": 1, "description": 1, "status": 1}))
    dup_res = AIEngine.find_duplicates(
        title="Crash in nested flexbox layout during reflow",
        description="Null pointer dereference occurs in nsFlexContainerFrame",
        existing_bugs=existing,
        threshold=30.0
    )
    print(f"   Duplicate Found: {dup_res.get('is_likely_duplicate')}, Matches: {len(dup_res.get('matches'))}")
    assert len(dup_res.get("matches")) > 0, "Should detect similar flexbox bug"
    print(f"   Top Match: {dup_res['matches'][0]['key']} with score {dup_res['matches'][0]['similarity_score']}%")
    print("   [OK] Duplicate Detection PASSED!")

    # 4. Test Natural Language Search Parser
    print("4. Testing Natural Language Query Parser...")
    filters = AIEngine.parse_natural_language_search("show all P1 blockers with security vulnerabilities")
    print(f"   Interpreted Filters: {filters}")
    assert filters.get("is_security_vulnerability") is True
    print("   [OK] Natural Language Search PASSED!")

    print("\n[SUCCESS] ALL BACKEND LOGIC VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
