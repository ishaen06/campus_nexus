import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from services.academic_service import (
    validate_email_domain,
    parse_rvce_email,
    calculate_academic_year,
    get_subject_cycle,
    get_branch_full_name,
    DEFAULT_CYCLE_MAPPINGS,
    DEFAULT_BRANCH_NAMES
)

def test_academic_service():
    print("--- Running Academic Service Tests ---")

    # 1. Email Domain & Whitelist Validation Tests
    print("\n1. Testing Email Validation:")
    rvce_email = "ishaensbethur.cs25@rvce.edu.in"
    allowed_gmail_1 = "ishaen06@gmail.com"
    allowed_gmail_2 = "ishaen.vihaan@gmail.com"
    unauthorized_gmail = "randomstudent@gmail.com"
    unauthorized_domain = "student@otheruniv.ac.in"

    assert validate_email_domain(rvce_email) == True, "RVCE email should be allowed"
    assert validate_email_domain(allowed_gmail_1) == True, "ishaen06@gmail.com should be allowed"
    assert validate_email_domain(allowed_gmail_2) == True, "ishaen.vihaan@gmail.com should be allowed"
    assert validate_email_domain(unauthorized_gmail) == False, "random @gmail.com should be rejected"
    assert validate_email_domain(unauthorized_domain) == False, "random domain should be rejected"
    print("  [OK] All domain & whitelist tests passed!")

    # 2. RVCE Email Parsing Tests
    print("\n2. Testing RVCE Email Parser:")
    parse_result_1 = parse_rvce_email("ishaensbethur.cs25@rvce.edu.in")
    assert parse_result_1["branch_code"] == "CS", f"Expected CS, got {parse_result_1['branch_code']}"
    assert parse_result_1["joining_year"] == 2025, f"Expected 2025, got {parse_result_1['joining_year']}"

    parse_result_2 = parse_rvce_email("john.ec24@rvce.edu.in")
    assert parse_result_2["branch_code"] == "EC", f"Expected EC, got {parse_result_2['branch_code']}"
    assert parse_result_2["joining_year"] == 2024, f"Expected 2024, got {parse_result_2['joining_year']}"

    parse_result_3 = parse_rvce_email("alice.is23@rvce.edu.in")
    assert parse_result_3["branch_code"] == "IS", f"Expected IS, got {parse_result_3['branch_code']}"
    assert parse_result_3["joining_year"] == 2023, f"Expected 2023, got {parse_result_3['joining_year']}"
    print("  [OK] All RVCE email parsing tests passed!")

    # 3. Dynamic Academic Year Calculation Tests
    print("\n3. Testing Dynamic Academic Year Calculation:")
    year_1 = calculate_academic_year(2025, session_start_month=8)
    assert year_1 == 1, f"Expected 1st year for 2025, got {year_1}"

    year_2 = calculate_academic_year(2024, session_start_month=8)
    assert year_2 == 2, f"Expected 2nd year for 2024, got {year_2}"

    year_3 = calculate_academic_year(2023, session_start_month=8)
    assert year_3 == 3, f"Expected 3rd year for 2023, got {year_3}"

    year_4 = calculate_academic_year(2022, session_start_month=8)
    assert year_4 == 4, f"Expected 4th year for 2022, got {year_4}"
    print("  [OK] All dynamic academic year promotion tests passed!")

    # 4. Branch Name & Subject Cycle Mapping Tests
    print("\n4. Testing Branch Names & Default Cycle Mapping:")
    class MockDB:
        class academic_settings:
            @staticmethod
            def find_one(query):
                return {
                    "_id": "global",
                    "session_start_month": 8,
                    "branch_mappings": DEFAULT_BRANCH_NAMES,
                    "cycle_mappings": DEFAULT_CYCLE_MAPPINGS
                }

    db = MockDB()
    cs_name = get_branch_full_name("CS", db)
    assert cs_name == "Computer Science Engineering", f"Expected Computer Science Engineering, got {cs_name}"

    cs_cycle = get_subject_cycle("CS", db)
    assert cs_cycle == "C", f"Expected C cycle for CS, got {cs_cycle}"

    ec_cycle = get_subject_cycle("EC", db)
    assert ec_cycle == "P", f"Expected P cycle for EC, got {ec_cycle}"
    print("  [OK] All branch name & subject cycle mapping tests passed!")

    print("\nALL ACADEMIC SERVICE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_academic_service()
