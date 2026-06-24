import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "el_platform.db")
print(f"Connecting to database: {db_path}")

tables_to_clear = [
    "connections",
    "messages",
    "communities",
    "community_members",
    "events",
    "reports",
    "blocked_users",
    "muted_connections",
    "dismissed_users"
]

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get list of existing tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
existing_tables = [r[0] for r in cursor.fetchall()]
print(f"Existing tables: {existing_tables}")

for table in tables_to_clear:
    if table in existing_tables:
        cursor.execute(f"DELETE FROM {table};")
        # Also reset sqlite_sequence if table has autoincrement
        try:
            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")
        except sqlite3.OperationalError:
            pass
        print(f"Cleared table: {table}")
    else:
        print(f"Table not found: {table}")

conn.commit()
conn.close()
print("Data clear completed successfully (user info preserved)!")
