import os
import pymongo

# 1. Local Database cleanup
LOCAL_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
LOCAL_DB_NAME = os.getenv("MONGO_DB_NAME", "el_platform")

# 2. Atlas Production Database cleanup
ATLAS_URL = "mongodb+srv://ishaen:Ishaen2006*@campusnexus.fzvhb7p.mongodb.net/?retryWrites=true&w=majority"
ATLAS_DB_NAME = "el_platform"

TEST_USER_IDS = [1001, 1002, 1003, 1004, 1005, 1006]
TEST_TEAM_IDS = [2001, 2002]

def clean_database(url, db_name, label):
    print(f"\n--- Cleaning {label} Database ({db_name}) ---")
    try:
        client = pymongo.MongoClient(url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        # Count before
        u_before = db.users.count_documents({})
        g_before = db.group_chats.count_documents({})
        
        # Remove test users
        u_res = db.users.delete_many({
            "$or": [
                {"id": {"$in": TEST_USER_IDS}},
                {"email": {"$regex": r"\.test@campusnexus\.app$"}}
            ]
        })
        
        # Remove test teams / group chats
        g_res = db.group_chats.delete_many({
            "id": {"$in": TEST_TEAM_IDS}
        })
        
        # Remove group members for test teams or test users
        gm_res = db.group_members.delete_many({
            "$or": [
                {"group_id": {"$in": TEST_TEAM_IDS}},
                {"user_id": {"$in": TEST_USER_IDS}}
            ]
        })
        
        # Remove connections / requests involving test users
        conn_res = db.connections.delete_many({
            "$or": [
                {"sender_id": {"$in": TEST_USER_IDS}},
                {"receiver_id": {"$in": TEST_USER_IDS}}
            ]
        })
        
        u_after = db.users.count_documents({})
        g_after = db.group_chats.count_documents({})
        
        print(f"[{label}] Users deleted: {u_res.deleted_count} (Total remaining: {u_after})")
        print(f"[{label}] Teams deleted: {g_res.deleted_count} (Total remaining: {g_after})")
        print(f"[{label}] Group members cleaned: {gm_res.deleted_count}")
        print(f"[{label}] Connections cleaned: {conn_res.deleted_count}")
        
        print(f"Remaining users in {label}:")
        for u in db.users.find({}, {"id": 1, "full_name": 1, "email": 1, "is_mentor": 1, "is_admin": 1}):
            print(f"  - ID: {u.get('id')} | Name: {u.get('full_name')} | Email: {u.get('email')} | Mentor: {u.get('is_mentor')} | Admin: {u.get('is_admin')}")
            
    except Exception as e:
        print(f"[{label}] Error cleaning DB: {e}")

clean_database(LOCAL_URL, LOCAL_DB_NAME, "Local")
clean_database(ATLAS_URL, ATLAS_DB_NAME, "Atlas Production")
