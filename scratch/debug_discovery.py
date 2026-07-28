import os
import pymongo

client = pymongo.MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.getenv("MONGO_DB_NAME", "el_platform")]

print("=== STEP BY STEP DEBUG ===")
print("Total users:", db.users.count_documents({}))

q1 = {"is_verified": True}
print("is_verified True:", db.users.count_documents(q1))

q2 = {"is_verified": True, "is_banned": False}
print("+ is_banned False:", db.users.count_documents(q2))

q3 = {"is_verified": True, "is_banned": False, "is_mentor": False}
print("+ is_mentor False:", db.users.count_documents(q3))

q4 = {"is_verified": True, "is_banned": False, "is_mentor": False, "is_admin": False}
print("+ is_admin False:", db.users.count_documents(q4))

q5 = {"is_verified": True, "is_banned": False, "is_mentor": False, "is_admin": False, "role": {"$nin": ["admin"]}}
print("+ role nin admin:", db.users.count_documents(q5))

# Check all docs
print("\n=== All user docs (abbreviated) ===")
for u in db.users.find({}):
    print(f"  id={u.get('id')} name={u.get('full_name')} is_admin={u.get('is_admin')} is_mentor={u.get('is_mentor')} is_verified={u.get('is_verified')} is_banned={u.get('is_banned')} role={u.get('role', 'N/A')}")

# Check approved groups
approved = list(db.group_chats.find({"mentor_status": "APPROVED"}))
print("\nApproved groups:", len(approved))

# Check the role field
print("\nDocs WITH role field:", db.users.count_documents({"role": {"$exists": True}}))
print("Docs WITHOUT role field:", db.users.count_documents({"role": {"$exists": False}}))
