# -*- coding: utf-8 -*-
import pymongo
from datetime import datetime, timezone

MONGO_URL = "mongodb+srv://ishaen:Ishaen2006*@campusnexus.fzvhb7p.mongodb.net/?retryWrites=true&w=majority"
client = pymongo.MongoClient(MONGO_URL)
db = client["el_platform"]

print("Connected to Atlas. Users before:", db.users.count_documents({}))

NOW = datetime.now(timezone.utc).isoformat()

TEST_USERS = [
    {"id":1001,"email":"aarav.sharma.test@campusnexus.app","full_name":"Aarav Sharma","usn":"1BM22CS001","branch":"Computer Science","year_of_study":3,"cycle":"P","bio":"ML enthusiast building smart campus tools. Open to AI/ML projects.","interests":["Machine Learning","Python","Data Science","Hackathons"],"goals":["Build an AI startup","Win Smart India Hackathon"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":False,"created_at":NOW},
    {"id":1002,"email":"ananya.rao.test@campusnexus.app","full_name":"Ananya Rao","usn":"1BM22IS002","branch":"Information Science","year_of_study":2,"cycle":"C","bio":"Passionate about full-stack web dev and open-source.","interests":["Web Development","React","Open Source","UI/UX"],"goals":["Land a top SDE internship","Build a SaaS product"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":False,"created_at":NOW},
    {"id":1003,"email":"vikramaditya.k.test@campusnexus.app","full_name":"Vikramaditya K","usn":"1BM22EC003","branch":"Electronics & Communication","year_of_study":4,"cycle":"P","bio":"Competitive programmer and CTF enthusiast.","interests":["Competitive Programming","Cybersecurity","CTF","Algorithms"],"goals":["ACM ICPC regionals","Red team security role"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":True,"created_at":NOW},
    {"id":1004,"email":"priya.nambiar.test@campusnexus.app","full_name":"Priya Nambiar","usn":"1BM22ME004","branch":"Mechanical Engineering","year_of_study":2,"cycle":"C","bio":"Robotics club lead. Bridging hardware and software through embedded systems.","interests":["Robotics","Embedded Systems","IoT","Arduino"],"goals":["Build an autonomous robot","Research in robotics"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":False,"created_at":NOW},
    {"id":1005,"email":"rohan.gupta.test@campusnexus.app","full_name":"Rohan Gupta","usn":"1BM22CS005","branch":"Computer Science","year_of_study":3,"cycle":"P","bio":"Blockchain developer and DeFi enthusiast.","interests":["Blockchain","Web3","Smart Contracts","DeFi"],"goals":["Launch a DeFi protocol","Speak at ETHIndia"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":True,"created_at":NOW},
    {"id":1006,"email":"sneha.kulkarni.test@campusnexus.app","full_name":"Sneha Kulkarni","usn":"1BM22CS006","branch":"Computer Science","year_of_study":1,"cycle":"C","bio":"First-year coder eager to learn and collaborate.","interests":["Android Development","Flutter","AI","Design Thinking"],"goals":["Build my first published app","Win a collegiate hackathon"],"profile_photo":None,"is_admin":False,"is_mentor":False,"is_verified":True,"is_banned":False,"is_online":False,"created_at":NOW},
]

TEST_TEAMS = [
    {"id":2001,"name":"Nexus AI Innovators","description":"Building an AI-powered campus assistant for SIH 2025. Looking for ML engineers, backend devs, and UI/UX designers!","created_by":1001,"mentor_id":None,"mentor_status":"PENDING","is_public":True,"max_members":6,"created_at":NOW},
    {"id":2002,"name":"Quantum Shield CTF","description":"Competitive CTF team for national cybersecurity competitions. Train in ethical hacking and compete in Capture The Flag events.","created_by":1003,"mentor_id":None,"mentor_status":"PENDING","is_public":True,"max_members":5,"created_at":NOW},
]

SET_ON_INSERT = "$setOnInsert"
for u in TEST_USERS:
    r = db.users.update_one({"id": u["id"]}, {SET_ON_INSERT: u}, upsert=True)
    status = "INSERTED" if r.upserted_id else "ALREADY EXISTS"
    print(f"  User {u['id']} {u['full_name']}: {status}")

for t in TEST_TEAMS:
    r = db.group_chats.update_one({"id": t["id"]}, {SET_ON_INSERT: t}, upsert=True)
    status = "INSERTED" if r.upserted_id else "ALREADY EXISTS"
    print(f"  Team {t['id']} {t['name']}: {status}")
    member_doc = {"group_id": t["id"], "user_id": t["created_by"], "role": "admin"}
    db.group_members.update_one(
        {"group_id": t["id"], "user_id": t["created_by"]},
        {SET_ON_INSERT: member_doc},
        upsert=True
    )

print("")
print("Users after seeding:", db.users.count_documents({}))
print("Public teams after seeding:", db.group_chats.count_documents({"is_public": True}))
print("DONE - Production Atlas seeded successfully!")
