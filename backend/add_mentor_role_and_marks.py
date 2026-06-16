import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), "el_platform.db")
    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Alter users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_mentor BOOLEAN DEFAULT 0")
        print("[OK] Added is_mentor to users table.")
    except sqlite3.OperationalError as e:
        print(f"[INFO] users table alteration skipped: {e}")

    # Alter group_chats table
    alterations = [
        "ALTER TABLE group_chats ADD COLUMN mentor_rejection_reason TEXT",
        "ALTER TABLE group_chats ADD COLUMN phase1_marks INTEGER DEFAULT 0",
        "ALTER TABLE group_chats ADD COLUMN phase2_marks INTEGER DEFAULT 0",
        "ALTER TABLE group_chats ADD COLUMN phase3_marks INTEGER DEFAULT 0"
    ]

    for alt in alterations:
        try:
            cursor.execute(alt)
            print(f"[OK] Executed alteration: {alt}")
        except sqlite3.OperationalError as e:
            print(f"[INFO] Alteration skipped: {e}")

    conn.commit()
    conn.close()
    print("Database migration completed.")

if __name__ == "__main__":
    migrate()
