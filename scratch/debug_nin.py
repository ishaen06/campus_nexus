import os
import pymongo

client = pymongo.MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.getenv("MONGO_DB_NAME", "el_platform")]

exclude_ids = [1, 2, 3, 5, 8, 9, 11]

# Test with role nin filter
q_with_role = {
    "id": {"$nin": exclude_ids},
    "is_verified": True,
    "is_banned": False,
    "is_mentor": False,
    "is_admin": False,
    "role": {"$nin": ["admin"]}
}
r1 = list(db.users.find(q_with_role))
print(f"With role $nin filter: {len(r1)} users -> {[u['full_name'] for u in r1]}")

# Test without role filter
q_no_role = {
    "id": {"$nin": exclude_ids},
    "is_verified": True,
    "is_banned": False,
    "is_mentor": False,
    "is_admin": False
}
r2 = list(db.users.find(q_no_role))
print(f"Without role filter: {len(r2)} users -> {[u['full_name'] for u in r2]}")

# Test: does $nin exclude docs where field doesn't exist?
print("\n--- Testing $nin behavior with missing field ---")
print("role $nin ['admin']:", db.users.count_documents({"role": {"$nin": ["admin"]}}))
print("role $nin ['x']:", db.users.count_documents({"role": {"$nin": ["x"]}}))
print("role $in ['admin']:", db.users.count_documents({"role": {"$in": ["admin"]}}))
print("role exists:", db.users.count_documents({"role": {"$exists": True}}))
print("role not exists:", db.users.count_documents({"role": {"$exists": False}}))

# One user's role field
u = db.users.find_one({"id": 1001})
print(f"\nUser 1001 'role' key present: {'role' in u}")
