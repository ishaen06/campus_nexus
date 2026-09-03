import os
from pymongo import MongoClient, ReturnDocument
from utils import load_env

# Load environment variables from .env
load_env()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "el_platform")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=15000)

db = client[DB_NAME]

def get_mongo_db():
    return db

def init_db():
    """Create required indexes. Called once at app startup."""
    try:
        db.users.create_index([("id", 1)], unique=True, sparse=True)
        db.users.create_index("usn", unique=True, sparse=True, partialFilterExpression={"usn": {"$type": "string"}})
        db.users.create_index([("branch", 1)])
        db.users.create_index([("year_of_study", 1)])
        db.users.create_index([("is_mentor", 1)])
        db.connections.create_index([("id", 1)], unique=True)
        db.connections.create_index([("sender_id", 1)])
        db.connections.create_index([("receiver_id", 1)])
        db.connections.create_index([("status", 1)])
        db.connections.create_index([("receiver_id", 1), ("status", 1)])
        db.messages.create_index([("connection_id", 1)])
        db.messages.create_index([("connection_id", 1), ("created_at", 1)])
        db.messages.create_index([("connection_id", 1), ("sender_id", 1), ("is_read", 1)])
        db.group_chats.create_index([("id", 1)], unique=True)
        db.group_members.create_index([("group_id", 1)])
        db.group_members.create_index([("user_id", 1)])
        db.group_members.create_index([("group_id", 1), ("user_id", 1)])
        db.group_messages.create_index([("group_id", 1)])
        db.notifications.create_index([("user_id", 1)])
        db.notifications.create_index([("user_id", 1), ("is_read", 1)])

        # Ensure administrators and mentors are never in student team rosters
        admin_users = list(db.users.find({"$or": [{"is_admin": True}, {"email": "ishaen.vihaan@gmail.com"}]}))
        admin_ids = [u["id"] for u in admin_users if "id" in u]
        if admin_ids:
            db.group_members.delete_many({"user_id": {"$in": admin_ids}})

        # Synchronize academic cohorts across all student records with precise regex matching
        # USN format: ^1[A-Za-z]{2}(YY) -> 2 digits after college code
        # Email format: [a-zA-Z]{2,4}(YY)@ -> 2 digits after branch code
        # 26 -> 1st Year (joining_year 2026, year_of_study 1)
        # 25 -> 2nd Year (joining_year 2025, year_of_study 2)
        # 24 -> 3rd Year (joining_year 2024, year_of_study 3)
        db.users.update_many(
            {
                "$or": [
                    {"email": {"$regex": r"[a-zA-Z]{2,4}26@"}},
                    {"usn": {"$regex": r"^1[A-Za-z]{2}26"}}
                ],
                "is_mentor": {"$ne": True},
                "is_admin": {"$ne": True},
                "email": {"$ne": "ishaen.vihaan@gmail.com"}
            },
            {"$set": {"joining_year": 2026, "year_of_study": 1}}
        )
        db.users.update_many(
            {
                "$or": [
                    {"email": {"$regex": r"[a-zA-Z]{2,4}25@"}},
                    {"usn": {"$regex": r"^1[A-Za-z]{2}25"}}
                ],
                "is_mentor": {"$ne": True},
                "is_admin": {"$ne": True},
                "email": {"$ne": "ishaen.vihaan@gmail.com"}
            },
            {"$set": {"joining_year": 2025, "year_of_study": 2}}
        )
        db.users.update_many(
            {
                "$or": [
                    {"email": {"$regex": r"[a-zA-Z]{2,4}24@"}},
                    {"usn": {"$regex": r"^1[A-Za-z]{2}24"}}
                ],
                "is_mentor": {"$ne": True},
                "is_admin": {"$ne": True},
                "email": {"$ne": "ishaen.vihaan@gmail.com"}
            },
            {"$set": {"joining_year": 2024, "year_of_study": 3}}
        )

    except Exception:
        pass





def get_next_sequence_value(sequence_name: str) -> int:
    counter = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["sequence_value"]

class MongoUser:
    def __init__(self, data: dict):
        self.id = data.get("id")
        self.usn = data.get("usn")
        self.email = data.get("email")
        self.full_name = data.get("full_name")
        self.branch = data.get("branch")
        self.year_of_study = data.get("year_of_study")
        self.hashed_password = data.get("hashed_password")
        self.is_verified = data.get("is_verified", False)
        self.is_admin = data.get("is_admin", False)
        self.is_mentor = data.get("is_mentor", False)
        self.is_banned = data.get("is_banned", False)
        self.cycle = data.get("cycle")
        self.department = data.get("department")
        self.post = data.get("post")
        self.bio = data.get("bio", "")
        self.interests = data.get("interests", [])
        self.goals = data.get("goals", [])
        self.avatar_config = data.get("avatar_config")

    @property
    def is_online(self) -> bool:
        from security import is_user_online
        return is_user_online(self.id)


