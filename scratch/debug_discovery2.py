"""
Simulates the exact /users/discovery endpoint logic to find exactly why it returns 0 users.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")

import pymongo
from database_mongo import get_mongo_db, MongoUser

client = pymongo.MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.getenv("MONGO_DB_NAME", "el_platform")]

# Get your user (id=1) as the current user
current_user = db.users.find_one({"id": 1})
if not current_user:
    print("ERROR: Admin user id=1 not found!")
    sys.exit(1)

print(f"Logged in as: {current_user['full_name']} (id={current_user['id']}, is_admin={current_user.get('is_admin')})")

# Step 1: Connections
connections = list(db.connections.find({
    "$or": [
        {"sender_id": current_user["id"]},
        {"receiver_id": current_user["id"]}
    ]
}))
connected_list = []
for conn in connections:
    connected_list.append(conn["sender_id"])
    connected_list.append(conn["receiver_id"])
print(f"\nConnected users: {connected_list}")

# Step 2: Blocks
blocks = list(db.blocked_users.find({
    "$or": [
        {"blocker_id": current_user["id"]},
        {"blocked_id": current_user["id"]}
    ]
}))
blocked_list = []
for b in blocks:
    blocked_list.append(b["blocker_id"])
    blocked_list.append(b["blocked_id"])
print(f"Blocked users: {blocked_list}")

# Step 3: Approved group members
approved_groups = list(db.group_chats.find({"mentor_status": "APPROVED"}))
approved_group_ids = [g["id"] for g in approved_groups]
approved_members = list(db.group_members.find({"group_id": {"$in": approved_group_ids}}))
approved_member_ids = [m["user_id"] for m in approved_members]
print(f"Approved member IDs (excluded): {approved_member_ids}")

# Step 4: Build exclude_ids
exclude_ids = list(set([current_user["id"]] + connected_list + blocked_list + approved_member_ids))
print(f"Exclude IDs: {exclude_ids}")

# Step 5: Query filter
query_filter = {
    "id": {"$nin": exclude_ids},
    "is_verified": True,
    "is_banned": False,
    "is_mentor": False,
    "is_admin": False,
    "role": {"$nin": ["admin"]}
}
print(f"\nQuery filter: {query_filter}")

users = list(db.users.find(query_filter).limit(20))
print(f"\nUsers found by query: {len(users)}")
for u in users:
    print(f"  - {u['full_name']} (id={u['id']})")

# Step 6: Compatibility scoring
print("\nRunning calculate_compatibility for each user...")
try:
    from routers.users import calculate_compatibility
    current_user_obj = MongoUser(current_user)
    for u in users:
        u_obj = MongoUser(u)
        try:
            ai_data = calculate_compatibility(current_user_obj, u_obj)
            print(f"  - {u['full_name']}: score={ai_data.get('score') if ai_data else 'N/A'}")
        except Exception as e:
            print(f"  - {u['full_name']}: ERROR in compatibility: {e}")
except ImportError as e:
    print(f"Could not import calculate_compatibility: {e}")

print("\n=== CONCLUSION ===")
if len(users) > 0:
    print(f"Backend should return {len(users)} users. Check if the FRONTEND is receiving them.")
    print("Make sure the backend server is running and the API is live.")
else:
    print("Backend query returns 0 users. The exclude_ids list may be filtering everyone out.")
