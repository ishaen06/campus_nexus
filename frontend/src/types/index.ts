export type UserRole = 'admin' | 'lead_dev' | 'developer' | 'qa_engineer' | 'reporter' | 'viewer';

export type BugSeverity = 'blocker' | 'critical' | 'major' | 'normal' | 'minor' | 'trivial' | 'enhancement';

export type BugPriority = 'p1_urgent' | 'p2_high' | 'p3_medium' | 'p4_low' | 'p5_backlog';

export type BugStatus = 'unconfirmed' | 'confirmed' | 'in_progress' | 'in_review' | 'resolved' | 'verified' | 'closed' | 'reopened';

export type BugResolution = 'fixed' | 'invalid' | 'wontfix' | 'duplicate' | 'worksforme' | 'not_a_bug' | 'deferred' | 'mitigated';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  team?: string;
  email_verified?: boolean;
  created_at?: string;
}

export interface AuthMessageResponse {
  message: string;
  email: string;
  verification_link?: string;
  verification_token?: string;
  verification_code_preview?: string;
  user?: User;
}

export interface ReproductionStep {
  step_number: number;
  action: string;
  expected?: string;
  actual?: string;
  is_verified: boolean;
}

export interface BugEnvironment {
  os?: string;
  browser?: string;
  version?: string;
  hardware?: string;
  runtime?: string;
  environment_type?: string;
}

export interface RootCauseAnalysis {
  category?: string;
  description?: string;
  suggested_fix?: string;
  suggested_diff?: string;
  confidence_score?: number;
}

export interface BugFlags {
  needinfo?: boolean;
  needinfo_from?: string;
  review_requested?: boolean;
  qa_approved?: boolean;
  security_reviewed?: boolean;
}

export interface Bug {
  id: string;
  key: string;
  title: string;
  description: string;
  product_id: string;
  component_id: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  resolution?: BugResolution | null;
  milestone_id?: string;
  version?: string;
  reporter_id: string;
  reporter_name?: string;
  reporter_avatar?: string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  qa_contact_id?: string;
  qa_contact_name?: string;
  cc_user_ids?: string[];
  product_name?: string;
  component_name?: string;
  milestone_name?: string;
  tags: string[];
  is_security_vulnerability: boolean;
  environment: BugEnvironment;
  reproduction_steps: ReproductionStep[];
  stack_trace?: string;
  root_cause_analysis?: RootCauseAnalysis;
  blocks: string[];
  depends_on: string[];
  duplicate_of?: string | null;
  duplicates_count?: number;
  estimated_hours?: number;
  spent_hours?: number;
  remaining_hours?: number;
  sla_due_hours?: number;
  sla_breached?: boolean;
  sla_time_left_hours?: number | null;
  flags: BugFlags;
  comments_count?: number;
  commits_count?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface Component {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  default_assignee_id?: string;
  default_qa_contact_id?: string;
}

export interface Milestone {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  target_date?: string;
  status: string;
  is_release_blocker: boolean;
  release_notes?: string;
  open_defects_count?: number;
  total_defects_count?: number;
  readiness_score?: number;
}

export interface Product {
  id: string;
  name: string;
  key_prefix: string;
  description?: string;
  lead_user_id?: string;
  default_assignee_id?: string;
  versions: string[];
  components: Component[];
  milestones: Milestone[];
  total_defects: number;
  open_defects: number;
}

export interface Comment {
  id: string;
  bug_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_role: string;
  content: string;
  is_internal: boolean;
  reactions: Record<string, string[]>;
  attachments: string[];
  created_at: string;
  updated_at?: string;
}

export interface GitCommit {
  id: string;
  bug_id: string;
  commit_sha: string;
  message: string;
  author: string;
  branch: string;
  repo_name: string;
  diff_snippet?: string;
  web_url?: string;
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  bug_id: string;
  bug_key?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface AITriageResponse {
  predicted_severity: BugSeverity;
  predicted_component?: string;
  detected_error_type?: string;
  root_cause_hypothesis: string;
  suggested_fix_strategy: string;
  suggested_diff_patch?: string;
  confidence_score: number;
  security_risk_assessment?: string;
}

export interface DuplicateMatch {
  id: string;
  key: string;
  title: string;
  status: string;
  similarity_score: number;
  match_reason: string;
}

export interface DuplicateCheckResponse {
  is_likely_duplicate: boolean;
  highest_score: number;
  matches: DuplicateMatch[];
}

export interface AnalyticsSummary {
  total_defects: number;
  open_defects: number;
  resolved_defects: number;
  blockers_count: number;
  critical_count: number;
  security_vulnerabilities_count: number;
  mttr_hours: number;
  sla_compliance_percentage: number;
  release_readiness_score: number;
}

export interface ComponentDefectDensity {
  component_id: string;
  component_name: string;
  product_id: string;
  total_defects: number;
  open_defects: number;
  blockers: number;
  critical: number;
  major: number;
  normal: number;
  risk_score: number;
}

export interface BurndownPoint {
  date: string;
  ideal_remaining: number;
  actual_remaining: number;
  resolved_cumulative: number;
}
