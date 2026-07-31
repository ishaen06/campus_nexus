import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database_mongo import get_mongo_db, get_next_sequence_value

def add_test_group():
    db = get_mongo_db()
    
    student = db.users.find_one({"email": "ishaensbethur.cs25@rvce.edu.in"})
    mentor = db.users.find_one({"email": "ishaen06@gmail.com"})
    
    if not student:
        print("Error: Student account not found!")
        return

    # Check if student is already in a group
    existing_member = db.group_members.find_one({"user_id": student["id"]})
    if existing_member:
        print("Student is already a member of a group:", existing_member)
        group_id = existing_member["group_id"]
    else:
        group_id = get_next_sequence_value("group_chats")
        
    group_doc = {
        "id": group_id,
        "name": "Alpha Nexus Innovators",
        "project_title": "AI-Driven Automated Campus Management & Peer Collaboration System",
        "project_topic": "Artificial Intelligence & Web Engineering",
        "created_by": student["id"],
        "creator_email": student["email"],
        "is_public": True,
        "mentor_email": mentor["email"] if mentor else "ishaen06@gmail.com",
        "mentor_status": "APPROVED",
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

    db.group_chats.update_one({"id": group_id}, {"$set": group_doc}, upsert=True)
    
    # Ensure student is registered as group member
    db.group_members.update_one(
        {"group_id": group_id, "user_id": student["id"]},
        {"$set": {
            "id": get_next_sequence_value("group_members"),
            "group_id": group_id,
            "user_id": student["id"],
            "joined_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }},
        upsert=True
    )
    
    print(f"[OK] Successfully created Test Group ID: {group_id}!")
    print(f"Group Name: {group_doc['name']}")
    print(f"Project Title: {group_doc['project_title']}")
    print(f"Leader: {student['full_name']} ({student['email']})")
    print(f"Mentor: {group_doc['mentor_email']} (Status: APPROVED)")

    print("\nCurrent Group Chats in DB:")
    for g in db.group_chats.find():
        print(f"Group ID: {g.get('id')} | Name: {g.get('name')} | Mentor: {g.get('mentor_email')} ({g.get('mentor_status')})")

if __name__ == "__main__":
    add_test_group()
