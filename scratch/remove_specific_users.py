import os
import pymongo

LOCAL_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
LOCAL_DB_NAME = os.getenv("MONGO_DB_NAME", "el_platform")

ATLAS_URL = "mongodb+srv://ishaen:Ishaen2006*@campusnexus.fzvhb7p.mongodb.net/?retryWrites=true&w=majority"
ATLAS_DB_NAME = "el_platform"

TARGET_EMAILS = [
    "nexus2026.otp@gmail.com",
    "iniyasakthivel1@gmail.com"
]

def remove_users(url, db_name, label):
    print(f"\n--- Cleaning {label} Database ({db_name}) ---")
    try:
        client = pymongo.MongoClient(url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        # Find user IDs to clean up related collections
        users_to_delete = list(db.users.find({"email": {"$in": TARGET_EMAILS}}))
        user_ids = [u["id"] for u in users_to_delete if "id" in u]
        
        print(f"[{label}] Found {len(users_to_delete)} user(s) matching target emails: {[u.get('email') for u in users_to_delete]}")
        
        # Delete from users
        u_res = db.users.delete_many({"email": {"$in": TARGET_EMAILS}})
        
        # Clean associated records if user IDs exist
        gm_count = 0
        conn_count = 0
        if user_ids:
            gm_res = db.group_members.delete_many({"user_id": {"$in": user_ids}})
            gm_count = gm_res.deleted_count
            
            conn_res = db.connections.delete_many({
                "$or": [
                    {"sender_id": {"$in": user_ids}},
                    {"receiver_id": {"$in": user_ids}}
                ]
            })
            conn_count = conn_res.deleted_count

        u_after = db.users.count_documents({})
        print(f"[{label}] Users deleted: {u_res.deleted_count} (Total remaining in DB: {u_after})")
        print(f"[{label}] Group members cleaned: {gm_count}")
        print(f"[{label}] Connections cleaned: {conn_count}")
        
        print(f"\nRemaining users in {label}:")
        for u in db.users.find({}, {"id": 1, "full_name": 1, "email": 1, "is_mentor": 1, "is_admin": 1}):
            print(f"  - ID: {u.get('id')} | Name: {u.get('full_name')} | Email: {u.get('email')} | Mentor: {u.get('is_mentor')} | Admin: {u.get('is_admin')}")

    except Exception as e:
        print(f"[{label}] Error: {e}")

remove_users(LOCAL_URL, LOCAL_DB_NAME, "Local")
remove_users(ATLAS_URL, ATLAS_DB_NAME, "Atlas Production")
