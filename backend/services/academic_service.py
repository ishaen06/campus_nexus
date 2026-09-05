import re
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import HTTPException, status

DEFAULT_BRANCH_NAMES = {
    "CS": "Computer Science and Engineering",
    "CI": "Artificial Intelligence and Machine Learning",
    "AI": "Artificial Intelligence and Machine Learning",
    "CD": "Computer Science (Data Science)",
    "CY": "Computer Science and Engineering (Cyber Security)",
    "IS": "Information Science and Engineering",
    "EC": "Electronics and Communication Engineering",
    "EE": "Electrical and Electronics Engineering",
    "ET": "Electronics and Telecommunication Engineering",
    "AS": "Aerospace Engineering",
    "AE": "Aerospace Engineering",
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
    "AI": "C",
    "CD": "C",
    "CY": "C",
    "IS": "C",
    # P-Cycle (EC cluster)
    "EC": "P",
    "EE": "P",
    "ET": "P",
    # P-Cycle (ME cluster)
    "AS": "P",
    "AE": "P",
    "IM": "P",
    "ME": "P",
    # P-Cycle (CV cluster)
    "CV": "P",
    "BT": "P",
    "CH": "P",
}

DEFAULT_CLUSTER_MAPPINGS = {
    "CS": "CS", "CI": "CS", "AI": "CS", "CD": "CS", "CY": "CS", "IS": "CS",
    "EC": "EC", "EE": "EC", "ET": "EC",
    "AS": "ME", "AE": "ME", "IM": "ME", "ME": "ME",
    "CV": "CV", "BT": "CV", "CH": "CV",
}

DEFAULT_FIRST_YEAR_THEMES = [
    "Agriculture, Livestock & Rural Development",
    "Education, Skilling & Student-Centric Solutions",
    "Health, Wellness & Traditional Medicine",
    "Urban Development, Mobility & Smart Cities",
    "Sustainability & Environment",
    "Emerging Technology, Innovation & Industry 4.0",
    "Ocean, Marine & Aerospace Technologies",
]

DEFAULT_CLUSTER_THEMES = {
    "CS": [
        "Artificial Intelligence",
        "Internet of Things",
        "AR, VR & MR",
        "Quantum Security",
        "Edge Computing",
        "Ethical AI",
        "Cloud Security",
        "Programming Mechanics (Coding for App Development)",
        "AI for Social Good",
        "AI in Education",
        "Data Science and Analytics",
    ],
    "EC": [
        "Semiconductor Engineering",
        "Cyber Physical Systems",
        "Drone Technology",
        "Biomedical Instrumentation",
        "Bionics and Prosthetics",
        "Renewable Energy Solutions",
        "Embedded Systems and IoT",
        "AI in Electronics",
        "5G and Wireless Communications",
        "Power Systems Engineering",
        "Autonomous Vehicles",
    ],
    "ME": [
        "Smart Manufacturing",
        "Digital Metrology",
        "Ergonomics in Automation",
        "Advanced Materials",
        "Energy Systems",
        "Eco-friendly Materials and Waste Reduction Strategies",
        "Mechatronics & Industrial Internet of Things",
        "Thermodynamic Simulations",
        "AI for Mechanical Systems",
        "Electric Vehicle Technology",
        "Supply Chain Management",
    ],
    "CV": [
        "Environmental Engineering and Sustainability",
        "Pollution Control, Waste Management and Bioremediation",
        "Urban Planning and Development, including Digital Twins",
        "Smart Materials and Structures",
        "Innovative Solutions for Water and Wastewater Purification, Reuse and Recycling",
        "Technologies to Mitigate Climate Change Impacts",
        "Bioinformatics",
        "Biomaterials and Computational Biology",
    ],
}

DEFAULT_CLUSTER_THEMES_YEAR_2 = DEFAULT_CLUSTER_THEMES

DEFAULT_CLUSTER_THEMES_YEAR_3 = {
    "CS": [
        "Advanced Autonomous Systems & Edge AI",
        "Generative AI & Large Language Models",
        "Blockchain & Decentralized Architectures",
        "Quantum Computing & Advanced Cryptography",
        "Intelligent Cyber-Physical Systems",
        "Cloud-Native Architectures & High-Performance Computing",
        "Full-Stack Smart Applications & Systems Engineering",
        "Big Data Analytics & Distributed Streaming Systems",
        "AR/VR and Spatial Computing",
    ],
    "EC": [
        "VLSI Architecture & System-on-Chip (SoC) Design",
        "Advanced Drone & Unmanned Aerial Systems",
        "Next-Gen 5G/6G Wireless Networks & RF Engineering",
        "Smart Embedded Robotics & Autonomous Systems",
        "Precision Biomedical Systems & Neural Engineering",
        "Smart Energy Harvesting & Green IoT",
        "Edge Hardware Acceleration for Deep Learning",
    ],
    "ME": [
        "Advanced Autonomous Vehicles & Electric Powertrains",
        "Industry 5.0, Smart Manufacturing & Industrial Robotics",
        "Small Satellite Systems & Aerospace Propulsion",
        "Clean Energy Systems & Advanced Fuel Cells",
        "Additive Manufacturing & Advanced Metamaterials",
        "Computational Fluid Dynamics & Thermal Management",
        "Biomimetic & Soft Robotics",
    ],
    "CV": [
        "Smart Infrastructure, Structural Health Monitoring & BIM",
        "Climate-Resilient Urban Systems & Carbon Capture",
        "Advanced Wastewater Recycling & Membrane Technologies",
        "Geo-Environmental & Disaster Mitigation Engineering",
        "Sustainable Construction Materials & Geopolymer Concrete",
        "Computational Systems Biology & Bio-Manufacturing",
    ],
}

DEFAULT_COHORT_MAPPINGS = {
    "26": 1,  # 1st Year (2026 Batch)
    "25": 2,  # 2nd Year (2025 Batch)
    "24": 3,  # 3rd Year (2024 Batch)
    "23": 4,  # 4th Year (2023 Batch)
}

DEFAULT_FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdn1JLoy8JNgLMY1S7aXeDwiPLedtdsNwQFugVJk84KTJieNA/viewform"

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
        # Normalization: In RVCE, AI and CI are the same branch (AI/ML)
        if branch_code_upper == "AI":
            branch_code_upper = "CI"
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
        if b_code == "AI":
            b_code = "CI"
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

    b_match = re.search(r"\b(cs|ci|ai|cd|cy|is|ec|ee|et|as|ae|im|me|cv|bt|ch)\b", user_part) or re.search(r"(cs|ci|ai|cd|cy|is|ec|ee|et|as|ae|im|me|cv|bt|ch)", user_part)
    b_code = b_match.group(1).upper() if b_match else "CS"
    if b_code == "AI":
        b_code = "CI"

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
            "cycle_mappings": DEFAULT_CYCLE_MAPPINGS,
            "cluster_mappings": DEFAULT_CLUSTER_MAPPINGS,
            "first_year_themes": list(DEFAULT_FIRST_YEAR_THEMES),
            "cluster_themes": {k: list(v) for k, v in DEFAULT_CLUSTER_THEMES.items()},
            "year3_cluster_themes": {k: list(v) for k, v in DEFAULT_CLUSTER_THEMES_YEAR_3.items()},
            "cohort_mappings": dict(DEFAULT_COHORT_MAPPINGS),
            "google_form_feedback_url": DEFAULT_FEEDBACK_FORM_URL
        }
        try:
            db.academic_settings.insert_one(settings)
        except Exception:
            pass
    else:
        # Self-heal missing mappings if any
        b_map = settings.get("branch_mappings", {})
        c_map = settings.get("cycle_mappings", {})
        cl_map = settings.get("cluster_mappings", {})
        first_yr_themes = settings.get("first_year_themes", [])
        cl_themes = settings.get("cluster_themes", {})
        y3_cl_themes = settings.get("year3_cluster_themes", {})
        cohort_map = settings.get("cohort_mappings", {})
        feedback_url = (settings.get("google_form_feedback_url") or "").strip()
        if "campusnexus-feedback" in feedback_url or not feedback_url:
            feedback_url = DEFAULT_FEEDBACK_FORM_URL
        for k, v in DEFAULT_BRANCH_NAMES.items():
            if k not in b_map:
                b_map[k] = v
        for k, v in DEFAULT_CYCLE_MAPPINGS.items():
            if k not in c_map:
                c_map[k] = v
        for k, v in DEFAULT_CLUSTER_MAPPINGS.items():
            if k not in cl_map:
                cl_map[k] = v
        if not first_yr_themes:
            first_yr_themes = list(DEFAULT_FIRST_YEAR_THEMES)
        if not cl_themes:
            cl_themes = {k: list(v) for k, v in DEFAULT_CLUSTER_THEMES.items()}
        else:
            for k, v in DEFAULT_CLUSTER_THEMES.items():
                if k not in cl_themes:
                    cl_themes[k] = list(v)
        if not y3_cl_themes:
            y3_cl_themes = {k: list(v) for k, v in DEFAULT_CLUSTER_THEMES_YEAR_3.items()}
        else:
            for k, v in DEFAULT_CLUSTER_THEMES_YEAR_3.items():
                if k not in y3_cl_themes:
                    y3_cl_themes[k] = list(v)
        if not cohort_map:
            cohort_map = dict(DEFAULT_COHORT_MAPPINGS)
        settings["branch_mappings"] = b_map
        settings["cycle_mappings"] = c_map
        settings["cluster_mappings"] = cl_map
        settings["first_year_themes"] = first_yr_themes
        settings["cluster_themes"] = cl_themes
        settings["year3_cluster_themes"] = y3_cl_themes
        settings["cohort_mappings"] = cohort_map
        settings["google_form_feedback_url"] = feedback_url
        try:
            db.academic_settings.update_one({"_id": "global"}, {"$set": settings})
        except Exception:
            pass
    return settings

def get_allowed_themes_for_year(year: int, cluster: Optional[str] = None, db = None) -> list[str]:
    """
    Returns the list of valid themes for a given academic year and optional cluster:
    - Year 1: Non-cluster generic themes (DEFAULT_FIRST_YEAR_THEMES)
    - Year 2: Cluster-wise themes for the specified cluster
    - Year 3: Year 3 cluster-wise themes for the specified cluster
    - Year 4+: Cluster-wise themes
    """
    settings = get_academic_settings(db) if db is not None else None
    if year == 1:
        if settings and settings.get("first_year_themes"):
            return settings["first_year_themes"]
        return list(DEFAULT_FIRST_YEAR_THEMES)
    elif year == 3:
        year3_map = (settings.get("year3_cluster_themes") if settings else None) or DEFAULT_CLUSTER_THEMES_YEAR_3
        if cluster and cluster in year3_map:
            return year3_map[cluster]
        all_themes = []
        for lst in year3_map.values():
            all_themes.extend(lst)
        return all_themes
    else:
        # Year 2 (and default)
        cl_map = (settings.get("cluster_themes") if settings else None) or DEFAULT_CLUSTER_THEMES
        if cluster and cluster in cl_map:
            return cl_map[cluster]
        all_themes = []
        for lst in cl_map.values():
            all_themes.extend(lst)
        return all_themes

def calculate_academic_year(joining_year: int = None, session_start_month: int = 8, email: str = "", cohort_mappings: dict = None, db = None) -> int:
    """
    Dynamically calculates Academic Year (1, 2, 3, or 4).
    Uses configurable cohort_mappings (e.g. {"26": 1, "25": 2, "24": 3, "23": 4})
    """
    if cohort_mappings is None:
        if db is not None:
            try:
                settings = get_academic_settings(db)
                cohort_mappings = settings.get("cohort_mappings", DEFAULT_COHORT_MAPPINGS)
            except Exception:
                cohort_mappings = DEFAULT_COHORT_MAPPINGS
        else:
            cohort_mappings = DEFAULT_COHORT_MAPPINGS

    clean_email = (email or "").lower().strip()
    em_match = re.search(r"[a-z]{2,4}(\d{2})@rvce\.edu\.in", clean_email) or re.search(r"(?:^|\.)[a-z]{2,4}(\d{2})(?:@|$)", clean_email)
    em_yy = em_match.group(1) if em_match else None

    # 1. Match email batch ID against configured cohort mappings
    if em_yy and str(em_yy) in cohort_mappings:
        return int(cohort_mappings[str(em_yy)])

    # 2. Match joining_year (e.g. 2025 -> "25")
    if joining_year:
        jy_str = str(joining_year).strip()
        jy_suffix = jy_str[-2:]
        if jy_suffix in cohort_mappings:
            return int(cohort_mappings[jy_suffix])
        if jy_str in cohort_mappings:
            return int(cohort_mappings[jy_str])

    # Fallback to default heuristic if unmapped
    if em_yy == "26" or joining_year == 2026:
        return 1
    if em_yy == "25" or joining_year == 2025:
        return 2
    if em_yy == "24" or joining_year == 2024:
        return 3
    if em_yy == "23" or joining_year == 2023:
        return 4

    if not joining_year:
        return 2
        
    now = datetime.now()
    try:
        years_passed = now.year - int(joining_year)
    except Exception:
        years_passed = 1
    if now.month < session_start_month:
        years_passed -= 1
        
    year_of_study = years_passed + 1
    return max(1, min(4, year_of_study))

def calculate_academic_semester(joining_year: int = None, session_start_month: int = 8, email: str = "", year_of_study: int = None, cohort_mappings: dict = None, db = None) -> int:
    """
    Dynamically calculates Current Academic Semester (1 to 8) aligned with year_of_study.
    """
    if year_of_study is None:
        year_of_study = calculate_academic_year(joining_year, session_start_month, email, cohort_mappings, db)

    now = datetime.now()
    # In August-December (odd sem): 1, 3, 5, 7
    # In January-July (even sem): 2, 4, 6, 8
    is_even_sem = (1 <= now.month <= 6)
    base_sem = (year_of_study * 2) - 1
    return base_sem + (1 if is_even_sem else 0)

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
        cohort_mappings = settings.get("cohort_mappings", DEFAULT_COHORT_MAPPINGS)
        
        # Calculate dynamic year of study & semester
        res["year_of_study"] = calculate_academic_year(joining_year, session_start_month, email=user_email, cohort_mappings=cohort_mappings)
        res["semester"] = calculate_academic_semester(joining_year, session_start_month, email=user_email, year_of_study=res.get("year_of_study"), cohort_mappings=cohort_mappings)


        
        # Resolve live Subject Cycle (strictly for 1st Year students; 2nd & 3rd year follow core branch)
        if res.get("year_of_study") == 1:
            res["cycle"] = get_subject_cycle(branch_code, db)
        else:
            res["cycle"] = "N/A"
        
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

