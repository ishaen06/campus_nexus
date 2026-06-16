import sqlite3
import os

def migrate_users_nullable():
    db_path = os.path.join(os.path.dirname(__file__), "el_platform.db")
    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Disable foreign keys temporarily
        cursor.execute("PRAGMA foreign_keys = OFF;")
        print("[OK] Disabled foreign keys.")

        # 2. Rename old users table
        cursor.execute("ALTER TABLE users RENAME TO users_old;")
        print("[OK] Renamed users to users_old.")

        # 3. Create new users table with nullable USN, branch, and year_of_study
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER NOT NULL, 
                usn VARCHAR, 
                email VARCHAR NOT NULL, 
                full_name VARCHAR NOT NULL, 
                branch VARCHAR, 
                year_of_study INTEGER, 
                hashed_password VARCHAR NOT NULL, 
                is_verified BOOLEAN, 
                is_admin BOOLEAN, 
                is_banned BOOLEAN, 
                bio VARCHAR, 
                interests JSON, 
                goals JSON, 
                avatar_config JSON, 
                cycle TEXT, 
                is_mentor BOOLEAN DEFAULT 0, 
                PRIMARY KEY (id)
            );
        """)
        print("[OK] Created new users table with nullable columns.")

        # 4. Copy data from users_old to new users table
        cursor.execute("""
            INSERT INTO users (
                id, usn, email, full_name, branch, year_of_study, hashed_password, 
                is_verified, is_admin, is_banned, bio, interests, goals, 
                avatar_config, cycle, is_mentor
            ) SELECT 
                id, usn, email, full_name, branch, year_of_study, hashed_password, 
                is_verified, is_admin, is_banned, bio, interests, goals, 
                avatar_config, cycle, is_mentor 
            FROM users_old;
        """)
        print(f"[OK] Copied {cursor.rowcount} users from users_old to users.")

        # 5. Drop users_old table
        cursor.execute("DROP TABLE users_old;")
        print("[OK] Dropped users_old table.")

        # 6. Recreate indexes
        cursor.execute("CREATE INDEX ix_users_id ON users (id);")
        cursor.execute("CREATE UNIQUE INDEX ix_users_usn ON users (usn);")
        cursor.execute("CREATE UNIQUE INDEX ix_users_email ON users (email);")
        print("[OK] Recreated indexes on users table.")

        # 7. Re-enable foreign keys and commit
        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON;")
        print("[OK] Re-enabled foreign keys and committed migration.")
        print("\n--- MIGRATION COMPLETED SUCCESSFULLY ---")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        # Try to restore in case of failure
        try:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("DROP TABLE IF EXISTS users;")
            cursor.execute("ALTER TABLE users_old RENAME TO users;")
            conn.commit()
            print("[INFO] Restored users table to original state.")
        except Exception as restore_err:
            print(f"[CRITICAL] Failed to restore database state: {restore_err}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_users_nullable()
