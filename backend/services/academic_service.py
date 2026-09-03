import re
from datetime import datetime
from fastapi import HTTPException, status

DEFAULT_BRANCH_NAMES = {
    "CS": "Computer Science and Engineering",
    "CI": "Artificial Intelligence and Machine Learning",
    "CD": "Computer Science (Data Science)",
    "CY": "Computer Science and Engineering (Cyber Security)",
    "EC": "Electronics and Communication Engineering",
    "EE": "Electrical and Electronics Engineering",
    "ET": "Electronics and Telecommunication Engineering",
    "AS": "Aerospace Engineering",
    "IM": "Industrial Engineering and Management",
    "ME": "Mechanical Engineering",
    "CV": "Civil Engineering",
    "BT": "Biotechnology",
    "CH": "Chemical Engineering",
}

DEFAULT_CYCLE_MAPPINGS = {
    # C-Cycle (CS cluster)
    "CS": "C",
    "CI": "C",
    "CD": "C",
    "CY": "C",
    # P-Cycle (EC cluster)
    "EC": "P",
    "EE": "P",
    "ET": "P",
    # P-Cycle (ME cluster)
    "AS": "P",
    "IM": "P",
    "ME": "P",
    # P-Cycle (CV cluster)
    "CV": "P",
    "BT": "P",
    "CH": "P",
}


ALLOWED_GMAIL_ACCOUNTS = {
    "ishaen06@gmail.com",
    "ishaen.vihaan@gmail.com"
}

def validate_email_domain(email: str) -> bool:
    """
    Strict email validation:
    - @rvce.edu.in is allowed for students
    - Allowed whitelist for @gmail.com: ONLY ishaen06@gmail.com and ishaen.vihaan@gmail.com
    - Rejects all other domains/emails
    """
    clean_email = (email or "").strip().lower()
    if clean_email.endswith("@rvce.edu.in"):
        return True
    if clean_email in ALLOWED_GMAIL_ACCOUNTS:
        return True
    return False

def parse_rvce_email(email: str) -> dict:
    """
    Parses RVCE student emails following convention:
    username.branchCodeYY@rvce.edu.in
    Example: ishaensbethur.cs25@rvce.edu.in -> username: ishaensbethur, branch: CS, year: 2025
    Rule: all emails with 25 are considered second year students (joining_year 2025).
    """
    clean_email = (email or "").strip().lower()
    pattern = r"^([a-z0-9\._]+)\.([a-z]{2,5})(\d{2})@rvce\.edu\.in$"
    match = re.match(pattern, clean_email)
    
    if match:
        username, branch_code, yy_str = match.groups()
        branch_code_upper = branch_code.upper()
        joining_year = 2000 + int(yy_str)
        return {
            "username": username,
            "branch_code": branch_code_upper,
            "joining_year": joining_year,
            "is_valid_rvce_student": True
        }
        
    user_part = clean_email.split("@")[0] if "@" in clean_email else clean_email
    bm = re.search(r"([a-z]{2,5})(\d{2})$", user_part)
    if bm:
        b_code = bm.group(1).upper()
        yy = int(bm.group(2))
        joining_year = 2000 + yy
        return {
            "username": user_part,
            "branch_code": b_code,
            "joining_year": joining_year,
            "is_valid_rvce_student": True
        }

    # Direct rule:
    # 26 in email -> 1st year (2026)
    # 25 in email -> 2nd year (2025)
    # 24 in email -> 3rd year (2024)
    # 23 in email -> 4th year (2023)
    if "26" in clean_email:
        joining_year = 2026
    elif "25" in clean_email:
        joining_year = 2025
    elif "24" in clean_email:
        joining_year = 2024
    elif "23" in clean_email:
        joining_year = 2023
    else:
        joining_year = 2025

    b_match = re.search(r"\b(cs|ci|cd|cy|ec|ee|et|as|im|me|cv|bt|ch)\b", user_part) or re.search(r"(cs|ci|cd|cy|ec|ee|et|as|im|me|cv|bt|ch)", user_part)
    b_code = b_match.group(1).upper() if b_match else "CS"

    return {
        "username": user_part,
        "branch_code": b_code,
        "joining_year": joining_year,
        "is_valid_rvce_student": clean_email.endswith("@rvce.edu.in")
    }

def get_academic_settings(db):
    """
    Fetch global academic settings from database or initialize defaults.
    """
    settings = db.academic_settings.find_one({"_id": "global"})
    if not settings:
        settings = {
            "_id": "global",
            "session_start_month": 8, # August session start
            "branch_mappings": DEFAULT_BRANCH_NAMES,
            "cycle_mappings": DEFAULT_CYCLE_MAPPINGS
        }
        try:
            db.academic_settings.insert_one(settings)
        except Exception:
            pass
    else:
        # Self-heal missing mappings if any
        b_map = settings.get("branch_mappings", {})
        c_map = settings.get("cycle_mappings", {})
        for k, v in DEFAULT_BRANCH_NAMES.items():
            if k not in b_map:
                b_map[k] = v
        for k, v in DEFAULT_CYCLE_MAPPINGS.items():
            if k not in c_map:
                c_map[k] = v
        settings["branch_mappings"] = b_map
        settings["cycle_mappings"] = c_map
        try:
            db.academic_settings.update_one({"_id": "global"}, {"$set": settings})
        except Exception:
            pass
    return settings

def calculate_academic_year(joining_year: int, session_start_month: int = 8, email: str = "") -> int:
    """
    Dynamically calculates Academic Year (1, 2, 3, or 4).
    Rules:
      - 26 in email or joining_year == 2026: 1st year (1)
      - 25 in email or joining_year == 2025: 2nd year (2)
      - 24 in email or joining_year == 2024: 3rd year (3)
      - 23 in email or joining_year == 2023: 4th year (4)
    """
    clean_email = (email or "").lower()
    if "26" in clean_email or joining_year == 2026:
        return 1
    if "25" in clean_email or joining_year == 2025:
        return 2
    if "24" in clean_email or joining_year == 2024:
        return 3
    if "23" in clean_email or joining_year == 2023:
        return 4

    if not joining_year:
        return 2
        
    now = datetime.now()
    years_passed = now.year - joining_year
    if now.month < session_start_month:
        years_passed -= 1
        
    year_of_study = years_passed + 1
    return max(1, min(4, year_of_study))

def calculate_academic_semester(joining_year: int, session_start_month: int = 8, email: str = "", year_of_study: int = None) -> int:
    """
    Dynamically calculates Current Academic Semester (1 to 8).
    Rule: all emails with 25 (or joining_year == 2025) are 3rd sem students.
    """
    clean_email = (email or "").lower()
    if "25" in clean_email or joining_year == 2025:
        return 3
    if "26" in clean_email or joining_year == 2026:
        return 1
    if "24" in clean_email or joining_year == 2024:
        return 5
    if "23" in clean_email or joining_year == 2023:
        return 7
        
    if year_of_study == 2:
        return 3
    elif year_of_study == 1:
        return 1
    elif year_of_study == 3:
        return 5
    elif year_of_study == 4:
        return 7
        
    return 3

def get_subject_cycle(branch_code: str, db) -> str:

    """
    Fetches the live Admin-configured Subject Cycle ('C' or 'P') for a branch code.
    """
    if not branch_code:
        return "P"
    settings = get_academic_settings(db)
    cycle_mappings = settings.get("cycle_mappings", DEFAULT_CYCLE_MAPPINGS)
    code_upper = branch_code.strip().upper()
    return cycle_mappings.get(code_upper, DEFAULT_CYCLE_MAPPINGS.get(code_upper, "P"))

def get_branch_full_name(branch_code: str, db) -> str:
    """
    Resolves full branch name from branch code.
    """
    if not branch_code:
        return "Computer Science Engineering"
    settings = get_academic_settings(db)
    branch_mappings = settings.get("branch_mappings", DEFAULT_BRANCH_NAMES)
    code_upper = branch_code.strip().upper()
    return branch_mappings.get(code_upper, DEFAULT_BRANCH_NAMES.get(code_upper, f"{code_upper} Engineering"))

def enrich_user_academic_profile(user_dict: dict, db) -> dict:
    """
    Enriches user dictionary with dynamic academic fields:
    - year_of_study: calculated dynamically from joining_year
    - cycle: retrieved from live admin branch-to-cycle database mapping
    - branch: full human-readable branch name (or branch code)
    """
    if not user_dict:
        return user_dict
        
    res = dict(user_dict)
    user_email = (res.get("email") or "").lower().strip()
    is_mentor = res.get("is_mentor")
    
    # If user is student (or @rvce.edu.in email)
    if user_email.endswith("@rvce.edu.in") or is_mentor is False:
        joining_year = res.get("joining_year")
        branch_code = res.get("branch_code") or res.get("branch")
        
        if (not joining_year or not branch_code) and user_email.endswith("@rvce.edu.in"):
            parsed = parse_rvce_email(user_email)
            joining_year = parsed.get("joining_year")
            branch_code = parsed.get("branch_code")
            res["joining_year"] = joining_year
            res["branch_code"] = branch_code
            
        settings = get_academic_settings(db)
        session_start_month = settings.get("session_start_month", 8)
        
        # Calculate dynamic year of study & semester
        res["year_of_study"] = calculate_academic_year(joining_year, session_start_month, email=user_email)
        res["semester"] = calculate_academic_semester(joining_year, session_start_month, email=user_email, year_of_study=res.get("year_of_study"))


        
        # Resolve live Subject Cycle
        res["cycle"] = get_subject_cycle(branch_code, db)
        
        # Resolve full branch name
        if branch_code:
            res["branch"] = get_branch_full_name(branch_code, db)
            
    # Check if user has already submitted an app rating
    try:
        user_id = res.get("id")
        user_email = (res.get("email") or "").strip().lower()
        has_rated = db.app_ratings.find_one({
            "$or": [
                {"user_id": user_id},
                {"user_email": user_email}
            ]
        }) is not None
        res["has_rated"] = has_rated
    except Exception:
        res["has_rated"] = False

    return res

