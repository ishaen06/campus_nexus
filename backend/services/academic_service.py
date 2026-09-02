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
    """
    clean_email = (email or "").strip().lower()
    pattern = r"^([a-z0-9\._]+)\.([a-z]{2,5})(\d{2})@rvce\.edu\.in$"
    match = re.match(pattern, clean_email)
    
    if not match:
        # Fallback regex if username formatting varies slightly
        pattern_fallback = r"^([a-z0-9\._]+)@rvce\.edu\.in$"
        m_fallback = re.match(pattern_fallback, clean_email)
        if m_fallback:
            user_part = m_fallback.group(1)
            # Try finding branch + 2 digits at end of user_part
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
        return {
            "username": clean_email.split("@")[0],
            "branch_code": "CS",
            "joining_year": 2025,
            "is_valid_rvce_student": False
        }
        
    username, branch_code, yy_str = match.groups()
    branch_code_upper = branch_code.upper()
    joining_year = 2000 + int(yy_str)
    
    return {
        "username": username,
        "branch_code": branch_code_upper,
        "joining_year": joining_year,
        "is_valid_rvce_student": True
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
            
    # Cleanup removed branches like 'IS' from DB settings document if present
    b_map = dict(settings.get("branch_mappings", {}))
    c_map = dict(settings.get("cycle_mappings", {}))
    if "IS" in b_map or "IS" in c_map:
        b_map.pop("IS", None)
        c_map.pop("IS", None)
        settings["branch_mappings"] = b_map
        settings["cycle_mappings"] = c_map
        try:
            db.academic_settings.update_one({"_id": "global"}, {"$set": {"branch_mappings": b_map, "cycle_mappings": c_map}}, upsert=True)
        except Exception:
            pass
    return settings

def calculate_academic_year(joining_year: int, session_start_month: int = 8) -> int:
    """
    Dynamically calculates Academic Year (1, 2, 3, or 4) based on Joining Year, 
    Current Date, and Academic Session Start Month.
    """
    if not joining_year:
        return 1
        
    now = datetime.now()
    years_passed = now.year - joining_year
    if now.month < session_start_month:
        years_passed -= 1
        
    year_of_study = years_passed + 1
    return max(1, min(4, year_of_study))

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
        
        # Calculate dynamic year of study
        res["year_of_study"] = calculate_academic_year(joining_year, session_start_month)
        
        # Resolve live Subject Cycle
        res["cycle"] = get_subject_cycle(branch_code, db)
        
        # Resolve full branch name
        if branch_code:
            res["branch"] = get_branch_full_name(branch_code, db)
            
    return res
