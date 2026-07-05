import sys
sys.path.append('backend')
from database_mongo import get_mongo_db

db = get_mongo_db()
email = "ishaen.vihaan@gmail.com"

# Check if user exists
user = db.users.find_one({"email": email})
if user:
    db.users.update_one({"email": email}, {"$set": {"is_admin": True}})
    print(f"Updated user {email} (ID: {user['id']}) to admin=True.")
else:
    # Create the user if they don't exist yet
    from database_mongo import get_next_sequence_value
    new_id = get_next_sequence_value("users")
    db.users.insert_one({
        "id": new_id,
        "usn": None,
        "email": email,
        "full_name": "Admin User",
        "branch": None,
        "year_of_study": None,
        "hashed_password": "",
        "cycle": None,
        "is_mentor": True,
        "department": "Admin Office",
        "post": "Chief Administrator",
        "is_verified": True,
        "is_admin": True,
        "is_banned": False,
        "bio": "Platform Administrator account.",
        "interests": [],
        "goals": [],
        "avatar_config": {"emoji": "🛡️", "bg": 2}
    })
    print(f"Created user {email} (ID: {new_id}) as admin=True.")
