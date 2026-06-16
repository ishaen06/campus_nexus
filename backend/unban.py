from database import SessionLocal
from models import User

def unban_all_users():
    db = SessionLocal()
    users = db.query(User).filter(User.is_banned == True).all()
    for u in users:
        u.is_banned = False
        print(f"Unbanned user: {u.email}")
    db.commit()
    db.close()

if __name__ == "__main__":
    unban_all_users()
