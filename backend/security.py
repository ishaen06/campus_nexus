from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt

SECRET_KEY = "supersecretkey_for_el_platform"  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# In-memory tracking of active user sessions
active_users = {}

def mark_user_active(user_id: int):
    active_users[user_id] = datetime.utcnow()

def is_user_online(user_id: int) -> bool:
    last_active = active_users.get(user_id)
    if not last_active:
        return False
    # User is considered online if they made an API request in the last 15 minutes
    return datetime.utcnow() - last_active < timedelta(minutes=15)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
