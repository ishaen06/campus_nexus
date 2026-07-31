import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database_mongo import get_mongo_db

def clear_all_messages():
    db = get_mongo_db()
    
    res_msg = db.messages.delete_many({})
    res_grp_msg = db.group_messages.delete_many({})
    
    # Reset connection unread flags and last message fields if any
    res_conn = db.connections.update_many(
        {},
        {"$set": {"has_unread": False, "last_message": None, "last_message_time": None}}
    )
    
    print(f"Cleared {res_msg.deleted_count} direct messages from 'messages' collection.")
    print(f"Cleared {res_grp_msg.deleted_count} team messages from 'group_messages' collection.")
    print(f"Reset {res_conn.modified_count} connections message states.")

if __name__ == "__main__":
    clear_all_messages()
