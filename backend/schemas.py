from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# UserCreate and OTPVerify models removed

class UserResponse(BaseModel):
    id: int
    usn: Optional[str] = None
    email: str
    full_name: str
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    profile_photo: Optional[str] = None
    is_admin: bool = False
    is_mentor: Optional[bool] = None
    is_banned: bool = False
    cycle: Optional[str] = None
    department: Optional[str] = None
    post: Optional[str] = None
    is_online: bool = False
    
    class Config:
        from_attributes = True

class DiscoveryUserResponse(UserResponse):
    pass

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    usn: Optional[str] = None
    branch: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    profile_photo: Optional[str] = None
    is_mentor: Optional[bool] = None
    cycle: Optional[str] = None
    department: Optional[str] = None
    post: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    credential: str
    admin_password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ConnectionBase(BaseModel):
    receiver_id: int

class MentorChatRequest(BaseModel):
    email: EmailStr


class ConnectionResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    connection_id: int
    sender_id: int
    content: str
    is_read: bool = False
    reactions: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CommunityCreate(BaseModel):
    name: str
    description: str
    category: str

class CommunityResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str
    description: str
    date: str
    time: str
    location: str
    community_id: Optional[int] = None

class EventResponse(EventCreate):
    id: int
    created_by: int
    rsvps: Optional[List[int]] = []
    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    reason: str

class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_id: int
    reason: str
    created_at: datetime
    class Config:
        from_attributes = True

class GroupChatCreate(BaseModel):
    name: str
    member_ids: List[int]
    is_public: Optional[bool] = False
    project_topic: Optional[str] = None
    project_sub_topic: Optional[str] = None
    project_theme: Optional[str] = None

class GroupChatUpdate(BaseModel):
    name: Optional[str] = None
    member_ids: Optional[List[int]] = None
    is_public: Optional[bool] = None
    project_topic: Optional[str] = None
    project_sub_topic: Optional[str] = None
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None
    allow_member_leave: Optional[bool] = None
    project_theme: Optional[str] = None
    chief_mentor_name: Optional[str] = None
    chief_mentor_designation: Optional[str] = None
    chief_mentor_department: Optional[str] = None
    evaluators: Optional[List[str]] = None

class GroupChatResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: Optional[datetime] = None
    member_ids: List[int] = []
    is_public: bool = False
    project_topic: Optional[str] = None
    project_sub_topic: Optional[str] = None
    project_theme: Optional[str] = None
    members: Optional[List[UserResponse]] = []
    criteria_met: bool = False
    validation_error: Optional[str] = None
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None
    mentor_status: str = "NOT_SUBMITTED"
    mentor_rejection_reason: Optional[str] = None
    phase1_marks: Optional[int] = 0
    phase2_marks: Optional[int] = 0
    phase3_marks: Optional[int] = 0
    project_files: Optional[List[dict]] = []
    allow_member_leave: bool = False
    
    chief_mentor_name: Optional[str] = "DR SUBRAMANYA KN"
    chief_mentor_designation: Optional[str] = "PRINCIPAL"
    chief_mentor_department: Optional[str] = ""
    evaluators: Optional[List[str]] = []
    phase1_detail_marks: Optional[dict] = None
    phase2_detail_marks: Optional[dict] = None
    phase3_detail_marks: Optional[dict] = None
    phase1_observations: Optional[str] = None
    phase2_observations: Optional[str] = None
    phase3_observations: Optional[str] = None
    student_evaluations: Optional[dict] = None
    
    class Config:
        from_attributes = True

class GroupMessageResponse(BaseModel):
    id: int
    group_id: int
    sender_id: int
    content: str
    reactions: Optional[dict] = None
    created_at: datetime
    sender_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class GroupMarksUpdate(BaseModel):
    phase1_marks: Optional[int] = None
    phase2_marks: Optional[int] = None
    phase3_marks: Optional[int] = None
    phase1_detail_marks: Optional[dict] = None
    phase2_detail_marks: Optional[dict] = None
    phase3_detail_marks: Optional[dict] = None
    phase1_observations: Optional[str] = None
    phase2_observations: Optional[str] = None
    phase3_observations: Optional[str] = None
    chief_mentor_name: Optional[str] = None
    chief_mentor_designation: Optional[str] = None
    chief_mentor_department: Optional[str] = None
    evaluators: Optional[List[str]] = None
    student_evaluations: Optional[dict] = None

class MentorActionRequest(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    rejection_reason: Optional[str] = None

class GroupLeaveRequest(BaseModel):
    reason: Optional[str] = None
