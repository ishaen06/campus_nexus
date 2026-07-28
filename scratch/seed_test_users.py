import os
import pymongo
from datetime import datetime

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "el_platform")

client = pymongo.MongoClient(MONGO_URL)
db = client[DB_NAME]

TEST_USERS = [
    {
        "id": 1001,
        "email": "aarav.sharma@rvce.edu.in",
        "full_name": "Aarav Sharma",
        "usn": "1RV22CS014",
        "branch": "CSE",
        "year_of_study": 5,
        "cycle": "P",
        "bio": "AI & Full-stack dev enthusiast. Looking for team members passionate about machine learning and building scalable web apps!",
        "interests": ["Artificial Intelligence", "Startups", "Gaming", "Technology"],
        "goals": ["Build a startup", "Participate in hackathons", "Prepare for placements"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    },
    {
        "id": 1002,
        "email": "ananya.rao@rvce.edu.in",
        "full_name": "Ananya Rao",
        "usn": "1RV23EC028",
        "branch": "ECE",
        "year_of_study": 3,
        "cycle": "C",
        "bio": "Embedded systems & Robotics lover. Seeking teammates for hardware-software co-design and IoT projects.",
        "interests": ["Robotics", "Research", "Technology", "Sports"],
        "goals": ["Find study partners", "Learn new technologies", "Participate in hackathons"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    },
    {
        "id": 1003,
        "email": "vikram.k@rvce.edu.in",
        "full_name": "Vikramaditya K",
        "usn": "1RV22AI042",
        "branch": "CSE_DS",
        "year_of_study": 5,
        "cycle": "P",
        "bio": "Data Scientist & Competitive Programmer. Passionate about LLMs, Deep Learning, and quantitative analytics.",
        "interests": ["Artificial Intelligence", "Stock Markets", "Finance", "Research"],
        "goals": ["Prepare for placements", "Network with peers", "Learn new technologies"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    },
    {
        "id": 1004,
        "email": "priya.nambiar@rvce.edu.in",
        "full_name": "Priya Nambiar",
        "usn": "1RV23IS089",
        "branch": "CSE",
        "year_of_study": 3,
        "cycle": "C",
        "bio": "UI/UX Designer and Frontend Engineer. Passionate about sleek modern glassmorphism web applications & mobile apps.",
        "interests": ["Content Creation", "Photography", "Startups", "Gaming"],
        "goals": ["Build a startup", "Find study partners", "Network with peers"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    },
    {
        "id": 1005,
        "email": "rohan.gupta@rvce.edu.in",
        "full_name": "Rohan Gupta",
        "usn": "1RV21ME077",
        "branch": "ME",
        "year_of_study": 7,
        "cycle": "P",
        "bio": "CAD modeling, Mechatronics, and Automotive Tech enthusiast. Working on EV powertrain simulations for senior capstone.",
        "interests": ["Robotics", "Sports", "Technology"],
        "goals": ["Higher studies", "Prepare for placements", "Learn new technologies"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    },
    {
        "id": 1006,
        "email": "sneha.kulkarni@rvce.edu.in",
        "full_name": "Sneha Kulkarni",
        "usn": "1RV23CY012",
        "branch": "CSE_CY",
        "year_of_study": 3,
        "cycle": "C",
        "bio": "Cybersecurity researcher & CTF player. Interested in network security, ethical hacking, and cryptography.",
        "interests": ["Technology", "Research", "Gaming", "Public Speaking"],
        "goals": ["Participate in hackathons", "Find study partners", "Network with peers"],
        "profile_photo": None,
        "is_verified": True,
        "is_banned": False,
        "is_mentor": False,
        "is_admin": False,
        "created_at": datetime.utcnow()
    }
]

TEST_TEAMS = [
    {
        "id": 2001,
        "name": "Nexus AI Innovators",
        "admin_id": 1001,
        "project_theme": "Artificial Intelligence",
        "project_sub_topic": "Generative AI for Campus Automation",
        "is_public": True,
        "mentor_status": "PENDING",
        "created_at": datetime.utcnow()
    },
    {
        "id": 2002,
        "name": "Quantum Shield CTF",
        "admin_id": 1006,
        "project_theme": "Cyber Security",
        "project_sub_topic": "Zero-Trust Mesh Network Security",
        "is_public": True,
        "mentor_status": "PENDING",
        "created_at": datetime.utcnow()
    }
]

TEAM_MEMBERS = [
    {"group_id": 2001, "user_id": 1001},
    {"group_id": 2001, "user_id": 1003},
    {"group_id": 2002, "user_id": 1006},
    {"group_id": 2002, "user_id": 1004}
]

def seed():
    print("Seeding test users and recruiting teams...")
    for user in TEST_USERS:
        db.users.update_one({"id": user["id"]}, {"$set": user}, upsert=True)
        print(f"  [+] User created/updated: {user['full_name']} ({user['branch']} - {user['cycle']} Cycle)")

    for team in TEST_TEAMS:
        db.group_chats.update_one({"id": team["id"]}, {"$set": team}, upsert=True)
        print(f"  [+] Public Team created: {team['name']} ({team['project_theme']})")

    for member in TEAM_MEMBERS:
        db.group_members.update_one(
            {"group_id": member["group_id"], "user_id": member["user_id"]},
            {"$set": member},
            upsert=True
        )

    print("\nDatabase successfully seeded with test profiles and public recruiting teams!")

if __name__ == "__main__":
    seed()
