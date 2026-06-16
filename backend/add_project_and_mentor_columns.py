import sqlite3

def run_migration():
    conn = sqlite3.connect("el_platform.db")
    cursor = conn.cursor()
    
    columns_to_add = [
        ("mentor_name", "TEXT DEFAULT NULL"),
        ("mentor_email", "TEXT DEFAULT NULL"),
        ("mentor_status", "TEXT DEFAULT 'NOT_SUBMITTED'"),
        ("mentor_token", "TEXT DEFAULT NULL"),
        ("project_files", "TEXT DEFAULT '[]'")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE group_chats ADD COLUMN {col_name} {col_type}")
            conn.commit()
            print(f"Successfully added column {col_name} to group_chats table.")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} migration warning/skipped: {e}")
            
    conn.close()

if __name__ == "__main__":
    run_migration()
