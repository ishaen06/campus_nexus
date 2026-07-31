from database_mongo import db

res = db.users.update_one(
    {"email": "ishaen06@gmail.com"},
    {"$set": {"is_admin": False, "is_mentor": False, "department": None, "post": None, "bio": ""}}
)
print("Updated ishaen06@gmail.com document count:", res.modified_count)
