from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, ForeignKey
import enum
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    usn = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    branch = Column(String, nullable=True)
    year_of_study = Column(Integer, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_mentor = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    cycle = Column(String, nullable=True) # "P" or "C"
    
    # Profile information
    bio = Column(String, nullable=True)
    interests = Column(JSON, nullable=True)
    goals = Column(JSON, nullable=True)
    avatar_config = Column(JSON, nullable=True)

    @property
    def is_online(self) -> bool:
        from security import is_user_online
        return is_user_online(self.id)
    
# OTPCode model removed

class ConnectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default=ConnectionStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    reactions = Column(JSON, nullable=True) # e.g. {"user_id": "❤️"}
    created_at = Column(DateTime, default=datetime.utcnow)

class Community(Base):
    __tablename__ = "communities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class CommunityMember(Base):
    __tablename__ = "community_members"
    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="MEMBER")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    location = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=True)
    rsvps = Column(JSON, nullable=True, default=list)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reported_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BlockedUser(Base):
    __tablename__ = "blocked_users"
    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class MutedConnection(Base):
    __tablename__ = "muted_connections"
    id = Column(Integer, primary_key=True, index=True)
    muter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DismissedUser(Base):
    __tablename__ = "dismissed_users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dismissed_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class GroupChat(Base):
    __tablename__ = "group_chats"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Boolean, default=False)
    project_topic = Column(String, nullable=True)
    mentor_name = Column(String, nullable=True)
    mentor_email = Column(String, nullable=True)
    mentor_status = Column(String, default="NOT_SUBMITTED") # "NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"
    mentor_token = Column(String, nullable=True, unique=True)
    mentor_rejection_reason = Column(String, nullable=True)
    phase1_marks = Column(Integer, default=0)
    phase2_marks = Column(Integer, default=0)
    phase3_marks = Column(Integer, default=0)
    project_files = Column(JSON, nullable=True, default=list)
    allow_member_leave = Column(Boolean, default=False)

class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("group_chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

class GroupMessage(Base):
    __tablename__ = "group_messages"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("group_chats.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    reactions = Column(JSON, nullable=True) # e.g. {"user_id": "❤️"}
    created_at = Column(DateTime, default=datetime.utcnow)
