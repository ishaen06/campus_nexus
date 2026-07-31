import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database_mongo import get_mongo_db

def restore_account():
    db = get_mongo_db()
    existing = db.users.find_one({"email": "jayadevakkanakuppi@gmail.com"})
    if not existing:
        user_doc = {
            "id": 4024,
            "usn": None,
            "email": "jayadevakkanakuppi@gmail.com",
            "full_name": "JAYADEVA K KANAKUPPI",
            "branch_code": None,
            "joining_year": None,
            "branch": None,
            "year_of_study": None,
            "hashed_password": "",
            "cycle": None,
            "is_mentor": True,
            "department": "Computer Science Engineering",
            "post": "Faculty Mentor",
            "is_verified": True,
            "is_admin": False,
            "is_banned": False,
            "bio": "Faculty Mentor at RV College of Engineering.",
            "interests": [],
            "goals": [],
            "avatar_config": {"emoji": "👨‍🏫", "bg": 1}
        }
        db.users.insert_one(user_doc)
        print("Successfully restored account for JAYADEVA K KANAKUPPI (jayadevakkanakuppi@gmail.com)!")
    else:
        print("Account for JAYADEVA K KANAKUPPI already exists!")

    print("\nCurrent Database Users:")
    for u in db.users.find():
        print(f"ID: {u.get('id')} | Email: {u.get('email')} | Name: {u.get('full_name')} | Mentor: {u.get('is_mentor')} | Admin: {u.get('is_admin')}")

if __name__ == "__main__":
    restore_account()
