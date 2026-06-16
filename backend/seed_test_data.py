import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal, Base, engine
from models import User
from security import get_password_hash

def seed_data():
    print("Seeding test users...")
    db = SessionLocal()
    try:
        # Recreate tables just in case
        Base.metadata.create_all(bind=engine)
        
        # Clear existing users to prevent duplicate keys
        db.query(User).delete()
        db.commit()
        
        test_users = [
            {
                "usn": "1rv25cs066",
                "email": "ishaen06@gmail.com",
                "full_name": "isahen",
                "branch": "CSE",
                "year_of_study": 1,
                "cycle": "P"
            },
            {
                "usn": "1rz25cs077",
                "email": "ishaen.vigaan@gmail.com",
                "full_name": "sam",
                "branch": "CSE",
                "year_of_study": 1,
                "cycle": "C"
            },
            {
                "usn": "1234ertfg",
                "email": "ishaen.vn@gmail.com",
                "full_name": "asfdf",
                "branch": "CSE",
                "year_of_study": 1,
                "cycle": "P"
            },
            {
                "usn": "1RV25CS100",
                "email": "user4@rvce.edu.in",
                "full_name": "User Four",
                "branch": "CSE",
                "year_of_study": 1,
                "cycle": "C"
            }
        ]
        
        hashed_password = get_password_hash("password123")
        for u_data in test_users:
            u = User(
                usn=u_data["usn"],
                email=u_data["email"],
                full_name=u_data["full_name"],
                branch=u_data["branch"],
                year_of_study=u_data["year_of_study"],
                hashed_password=hashed_password,
                is_verified=True,
                cycle=u_data["cycle"]
            )
            db.add(u)
            
        db.commit()
        print("Successfully seeded 4 test users!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
