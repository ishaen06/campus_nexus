"""
Seeds test users and teams into the PRODUCTION Atlas MongoDB for the Explore section.
Run with: python seed_prod.py
"""
import os
import pymongo
from datetime import datetime

# ─── Production Atlas connection ─────────────────────────────────────────────
MONGO_URL = "mongodb+srv://ishaen:Ishaen2006*@campusnexus.fzvhb7p.mongodb.net/?retryWrites=true&w=majority"
MONGO_DB_NAME = "el_platform"

client = pymongo.MongoClient(MONGO_URL)
db = client[MONGO_DB_NAME]

print("Connected to Atlas. DB:", MONGO_DB_NAME)
print("Current user count:", db.users.count_documents({}))

# ─── Test Users (IDs 1001-1006) ──────────────────────────────────────────────
TEST_USERS = [
    {
        "id": 1001,
        "email": "aarav.sharma.test@campusnexus.app",
        "full_name": "Aarav Sharma",
        "usn": "1BM22CS001",
        "branch": "Computer Science",
        "year_of_study": 3,
        "cycle": "P",
        "bio": "ML enthusiast building smart campus tools. Open to collaborating on AI/ML projects.",
        "interests": ["Machine Learning", "Python", "Data Science", "Hackathons"],
        "goals": ["Build an AI startup", "Win Smart India Hackathon", "Research internship"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": False,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 1002,
        "email": "ananya.rao.test@campusnexus.app",
        "full_name": "Ananya Rao",
        "usn": "1BM22IS002",
        "branch": "Information Science",
        "year_of_study": 2,
        "cycle": "C",
        "bio": "Passionate about full-stack web dev and open-source. Let's build something great!",
        "interests": ["Web Development", "React", "Open Source", "UI/UX"],
        "goals": ["Land a top-tier SDE internship", "Contribute to open source", "Build a SaaS product"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": False,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 1003,
        "email": "vikramaditya.k.test@campusnexus.app",
        "full_name": "Vikramaditya K",
        "usn": "1BM22EC003",
        "branch": "Electronics & Communication",
        "year_of_study": 4,
        "cycle": "P",
        "bio": "Competitive programmer and CTF enthusiast. Looking for teammates for upcoming contests.",
        "interests": ["Competitive Programming", "Cybersecurity", "CTF", "Algorithms"],
        "goals": ["ACM ICPC regionals", "Red team security role", "Master's in CS"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 1004,
        "email": "priya.nambiar.test@campusnexus.app",
        "full_name": "Priya Nambiar",
        "usn": "1BM22ME004",
        "branch": "Mechanical Engineering",
        "year_of_study": 2,
        "cycle": "C",
        "bio": "Robotics club lead. Bridging hardware and software through embedded systems.",
        "interests": ["Robotics", "Embedded Systems", "IoT", "Arduino", "3D Printing"],
        "goals": ["Build an autonomous robot", "Research in robotics", "Work at a deep tech startup"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": False,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 1005,
        "email": "rohan.gupta.test@campusnexus.app",
        "full_name": "Rohan Gupta",
        "usn": "1BM22CS005",
        "branch": "Computer Science",
        "year_of_study": 3,
        "cycle": "P",
        "bio": "Blockchain developer and DeFi enthusiast. Building the future of decentralized finance.",
        "interests": ["Blockchain", "Web3", "Smart Contracts", "DeFi", "Solidity"],
        "goals": ["Launch a DeFi protocol", "Ethereum Foundation grant", "Speak at ETHIndia"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 1006,
        "email": "sneha.kulkarni.test@campusnexus.app",
        "full_name": "Sneha Kulkarni",
        "usn": "1BM22CS006",
        "branch": "Computer Science",
        "year_of_study": 1,
        "cycle": "C",
        "bio": "First-year coder eager to learn and collaborate. Interested in app development and AI.",
        "interests": ["Android Development", "Flutter", "AI", "Design Thinking"],
        "goals": ["Build my first published app", "Join a research lab", "Win a collegiate hackathon"],
        "profile_photo": None,
        "is_admin": False,
        "is_mentor": False,
        "is_verified": True,
        "is_banned": False,
        "is_online": False,
        "created_at": datetime.utcnow().isoformat(),
    },
]

# ─── Test Teams (IDs 2001-2002) ───────────────────────────────────────────────
TEST_TEAMS = [
    {
        "id": 2001,
        "name": "Nexus AI Innovators",
        "description": "Building an AI-powered campus assistant for Smart India Hackathon 2025. Looking for ML engineers, backend devs, and UI/UX designers!",
        "created_by": 1001,
        "mentor_id": None,
        "mentor_status": "PENDING",
        "is_public": True,
        "max_members": 6,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 2002,
        "name": "Quantum Shield CTF",
        "description": "Competitive CTF team preparing for national cybersecurity competitions. We compete in Capture The Flag events and train in ethical hacking.",
        "created_by": 1003,
        "mentor_id": None,
        "mentor_status": "PENDING",
        "is_public": True,
        "max_members": 5,
        "created_at": datetime.utcnow().isoformat(),
    },
]

# ─── Seed users ───────────────────────────────────────────────────────────────
seeded_users = 0
for user in TEST_USERS:
    result = db.users.update_one(
        {"id": user["id"]},
        {"$setOnInsert": user},
        upsert=True
    )
    if result.upserted_id:
        print(f"  ✅ Inserted user: {user['full_name']} (id={user['id']})")
        seeded_users += 1
    else:
        print(f"  ⏭  Already exists: {user['full_name']} (id={user['id']})")

# ─── Seed teams ───────────────────────────────────────────────────────────────
seeded_teams = 0
for team in TEST_TEAMS:
    result = db.group_chats.update_one(
        {"id": team["id"]},
        {"$setOnInsert": team},
        upsert=True
    )
    if result.upserted_id:
        print(f"  ✅ Inserted team: {team['name']} (id={team['id']})")
        seeded_teams += 1
    else:
        print(f"  ⏭  Already exists: {team['name']} (id={team['id']})")

    # Add team creator as member
    member_record = {"group_id": team["id"], "user_id": team["created_by"], "role": "admin"}
    db.group_members.update_one(
        {"group_id": team["id"], "user_id": team["created_by"]},
        {"$setOnInsert": member_record},
        upsert=True
    )

print(f"\n🎉 Done! Seeded {seeded_users} new users and {seeded_teams} new teams into Atlas.")
print(f"Total users in DB: {db.users.count_documents({})}")
