import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "el_platform.db")
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Add avatar_config column to users table
try:
    cursor.execute("ALTER TABLE users ADD COLUMN avatar_config JSON;")
    print("Added avatar_config column to users table.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("avatar_config column already exists in users table.")
    else:
        raise e

# 2. Create group_chats table
cursor.execute("""
CREATE TABLE IF NOT EXISTS group_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
);
""")
print("Created group_chats table if not exists.")

# 3. Create group_members table
cursor.execute("""
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES group_chats(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
""")
print("Created group_members table if not exists.")

# 4. Create group_messages table
cursor.execute("""
CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    reactions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES group_chats(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
);
""")
print("Created group_messages table if not exists.")

conn.commit()
conn.close()
print("Migration completed successfully!")
