import sqlite3

def run_migration():
    conn = sqlite3.connect("el_platform.db")
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN rsvps TEXT DEFAULT '[]'")
        conn.commit()
        print("Successfully added rsvps column to events table.")
    except sqlite3.OperationalError as e:
        print(f"Migration warning/skipped: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
