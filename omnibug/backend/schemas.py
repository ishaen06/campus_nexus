from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# --- Enums ---

class UserRole(str, Enum):
    ADMIN = "admin"
    LEAD_DEV = "lead_dev"
    DEVELOPER = "developer"
    QA_ENGINEER = "qa_engineer"
    REPORTER = "reporter"
    VIEWER = "viewer"

class BugSeverity(str, Enum):
    BLOCKER = "blocker"
    CRITICAL = "critical"
    MAJOR = "major"
    NORMAL = "normal"
    MINOR = "minor"
    TRIVIAL = "trivial"
    ENHANCEMENT = "enhancement"

class BugPriority(str, Enum):
    P1_URGENT = "p1_urgent"
    P2_HIGH = "p2_high"
    P3_MEDIUM = "p3_medium"
    P4_LOW = "p4_low"
    P5_BACKLOG = "p5_backlog"

class BugStatus(str, Enum):
    UNCONFIRMED = "unconfirmed"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    VERIFIED = "verified"
    CLOSED = "closed"
    REOPENED = "reopened"

class BugResolution(str, Enum):
    FIXED = "fixed"
    INVALID = "invalid"
    WONTFIX = "wontfix"
    DUPLICATE = "duplicate"
    WORKSFORME = "worksforme"
    NOT_A_BUG = "not_a_bug"
    DEFERRED = "deferred"
    MITIGATED = "mitigated"

# --- User Models ---

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: UserRole = UserRole.DEVELOPER
    avatar_url: Optional[str] = None
    team: Optional[str] = "Engineering"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class UserOut(UserBase):
    id: str
    email_verified: bool = False
    created_at: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str

class RegisterInitRequest(BaseModel):
    email: str
    full_name: str
    username: Optional[str] = None
    role: UserRole = UserRole.QA_ENGINEER
    team: Optional[str] = "Quality Assurance"

class VerifyCodeResponse(BaseModel):
    verified: bool
    email: str
    message: str

class SetPasswordWithTokenRequest(BaseModel):
    token: str
    email: str
    password: str

class ValidateTokenResponse(BaseModel):
    valid: bool
    email: str
    full_name: Optional[str] = None
    message: Optional[str] = None

class AuthMessageResponse(BaseModel):
    message: str
    email: str
    verification_link: Optional[str] = None
    verification_token: Optional[str] = None
    verification_code_preview: Optional[str] = None
    user: Optional[UserOut] = None

# --- Sub-schemas for Bugs ---

class ReproductionStep(BaseModel):
    step_number: int
    action: str
    expected: Optional[str] = None
    actual: Optional[str] = None
    is_verified: bool = False

class BugEnvironment(BaseModel):
    os: Optional[str] = "Unknown"
    browser: Optional[str] = "Unknown"
    version: Optional[str] = "1.0.0"
    hardware: Optional[str] = "x86_64"
    runtime: Optional[str] = None
    environment_type: Optional[str] = "production"  # production, staging, local, ci

class RootCauseAnalysis(BaseModel):
    category: Optional[str] = "code_defect"  # code_defect, race_condition, memory_leak, config_error, api_contract_break, regression
    description: Optional[str] = None
    suggested_fix: Optional[str] = None
    suggested_diff: Optional[str] = None
    confidence_score: Optional[float] = 0.0

class BugFlags(BaseModel):
    needinfo: bool = False
    needinfo_from: Optional[str] = None
    review_requested: bool = False
    qa_approved: bool = False
    security_reviewed: bool = False

# --- Product, Component, Milestone Models ---

class ComponentBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_assignee_id: Optional[str] = None
    default_qa_contact_id: Optional[str] = None

class ComponentCreate(ComponentBase):
    product_id: str

class ComponentOut(ComponentBase):
    id: str
    product_id: str

class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_date: Optional[str] = None
    status: str = "open"  # open, active, closed
    is_release_blocker: bool = False
    release_notes: Optional[str] = None

class MilestoneCreate(MilestoneBase):
    product_id: str

class MilestoneOut(MilestoneBase):
    id: str
    product_id: str
    open_defects_count: Optional[int] = 0
    total_defects_count: Optional[int] = 0
    readiness_score: Optional[float] = 0.0

class ProductBase(BaseModel):
    name: str
    key_prefix: str
    description: Optional[str] = None
    lead_user_id: Optional[str] = None
    default_assignee_id: Optional[str] = None
    versions: List[str] = []

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: str
    components: List[ComponentOut] = []
    milestones: List[MilestoneOut] = []
    total_defects: int = 0
    open_defects: int = 0

# --- Git Integration Models ---

class GitCommitModel(BaseModel):
    id: Optional[str] = None
    bug_id: str
    commit_sha: str
    message: str
    author: str
    branch: Optional[str] = "main"
    repo_name: Optional[str] = "core-engine"
    diff_snippet: Optional[str] = None
    web_url: Optional[str] = None
    created_at: Optional[datetime] = None

class GitWebhookPayload(BaseModel):
    repo_name: str
    branch: Optional[str] = "main"
    commits: List[Dict[str, Any]]
    sender: Optional[str] = None

# --- Comments & Activity Audit Models ---

class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False
    attachments: List[str] = []

class CommentOut(BaseModel):
    id: str
    bug_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    user_role: str = "developer"
    content: str
    is_internal: bool = False
    reactions: Dict[str, List[str]] = {}  # e.g., {"👍": ["user1", "user2"]}
    attachments: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

class ActivityLogOut(BaseModel):
    id: str
    bug_id: str
    bug_key: Optional[str] = None
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    action_type: str  # created, updated_status, assigned, added_comment, linked_commit, marked_duplicate, etc.
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime

# --- Bug / Defect Models ---

class BugBase(BaseModel):
    title: str
    description: str
    product_id: str
    component_id: str
    severity: BugSeverity = BugSeverity.NORMAL
    priority: BugPriority = BugPriority.P3_MEDIUM
    status: BugStatus = BugStatus.UNCONFIRMED
    resolution: Optional[BugResolution] = None
    milestone_id: Optional[str] = None
    version: Optional[str] = "1.0.0"
    
    assignee_id: Optional[str] = None
    qa_contact_id: Optional[str] = None
    cc_user_ids: List[str] = []
    
    tags: List[str] = []
    is_security_vulnerability: bool = False
    
    environment: BugEnvironment = BugEnvironment()
    reproduction_steps: List[ReproductionStep] = []
    stack_trace: Optional[str] = None
    
    blocks: List[str] = []       # List of bug keys or IDs this bug blocks
    depends_on: List[str] = []   # List of bug keys or IDs this bug depends on
    duplicate_of: Optional[str] = None
    
    estimated_hours: Optional[float] = 0.0
    spent_hours: Optional[float] = 0.0
    remaining_hours: Optional[float] = 0.0
    sla_due_hours: Optional[int] = 48  # Default 48h SLA for normal bugs
    
    flags: BugFlags = BugFlags()

class BugCreate(BugBase):
    pass

class BugUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    product_id: Optional[str] = None
    component_id: Optional[str] = None
    severity: Optional[BugSeverity] = None
    priority: Optional[BugPriority] = None
    status: Optional[BugStatus] = None
    resolution: Optional[BugResolution] = None
    milestone_id: Optional[str] = None
    version: Optional[str] = None
    assignee_id: Optional[str] = None
    qa_contact_id: Optional[str] = None
    cc_user_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_security_vulnerability: Optional[bool] = None
    environment: Optional[BugEnvironment] = None
    reproduction_steps: Optional[List[ReproductionStep]] = None
    stack_trace: Optional[str] = None
    root_cause_analysis: Optional[RootCauseAnalysis] = None
    blocks: Optional[List[str]] = None
    depends_on: Optional[List[str]] = None
    duplicate_of: Optional[str] = None
    estimated_hours: Optional[float] = None
    spent_hours: Optional[float] = None
    remaining_hours: Optional[float] = None
    flags: Optional[BugFlags] = None

class BugTransitionRequest(BaseModel):
    to_status: BugStatus
    resolution: Optional[BugResolution] = None
    comment: Optional[str] = None
    root_cause_category: Optional[str] = None
    duplicate_of: Optional[str] = None

class BugBulkAction(BaseModel):
    bug_ids: List[str]
    action: str  # set_status, set_priority, set_severity, assign, set_milestone, delete
    value: Any
    comment: Optional[str] = None

class BugOut(BugBase):
    id: str
    key: str  # e.g., GEC-101
    reporter_id: str
    reporter_name: Optional[str] = None
    reporter_avatar: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_avatar: Optional[str] = None
    qa_contact_name: Optional[str] = None
    product_name: Optional[str] = None
    component_name: Optional[str] = None
    milestone_name: Optional[str] = None
    root_cause_analysis: Optional[RootCauseAnalysis] = None
    duplicates_count: int = 0
    comments_count: int = 0
    commits_count: int = 0
    sla_breached: bool = False
    sla_time_left_hours: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

# --- AI Triage & Analytics Models ---

class AITriageRequest(BaseModel):
    title: str
    description: str
    stack_trace: Optional[str] = None
    product_id: Optional[str] = None

class AITriageResponse(BaseModel):
    predicted_severity: BugSeverity
    predicted_component: Optional[str] = None
    root_cause_hypothesis: str
    suggested_fix_strategy: str
    suggested_diff_patch: Optional[str] = None
    confidence_score: float
    detected_error_type: Optional[str] = None
    security_risk_assessment: Optional[str] = None

class DuplicateCheckRequest(BaseModel):
    title: str
    description: str
    product_id: Optional[str] = None

class DuplicateMatch(BaseModel):
    id: str
    key: str
    title: str
    status: str
    similarity_score: float
    match_reason: str

class DuplicateCheckResponse(BaseModel):
    is_likely_duplicate: bool
    highest_score: float
    matches: List[DuplicateMatch]

class NLSearchRequest(BaseModel):
    query: str

class SavedQueryModel(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    filter_criteria: Dict[str, Any]
    is_public: bool = False
    created_at: Optional[datetime] = None
