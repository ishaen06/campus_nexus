import os
from pymongo import MongoClient, ReturnDocument
from utils import load_env

# Load environment variables from .env
load_env()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "el_platform")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def get_mongo_db():
    return db

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
        self.bio = data.get("bio", "")
        self.interests = data.get("interests", [])
        self.goals = data.get("goals", [])
        self.avatar_config = data.get("avatar_config")

    @property
    def is_online(self) -> bool:
        from security import is_user_online
        return is_user_online(self.id)


