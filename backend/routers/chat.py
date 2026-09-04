from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from typing import List, Dict
from datetime import datetime

from database_mongo import get_mongo_db, get_next_sequence_value, MongoUser
from schemas import MessageResponse, GroupChatCreate, GroupChatResponse, GroupMessageResponse, GroupChatUpdate, GroupLeaveRequest, GroupMarksUpdate, MentorActionRequest, TeamInviteInfoResponse, JoinTeamResponse
from jose import JWTError, jwt
from security import SECRET_KEY, ALGORITHM
from ai_service import analyze_message_content
import json
import uuid


router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        # Maps connection_id to a list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps group_id to a list of active WebSockets
        self.active_group_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_id: int):
        await websocket.accept()
        if connection_id not in self.active_connections:
            self.active_connections[connection_id] = []
        self.active_connections[connection_id].append(websocket)

    def disconnect(self, websocket: WebSocket, connection_id: int):
        if connection_id in self.active_connections:
            self.active_connections[connection_id].remove(websocket)
            if not self.active_connections[connection_id]:
                del self.active_connections[connection_id]

    async def broadcast_to_connection(self, message: dict, connection_id: int):
        if connection_id in self.active_connections:
            for connection in self.active_connections[connection_id]:
                await connection.send_json(message)

    # Group connections
    async def connect_group(self, websocket: WebSocket, group_id: int):
        await websocket.accept()
        if group_id not in self.active_group_connections:
            self.active_group_connections[group_id] = []
        self.active_group_connections[group_id].append(websocket)

    def disconnect_group(self, websocket: WebSocket, group_id: int):
        if group_id in self.active_group_connections:
            self.active_group_connections[group_id].remove(websocket)
            if not self.active_group_connections[group_id]:
                del self.active_group_connections[group_id]

    async def broadcast_to_group(self, message: dict, group_id: int):
        if group_id in self.active_group_connections:
            for connection in self.active_group_connections[group_id]:
                await connection.send_json(message)

manager = ConnectionManager()

def get_user_from_token(token: str, db):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    except JWTError:
        return None

@router.websocket("/ws/{connection_id}")
async def websocket_chat(websocket: WebSocket, connection_id: int, token: str = Query(...), db = Depends(get_mongo_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return
        
    # Verify they are part of this connection
    conn = db.connections.find_one({"id": connection_id, "status": "ACCEPTED"})
    if not conn or (conn["sender_id"] != user["id"] and conn["receiver_id"] != user["id"]):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, connection_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            
            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")
                
                if msg_type in ["typing", "stop_typing"]:
                    await manager.broadcast_to_connection({
                        "type": msg_type,
                        "sender_id": user["id"]
                    }, connection_id)
                    continue
                    
                if msg_type == "read":
                    # Mark specific message as read
                    msg_id = data.get("message_id")
                    if msg_id:
                        msg_to_update = db.messages.find_one({"id": msg_id})
                        if msg_to_update and msg_to_update["sender_id"] != user["id"]:
                            db.messages.update_one({"id": msg_id}, {"$set": {"is_read": True}})
                            await manager.broadcast_to_connection({
                                "type": "read_receipt",
                                "message_id": msg_id
                            }, connection_id)
                    continue

                if msg_type == "react":
                    msg_id = data.get("message_id")
                    reaction = data.get("reaction")
                    if msg_id and reaction:
                        msg_to_update = db.messages.find_one({"id": msg_id})
                        if msg_to_update:
                            current_reactions = dict(msg_to_update.get("reactions") or {})
                            current_reactions[str(user["id"])] = reaction
                            db.messages.update_one({"id": msg_id}, {"$set": {"reactions": current_reactions}})
                            await manager.broadcast_to_connection({
                                "type": "reaction_update",
                                "message_id": msg_id,
                                "reactions": current_reactions
                            }, connection_id)
                    continue
                    
                content = data.get("content", "")
            except json.JSONDecodeError:
                content = raw_data
                
            if not content:
                continue

            # Run AI Moderation
            analysis = analyze_message_content(content)
            
            if analysis["status"] == "severe":
                db.users.update_one({"id": user["id"]}, {"$set": {"is_banned": True}})
                await websocket.send_json({
                    "type": "system_warning",
                    "message": "Your account has been suspended for severe policy violations."
                })
                await websocket.close(code=1008)
                break
                
            if analysis["status"] == "warning":
                await websocket.send_json({
                    "type": "system_warning",
                    "message": analysis["message"]
                })
                continue # Don't send the message

            # Save message to DB
            new_msg_id = get_next_sequence_value("messages")
            new_msg = {
                "id": new_msg_id,
                "connection_id": connection_id,
                "sender_id": user["id"],
                "content": content,
                "is_read": False,
                "reactions": None,
                "created_at": datetime.utcnow()
            }
            db.messages.insert_one(new_msg)
            
            # Broadcast
            await manager.broadcast_to_connection({
                "type": "message",
                "id": new_msg_id,
                "connection_id": connection_id,
                "sender_id": user["id"],
                "content": content,
                "created_at": new_msg["created_at"].isoformat()
            }, connection_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)

from routers.users import get_current_user

@router.get("/{connection_id}/messages", response_model=List[MessageResponse])
def get_messages(connection_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    conn = db.connections.find_one({"id": connection_id})
    if not conn or (conn["sender_id"] != current_user["id"] and conn["receiver_id"] != current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    if conn.get("status") != "ACCEPTED":
        raise HTTPException(status_code=403, detail="Connection has not been accepted yet.")

        
    messages = list(db.messages.find({"connection_id": connection_id}).sort("created_at", 1))
    
    # Mark unread messages from the other user as read
    unread_message_ids = [m["id"] for m in messages if m["sender_id"] != current_user["id"] and not m.get("is_read", False)]
    if unread_message_ids:
        db.messages.update_many({"id": {"$in": unread_message_ids}}, {"$set": {"is_read": True}})
        # update our list to show read
        for m in messages:
            if m["id"] in unread_message_ids:
                m["is_read"] = True
                
    for m in messages:
        m.pop("_id", None)
    return messages



# ─── 2nd Year: Cluster-wise Project Themes ─────────────────────────────────
CLUSTER_THEMES: dict[str, list[str]] = {
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

# ─── Cluster definitions ───────────────────────────────────────────────────
BRANCH_CLUSTERS = {
    "EC": "EC", "EE": "EC", "ET": "EC",
    "CS": "CS", "CI": "CS", "CD": "CS", "CY": "CS",
    "ME": "ME", "AS": "ME", "IM": "ME",
    "CV": "CV", "CH": "CV", "BT": "CV",
}

# Each entry is a dict of {branch_code: required_count}
VALID_TEAM_COMBINATIONS: dict[str, list[dict]] = {
    "EC": [
        {"EC": 3, "EE": 1, "ET": 1},  # 5-member
        {"EC": 3, "EE": 2},            # 5-member
        {"EC": 3, "ET": 2},            # 5-member
        {"EC": 4, "EE": 1},            # 5-member
        {"EC": 4, "ET": 1},            # 5-member
        {"EC": 3, "EE": 1},            # 4-member
        {"EC": 3, "ET": 1},            # 4-member
    ],
    "CS": [
        {"CS": 3, "CI": 2},            # 5-member
        {"CS": 2, "CD": 1, "CY": 1},   # 4-member
        {"CD": 2, "CS": 1, "CY": 2},   # 5-member
        {"CD": 1, "CY": 1, "CI": 2},   # 4-member
    ],
    "ME": [
        {"AS": 1, "IM": 1, "ME": 3},   # 5-member
        {"AS": 2, "IM": 1, "ME": 2},   # 5-member
        {"AS": 1, "IM": 2, "ME": 2},   # 5-member
    ],
    "CV": [
        {"CV": 1, "CH": 2, "BT": 2},   # 5-member
        {"CV": 2, "CH": 1, "BT": 2},   # 5-member
        {"CV": 1, "CH": 1, "BT": 2},   # 4-member
    ],
}

# ─── Branch code full names (used in emails & error messages) ──────────────
BRANCH_FULL_NAMES = {
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

# P/C cycle mapping for 1st year branch codes
BRANCH_CYCLE_MAP_1ST_YEAR = {
    "CS": "C", "CI": "C", "CD": "C", "CY": "C",   # CS cluster → C-Cycle
    "EC": "P", "EE": "P", "ET": "P",               # EC cluster → P-Cycle
    "AS": "P", "IM": "P", "ME": "P",               # ME cluster → P-Cycle
    "CV": "P", "BT": "P", "CH": "P",               # CV cluster → P-Cycle
}

_SESSION_START_MONTH = 8  # August

def _get_year_of_study(joining_year: int) -> int:
    if joining_year == 2026:
        return 1
    if joining_year == 2025:
        return 2
    if joining_year == 2024:
        return 3
    if joining_year == 2023:
        return 4
    from datetime import datetime
    now = datetime.now()
    years_passed = now.year - joining_year
    if now.month < _SESSION_START_MONTH:
        years_passed -= 1
    return max(1, min(4, years_passed + 1))

def _extract_user_academic_info(u: dict) -> tuple[str, int, int]:
    """Returns (branch_code, joining_year, year_of_study).
    Rules:
      - 26 in email or USN -> 1st year (joining_year 2026, year_of_study 1)
      - 25 in email or USN -> 2nd year (joining_year 2025, year_of_study 2)
      - 24 in email or USN -> 3rd year (joining_year 2024, year_of_study 3)
      - 23 in email or USN -> 4th year (joining_year 2023, year_of_study 4)
      - Cycle is P or C -> 1st year (2026)
      - Saved year_of_study is respected
    """
    import re
    from services.academic_service import parse_rvce_email

    email = (u.get("email") or "").strip().lower()
    usn = (u.get("usn") or "").strip().upper()
    branch_code = (u.get("branch_code") or "").strip().upper()
    joining_year = u.get("joining_year")
    saved_year = u.get("year_of_study")
    cycle = (u.get("cycle") or "").strip().upper()

    # 1. Parse USN admission year (e.g. 1RV25CS126 or 1RZ25CS126 -> cohort year is 25, 126 is roll number)
    usn_year = None
    if usn:
        m_usn = re.search(r"1[A-Z]{2}(\d{2})[A-Z]{2,4}\d+", usn)
        if m_usn:
            yy = int(m_usn.group(1))
            if 10 <= yy <= 99:
                usn_year = yy

    # 2. Parse RVCE Email admission year (e.g. prekshar.cs25@rvce.edu.in -> cohort year is 25)
    email_year = None
    if email:
        m_email = re.search(r"[a-z]{2,4}(\d{2})@rvce\.edu\.in", email)
        if m_email:
            email_year = int(m_email.group(1))
        else:
            m_loose = re.search(r"(?:^|\.)[a-z]{2,4}(\d{2})(?:@|$)", email)
            if m_loose:
                email_year = int(m_loose.group(1))

    # Authoritative cohort resolution (USN or Email):
    detected_yy = usn_year or email_year
    detected_yy_str = str(detected_yy) if detected_yy is not None else None

    # Retrieve live cohort mappings from academic settings if available
    cohort_map = {"26": 1, "25": 2, "24": 3, "23": 4}
    try:
        from database_mongo import get_mongo_db
        db_conn = get_mongo_db()
        doc = db_conn.academic_settings.find_one({"_id": "global"}, {"cohort_mappings": 1})
        if doc and "cohort_mappings" in doc and doc["cohort_mappings"]:
            cohort_map = doc["cohort_mappings"]
    except Exception:
        pass

    if detected_yy_str and detected_yy_str in cohort_map:
        joining_year = 2000 + int(detected_yy)
        year_of_study = int(cohort_map[detected_yy_str])
    elif detected_yy == 26:
        joining_year = 2026
        year_of_study = 1
    elif detected_yy == 25:
        joining_year = 2025
        year_of_study = 2
    elif detected_yy == 24:
        joining_year = 2024
        year_of_study = 3
    elif detected_yy == 23:
        joining_year = 2023
        year_of_study = 4
    elif cycle in ["P", "C", "PHYSICS", "CHEMISTRY"] and (not usn_year) and (not email_year):
        # Only 1st year students are divided into P-Cycle and C-Cycle
        joining_year = 2026
        year_of_study = 1
    elif saved_year in [1, 2, 3, 4]:
        year_of_study = int(saved_year)
        joining_year = 2027 - year_of_study

    elif joining_year:
        try:
            jy = int(joining_year)
            jy_str = str(jy)[-2:]
            if jy_str in cohort_map:
                year_of_study = int(cohort_map[jy_str])
            elif jy == 2026:
                year_of_study = 1
            elif jy == 2025:
                year_of_study = 2
            elif jy == 2024:
                year_of_study = 3
            elif jy == 2023:
                year_of_study = 4
            else:
                year_of_study = _get_year_of_study(jy)
        except Exception:
            year_of_study = 2
            joining_year = 2025
    else:
        year_of_study = 2
        joining_year = 2025

    # Branch extraction:
    if not branch_code:
        b_val = (u.get("branch") or "").strip().upper()
        if b_val in BRANCH_CLUSTERS:
            branch_code = b_val

    if usn and not branch_code:
        m = re.match(r"^1R[VZ](\d{2})([A-Z]{2,3})\d{3}$", usn)
        if m:
            yy, b = m.groups()
            if b in BRANCH_CLUSTERS:
                branch_code = b

    if (not branch_code) and email.endswith("@rvce.edu.in"):
        parsed = parse_rvce_email(email)
        if parsed.get("branch_code"):
            branch_code = parsed.get("branch_code")

    if not branch_code:
        branch_code = "CS"

    return branch_code, int(joining_year), int(year_of_study)





def validate_team_criteria(member_users: List[dict]) -> tuple[bool, str]:
    student_users = [u for u in member_users if not u.get("is_mentor")]
    size = len(student_users)
    if size < 4 or size > 5:
        return False, f"Formal project team must contain 4 or 5 members (currently has {size})"

    # ── Extract academic info for each member ──────────────────────────────
    member_data = []
    for u in student_users:
        b_code, j_yr, y_study = _extract_user_academic_info(u)
        member_data.append({
            "user": u,
            "branch_code": b_code,
            "joining_year": j_yr,
            "year_of_study": y_study,
            "cluster": BRANCH_CLUSTERS.get(b_code)
        })

    study_years = {m["year_of_study"] for m in member_data}
    if len(study_years) > 1:
        years_str = " & ".join(f"Year {y}" for y in sorted(study_years))
        return False, (
            f"Team members are from different academic years ({years_str}). "
            "All members must be in the same year of study."
        )

    year = next(iter(study_years))

    # ── 1st Year: P/C Cycle balance ────────────────────────────────────────
    if year == 1:
        p_count, c_count = 0, 0
        for m in member_data:
            code = m["branch_code"]
            cycle = BRANCH_CYCLE_MAP_1ST_YEAR.get(code, "P")
            if cycle == "P":
                p_count += 1
            else:
                c_count += 1

        if size == 4 and (p_count != 2 or c_count != 2):
            return False, (
                f"1st Year Cycle Balance failed: Team of 4 must have exactly 2 P-Cycle and 2 C-Cycle members "
                f"(Found {p_count} P-Cycle, {c_count} C-Cycle)."
            )
        if size == 5 and not ((p_count == 3 and c_count == 2) or (p_count == 2 and c_count == 3)):
            return False, (
                f"1st Year Cycle Balance failed: Team of 5 must have either (3 P + 2 C) or (2 P + 3 C) "
                f"(Found {p_count} P-Cycle, {c_count} C-Cycle)."
            )
        return True, ""

    # ── 2nd Year (and above): Cluster-based branch combination ────────────
    branch_counts: dict[str, int] = {}
    for m in member_data:
        code = m["branch_code"]
        branch_counts[code] = branch_counts.get(code, 0) + 1

    clusters_in_team = {m["cluster"] for m in member_data if m["cluster"]}

    if len(clusters_in_team) == 0:
        return False, "Unable to determine cluster — ensure all members have valid branch codes."
    if len(clusters_in_team) > 1:
        cluster_labels = " / ".join(sorted(clusters_in_team))
        return False, (
            f"Team members belong to multiple clusters ({cluster_labels}). "
            "All members must be from the same cluster (EC, CS, ME, or CV)."
        )

    cluster = next(iter(clusters_in_team))
    valid_combos = VALID_TEAM_COMBINATIONS.get(cluster, [])

    if not any(branch_counts == combo for combo in valid_combos):
        combo_strs = [" + ".join(f"{cnt} {br}" for br, cnt in combo.items()) for combo in valid_combos]
        combos_display = "\n  • " + "\n  • ".join(combo_strs)
        current_str = " + ".join(f"{cnt} {br}" for br, cnt in sorted(branch_counts.items()))
        return False, (
            f"Invalid branch combination for {cluster} Cluster. "
            f"Current team: {current_str}. "
            f"Approved {cluster} combinations:{combos_display}"
        )

    return True, ""


def build_group_response(group: dict, db, current_user = None) -> dict:
    member_records = list(db.group_members.find({"group_id": group["id"]}))
    member_ids = [m["user_id"] for m in member_records]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    for u in member_users:
        u.pop("_id", None)
        b_code, j_yr, y_study = _extract_user_academic_info(u)
        u["branch_code"] = b_code
        u["joining_year"] = j_yr
        u["year_of_study"] = y_study
        u["cluster"] = BRANCH_CLUSTERS.get(b_code)

    criteria_met, val_error = validate_team_criteria(member_users)
    
    # Query evaluations from evaluations collection
    evaluations = list(db.evaluations.find({"group_id": group["id"]}))
    
    student_evaluations_dict = {}
    for ev in evaluations:
        student_evaluations_dict[str(ev["student_id"])] = {
            "phase1_detail_marks": ev.get("phase1_detail_marks") or {},
            "phase1_observations": ev.get("phase1_observations") or "",
            "phase2_detail_marks": ev.get("phase2_detail_marks") or {},
            "phase2_observations": ev.get("phase2_observations") or "",
            "phase3_detail_marks": ev.get("phase3_detail_marks") or {},
            "phase3_observations": ev.get("phase3_observations") or "",
            "evaluator_id": ev.get("evaluator_id")
        }

        
    print(f"[Backend build_group_response] student_evaluations_dict: {student_evaluations_dict}")

    invite_code = group.get("invite_code")
    if not invite_code:
        invite_code = uuid.uuid4().hex[:10]
        db.group_chats.update_one({"id": group["id"]}, {"$set": {"invite_code": invite_code, "invite_enabled": True}})

    return {
        "id": group["id"],
        "name": group["name"],
        "created_by": group["created_by"],
        "created_at": group.get("created_at"),
        "is_public": bool(group.get("is_public", False)),
        "project_topic": group.get("project_topic"),
        "project_sub_topic": group.get("project_sub_topic"),
        "project_theme": group.get("project_theme"),
        "member_ids": member_ids,
        "members": member_users,
        "criteria_met": criteria_met,
        "validation_error": val_error if not criteria_met else None,
        "mentor_name": group.get("mentor_name"),
        "mentor_email": group.get("mentor_email"),
        "mentor_status": group.get("mentor_status") or "NOT_SUBMITTED",
        "mentor_rejection_reason": group.get("mentor_rejection_reason"),
        "phase1_marks": group.get("phase1_marks") or 0,
        "phase2_marks": group.get("phase2_marks") or 0,
        "phase3_marks": group.get("phase3_marks") or 0,
        "project_files": group.get("project_files") or [],
        "allow_member_leave": bool(group.get("allow_member_leave", False)),
        "chief_mentor_name": group.get("chief_mentor_name") or "DR SUBRAMANYA KN",
        "chief_mentor_designation": group.get("chief_mentor_designation") or "PRINCIPAL",
        "chief_mentor_department": group.get("chief_mentor_department") or "",
        "evaluators": group.get("evaluators") or ["", "", "", ""],
        "phase1_detail_marks": group.get("phase1_detail_marks") or {"problem_definition": 0, "objectives": 0, "methodology": 0},
        "phase2_detail_marks": group.get("phase2_detail_marks") or {"project_execution": 0, "tools_techniques": 0, "partial_results": 0},
        "phase3_detail_marks": group.get("phase3_detail_marks") or {"prototype_demonstration": 0, "results_discussions": 0, "report_poster_ppt": 0, "outcome_work": 0},
        "phase1_observations": group.get("phase1_observations") or "",
        "phase2_observations": group.get("phase2_observations") or "",
        "phase3_observations": group.get("phase3_observations") or "",
        "student_evaluations": student_evaluations_dict,
        "invite_code": invite_code,
        "invite_enabled": bool(group.get("invite_enabled", True))
    }

def populate_group_response(group: dict, db, current_user = None) -> dict:
    return build_group_response(group, db, current_user)

@router.post("/groups", response_model=GroupChatResponse)
def create_group_chat(group_data: GroupChatCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if current_user.get("is_admin") or (current_user.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
        raise HTTPException(status_code=400, detail="Administrators cannot create or join student project teams.")
    if current_user.get("is_mentor"):
        raise HTTPException(status_code=400, detail="Mentors cannot create or join student project teams as members.")

    members_to_add = list(set(group_data.member_ids + [current_user["id"]]))
    
    # Enforce team limit criteria: maximum 5 members (Only enforced when submitting for mentor approval)
    pass

        
    member_users = list(db.users.find({"id": {"$in": members_to_add}}))
    if len(member_users) != len(members_to_add):
        raise HTTPException(
            status_code=400,
            detail="One or more member IDs are invalid."
        )

    for u in member_users:
        if u.get("is_admin") or (u.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
            raise HTTPException(status_code=400, detail=f"User '{u.get('full_name')}' is an administrator and cannot be added to a student team.")
        if u.get("is_mentor"):
            raise HTTPException(status_code=400, detail=f"User '{u.get('full_name')}' is a mentor and cannot be added as a student team member.")

        
    # Enforce that a user can only be in one team at a time
    for uid in members_to_add:
        existing_membership = db.group_members.find_one({"user_id": uid})
        if existing_membership:
            member_user = db.users.find_one({"id": uid})
            name_str = "You are" if uid == current_user["id"] else f"Member '{member_user.get('full_name')}' is"
            raise HTTPException(
                status_code=400,
                detail=f"{name_str} already in another team. A person can join only 1 team at a time."
            )
        
    # 1. Create group
    new_group_id = get_next_sequence_value("group_chats")
    new_group = {
        "id": new_group_id,
        "name": group_data.name,
        "created_by": current_user["id"],
        "is_public": group_data.is_public,
        "project_topic": group_data.project_topic,
        "project_sub_topic": group_data.project_sub_topic,
        "project_theme": group_data.project_theme,
        "created_at": datetime.utcnow(),
        "mentor_status": "NOT_SUBMITTED",
        "phase1_marks": 0,
        "phase2_marks": 0,
        "phase3_marks": 0,
        "project_files": [],
        "allow_member_leave": False,
        "invite_code": uuid.uuid4().hex[:10],
        "invite_enabled": True
    }

    db.group_chats.insert_one(new_group)
    
    # 2. Add members
    for u in member_users:
        new_member_id = get_next_sequence_value("group_members")
        db.group_members.insert_one({
            "id": new_member_id,
            "group_id": new_group_id,
            "user_id": u["id"]
        })
    
    return build_group_response(new_group, db, current_user)

@router.get("/groups", response_model=List[GroupChatResponse])
def get_user_group_chats(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    member_records = list(db.group_members.find({"user_id": current_user["id"]}))
    group_ids = [m["group_id"] for m in member_records]
    groups = list(db.group_chats.find({"id": {"$in": group_ids}}))
    return [build_group_response(g, db, current_user) for g in groups]

@router.get("/groups/public", response_model=List[GroupChatResponse])
def get_public_group_chats(db = Depends(get_mongo_db)):
    # Find all public groups
    public_groups = list(db.group_chats.find({"is_public": True}))
    
    results = []
    for g in public_groups:
        resp = build_group_response(g, db, None)
        # Only show groups that have fewer than 5 members (open to accept people)
        if len(resp["member_ids"]) < 5:
            results.append(resp)
    return results

@router.get("/groups/mentor/teams", response_model=List[GroupChatResponse])
def get_mentor_teams(current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can access this endpoint")
    groups = list(db.group_chats.find({"mentor_email": {"$regex": f"^{current_user['email']}$", "$options": "i"}}))
    return [populate_group_response(g, db, current_user) for g in groups]

@router.get("/groups/{group_id}", response_model=GroupChatResponse)
def get_group_details(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    is_mentor_or_admin = (
        current_user.get("is_admin") or
        (
            current_user.get("is_mentor") and
            (group.get("mentor_email") or "").lower().strip() == (current_user.get("email") or "").lower().strip() and
            group.get("mentor_status") in ["APPROVED", "COMPLETED", "PENDING"]
        )
    )
    if not is_member and not is_mentor_or_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")
        
    return build_group_response(group, db, current_user)

@router.put("/groups/{group_id}", response_model=GroupChatResponse)
def update_group_chat(group_id: int, group_data: GroupChatUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    # Find group
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Ensure current user is the leader/creator
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can modify group properties")
        
    update_fields = {}
    
    # Update group name if provided
    if group_data.name is not None:
        update_fields["name"] = group_data.name
        
    # Update public/private visibility if provided
    if group_data.is_public is not None:
        update_fields["is_public"] = group_data.is_public
        
    # Update project topic if provided
    if group_data.project_topic is not None:
        update_fields["project_topic"] = group_data.project_topic
    if group_data.project_sub_topic is not None:
        update_fields["project_sub_topic"] = group_data.project_sub_topic
    if group_data.project_theme is not None:
        update_fields["project_theme"] = group_data.project_theme
        
    # Update members if provided
    if group_data.member_ids is not None:
        # Creator is always a member
        new_members = list(set(group_data.member_ids + [current_user["id"]]))
        
        # Enforce max 5 members limit (Only enforced when submitting for mentor approval)
        pass

            
        member_users = list(db.users.find({"id": {"$in": new_members}}))
        if len(member_users) != len(new_members):
            raise HTTPException(
                status_code=400,
                detail="One or more member IDs are invalid."
            )

        for u in member_users:
            if u.get("is_admin") or (u.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
                raise HTTPException(status_code=400, detail=f"User '{u.get('full_name')}' is an administrator and cannot be added to a student team.")
            if u.get("is_mentor"):
                raise HTTPException(status_code=400, detail=f"User '{u.get('full_name')}' is a mentor and cannot be added as a student team member.")

            
        # Enforce that a user can only be in one team at a time
        for uid in new_members:
            existing_membership = db.group_members.find_one({
                "user_id": uid,
                "group_id": {"$ne": group_id}
            })
            if existing_membership:
                member_user = db.users.find_one({"id": uid})
                name_str = "You are" if uid == current_user["id"] else f"Member '{member_user.get('full_name')}' is"
                raise HTTPException(
                    status_code=400,
                    detail=f"{name_str} already in another team. A person can join only 1 team at a time."
                )
            
        # Find mentor users in the DB to check if they are currently members of this group
        mentor_users = list(db.users.find({"is_mentor": True}))
        mentor_ids = [m["id"] for m in mentor_users]
        existing_mentor_memberships = list(db.group_members.find({
            "group_id": group_id,
            "user_id": {"$in": mentor_ids}
        }))
        
        # Delete old members
        db.group_members.delete_many({"group_id": group_id})
        
        # Add new members
        for u in member_users:
            new_member_id = get_next_sequence_value("group_members")
            db.group_members.insert_one({
                "id": new_member_id,
                "group_id": group_id,
                "user_id": u["id"]
            })
            
        # Re-add mentor memberships
        for mm in existing_mentor_memberships:
            new_member_id = get_next_sequence_value("group_members")
            db.group_members.insert_one({
                "id": new_member_id,
                "group_id": group_id,
                "user_id": mm["user_id"]
            })
                
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
        group.update(update_fields)
        
    updated_group = db.group_chats.find_one({"id": group_id})
    return build_group_response(updated_group, db, current_user)

@router.get("/groups/{group_id}/messages", response_model=List[GroupMessageResponse])
def get_group_messages(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is member or approved mentor
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    is_approved_mentor = (
        current_user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (current_user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    if not is_member and not is_approved_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to access this group chat")
        
    messages = list(db.group_messages.find({"group_id": group_id}).sort("created_at", 1))
    
    # Pre-fetch senders to optimize
    sender_ids = list(set([m["sender_id"] for m in messages]))
    senders = {u["id"]: u["full_name"] for u in db.users.find({"id": {"$in": sender_ids}})}
    
    results = []
    for m in messages:
        results.append({
            "id": m["id"],
            "group_id": m["group_id"],
            "sender_id": m["sender_id"],
            "content": m["content"],
            "reactions": m.get("reactions"),
            "created_at": m["created_at"],
            "sender_name": senders.get(m["sender_id"], "Unknown")
        })
    return results

# ─── Public Invite Code Routes ──────────────────────────────────────────────
# IMPORTANT: These MUST be declared BEFORE the @router.get("/groups/{group_id}/...")
# routes below, otherwise FastAPI will match /groups/invite/... as group_id="invite"
# and never reach these endpoints.

def _resolve_group_by_invite_code(code: str, db):
    """
    Resolves a group chat by invite code, supporting:
    1. Exact invite_code match (e.g. '7f486e9c3c')
    2. Fallback prefix 'nexus-{group_id}' or 'nexus-{group_id}-{rand}'
    3. Direct integer group ID (e.g. '2')
    """
    clean = (code or "").strip()
    if not clean:
        return None
    # 1. Exact invite_code match
    group = db.group_chats.find_one({"invite_code": clean})
    if group:
        return group
    # 2. Match nexus-<id> or nexus-<id>-<rand>
    if clean.startswith("nexus-"):
        parts = clean.split("-")
        if len(parts) >= 2 and parts[1].isdigit():
            group = db.group_chats.find_one({"id": int(parts[1])})
            if group:
                if not group.get("invite_code"):
                    db.group_chats.update_one({"id": group["id"]}, {"$set": {"invite_code": clean, "invite_enabled": True}})
                    group["invite_code"] = clean
                return group
    # 3. Direct numeric ID match
    if clean.isdigit():
        group = db.group_chats.find_one({"id": int(clean)})
        if group:
            if not group.get("invite_code"):
                new_c = uuid.uuid4().hex[:10]
                db.group_chats.update_one({"id": group["id"]}, {"$set": {"invite_code": new_c, "invite_enabled": True}})
                group["invite_code"] = new_c
            return group
    return None

@router.get("/groups/invite/{invite_code}", response_model=TeamInviteInfoResponse)
def get_invite_preview(invite_code: str, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = _resolve_group_by_invite_code(invite_code, db)
    if not group:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link.")
        
    if not group.get("invite_enabled", True):
        raise HTTPException(status_code=400, detail="Invites via link are currently disabled by the team leader.")


    # Get members
    member_records = list(db.group_members.find({"group_id": group["id"]}))
    member_ids = [m["user_id"] for m in member_records]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    for u in member_users:
        u.pop("_id", None)
        b_code, j_yr, y_study = _extract_user_academic_info(u)
        u["branch_code"] = b_code
        u["joining_year"] = j_yr
        u["year_of_study"] = y_study
        u["cluster"] = BRANCH_CLUSTERS.get(b_code)

    member_count = len([m for m in member_users if not m.get("is_mentor")])
    is_full = member_count >= 5
    is_locked = (group.get("mentor_status") or "").upper() == "APPROVED"

    creator = db.users.find_one({"id": group["created_by"]})
    created_by_name = creator.get("full_name") if creator else "Team Leader"

    already_member = current_user["id"] in member_ids
    in_other_team = False
    other_team_name = None

    can_join = True
    reason = None

    if current_user.get("is_admin") or (current_user.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
        can_join = False
        reason = "Administrators cannot join student project teams."
    elif current_user.get("is_mentor"):
        can_join = False
        reason = "Mentors cannot join student project teams as members."
    elif already_member:
        can_join = False
        reason = "You are already a member of this team."

    else:
        existing_membership = db.group_members.find_one({"user_id": current_user["id"]})
        if existing_membership and existing_membership["group_id"] != group["id"]:
            in_other_team = True
            other_group = db.group_chats.find_one({"id": existing_membership["group_id"]})
            other_team_name = other_group.get("name") if other_group else "Another Team"
            can_join = False
            reason = f"You are already in team '{other_team_name}'. You must leave that team first before joining another."
        elif is_full:
            can_join = False
            reason = "This team has already reached its maximum capacity of 5 members."
        elif is_locked:
            can_join = False
            reason = "This team has already been approved by a mentor and its roster is finalized."
        else:
            u_b_code, u_j_yr, u_y_study = _extract_user_academic_info(current_user)
            student_members = [m for m in member_users if not m.get("is_mentor")]
            if student_members:
                team_years = {m.get("year_of_study") for m in student_members if m.get("year_of_study")}
                if team_years and u_y_study not in team_years:
                    team_year_val = next(iter(team_years))
                    can_join = False
                    reason = f"Academic Year Mismatch: Team members are in Year {team_year_val}, while your profile is Year {u_y_study}."

    return {
        "group_id": group["id"],
        "name": group["name"],
        "created_by": group["created_by"],
        "created_by_name": created_by_name,
        "project_topic": group.get("project_topic"),
        "project_sub_topic": group.get("project_sub_topic"),
        "project_theme": group.get("project_theme"),
        "members": member_users,
        "member_count": member_count,
        "max_members": 5,
        "is_full": is_full,
        "is_locked": is_locked,
        "can_join": can_join,
        "reason": reason,
        "already_member": already_member,
        "in_other_team": in_other_team,
        "other_team_name": other_team_name
    }

@router.post("/groups/invite/{invite_code}/join", response_model=JoinTeamResponse)
def join_group_via_invite(invite_code: str, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = _resolve_group_by_invite_code(invite_code, db)
    if not group:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link.")
        
    if not group.get("invite_enabled", True):
        raise HTTPException(status_code=400, detail="Invites via link are currently disabled by the team leader.")

    if current_user.get("is_admin") or (current_user.get("email") or "").lower() == "ishaen.vihaan@gmail.com":
        raise HTTPException(status_code=400, detail="Administrators cannot join student project teams.")
    if current_user.get("is_mentor"):
        raise HTTPException(status_code=400, detail="Mentors cannot join student project teams as members.")

    # Check mentor approved

    if (group.get("mentor_status") or "").upper() == "APPROVED":
        raise HTTPException(status_code=400, detail="This team is already approved by a mentor and its roster is finalized.")

    # Check already member
    existing = db.group_members.find_one({"group_id": group["id"], "user_id": current_user["id"]})
    if existing:
        return {
            "success": True,
            "group_id": group["id"],
            "message": "You are already a member of this team."
        }

    # Check already in another team
    in_another = db.group_members.find_one({"user_id": current_user["id"]})
    if in_another:
        other_g = db.group_chats.find_one({"id": in_another["group_id"]})
        other_name = other_g.get("name") if other_g else "Another Team"
        raise HTTPException(
            status_code=400,
            detail=f"You are already in team '{other_name}'. Each student can join only 1 team at a time."
        )

    # Check capacity
    current_members = list(db.group_members.find({"group_id": group["id"]}))
    if len(current_members) >= 5:
        raise HTTPException(status_code=400, detail="This team has already reached its maximum capacity of 5 members.")

    # Check academic year compatibility
    member_ids = [m["user_id"] for m in current_members]
    member_users = list(db.users.find({"id": {"$in": member_ids}}))
    u_b_code, u_j_yr, u_y_study = _extract_user_academic_info(current_user)
    student_members = [m for m in member_users if not m.get("is_mentor")]
    if student_members:
        team_years = {m.get("year_of_study") for m in student_members if m.get("year_of_study")}
        if team_years and u_y_study not in team_years:
            team_year_val = next(iter(team_years))
            raise HTTPException(
                status_code=400,
                detail=f"Academic year mismatch: Team members are in Year {team_year_val}, while you are in Year {u_y_study}."
            )

    # Add user to group_members
    new_member_id = get_next_sequence_value("group_members")
    db.group_members.insert_one({
        "id": new_member_id,
        "group_id": group["id"],
        "user_id": current_user["id"]
    })

    # Recalculate team criteria status
    all_member_ids = member_ids + [current_user["id"]]
    all_member_users = list(db.users.find({"id": {"$in": all_member_ids}}))
    for mu in all_member_users:
        mu_b, mu_j, mu_y = _extract_user_academic_info(mu)
        mu["branch_code"] = mu_b
        mu["joining_year"] = mu_j
        mu["year_of_study"] = mu_y
        mu["cluster"] = BRANCH_CLUSTERS.get(mu_b)

    crit_met, val_err = validate_team_criteria(all_member_users)
    db.group_chats.update_one({"id": group["id"]}, {
        "$set": {
            "criteria_met": crit_met,
            "validation_error": val_err if not crit_met else None
        }
    })

    # Add system notification message to group chat
    user_name = current_user.get("full_name") or "A student"
    new_msg_id = get_next_sequence_value("group_messages")
    db.group_messages.insert_one({
        "id": new_msg_id,
        "group_id": group["id"],
        "sender_id": current_user["id"],
        "content": f"🎉 {user_name} joined the team via invite link.",
        "created_at": datetime.utcnow()
    })

    return {
        "success": True,
        "group_id": group["id"],
        "message": f"Successfully joined {group['name']}!"
    }

# ─── Group ID Parameterized Routes ──────────────────────────────────────────

@router.get("/groups/{group_id}/invite")
def get_group_invite(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):

    membership = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not membership and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only team members can view the invite link.")
        
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    code = group.get("invite_code")
    if not code:
        code = uuid.uuid4().hex[:10]
        db.group_chats.update_one({"id": group_id}, {"$set": {"invite_code": code, "invite_enabled": True}})
        
    return {
        "group_id": group_id,
        "invite_code": code,
        "invite_enabled": bool(group.get("invite_enabled", True))
    }

@router.post("/groups/{group_id}/invite/regenerate")
def regenerate_group_invite(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    if group["created_by"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only the team leader or an admin can regenerate the invite code.")
        
    new_code = uuid.uuid4().hex[:10]
    db.group_chats.update_one({"id": group_id}, {"$set": {"invite_code": new_code, "invite_enabled": True}})
    return {
        "group_id": group_id,
        "invite_code": new_code,
        "invite_enabled": True,
        "message": "Invite link regenerated successfully. Previous links have been revoked."
    }

@router.post("/groups/{group_id}/invite/toggle")
def toggle_group_invite(group_id: int, enabled: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Team not found.")
        
    if group["created_by"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only the team leader or an admin can toggle invite link settings.")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"invite_enabled": enabled}})
    return {
        "group_id": group_id,
        "invite_enabled": enabled,
        "message": f"Invite link {'enabled' if enabled else 'disabled'} successfully."
    }


@router.post("/groups/{group_id}/leave")

async def leave_group_chat(group_id: int, leave_data: GroupLeaveRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Team admin cannot leave the team. Use disband instead.")
        
    # Block leaving after mentor approval
    if group.get("mentor_status") == "APPROVED":
        raise HTTPException(status_code=400, detail="Leaving the team is locked after mentor approval.")
        
    membership = db.group_members.find_one({
        "group_id": group_id, 
        "user_id": current_user["id"]
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
        
    # Delete membership
    db.group_members.delete_one({"id": membership["id"]})
    
    # Post system notification to chat
    reason_str = f" Reason: {leave_data.reason}" if leave_data.reason else ""
    content = f"⚠️ {current_user['full_name']} has left the team.{reason_str}"
    
    # We save the notification message to the database under the current_user's sender_id
    new_msg_id = get_next_sequence_value("group_messages")
    new_msg = {
        "id": new_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": content,
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(new_msg)
    
    # Broadcast to websocket connections
    await manager.broadcast_to_group({
        "type": "message",
        "id": new_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "content": content,
        "created_at": new_msg["created_at"].isoformat()
    }, group_id)
    
    return {"message": "Left team successfully"}

@router.delete("/groups/{group_id}/disband")
async def disband_group_chat(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can disband the team")
        
    # Post a final disband warning to websocket if any client is connected
    await manager.broadcast_to_group({
        "type": "system_warning",
        "message": "This group chat has been disbanded by the team admin."
    }, group_id)
    
    # Delete all messages, members, and the group itself
    db.group_messages.delete_many({"group_id": group_id})
    db.group_members.delete_many({"group_id": group_id})
    db.group_chats.delete_one({"id": group_id})
    
    # Regenerate sheets after deletion
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    return {"message": "Team disbanded successfully"}

@router.put("/groups/{group_id}/toggle-leave", response_model=GroupChatResponse)
def toggle_group_leave(group_id: int, allow: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can change this setting")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"allow_member_leave": allow}})
    group["allow_member_leave"] = allow
    return populate_group_response(group, db, current_user)

@router.put("/groups/{group_id}/toggle-privacy", response_model=GroupChatResponse)
def toggle_group_privacy(group_id: int, is_public: bool = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can change this setting")
        
    if group.get("mentor_status") == "APPROVED" and is_public:
        raise HTTPException(status_code=400, detail="Cannot make an approved team public")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"is_public": is_public}})
    group["is_public"] = is_public
    return populate_group_response(group, db, current_user)

@router.put("/groups/{group_id}/transfer-admin", response_model=GroupChatResponse)
def transfer_group_admin(group_id: int, new_admin_id: int = Query(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team admin can transfer ownership")
        
    # Verify new admin is a member of the group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": new_admin_id})
    if not is_member:
        raise HTTPException(status_code=400, detail="New admin must be a member of this team")
        
    db.group_chats.update_one({"id": group_id}, {"$set": {"created_by": new_admin_id}})
    group["created_by"] = new_admin_id
    return populate_group_response(group, db, current_user)


# --- Project Dashboard and Mentor Approval Endpoints ---

from fastapi import File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse
import os
import shutil
import uuid

# Helper to sync approved team to CSV/Excel folder
def regenerate_approved_teams_csv(db, year=None):
    import csv
    import os
    from datetime import datetime
    
    file_dir = "teachers_excel"
    file_name = f"approved_teams_year{year}.csv" if year else "approved_teams.csv"
    file_path = os.path.join(file_dir, file_name)
    os.makedirs(file_dir, exist_ok=True)
    
    headers = [
        "Team ID", "Team Name", "Project Topic", "Mentor Name", "Mentor Email", "Approved At",
        "Member 1 Name", "Member 1 Email", "Member 1 USN", "Member 1 Branch",
        "Member 2 Name", "Member 2 Email", "Member 2 USN", "Member 2 Branch",
        "Member 3 Name", "Member 3 Email", "Member 3 USN", "Member 3 Branch",
        "Member 4 Name", "Member 4 Email", "Member 4 USN", "Member 4 Branch",
        "Member 5 Name", "Member 5 Email", "Member 5 USN", "Member 5 Branch"
    ]
    
    approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
    if year is not None:
        from routers.admin import _group_belongs_to_year
        approved_groups = [g for g in approved_groups if _group_belongs_to_year(g, year, db)]
    rows = []

    
    for group in approved_groups:
        # Get all members
        member_records = list(db.group_members.find({"group_id": group["id"]}))
        member_ids = [m["user_id"] for m in member_records]
        
        # Exclude the mentor from member columns if they are in group_members
        mentor_email = group.get("mentor_email")
        if mentor_email:
            mentor_user = db.users.find_one({"email": {"$regex": f"^{mentor_email}$", "$options": "i"}})
            mentor_id = mentor_user["id"] if mentor_user else None
        else:
            mentor_id = None
        
        student_ids = [uid for uid in member_ids if uid != mentor_id]
        students = list(db.users.find({"id": {"$in": student_ids}})) if student_ids else []
        
        # Build member columns
        member_cols = []
        for i in range(5):
            if i < len(students):
                m = students[i]
                member_cols.extend([
                    m.get("full_name") or "",
                    m.get("email") or "",
                    m.get("usn") or "N/A",
                    m.get("branch_code") or "N/A"
                ])
            else:
                member_cols.extend(["", "", "", ""])

                
        approved_at_str = group.get("approved_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        row_data = [
            str(group["id"]), group["name"], group.get("project_topic") or "",
            group.get("mentor_name") or "", group.get("mentor_email") or "", approved_at_str
        ] + member_cols
        rows.append(row_data)
        
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

def regenerate_mentor_marks_csv(db, year=None):
    import csv
    import os
    
    file_dir = "teachers_excel"
    file_path = os.path.join(file_dir, f"student_phase_marks_year{year}.csv" if year else "student_phase_marks.csv")
    os.makedirs(file_dir, exist_ok=True)
    
    headers = [
        "Academic Year", "USN", "Student Name", "Student Email", "Branch", "Section", "Year of Study",
        "Team ID", "Team Name", "Mentor Name",
        "Phase 1 Marks", "Phase 1 Observations",
        "Phase 2 Marks", "Phase 2 Observations",
        "Phase 3 Marks", "Phase 3 Observations",
        "Total Marks"
    ]
    
    students = list(db.users.find({
        "is_mentor": {"$ne": True}, 
        "is_admin": {"$ne": True},
        "email": {"$ne": "ishaen.vihaan@gmail.com"}
    }))
    if year is not None:
        students = [s for s in students if _extract_user_academic_info(s)[2] == year]
    
    rows = []

    year_labels = {
        1: "1st Year (2026 Batch)",
        2: "2nd Year (2025 Batch)",
        3: "3rd Year (2024 Batch)",
        4: "4th Year (2023 Batch)"
    }

    for s in students:
        student_id = s.get("id")
        usn = s.get("usn") or "N/A"
        name = s.get("full_name") or "N/A"
        email = s.get("email") or "N/A"
        branch = s.get("branch") or "N/A"
        section = s.get("section") or "N/A"
        _, _, stu_y = _extract_user_academic_info(s)
        stu_year_label = year_labels.get(stu_y, f"Year {stu_y}")
        stu_y_num = s.get("year_of_study") or stu_y or "N/A"
        
        group_id = "N/A"
        group_name = "N/A"
        mentor_name = "N/A"
        group_doc = None
        
        membership = db.group_members.find_one({"user_id": student_id})
        if membership:
            group_doc = db.group_chats.find_one({"id": membership["group_id"]})
            if group_doc:
                group_id = str(group_doc.get("id"))
                group_name = group_doc.get("name") or "N/A"
                mentor_name = group_doc.get("mentor_name") or "N/A"
                    
        p1_marks = 0
        p1_obs = ""
        p2_marks = 0
        p2_obs = ""
        p3_marks = 0
        p3_obs = ""
        
        if group_doc:
            eval_doc = db.evaluations.find_one({"group_id": group_doc.get("id"), "student_id": student_id})
            if eval_doc:
                p1_det = eval_doc.get("phase1_detail_marks") or {}
                p1_marks = sum(int(float(v or 0)) for v in p1_det.values())
                p1_obs = eval_doc.get("phase1_observations") or ""
                
                p2_det = eval_doc.get("phase2_detail_marks") or {}
                p2_marks = sum(int(float(v or 0)) for v in p2_det.values())
                p2_obs = eval_doc.get("phase2_observations") or ""
                
                p3_det = eval_doc.get("phase3_detail_marks") or {}
                p3_marks = sum(int(float(v or 0)) for v in p3_det.values())
                p3_obs = eval_doc.get("phase3_observations") or ""
                
        total_marks = p1_marks + p2_marks + p3_marks
        
        row = [
            stu_year_label, usn, name, email, branch, section, stu_y_num,
            group_id, group_name, mentor_name,
            p1_marks, p1_obs,
            p2_marks, p2_obs,
            p3_marks, p3_obs,
            total_marks
        ]
        rows.append(row)
        
    with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

def sync_approved_team_to_csv(group: dict, db):
    regenerate_approved_teams_csv(db)

# Update Project Details (Topic, Mentor Name, Mentor Email)
@router.put("/groups/{group_id}/project-details", response_model=GroupChatResponse)
def update_project_details(group_id: int, details: GroupChatUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    update_fields = {}
    
    # Update fields
    primary_change = False
    
    if details.project_topic is not None:
        update_fields["project_topic"] = details.project_topic
        if details.project_topic != group.get("project_topic"):
            primary_change = True
            
    if details.project_sub_topic is not None:
        update_fields["project_sub_topic"] = details.project_sub_topic
        if details.project_sub_topic != group.get("project_sub_topic"):
            primary_change = True
            
            
    if details.project_theme is not None:
        # For 2nd year teams: validate theme is from the allowed cluster themes list
        member_records = list(db.group_members.find({"group_id": group_id}))
        member_ids = [m["user_id"] for m in member_records]
        members_raw = list(db.users.find({"id": {"$in": member_ids}})) if member_ids else []
        students_raw = [m for m in members_raw if not m.get("is_mentor")]

        if students_raw:
            joining_years = [int(m["joining_year"]) for m in students_raw if m.get("joining_year")]
            if joining_years:
                year = _get_year_of_study(min(joining_years))
                if year >= 2:
                    branch_codes = [(m.get("branch_code") or "").strip().upper() for m in students_raw]
                    clusters = {BRANCH_CLUSTERS.get(bc) for bc in branch_codes if bc}
                    clusters.discard(None)
                    if len(clusters) == 1:
                        cluster = next(iter(clusters))
                        from services.academic_service import get_academic_settings, DEFAULT_CLUSTER_THEMES
                        settings = get_academic_settings(db)
                        cl_themes = settings.get("cluster_themes", DEFAULT_CLUSTER_THEMES)
                        allowed = cl_themes.get(cluster, [])
                        if allowed and details.project_theme not in allowed:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Invalid theme for {cluster} cluster. Choose from: {', '.join(allowed)}"
                            )

        update_fields["project_theme"] = details.project_theme
        if details.project_theme != group.get("project_theme"):
            primary_change = True

            
    if details.mentor_name is not None:
        clean_m_name = details.mentor_name.strip()
        update_fields["mentor_name"] = clean_m_name if clean_m_name else None
        if clean_m_name != (group.get("mentor_name") or ""):
            primary_change = True
            
    if details.mentor_email is not None:
        email_lower = details.mentor_email.lower().strip()
        if email_lower:
            if not email_lower.endswith("@gmail.com"):
                raise HTTPException(status_code=400, detail="Mentor email must end with @gmail.com")
            
            # Verify mentor email exists in registered mentors
            mentor_user = db.users.find_one({
                "email": {"$regex": f"^{email_lower}$", "$options": "i"},
                "is_mentor": True
            })
            if not mentor_user:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid mentor email '{email_lower}'. No registered mentor found with this email. Please select a valid mentor from the dropdown."
                )
            
            # Only check the 25-team limit if assigning a NEW mentor
            if group.get("mentor_email") != email_lower:
                primary_change = True
                active_count = db.group_chats.count_documents({
                    "mentor_email": email_lower,
                    "mentor_status": {"$in": ["PENDING", "APPROVED"]}
                })
                if active_count >= 25:
                    raise HTTPException(
                        status_code=400,
                        detail="This mentor has already reached the maximum limit of 25 teams."
                    )
            update_fields["mentor_email"] = email_lower
        else:
            update_fields["mentor_email"] = None
            if group.get("mentor_email"):
                primary_change = True


    if details.chief_mentor_name is not None:
        update_fields["chief_mentor_name"] = details.chief_mentor_name
    if details.chief_mentor_designation is not None:
        update_fields["chief_mentor_designation"] = details.chief_mentor_designation
    if details.chief_mentor_department is not None:
        update_fields["chief_mentor_department"] = details.chief_mentor_department
    if details.evaluators is not None:
        update_fields["evaluators"] = details.evaluators
        
    if primary_change:
        # Reset status if topic/mentor changes
        update_fields["mentor_status"] = "NOT_SUBMITTED"
        update_fields["mentor_token"] = None
        
        # Remove any mentor user from this group's members since status is reset to NOT_SUBMITTED
        mentor_users = list(db.users.find({"is_mentor": True}))
        mentor_ids = [m["id"] for m in mentor_users]
        db.group_members.delete_many({"group_id": group_id, "user_id": {"$in": mentor_ids}})
    
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
        regenerate_approved_teams_csv(db)
        regenerate_mentor_marks_csv(db)
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return build_group_response(updated_group, db, current_user)

# Request Mentor Approval
@router.post("/groups/{group_id}/submit-approval")
def submit_mentor_approval(group_id: int, background_tasks: BackgroundTasks, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    if not group.get("project_topic") or not group.get("mentor_name") or not group.get("mentor_email"):
        raise HTTPException(status_code=400, detail="Project topic, mentor name, and mentor email must be provided first.")
        
    mentor_email_val = (group.get("mentor_email") or "").lower().strip()
    mentor_user = db.users.find_one({
        "email": {"$regex": f"^{mentor_email_val}$", "$options": "i"},
        "is_mentor": True
    })
    if not mentor_user:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mentor email '{group.get('mentor_email')}'. Selected mentor is not registered in the system."
        )
        
    # Check 25-team limit for the mentor before submitting
    active_count = db.group_chats.count_documents({
        "mentor_email": group["mentor_email"],
        "mentor_status": {"$in": ["PENDING", "APPROVED"]},
        "id": {"$ne": group_id}
    })
    if active_count >= 25:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit. This mentor has already reached the maximum limit of 25 teams."
        )
        
    # Get members
    member_records = list(db.group_members.find({"group_id": group_id}))
    member_ids = [m["user_id"] for m in member_records]
    members = list(db.users.find({"id": {"$in": member_ids}})) if member_ids else []
    
    # Validate criteria before submitting
    students = [m for m in members if not m.get("is_mentor")]
    ok, err = validate_team_criteria(students)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Cannot submit. {err}")
        
    # Generate token
    token = str(uuid.uuid4())
    db.group_chats.update_one({"id": group_id}, {"$set": {"mentor_token": token, "mentor_status": "PENDING"}})
    
    # Send email
    from utils import send_email
    subject = f"Mentor Approval Request for Team: {group['name']}"
    
    members_list_str = "\n".join([
        f"- {m.get('full_name')} ({m.get('email')}, USN: {m.get('usn') or 'N/A'}, "
        f"Branch: {m.get('branch_code') or 'N/A'} – {BRANCH_FULL_NAMES.get((m.get('branch_code') or '').upper(), 'Unknown Branch')})"
        for m in members
    ])

    
    host = os.getenv("API_HOST", "http://localhost:8000")
    approve_url = f"{host}/api/chat/groups/{group_id}/mentor-approve?token={token}"
    reject_url = f"{host}/api/chat/groups/{group_id}/mentor-reject?token={token}"
    
    body = f"""Dear {group.get('mentor_name')},
    
A student group has requested your approval for their engineering project team.

Team Details:
- Team Name: {group['name']}
- Project Topic: {group.get('project_topic')}

Team Members:
{members_list_str}

Please review their request and click one of the links below to approve or reject:

Approve: {approve_url}

Reject: {reject_url}

Thank you,
EL Platform Team
"""
    
    background_tasks.add_task(send_email, group.get("mentor_email"), subject, body)
    
    return {"message": "Approval request sent to mentor successfully."}

# Mentor Approve (Public Endpoint)
@router.get("/groups/{group_id}/mentor-approve", response_class=HTMLResponse)
def mentor_approve_team(group_id: int, token: str, db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        return HTMLResponse("<h1>Error</h1><p>Group not found</p>", status_code=404)
        
    if not group.get("mentor_token") or group.get("mentor_token") != token:
        return HTMLResponse("<h1>Error</h1><p>Invalid or expired approval token.</p>", status_code=400)
        
    db.group_chats.update_one({"id": group_id}, {"$set": {
        "mentor_status": "APPROVED",
        "mentor_token": None,
        "is_public": False
    }})
    
    group["mentor_status"] = "APPROVED"
    group["mentor_token"] = None
    group["is_public"] = False
    
    # Add mentor to group members
    if group.get("mentor_email"):
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            is_already_member = db.group_members.find_one({"group_id": group_id, "user_id": mentor_user["id"]})
            if not is_already_member:
                new_member_id = get_next_sequence_value("group_members")
                db.group_members.insert_one({
                    "id": new_member_id,
                    "group_id": group_id,
                    "user_id": mentor_user["id"]
                })
    
    # Sync approved details to teacher's excel folder
    sync_approved_team_to_csv(group, db)
    
    html_content = f"""
    <html>
        <head>
            <title>Approval Confirmed</title>
            <style>
                body {{ font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f0fdf4; margin: 0; }}
                .card {{ background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; border: 1px solid #bbf7d0; }}
                h1 {{ color: #166534; margin-top: 0; }}
                p {{ color: #1e293b; font-size: 1.1rem; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✓ Approval Confirmed!</h1>
                <p>You have approved the team <strong>"{group['name']}"</strong> with project topic <strong>"{group.get('project_topic')}"</strong>.</p>
                <p>The approved team data has been successfully compiled and sent to the teachers' database.</p>
            </div>
        </body>
    </html>
    """
    return html_content

# Mentor Reject (Public Endpoint)
@router.get("/groups/{group_id}/mentor-reject", response_class=HTMLResponse)
def mentor_reject_team(group_id: int, token: str, db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        return HTMLResponse("<h1>Error</h1><p>Group not found</p>", status_code=404)
        
    if not group.get("mentor_token") or group.get("mentor_token") != token:
        return HTMLResponse("<h1>Error</h1><p>Invalid or expired approval token.</p>", status_code=400)
        
    db.group_chats.update_one({"id": group_id}, {"$set": {
        "mentor_status": "REJECTED",
        "mentor_token": None
    }})
    
    html_content = f"""
    <html>
        <head>
            <title>Rejection Confirmed</title>
            <style>
                body {{ font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #fef2f2; margin: 0; }}
                .card {{ background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; border: 1px solid #fee2e2; }}
                h1 {{ color: #991b1b; margin-top: 0; }}
                p {{ color: #1e293b; font-size: 1.1rem; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✗ Rejection Registered</h1>
                <p>You have rejected the team request for <strong>"{group['name']}"</strong>.</p>
                <p>The students have been notified of the decision and can modify their topic or details and submit again.</p>
            </div>
        </body>
    </html>
    """
    return html_content

# Project File Upload
@router.post("/groups/{group_id}/files")
def upload_project_file(group_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Verify user is a member of this group
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    # Create uploads directory if not exists
    os.makedirs("uploads", exist_ok=True)
    
    # Save file on disk
    file_id = str(uuid.uuid4())
    safe_filename = f"group_{group_id}_{file_id}_{file.filename}"
    file_path = os.path.join("uploads", safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get metadata
    file_size = os.path.getsize(file_path)
    file_url = f"/api/uploads/{safe_filename}"
    uploaded_at_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    file_info = {
        "id": file_id,
        "name": file.filename,
        "url": file_url,
        "size": file_size,
        "uploaded_by": current_user["full_name"],
        "uploaded_at": uploaded_at_str
    }
    
    # Update DB
    current_files = list(group.get("project_files") or [])
    current_files.append(file_info)
    
    db.group_chats.update_one({"id": group_id}, {"$set": {"project_files": current_files}})
    
    # Post a message to group chat indicating file was uploaded
    notif_msg_id = get_next_sequence_value("group_messages")
    notif_msg = {
        "id": notif_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": f"📎 {current_user['full_name']} uploaded file: {file.filename}",
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(notif_msg)
    
    # Broadcast message to WebSocket via background tasks
    background_tasks.add_task(
        manager.broadcast_to_group,
        {
            "type": "message",
            "id": notif_msg_id,
            "group_id": group_id,
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": notif_msg["content"],
            "created_at": notif_msg["created_at"].isoformat()
        },
        group_id
    )
    
    return current_files

# Delete Project File
@router.delete("/groups/{group_id}/files/{file_id}")
def delete_project_file(group_id: int, file_id: str, background_tasks: BackgroundTasks, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": current_user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
        
    current_files = list(group.get("project_files") or [])
    file_to_delete = None
    
    for f in current_files:
        if f.get("id") == file_id:
            file_to_delete = f
            break
            
    if not file_to_delete:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Delete from list
    current_files.remove(file_to_delete)
    db.group_chats.update_one({"id": group_id}, {"$set": {"project_files": current_files}})
    
    # Try deleting from disk
    safe_filename = file_to_delete["url"].split("/uploads/")[-1]
    file_path = os.path.join("uploads", safe_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete file from disk: {e}")
            
    # Post a notification in the chat
    notif_msg_id = get_next_sequence_value("group_messages")
    notif_msg = {
        "id": notif_msg_id,
        "group_id": group_id,
        "sender_id": current_user["id"],
        "content": f"🗑️ {current_user['full_name']} deleted file: {file_to_delete['name']}",
        "created_at": datetime.utcnow()
    }
    db.group_messages.insert_one(notif_msg)
    
    # Broadcast message to WebSocket via background tasks
    background_tasks.add_task(
        manager.broadcast_to_group,
        {
            "type": "message",
            "id": notif_msg_id,
            "group_id": group_id,
            "sender_id": current_user["id"],
            "sender_name": current_user["full_name"],
            "content": notif_msg["content"],
            "created_at": notif_msg["created_at"].isoformat()
        },
        group_id
    )
    
    return current_files

@router.post("/groups/{group_id}/mentor-action", response_model=GroupChatResponse)
def mentor_action(group_id: int, payload: MentorActionRequest, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can approve or reject teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if (group.get("mentor_email") or "").lower().strip() != (current_user.get("email") or "").lower().strip():
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
    
    action = payload.action.upper()
    update_fields = {}
    if action == "APPROVE":
        # Check the 25-team limit before approving
        active_count = db.group_chats.count_documents({
            "mentor_email": group.get("mentor_email"),
            "mentor_status": "APPROVED",
            "id": {"$ne": group_id}
        })
        if active_count >= 25:
            raise HTTPException(status_code=400, detail="Cannot approve. You have already reached the maximum limit of 25 approved teams.")
            
        update_fields["mentor_status"] = "APPROVED"
        update_fields["mentor_token"] = None
        update_fields["mentor_rejection_reason"] = None
        update_fields["is_public"] = False
        
        # We need a copy of the group with updated values to sync to CSV
        group_copy = dict(group)
        group_copy.update(update_fields)
        sync_approved_team_to_csv(group_copy, db)
        
        # Add mentor to group members
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            is_already_member = db.group_members.find_one({"group_id": group_id, "user_id": mentor_user["id"]})
            if not is_already_member:
                new_member_id = get_next_sequence_value("group_members")
                db.group_members.insert_one({
                    "id": new_member_id,
                    "group_id": group_id,
                    "user_id": mentor_user["id"]
                })
    elif action in {"COMPLETE", "END_EVALUATION"}:
        update_fields["mentor_status"] = "COMPLETED"
        update_fields["evaluated_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        update_fields["is_completed"] = True
        update_fields["is_public"] = False
    elif action == "REJECT":
        update_fields["mentor_status"] = "REJECTED"
        update_fields["mentor_token"] = None
        update_fields["mentor_rejection_reason"] = payload.rejection_reason
        
        # Remove mentor from group members
        mentor_user = db.users.find_one({"email": {"$regex": f"^{group['mentor_email']}$", "$options": "i"}})
        if mentor_user:
            db.group_members.delete_many({"group_id": group_id, "user_id": mentor_user["id"]})
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use APPROVE, REJECT, or COMPLETE.")
        
    db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    
    # Regenerate spreadsheets to reflect approval/rejection state
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db, current_user)

@router.post("/groups/{group_id}/complete-evaluation", response_model=GroupChatResponse)
def complete_evaluation(group_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Dedicated endpoint to mark a team's evaluation as completed. 
    Sets mentor_status to COMPLETED and is_completed to True."""
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can complete evaluations")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if (group.get("mentor_email") or "").lower().strip() != (current_user.get("email") or "").lower().strip():
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
    
    update_fields = {
        "mentor_status": "COMPLETED",
        "evaluated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "is_completed": True,
        "is_public": False,
    }
    db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    
    # Regenerate spreadsheets to reflect completed evaluation
    regenerate_approved_teams_csv(db)
    regenerate_mentor_marks_csv(db)
    
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db, current_user)

@router.put("/groups/{group_id}/marks", response_model=GroupChatResponse)
def update_group_marks(group_id: int, marks: GroupMarksUpdate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if not current_user.get("is_mentor", False):
        raise HTTPException(status_code=403, detail="Only mentors can grade teams")
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if (group.get("mentor_email") or "").lower().strip() != (current_user.get("email") or "").lower().strip():
        raise HTTPException(status_code=403, detail="You are not the assigned mentor for this team")
        
    update_fields = {}
    if marks.phase1_detail_marks is not None:
        update_fields["phase1_detail_marks"] = marks.phase1_detail_marks
        update_fields["phase1_marks"] = sum(int(float(v or 0)) for v in marks.phase1_detail_marks.values())
    elif marks.phase1_marks is not None:
        update_fields["phase1_marks"] = marks.phase1_marks
        
    if marks.phase2_detail_marks is not None:
        update_fields["phase2_detail_marks"] = marks.phase2_detail_marks
        update_fields["phase2_marks"] = sum(int(float(v or 0)) for v in marks.phase2_detail_marks.values())
    elif marks.phase2_marks is not None:
        update_fields["phase2_marks"] = marks.phase2_marks
        
    if marks.phase3_detail_marks is not None:
        update_fields["phase3_detail_marks"] = marks.phase3_detail_marks
        update_fields["phase3_marks"] = sum(int(float(v or 0)) for v in marks.phase3_detail_marks.values())
    elif marks.phase3_marks is not None:
        update_fields["phase3_marks"] = marks.phase3_marks

    if marks.phase1_observations is not None:
        update_fields["phase1_observations"] = marks.phase1_observations
    if marks.phase2_observations is not None:
        update_fields["phase2_observations"] = marks.phase2_observations
    if marks.phase3_observations is not None:
        update_fields["phase3_observations"] = marks.phase3_observations

    if marks.chief_mentor_name is not None:
        update_fields["chief_mentor_name"] = marks.chief_mentor_name
    if marks.chief_mentor_designation is not None:
        update_fields["chief_mentor_designation"] = marks.chief_mentor_designation
    if marks.chief_mentor_department is not None:
        update_fields["chief_mentor_department"] = marks.chief_mentor_department

    if marks.evaluators is not None:
        update_fields["evaluators"] = marks.evaluators

    if marks.student_evaluations is not None:
        print(f"[Backend Save Logic] Save request started for group_id: {group_id} by evaluator_id: {current_user['id']}")
        # Save individual student evaluations to evaluations collection
        for student_id_str, eval_data in marks.student_evaluations.items():
            try:
                student_id = int(student_id_str)
            except (ValueError, TypeError):
                continue
                
            print(f"[Backend Save Logic] Checking existing evaluation for student_id: {student_id}")
            # Perform an INSERT only if no evaluation exists, otherwise UPDATE
            existing = db.evaluations.find_one({"group_id": group_id, "student_id": student_id})
            eval_doc = {
                "group_id": group_id,
                "student_id": student_id,
                "evaluator_id": current_user["id"],
                "phase1_detail_marks": eval_data.get("phase1_detail_marks") or {"problem_definition": 0, "objectives": 0, "methodology": 0},
                "phase1_observations": eval_data.get("phase1_observations") or "",
                "phase2_detail_marks": eval_data.get("phase2_detail_marks") or {"project_execution": 0, "tools_techniques": 0, "partial_results": 0},
                "phase2_observations": eval_data.get("phase2_observations") or "",
                "phase3_detail_marks": eval_data.get("phase3_detail_marks") or {"prototype_demonstration": 0, "results_discussions": 0, "report_poster_ppt": 0, "outcome_work": 0},
                "phase3_observations": eval_data.get("phase3_observations") or ""
            }
            if existing:
                print(f"[Backend Save Logic] [UPDATE] performed for student_id: {student_id}")
                up_res = db.evaluations.update_one(
                    {"group_id": group_id, "student_id": student_id},
                    {"$set": {
                        "evaluator_id": current_user["id"],
                        "phase1_detail_marks": eval_doc["phase1_detail_marks"],
                        "phase1_observations": eval_doc["phase1_observations"],
                        "phase2_detail_marks": eval_doc["phase2_detail_marks"],
                        "phase2_observations": eval_doc["phase2_observations"],
                        "phase3_detail_marks": eval_doc["phase3_detail_marks"],
                        "phase3_observations": eval_doc["phase3_observations"]
                    }}
                )
                print(f"[Backend Save Logic] [UPDATE RESULT] matched={up_res.matched_count}, modified={up_res.modified_count}")
            else:
                print(f"[Backend Save Logic] [INSERT] performed for student_id: {student_id}")
                eval_doc["id"] = get_next_sequence_value("evaluations")
                ins_res = db.evaluations.insert_one(eval_doc)
                print(f"[Backend Save Logic] [INSERT RESULT] acknowledged={ins_res.acknowledged}, inserted_id={ins_res.inserted_id}")
                
            # Verify immediately by querying MongoDB
            confirm_doc = db.evaluations.find_one({"group_id": group_id, "student_id": student_id})
            print(f"[Backend Save Logic] [DATABASE CONFIRMATION QUERY] Retrieved doc for student {student_id}: {confirm_doc}")
            
        print(f"[Backend Save Logic] All evaluations saved successfully for group_id: {group_id}")

        # Calculate overall phase marks by taking the average of all students' total marks
        try:
            p1_sums = []
            p2_sums = []
            p3_sums = []
            for stud_id, eval_data in marks.student_evaluations.items():
                if not eval_data or not isinstance(eval_data, dict):
                    continue
                p1_det = eval_data.get("phase1_detail_marks") or {}
                if isinstance(p1_det, dict):
                    p1_sums.append(sum(int(float(v or 0)) for v in p1_det.values() if v is not None))
                
                p2_det = eval_data.get("phase2_detail_marks") or {}
                if isinstance(p2_det, dict):
                    p2_sums.append(sum(int(float(v or 0)) for v in p2_det.values() if v is not None))
                
                p3_det = eval_data.get("phase3_detail_marks") or {}
                if isinstance(p3_det, dict):
                    p3_sums.append(sum(int(float(v or 0)) for v in p3_det.values() if v is not None))
                
            if p1_sums:
                update_fields["phase1_marks"] = int(sum(p1_sums) / len(p1_sums))
            if p2_sums:
                update_fields["phase2_marks"] = int(sum(p2_sums) / len(p2_sums))
            if p3_sums:
                update_fields["phase3_marks"] = int(sum(p3_sums) / len(p3_sums))
        except Exception as calc_err:
            import logging
            logging.warning(f"Phase mark calculation failed for group {group_id}: {calc_err}")
        
    if update_fields:
        db.group_chats.update_one({"id": group_id}, {"$set": update_fields})
    
    # Regenerate marks sheet after saving
    regenerate_mentor_marks_csv(db)
        
    updated_group = db.group_chats.find_one({"id": group_id})
    return populate_group_response(updated_group, db, current_user)

@router.websocket("/ws/group/{group_id}")
async def websocket_group_chat(websocket: WebSocket, group_id: int, token: str = Query(...), db = Depends(get_mongo_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return
        
    group = db.group_chats.find_one({"id": group_id})
    if not group:
        await websocket.close(code=1008)
        return

    # Verify user is member or approved mentor
    is_member = db.group_members.find_one({"group_id": group_id, "user_id": user["id"]})
    is_approved_mentor = (
        user.get("is_mentor") and
        (group.get("mentor_email") or "").lower().strip() == (user.get("email") or "").lower().strip() and
        group.get("mentor_status") == "APPROVED"
    )
    if not is_member and not is_approved_mentor:
        await websocket.close(code=1008)
        return

    await manager.connect_group(websocket, group_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")
                
                if msg_type in ["typing", "stop_typing"]:
                    await manager.broadcast_to_group({
                        "type": msg_type,
                        "sender_id": user["id"],
                        "sender_name": user["full_name"]
                    }, group_id)
                    continue
                    
                if msg_type == "react":
                    msg_id = data.get("message_id")
                    reaction = data.get("reaction")
                    if msg_id and reaction:
                        msg_to_update = db.group_messages.find_one({"id": msg_id})
                        if msg_to_update:
                            current_reactions = dict(msg_to_update.get("reactions") or {})
                            current_reactions[str(user["id"])] = reaction
                            db.group_messages.update_one({"id": msg_id}, {"$set": {"reactions": current_reactions}})
                            await manager.broadcast_to_group({
                                "type": "reaction_update",
                                "message_id": msg_id,
                                "reactions": current_reactions
                            }, group_id)
                    continue
                    
                content = data.get("content", "")
            except json.JSONDecodeError:
                content = raw_data
                
            if not content:
                continue

            # Run AI Moderation
            analysis = analyze_message_content(content)
            
            if analysis["status"] == "severe":
                db.users.update_one({"id": user["id"]}, {"$set": {"is_banned": True}})
                await websocket.send_json({
                    "type": "system_warning",
                    "message": "Your account has been suspended for severe policy violations."
                })
                await websocket.close(code=1008)
                break
                
            if analysis["status"] == "warning":
                await websocket.send_json({
                    "type": "system_warning",
                    "message": analysis["message"]
                })
                continue # Don't send

            # Save message to DB
            new_msg_id = get_next_sequence_value("group_messages")
            new_msg = {
                "id": new_msg_id,
                "group_id": group_id,
                "sender_id": user["id"],
                "content": content,
                "created_at": datetime.utcnow()
            }
            db.group_messages.insert_one(new_msg)
            
            # Broadcast
            await manager.broadcast_to_group({
                "type": "message",
                "id": new_msg_id,
                "group_id": group_id,
                "sender_id": user["id"],
                "sender_name": user["full_name"],
                "content": content,
                "created_at": new_msg["created_at"].isoformat()
            }, group_id)
    except WebSocketDisconnect:
        manager.disconnect_group(websocket, group_id)
