import os
from pymongo import MongoClient, ReturnDocument, TEXT, ASCENDING, DESCENDING
from utils import load_env

load_env()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "omnibug_db")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=8000)
db = client[DB_NAME]

def get_mongo_db():
    return db

def init_db():
    """Create indexes for high-speed queries, full-text search, and constraints."""
    try:
        # Users indexes
        db.users.create_index("email", unique=True)
        db.users.create_index("username", unique=True)
        
        # Products & Components indexes
        db.products.create_index("key_prefix", unique=True)
        db.components.create_index([("product_id", ASCENDING), ("name", ASCENDING)], unique=True)
        db.milestones.create_index([("product_id", ASCENDING), ("name", ASCENDING)])
        
        # Bugs / Defects indexes
        db.bugs.create_index("key", unique=True)
        db.bugs.create_index([("product_id", ASCENDING), ("status", ASCENDING)])
        db.bugs.create_index([("assignee_id", ASCENDING), ("status", ASCENDING)])
        db.bugs.create_index([("severity", ASCENDING), ("priority", ASCENDING)])
        db.bugs.create_index([("milestone_id", ASCENDING)])
        db.bugs.create_index([("created_at", DESCENDING)])
        db.bugs.create_index([
            ("title", TEXT),
            ("description", TEXT),
            ("stack_trace", TEXT),
            ("tags", TEXT)
        ], name="bug_fulltext_search")
        
        # Comments & Activities indexes
        db.comments.create_index([("bug_id", ASCENDING), ("created_at", ASCENDING)])
        db.activities.create_index([("bug_id", ASCENDING), ("timestamp", DESCENDING)])
        db.activities.create_index([("timestamp", DESCENDING)])
        
        # Git commits indexes
        db.commits.create_index([("bug_id", ASCENDING)])
        db.commits.create_index([("commit_sha", ASCENDING)], unique=True)
        
        # Saved queries
        db.saved_queries.create_index([("user_id", ASCENDING)])
        
        print("Database indexes initialized successfully.")
    except Exception as e:
        print(f"Warning during database index initialization: {e}")

def get_next_sequence_value(sequence_name: str, start_val: int = 100) -> int:
    """Generates atomic auto-incrementing sequential integers for issue keys."""
    counter = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    if counter["sequence_value"] == 1 and start_val > 1:
        db.counters.update_one({"_id": sequence_name}, {"$set": {"sequence_value": start_val}})
        return start_val
    return counter["sequence_value"]

def get_next_bug_key(product_prefix: str) -> str:
    """Generates key like GEC-101, NEX-102, PAY-103."""
    prefix = (product_prefix or "BUG").upper().strip()
    seq = get_next_sequence_value(f"bug_seq_{prefix}", start_val=101)
    return f"{prefix}-{seq}"
