import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertOctagon, 
  Users, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Search,
  Mail,
  ChevronRight,
  X,
  UserPlus,
  Trash2,
  GitMerge,
  Filter,
  Check,
  Slash,
  GraduationCap,
  Briefcase,
  UserCheck,
  UserX,
  AlertTriangle,
  Award,
  Star,
  Download,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';



interface Report {
  id: number;
  reporter: { id: number; name: string } | null;
  reported: { id: number; name: string } | null;
  reason: string;
  created_at: string;
}

interface AnalyticsData {
  counts: {
    total_students: number;
    total_mentors: number;
    total_teams: number;
    approved_teams: number;
    pending_teams: number;
    total_events: number;
    total_notifications: number;
    total_projects?: number;
    active_projects?: number;
    pending_approvals?: number;
    students_without_teams?: number;
    teams_without_mentors?: number;
    evaluations_completed?: number;
  };
  students_by_branch: Record<string, number>;
  teams_by_department: Record<string, number>;
  mentor_workload: Record<string, number>;
  project_approval_status: {
    APPROVED: number;
    PENDING: number;
    REJECTED: number;
    "NOT SUBMITTED": number;
  };
  event_registrations: Record<string, number>;
  team_formation_progress?: {
    in_teams: number;
    without_teams: number;
  };
  project_status_distribution?: {
    Completed: number;
    Ongoing: number;
    Pending: number;
  };
  monthly_project_creation_trend?: Record<string, number>;
  selected_year?: number | null;
  year_breakdown?: {
    all?: { students: number; teams: number };
    [key: string]: { students: number; teams: number } | undefined;
  };
  students?: Array<{
    id: number;
    full_name: string;
    usn: string;
    email: string;
    branch: string;
    year_of_study: number;
    cycle: string;
    has_team: boolean;
    team_id?: number | null;
    team_name?: string;
    mentor_name?: string | null;
  }>;
  teams?: Array<{
    id: number;
    name: string;
    project_topic: string;
    project_theme: string;
    mentor_name: string;
    mentor_status: string;
    member_count: number;
    members: Array<{ id: number; name: string; usn: string; branch: string }>;
    team_year: number;
  }>;
}



interface MatchedUser {
  id: number;
  full_name: string;
  email: string;
  usn: string;
  branch: string;
  department: string;
  post: string;
  is_mentor: boolean;
  bio: string;
  cycle: string;
  group: { 
    id: number; 
    name: string; 
    project_topic: string;
    project_sub_topic?: string;
    project_theme?: string;
    mentor_name?: string;
  } | null;
}

interface MatchedTeam {
  id: number;
  name: string;
  project_topic: string;
  mentor_name: string;
  mentor_email: string;
  mentor_status: string;
  members: string[];
}

interface MentorData {
  id: number;
  full_name: string;
  email: string;
  department: string;
  post: string;
  bio: string;
  workload: number;
  assigned_teams: {
    id: number;
    name: string;
    project_topic: string;
    mentor_status: string;
    students: string[];
  }[];
  assigned_students: string[];
}

interface UnassignedTeam {
  id: number;
  name: string;
  project_topic: string;
  mentor_name: string;
  mentor_email: string;
  mentor_status: string;
}

interface TeamData {
  id: number;
  name: string;
  project_topic: string;
  mentor_name: string;
  mentor_email: string;
  mentor_status: string;
  team_year?: number;
  members: {
    id: number;
    full_name: string;
    usn: string;
    email: string;
    branch: string;
    cycle: string;
    year_of_study?: number;
  }[];
}


export const resolveStudentYear = (s: any): number => {
  const email = (s?.email || s?.user_email || '').toLowerCase().trim();
  const usn = (s?.usn || '').toUpperCase().trim();

  // 1. Check USN admission year (e.g. 1RV25CS126 or 1RZ25CS126 -> cohort year is 25, 126 is roll number)
  if (usn) {
    const usnMatch = usn.match(/^1[A-Z]{2}(\d{2})[A-Z]{2,4}\d+/);
    if (usnMatch) {
      const yy = parseInt(usnMatch[1], 10);
      if (yy === 26) return 1;
      if (yy === 25) return 2;
      if (yy === 24) return 3;
      if (yy === 23) return 4;
    }
  }

  // 2. Check RVCE Email admission year (e.g. prekshar.cs25@rvce.edu.in -> cohort year is 25)
  if (email) {
    const emailMatch = email.match(/[a-z]{2,4}(\d{2})@rvce\.edu\.in/);
    if (emailMatch) {
      const yy = parseInt(emailMatch[1], 10);
      if (yy === 26) return 1;
      if (yy === 25) return 2;
      if (yy === 24) return 3;
      if (yy === 23) return 4;
    }
    const looseMatch = email.match(/(?:^|\.)[a-z]{2,4}(23|24|25|26)(?:@|$)/);
    if (looseMatch) {
      const yy = parseInt(looseMatch[1], 10);
      if (yy === 26) return 1;
      if (yy === 25) return 2;
      if (yy === 24) return 3;
      if (yy === 23) return 4;
    }
  }

  // 3. Fallback to year_of_study if valid
  if (s?.year_of_study && Number(s.year_of_study) >= 1 && Number(s.year_of_study) <= 4) {
    return Number(s.year_of_study);
  }

  // 4. Cycle check (only 1st year students are divided into cycles)
  const cycle = (s?.cycle || '').toUpperCase();
  if (cycle && cycle !== 'N/A' && cycle !== 'NONE') return 1;

  return 2;
};


export const resolveTeamYear = (t: any): number => {
  if (t?.team_year && Number(t.team_year) >= 1 && Number(t.team_year) <= 4) {
    return Number(t.team_year);
  }
  const members = t?.members || [];
  for (const m of members) {
    if (typeof m === 'object' && m !== null) {
      const yr = resolveStudentYear(m);
      if (yr) return yr;
    }
  }
  const name = (t?.name || '').toLowerCase();
  const topic = (t?.project_topic || '').toLowerCase();
  if (name.includes('26') || topic.includes('26')) return 1;
  if (name.includes('25') || topic.includes('25')) return 2;
  if (name.includes('24') || topic.includes('24')) return 3;
  return 2;
};

interface AdminDashboardProps {
  tab?: 'moderation' | 'analytics' | 'search' | 'mentors' | 'teams' | 'reports' | 'academic' | 'ratings';
}

export default function AdminDashboard({ tab }: AdminDashboardProps) {
  const navigate = useNavigate();
  const activeTab = tab || 'moderation';

  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [globalYear, setGlobalYear] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('admin_selected_year');
      return saved !== null && saved !== 'null' && saved !== '' ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [analyticsRosterTab, setAnalyticsRosterTab] = useState<'students' | 'teams'>('students');
  const [analyticsRosterSearch, setAnalyticsRosterSearch] = useState('');


  // Search states



  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: MatchedUser[]; teams: MatchedTeam[] }>({ users: [], teams: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<MatchedUser[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [userListFilter, setUserListFilter] = useState<'all' | 'students' | 'mentors'>('all');
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<MatchedUser | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 7);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Mentor management states
  const [mentors, setMentors] = useState<MentorData[]>([]);
  const [allTeams, setAllTeams] = useState<UnassignedTeam[]>([]);
  const [mentorQuery, setMentorQuery] = useState('');
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [expandedMentorId, setExpandedMentorId] = useState<number | null>(null);

  // Team management states
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Academic Settings states
  const [academicSettings, setAcademicSettings] = useState<{
    session_start_month: number;
    branch_mappings: Record<string, string>;
    cycle_mappings: Record<string, string>;
    branch_counts: Record<string, number>;
    total_students: number;
  } | null>(null);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [academicSaving, setAcademicSaving] = useState(false);
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCycle, setNewBranchCycle] = useState<'C' | 'P'>('C');
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState('ishaensbethur.cs25@rvce.edu.in');
  const [branchFilter, setBranchFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamsSearchText, setTeamsSearchText] = useState('');
  const [rejectingTeamId, setRejectingTeamId] = useState<number | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Report Preview states
  const [previewDataset, setPreviewDataset] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string | null>(null);
  const [previewYear, setPreviewYear] = useState<number>(1);
  const [previewData, setPreviewData] = useState<{ title: string; columns: string[]; preview: any[]; total_rows: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Year-wise Report Center states
  const [reportYearTab, setReportYearTab] = useState<number>(() => {
    const saved = localStorage.getItem('admin_selected_year');
    if (saved && saved !== 'null') {
      const num = parseInt(saved, 10);
      if ([1, 2, 3].includes(num)) return num;
    }
    return 1;
  });
  const [reportViewLayout, setReportViewLayout] = useState<'tabs' | 'sections'>('tabs');
  const [cardYearMap, setCardYearMap] = useState<Record<string, number>>({});


  // Ratings tab states
  const [ratingsData, setRatingsData] = useState<{
    total: number;
    average_score: number;
    breakdown: Record<number, number>;
    category_counts: Record<string, number>;
    tag_counts: Record<string, number>;
    ratings: any[];
  } | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [ratingSearchQuery, setRatingSearchQuery] = useState('');
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'student' | 'mentor'>('all');
  const [onlyWithFeedback, setOnlyWithFeedback] = useState(false);


  const fetchReports = async (yearOverride?: number | null) => {
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const url = yearToFetch ? `/admin/reports?year=${yearToFetch}` : '/admin/reports';
      const res = await api.get(url);
      setReports(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (yearOverride?: number | null) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const url = yearToFetch ? `/admin/analytics?year=${yearToFetch}` : '/admin/analytics';
      const res = await api.get(url);
      setAnalytics(res.data || null);
    } catch (err: any) {
      console.error("Failed to load analytics data", err);
      setAnalyticsError(err.response?.data?.detail || "Failed to load database metrics. Please ensure the backend server is running.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchMentorsData = async (yearOverride?: number | null) => {
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const res = await api.get('/admin/mentors');
      setMentors(res.data || []);
      const url = yearToFetch ? `/admin/unassigned-teams?year=${yearToFetch}` : '/admin/unassigned-teams';
      const resTeams = await api.get(url);
      setAllTeams(resTeams.data || []);
    } catch (err) {
      console.error("Failed to fetch mentor management data", err);
    } finally {
      setMentorsLoading(false);
    }
  };

  const fetchTeamsData = async (yearOverride?: number | null) => {
    setTeamsLoading(true);
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const url = yearToFetch ? `/admin/teams?year=${yearToFetch}` : '/admin/teams';
      const res = await api.get(url);
      setTeams(res.data || []);
    } catch (err) {
      console.error("Failed to fetch teams data", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchAllUsers = async (yearOverride?: number | null) => {
    setAllUsersLoading(true);
    setDirectoryError(null);
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const url = yearToFetch ? `/admin/users?year=${yearToFetch}` : '/admin/users';
      const res = await api.get(url);
      setAllUsers(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch all users', err);
      setDirectoryError(err.response?.data?.detail || err.message || 'Failed to load directory');
    } finally {
      setAllUsersLoading(false);
    }
  };

  const handleGlobalYearChange = (yr: number | null) => {
    setGlobalYear(yr);
    if (yr !== null) {
      setReportYearTab(yr);
    }
    try {
      localStorage.setItem('admin_selected_year', yr === null ? 'null' : String(yr));
    } catch (_) {}
    fetchAnalytics(yr);
    fetchTeamsData(yr);
    fetchMentorsData(yr);
    fetchAllUsers(yr);
    fetchReports(yr);
    fetchAcademicSettings(yr);
  };

  const fetchAcademicSettings = async (yearOverride?: number | null) => {
    setAcademicLoading(true);
    try {
      const yearToFetch = yearOverride !== undefined ? yearOverride : globalYear;
      const url = yearToFetch !== null ? `/admin/academic-settings?year=${yearToFetch}` : '/admin/academic-settings';
      const res = await api.get(url);
      setAcademicSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch academic settings", err);
    } finally {
      setAcademicLoading(false);
    }
  };


  const handleUpdateCycle = async (code: string, newCycle: 'C' | 'P') => {
    if (!academicSettings) return;
    const currentMappings = academicSettings.cycle_mappings || {};
    const previousCycle = currentMappings[code];
    const updatedCycles = { ...currentMappings, [code]: newCycle };
    
    // Optimistic UI update
    setAcademicSettings(prev => prev ? { ...prev, cycle_mappings: updatedCycles } : prev);
    
    const doUpdate = async () => {
      const res = await api.put('/admin/academic-settings', { cycle_mappings: updatedCycles });
      if (res.data?.cycle_mappings) {
        setAcademicSettings(prev => prev ? { ...prev, cycle_mappings: res.data.cycle_mappings } : prev);
      }
    };

    try {
      await doUpdate();
    } catch (err: any) {
      const isNetworkError = !err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK');
      if (isNetworkError) {
        // Server may be cold-starting — ping to wake it, then retry once
        try {
          await api.get('/ping');
        } catch (_) { /* ignore ping errors */ }
        try {
          await doUpdate();
          return; // retry succeeded
        } catch (retryErr: any) {
          console.error('Cycle update retry also failed', retryErr);
          setAcademicSettings(prev => prev ? { ...prev, cycle_mappings: { ...currentMappings, [code]: previousCycle } } : prev);
          alert(`Cycle Update: Server is starting up, please wait a moment and try again.`);
          return;
        }
      }
      // Non-network error (4xx/5xx): show real server message
      console.error('Failed to update cycle mapping', err);
      setAcademicSettings(prev => prev ? { ...prev, cycle_mappings: { ...currentMappings, [code]: previousCycle } } : prev);
      const errMsg = err.response?.data?.detail || err.message || 'Unknown error';
      alert(`Cycle Update failed: ${errMsg}`);
    }
  };

  const handleSaveAcademicSettings = async () => {
    if (!academicSettings) return;
    setAcademicSaving(true);
    try {
      await api.put('/admin/academic-settings', {
        session_start_month: academicSettings.session_start_month,
        branch_mappings: academicSettings.branch_mappings,
        cycle_mappings: academicSettings.cycle_mappings
      });
      alert("Academic settings updated successfully!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update settings");
    } finally {
      setAcademicSaving(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchCode || !newBranchName) {
      alert("Please provide both branch code and full name.");
      return;
    }
    try {
      await api.post('/admin/academic-settings/branches', {
        code: newBranchCode,
        name: newBranchName,
        cycle: newBranchCycle
      });
      setNewBranchCode('');
      setNewBranchName('');
      setIsAddBranchOpen(false);
      fetchAcademicSettings();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add branch");
    }
  };

  const handleDeleteBranch = async (code: string) => {
    if (!window.confirm(`Are you sure you want to remove the '${code}' branch?`)) return;
    try {
      await api.delete(`/admin/academic-settings/branches/${code}`);
      fetchAcademicSettings();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove branch");
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Trigger search on debounced query change or globalYear change
  useEffect(() => {
    const performSearch = async () => {
      const q = debouncedQuery.trim();
      if (!q) {
        setSearchResults({ users: [], teams: [] });
        return;
      }
      setSearchLoading(true);
      try {
        const url = globalYear ? `/admin/search?q=${encodeURIComponent(q)}&year=${globalYear}` : `/admin/search?q=${encodeURIComponent(q)}`;
        const res = await api.get(url);
        setSearchResults(res.data || { users: [], teams: [] });
        addRecentSearch(q);
      } catch (err) {
        console.error("Failed to perform global search", err);
      } finally {
        setSearchLoading(false);
      }
    };
    performSearch();
  }, [debouncedQuery, globalYear]);

  useEffect(() => {
    fetchReports(globalYear);
    fetchAnalytics(globalYear);
    fetchMentorsData(globalYear);
    fetchTeamsData(globalYear);
    fetchAcademicSettings(globalYear);
    fetchAllUsers(globalYear);


    // Auto-refresh analytics every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics(globalYear);
    }, 30000);

    return () => clearInterval(interval);
  }, []);


  // Sync URL search query parameters to teamsSearchText in Teams tab
  useEffect(() => {
    if (activeTab === 'teams') {
      const params = new URLSearchParams(window.location.search);
      const teamSearch = params.get('teamSearch');
      if (teamSearch) {
        setTeamsSearchText(teamSearch);
      }
    }
  }, [activeTab, window.location.search]);

  const fetchRatings = async () => {
    setRatingsLoading(true);
    setRatingsError(null);
    try {
      const res = await api.get('/ratings/admin/all');
      setRatingsData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch ratings', err);
      setRatingsError(err.response?.data?.detail || 'Failed to load ratings');
    } finally {
      setRatingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ratings') {
      fetchRatings();
    }
  }, [activeTab]);

  const handleDeleteRating = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete the rating from "${userName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/ratings/admin/${userId}`);
      fetchRatings();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete rating');
    }
  };

  const handleExportRatingsCSV = () => {
    if (!ratingsData || !ratingsData.ratings || ratingsData.ratings.length === 0) {
      alert('No ratings available to export.');
      return;
    }
    const headers = ['User Name', 'Email', 'USN / Dept', 'Role', 'Rating (Score)', 'Tags', 'Feedback / Review', 'Submitted At'];
    const rows = ratingsData.ratings.map(r => [
      `"${(r.user_name || '').replace(/"/g, '""')}"`,
      `"${(r.user_email || '').replace(/"/g, '""')}"`,
      `"${(r.usn || r.department || '').replace(/"/g, '""')}"`,
      `"${r.is_mentor ? 'Mentor' : 'Student'}"`,
      r.score,
      `"${(r.tags || []).join(', ')}"`,
      `"${(r.feedback || '').replace(/"/g, '""')}"`,
      `"${r.updated_at || r.created_at || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_nexus_ratings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Fallback directory populator in case /admin/users fails (e.g. during backend deployment rollout)
  useEffect(() => {
    if (allUsers.length === 0 && mentors.length > 0 && teams.length > 0) {
      console.warn("Using fallback local aggregation for Platform Directory");
      const aggregated: MatchedUser[] = [];
      
      // 1. Add mentors
      mentors.forEach(m => {
        aggregated.push({
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          usn: 'N/A',
          branch: 'N/A',
          department: m.department || 'N/A',
          post: m.post || 'N/A',
          is_mentor: true,
          bio: m.bio || '',
          cycle: 'N/A',
          group: null
        });
      });
      
      // 2. Add students from teams
      const seenStudentIds = new Set<number>();
      teams.forEach(t => {
        (t.members || []).forEach(mem => {
          if (!seenStudentIds.has(mem.id)) {
            seenStudentIds.add(mem.id);
            aggregated.push({
              id: mem.id,
              full_name: mem.full_name,
              email: mem.email,
              usn: mem.usn || 'N/A',
              branch: mem.branch || 'N/A',
              department: 'N/A',
              post: 'N/A',
              is_mentor: false,
              bio: '',
              cycle: mem.cycle || 'N/A',
              group: { id: t.id, name: t.name, project_topic: t.project_topic }
            });
          }
        });
      });
      
      // Sort mentors first, then students by name
      aggregated.sort((a, b) => {
        if (a.is_mentor && !b.is_mentor) return -1;
        if (!a.is_mentor && b.is_mentor) return 1;
        return a.full_name.localeCompare(b.full_name);
      });
      
      setAllUsers(aggregated);
    }
  }, [mentors, teams, allUsers.length]);

  const handleBan = async (userId: number, reportId?: number) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    
    if (reportId) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
    try {
      await api.post(`/admin/ban/${userId}`);
      if (reportId) {
        await api.post(`/admin/reports/${reportId}/dismiss`).catch(() => {});
      }
      alert("User has been banned.");
      fetchReports();
    } catch (err: any) {
      alert("Failed to ban user");
      fetchReports();
    }
  };

  const handleDismissReport = async (reportId: number) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    try {
      await api.post(`/admin/reports/${reportId}/dismiss`);
    } catch (err: any) {
      console.error("Failed to dismiss report", err);
      fetchReports();
    }
  };

  const handleAssignMentor = async (groupId: number, mentorId: number) => {
    try {
      await api.post(`/admin/groups/${groupId}/assign-mentor?mentor_id=${mentorId}`);
      alert("Mentor assigned successfully.");
      fetchMentorsData();
      fetchTeamsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to assign mentor.");
    }
  };

  const handleRemoveMentor = async (groupId: number) => {
    if (!window.confirm("Are you sure you want to remove the mentor from this project?")) return;
    try {
      await api.post(`/admin/groups/${groupId}/remove-mentor`);
      alert("Mentor removed successfully.");
      fetchMentorsData();
      fetchTeamsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove mentor.");
    }
  };

  // Team Management updates
  const handleApproveProject = async (groupId: number) => {
    try {
      await api.post(`/admin/groups/${groupId}/approve`);
      alert("Project theme approved successfully.");
      fetchTeamsData();
      fetchMentorsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve project theme.");
    }
  };

  const handleRejectProject = async (groupId: number) => {
    if (!rejectionReasonText.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.post(`/admin/groups/${groupId}/reject?rejection_reason=${encodeURIComponent(rejectionReasonText)}`);
      alert("Project theme rejected.");
      setRejectingTeamId(null);
      setRejectionReasonText('');
      fetchTeamsData();
      fetchMentorsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject project theme.");
    }
  };

  const handleDissolveTeam = async (groupId: number) => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to force-dissolve this team? This deletes the team chat, all messages, members list, and EVALUATIONS permanently!")) return;
    try {
      await api.post(`/admin/groups/${groupId}/dissolve`);
      alert("Team has been dissolved successfully.");
      fetchTeamsData();
      fetchMentorsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to dissolve team.");
    }
  };

  const handleMoveStudent = async (studentId: number, targetGroupId: number) => {
    const confirmationMsg = targetGroupId === 0 
      ? "Are you sure you want to remove this student from their team?"
      : `Are you sure you want to move this student to Team ID: ${targetGroupId}?`;
      
    if (!window.confirm(confirmationMsg)) return;
    try {
      const res = await api.post(`/admin/groups/move-student?student_id=${studentId}&target_group_id=${targetGroupId}`);
      alert(res.data?.detail || "Student updated successfully.");

      fetchTeamsData();
      fetchMentorsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to move student.");
    }
  };

  // Report Center trigger download
  const handleDownloadReport = async (dataset: string, format: string, yearOverride?: number | null) => {
    try {
      const activeYear = yearOverride !== undefined && yearOverride !== null 
        ? yearOverride 
        : (globalYear !== null ? globalYear : reportYearTab);
      const yearParam = `&year=${activeYear}`;
      const response = await api.get(`/admin/reports/download?dataset=${dataset}&format=${format}${yearParam}`, {
        responseType: 'blob'
      });
      
      const extensionMap: Record<string, string> = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf'
      };
      
      const mimeMap: Record<string, string> = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf'
      };
      
      let finalBlob = new Blob([response.data], { type: mimeMap[format] });

      // Client-side cohort isolation verification for CSV
      // Guarantees zero cross-cohort data bleed even under pending backend rollouts
      if (format === 'csv') {
        try {
          const rawCsv = await response.data.text();
          const lines = rawCsv.trim().split(/\r?\n/);
          if (lines.length > 1) {
            const header = lines[0];
            const filteredLines = [header];
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              const lineLower = line.toLowerCase();
              let isMatch = false;

              if (activeYear === 1) {
                // 1st Year (2026 Batch): match 26 admission year or 1st Year text
                // Strictly exclude 25 and 24 admission years
                const has25 = /1[a-z]{2}25/i.test(line) || /[a-z]{2,4}25@/i.test(line) || lineLower.includes('2nd year (2025');
                const has24 = /1[a-z]{2}24/i.test(line) || /[a-z]{2,4}24@/i.test(line) || lineLower.includes('3rd year (2024');
                if (!has25 && !has24) {
                  if (/1[a-z]{2}26/i.test(line) || /[a-z]{2,4}26@/i.test(line) || lineLower.includes('1st year') || lineLower.includes('p-cycle') || lineLower.includes('c-cycle')) {
                    isMatch = true;
                  }
                }
              } else if (activeYear === 2) {
                // 2nd Year (2025 Batch): match 25 admission year
                if (/1[a-z]{2}25/i.test(line) || /[a-z]{2,4}25@/i.test(line) || lineLower.includes('2nd year')) {
                  isMatch = true;
                }
              } else if (activeYear === 3) {
                // 3rd Year (2024 Batch): match 24 admission year
                if (/1[a-z]{2}24/i.test(line) || /[a-z]{2,4}24@/i.test(line) || lineLower.includes('3rd year')) {
                  isMatch = true;
                }
              }

              if (isMatch) {
                filteredLines.push(line);
              }
            }
            finalBlob = new Blob([filteredLines.join('\n')], { type: 'text/csv' });
          }
        } catch (filterErr) {
          console.warn("Client CSV sanitization fallback warning:", filterErr);
        }
      }

      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const yearTag = `_year${activeYear}`;
      link.setAttribute('download', `${dataset}_report${yearTag}_${dateStr}.${extensionMap[format]}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Failed to download report", err);
      alert("Failed to download report. Please check your admin permissions.");
    }
  };

  const handleTriggerPreview = async (dataset: string, format: string, yearOverride?: number | null) => {
    const activeYear = yearOverride !== undefined && yearOverride !== null 
      ? yearOverride 
      : (globalYear !== null ? globalYear : reportYearTab);
    setPreviewDataset(dataset);
    setPreviewFormat(format);
    setPreviewYear(activeYear);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/admin/reports/preview?dataset=${dataset}&year=${activeYear}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error("Failed to load report preview", err);
      alert("Failed to load report preview. Opening direct download...");
      handleDownloadReport(dataset, format, activeYear);
      setPreviewDataset(null);
      setPreviewFormat(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSwitchPreviewYear = async (newYear: number) => {
    if (!previewDataset) return;
    setPreviewYear(newYear);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/admin/reports/preview?dataset=${previewDataset}&year=${newYear}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error("Failed to switch preview year", err);
    } finally {
      setPreviewLoading(false);
    }
  };



  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 text-center max-w-md shadow-2xl border-red-200/50 bg-red-50/10 backdrop-blur-md">
          <AlertOctagon className="text-red-500 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 font-semibold text-sm leading-relaxed mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Loading moderation center...</p>
    </div>
  );

  // Filters computed lists with robust null-safety guards
  const allBranches = Array.from(new Set([
    'ASE', 'AI_ML', 'BT', 'CH', 'CV', 'CSE', 'CSE_CY', 'CSE_DS', 'EEE', 'ECE', 'ETE', 'IEM', 'ME', 'ISE', 'N/A',
    ...(teams || []).flatMap(t => (t.members || []).map(m => (m.branch || "N/A").trim().toUpperCase()))
  ])).filter(Boolean).sort();

  const allThemes = [
    "Agriculture, Livestock & Rural Development",
    "Education, Skilling & Student-Centric Solutions",
    "Health, Wellness & Traditional Medicine",
    "Urban Development, Mobility & Smart Cities",
    "Sustainability & Environment",
    "Emerging Technology, Innovation & Industry 4.0",
    "Ocean, Marine & Aerospace Technologies"
  ];

  const filteredTeams = (teams || []).filter(t => {
    if (globalYear !== null && resolveTeamYear(t) !== globalYear) return false;
    const matchesBranch = !branchFilter || (t.members || []).some(m => (m.branch || "N/A").trim().toUpperCase() === branchFilter);
    const matchesTheme = !themeFilter || (t.project_topic || "N/A").trim().toUpperCase() === themeFilter;
    const matchesStatus = !statusFilter || t.mentor_status === statusFilter;
    const matchesSearch = !teamsSearchText || 
      (t.name || "").toLowerCase().includes(teamsSearchText.toLowerCase()) || 
      String(t.id) === teamsSearchText || 
      (t.mentor_name || "").toLowerCase().includes(teamsSearchText.toLowerCase()) ||
      (t.project_topic || "").toLowerCase().includes(teamsSearchText.toLowerCase());
    return matchesBranch && matchesTheme && matchesStatus && matchesSearch;
  });

  const filteredMentors = (mentors || []).filter(m => 
    (m.full_name || "").toLowerCase().includes(mentorQuery.toLowerCase()) ||
    (m.department || "").toLowerCase().includes(mentorQuery.toLowerCase())
  );

  const filteredRatings = (ratingsData?.ratings || []).filter(r => {
    if (selectedStarFilter !== 'all' && r.score !== selectedStarFilter) return false;
    if (selectedCategoryFilter === 'student' && r.is_mentor) return false;
    if (selectedCategoryFilter === 'mentor' && !r.is_mentor) return false;
    if (onlyWithFeedback && !(r.feedback && r.feedback.trim())) return false;
    if (globalYear !== null && !r.is_mentor) {
      if (resolveStudentYear(r) !== globalYear) return false;
    }
    if (ratingSearchQuery.trim()) {
      const q = ratingSearchQuery.toLowerCase().trim();
      const matchName = (r.user_name || '').toLowerCase().includes(q);
      const matchEmail = (r.user_email || '').toLowerCase().includes(q);
      const matchFeedback = (r.feedback || '').toLowerCase().includes(q);
      const matchTags = (r.tags || []).some((t: string) => t.toLowerCase().includes(q));
      const matchUSN = (r.usn || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchFeedback && !matchTags && !matchUSN) return false;
    }
    return true;
  });

  const filteredReports = (reports || []).filter(r => {
    if (globalYear !== null) {
      const u = r.reported || (r as any).reported_user;
      if (u && !u.is_mentor) {
        if (resolveStudentYear(u) !== globalYear) return false;
      }
    }
    return true;
  });

  const filteredAllUsers = (allUsers || []).filter(u => {
    if (userListFilter === 'mentors' && !u.is_mentor) return false;
    if (userListFilter === 'students' && u.is_mentor) return false;
    if (globalYear !== null && !u.is_mentor) {
      if (resolveStudentYear(u) !== globalYear) return false;
    }
    return true;
  });

  const filteredSearchUsers = (searchResults.users || []).filter(u => {
    if (globalYear !== null && !u.is_mentor) {
      return resolveStudentYear(u) === globalYear;
    }
    return true;
  });

  const filteredSearchTeams = (searchResults.teams || []).filter(t => {
    if (globalYear !== null) {
      return resolveTeamYear(t) === globalYear;
    }
    return true;
  });

  const filteredUnassignedTeams = (allTeams || []).filter(t => {
    if (globalYear !== null && resolveTeamYear(t) !== globalYear) return false;
    return true;
  });

  const cohortStudentCounts: Record<number, number> = {
    1: analytics?.year_breakdown?.['1']?.students ?? (allUsers || []).filter(u => !u.is_mentor && !(u as any).is_admin && resolveStudentYear(u) === 1).length,
    2: analytics?.year_breakdown?.['2']?.students ?? (allUsers || []).filter(u => !u.is_mentor && !(u as any).is_admin && resolveStudentYear(u) === 2).length,
    3: analytics?.year_breakdown?.['3']?.students ?? (allUsers || []).filter(u => !u.is_mentor && !(u as any).is_admin && resolveStudentYear(u) === 3).length,
  };

  return (
    <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto py-6 px-4 md:px-8 space-y-6">
      {/* Sticky Header section with Title, Subtitle, and GLOBAL COHORT FILTER */}
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md pb-5 pt-3 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Link to="/admin/analytics" className="hover:opacity-80 transition cursor-pointer" title="Go to Analytics Dashboard">
              <ShieldAlert className="text-[#1e3a8a] w-8 h-8" />
            </Link>
            {activeTab === 'moderation' && "Moderation Logs"}

            {activeTab === 'analytics' && "Analytics Dashboard"}
            {activeTab === 'search' && "Global Database Search"}
            {activeTab === 'mentors' && "Mentor Workloads"}
            {activeTab === 'teams' && "Teams & Project Roster"}
            {activeTab === 'academic' && "Academic Settings & Subject Cycle Configuration"}
            {activeTab === 'reports' && "Report Center & Data Export"}
            {activeTab === 'ratings' && "App Ratings & User Reviews"}
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            {activeTab === 'moderation' && "Monitor campus network activity, safety logs, and report violations."}
            {activeTab === 'analytics' && "Real-time statistics, registrations, approvals, and workloads."}
            {activeTab === 'search' && "Query users, mentors, and student groups across the database."}
            {activeTab === 'mentors' && "Manage project assignment capacity, reallocations, and workload."}
            {activeTab === 'teams' && "View and filter student project teams, transfer members, and approve themes."}
            {activeTab === 'academic' && "Centralized academic profile generation, branch mappings, subject cycle allocation, and academic session settings."}
            {activeTab === 'reports' && "Export, download, and review platform records, team allocations, and grades."}
            {activeTab === 'ratings' && "Monitor real-time student and faculty satisfaction scores, feedback, and platform suggestions."}
          </p>
        </div>

        {/* Global Academic Year / Cohort Filter - Active across entire Admin Interface */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md self-start lg:self-auto flex-wrap ring-1 ring-slate-900/5">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Cohort:</span>
          </div>
          
          <button
            type="button"
            onClick={() => handleGlobalYearChange(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              globalYear === null
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>All Years</span>
          </button>

          {[
            { yr: 1, label: "1st Year", batch: "2026" },
            { yr: 2, label: "2nd Year", batch: "2025" },
            { yr: 3, label: "3rd Year", batch: "2024" }
          ].map(({ yr, label, batch }) => {
            const isSelected = globalYear === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => handleGlobalYearChange(yr)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={`${label} (${batch} Batch)`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}>
                  {batch}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Tab Panel */}
      <AnimatePresence mode="wait">
        {activeTab === 'moderation' ? (
          <motion.div 
            key="moderation"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Filtered by Global Cohort: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong>. Showing {filteredReports.length} reports.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}
            {filteredReports.map((report, index) => (

              <motion.div 
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-6 hover:bg-white/10 dark:hover:bg-slate-900/10 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm flex items-center gap-1">
                      <AlertOctagon size={11} /> Flagged
                    </span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={13} /> {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/20 dark:bg-slate-900/20 p-4 rounded-2xl border border-white/30 dark:border-slate-800/30 backdrop-blur-sm">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reporter</span>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                          <User size={12} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{report.reporter?.name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400 font-semibold">(ID: {report.reporter?.id})</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reported Target</span>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 font-bold text-xs">
                          <User size={12} />
                        </div>
                        <span className="text-sm font-extrabold text-red-600 dark:text-red-400">{report.reported?.name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400 font-semibold">(ID: {report.reported?.id})</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-red-500 bg-red-50/10 p-3.5 rounded-r-2xl border border-y-red-100/10 border-r-red-100/10">
                    <span className="block text-[9px] font-bold text-red-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MessageSquare size={10} /> Violation Reason
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-relaxed italic">"{report.reason}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDismissReport(report.id)}
                    className="w-full md:w-auto px-5 py-2.5 font-bold rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 text-sm shadow-sm cursor-pointer"
                  >
                    Dismiss
                  </motion.button>

                  {report.reported && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBan(report.reported!.id, report.id)}
                      className="w-full md:w-auto px-6 py-2.5 font-extrabold rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-700 dark:hover:text-white transition-all duration-300 text-sm shadow-sm cursor-pointer"
                    >
                      Ban User
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredReports.length === 0 && (
              <div className="text-center py-16 text-slate-400 font-semibold glass-panel p-10 max-w-md mx-auto mt-10">
                <span className="text-4xl block mb-4">🛡️</span>
                No reports found for this cohort. Everyone is behaving well!
              </div>
            )}

          </motion.div>
        ) : activeTab === 'analytics' ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {analyticsLoading ? (
              <div className="text-center py-16 text-slate-500 font-medium">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
                Loading database metrics...
              </div>
            ) : analyticsError ? (
              <div className="glass-panel p-8 text-center max-w-md mx-auto shadow-lg">
                <AlertOctagon className="text-red-500 w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Metrics Load Failed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-relaxed">{analyticsError}</p>
                <button
                  onClick={() => fetchAnalytics()}
                  className="bg-[#1e3a8a] hover:bg-[#152a63] text-white font-bold py-2.5 px-5 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
                >

                  Retry Connection
                </button>
              </div>
            ) : !analytics ? (
              <div className="text-center py-16 text-slate-400 font-semibold glass-panel p-10 max-w-sm mx-auto">
                No analytics data returned.
              </div>
            ) : (
              <>
                {/* Year-Wise Dashboard Selector */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-sm">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Year-Wise Analytics Dashboard
                        </h2>
                        {globalYear !== null && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                            {globalYear === 1 ? '1st Year' : globalYear === 2 ? '2nd Year' : '3rd Year'} Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {globalYear === null
                          ? "Showing overall metrics across all undergraduate years (1st, 2nd, and 3rd year)"
                          : globalYear === 1
                          ? "Showing 1st Year cohort metrics (foundation cycle, student onboarding, initial teams)"
                          : globalYear === 2
                          ? "Showing 2nd Year cohort metrics (experiential learning, approved projects, mentor status)"
                          : "Showing 3rd Year cohort metrics (advanced domain projects & milestone evaluations)"}
                      </p>
                    </div>
                  </div>

                  {/* Year Tabs */}
                  <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 gap-1.5 self-start md:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleGlobalYearChange(null)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        globalYear === null
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <span>All Years</span>
                      {analytics?.year_breakdown?.all && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          globalYear === null 
                            ? "bg-white/20 text-white" 
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}>
                          {analytics.year_breakdown.all.students}
                        </span>
                      )}
                    </button>

                    {[
                      { yr: 1, label: "1st Year", countKey: "1" },
                      { yr: 2, label: "2nd Year", countKey: "2" },
                      { yr: 3, label: "3rd Year", countKey: "3" }
                    ].map(({ yr, label, countKey }) => {
                      const count = analytics?.year_breakdown?.[countKey]?.students;
                      const isSelected = globalYear === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => handleGlobalYearChange(yr)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <span>{label}</span>
                          {count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected 
                                ? "bg-white/20 text-white" 
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>


                {/* 1. 8 Redesigned Statistics Cards */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Card 1: Total Students */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#1e3a8a]/40 border border-blue-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        <GraduationCap size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        Students
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.total_students ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Total Students
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 2: Total Mentors */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#1e3a8a]/40 border border-indigo-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                        <UserCheck size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                        Mentors
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.total_mentors ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Total Mentors
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 3: Total Teams */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#1e3a8a]/40 border border-violet-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                        <Layers size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-2.5 py-0.5 rounded-full">
                        Teams
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.total_teams ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Total Teams
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 4: Total Projects */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#1e3a8a]/40 border border-cyan-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
                        <Briefcase size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                        Projects
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.total_projects ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Total Projects
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 5: Active Projects */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-emerald-950/30 border border-emerald-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <CheckCircle2 size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.active_projects ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Active Projects
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 6: Pending Approvals */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-amber-950/30 border border-amber-100 dark:border-slate-800/80 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        <Clock size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2.5 py-0.5 rounded-full">
                        Pending
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.pending_approvals ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Pending Approvals
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 7: Students Without Teams */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-red-950/30 border border-red-100 dark:border-red-900/30 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                        <AlertTriangle size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-2.5 py-0.5 rounded-full">
                        Warning
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.students_without_teams ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Students Without Teams
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 8: Teams Without Mentors */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-red-950/30 border border-red-100 dark:border-red-900/30 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                        <UserX size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-2.5 py-0.5 rounded-full">
                        Warning
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.teams_without_mentors ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Teams Without Mentors
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 9: Evaluations Completed */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 shadow-sm dark:shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                        <Award size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                        Evaluations
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {analytics.counts.evaluations_completed ?? 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider">
                        Evaluations Completed
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Cohort-Scoped Quick Reports Bar */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-4">
                  {(() => {
                    const activeQuickYear = globalYear !== null ? globalYear : reportYearTab;
                    const quickYearLabel = activeQuickYear === 1 ? '1st Year (2026 Batch)' : activeQuickYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)';
                    const quickYearBadge = activeQuickYear === 1 ? '1st Yr' : activeQuickYear === 2 ? '2nd Yr' : '3rd Yr';

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/40">
                              <Download size={18} />
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span>{quickYearLabel} Reports & Data Export</span>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                  {quickYearBadge} Scoped
                                </span>
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Generate and download officially formatted institution spreadsheets strictly filtered for {quickYearLabel}.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                            {globalYear === null && (
                              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Cohort:</span>
                                {[
                                  { yr: 1, label: "1st Yr (2026)" },
                                  { yr: 2, label: "2nd Yr (2025)" },
                                  { yr: 3, label: "3rd Yr (2024)" }
                                ].map(({ yr, label }) => (
                                  <button
                                    key={yr}
                                    type="button"
                                    onClick={() => setReportYearTab(yr)}
                                    className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                      activeQuickYear === yr
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate('/admin/reports')}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Open Full Report Center</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 4 Quick Export Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {[
                            {
                              title: "Students Master List",
                              desc: `${analytics.counts.total_students} students enrolled`,
                              dataset: "students",
                              icon: Users
                            },
                            {
                              title: "Approved Teams Master",
                              desc: `${analytics.counts.approved_teams} approved teams`,
                              dataset: "approved_teams",
                              icon: CheckCircle2
                            },
                            {
                              title: "Student Marks & Rubrics",
                              desc: "Phase 1, 2, 3 marks & remarks",
                              dataset: "student_marks",
                              icon: Award
                            },
                            {
                              title: "Mentor Workloads",
                              desc: `${Object.keys(analytics.mentor_workload || {}).length} active mentors`,
                              dataset: "mentors",
                              icon: UserCheck
                            }
                          ].map((rep) => {
                            const Icon = rep.icon;
                            return (
                              <div key={rep.dataset} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-xs">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                                    <Icon size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {rep.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium truncate">
                                      {rep.desc}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadReport(rep.dataset, 'csv', activeQuickYear)}
                                    className="py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer truncate"
                                    title={`Download ${quickYearBadge} CSV`}
                                  >
                                    CSV ({quickYearBadge})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadReport(rep.dataset, 'excel', activeQuickYear)}
                                    className="py-1 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer truncate"
                                    title={`Download ${quickYearBadge} Excel`}
                                  >
                                    Excel ({quickYearBadge})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerPreview(rep.dataset, 'pdf', activeQuickYear)}
                                    className="py-1 px-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer truncate"
                                    title={`Preview / Download ${quickYearBadge} PDF`}
                                  >
                                    PDF ({quickYearBadge})
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 2. Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Team Formation Progress (Donut Chart) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="glass-panel p-6 space-y-6 flex flex-col"
                  >
                    <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Users size={14} />
                      </div>
                      Team Formation Progress
                    </h3>

                    {(() => {
                      const inTeams = analytics.team_formation_progress?.in_teams ?? 0;
                      const withoutTeams = analytics.team_formation_progress?.without_teams ?? 0;
                      const total = inTeams + withoutTeams;
                      const inTeamsPct = total > 0 ? (inTeams / total) * 100 : 0;
                      const withoutTeamsPct = total > 0 ? (withoutTeams / total) * 100 : 0;
                      const dashArray = 314;
                      const dashOffset = dashArray * (1 - inTeamsPct / 100);

                      return (
                        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-grow py-4">
                          {/* SVG Donut */}
                          <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                              {/* Background ring */}
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-100 dark:text-slate-800"
                              />
                              {/* Indicator ring */}
                              <motion.circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="8"
                                strokeDasharray={dashArray}
                                initial={{ strokeDashoffset: dashArray }}
                                animate={{ strokeDashoffset: dashOffset }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                            </svg>
                            {/* Inner Text overlay */}
                            <div className="absolute flex flex-col items-center justify-center text-center">
                              <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                                {inTeamsPct.toFixed(0)}%
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                In Teams
                              </span>
                            </div>
                          </div>

                          {/* Legend card */}
                          <div className="flex flex-col gap-4 w-full sm:w-auto">
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/60 flex items-center gap-4">
                              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Teams</div>
                                <div className="text-sm font-black text-slate-850 dark:text-white mt-0.5">
                                  {inTeams} <span className="text-xs font-semibold text-slate-400">({inTeamsPct.toFixed(0)}%)</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/60 flex items-center gap-4">
                              <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Without Teams</div>
                                <div className="text-sm font-black text-slate-855 dark:text-white mt-0.5">
                                  {withoutTeams} <span className="text-xs font-semibold text-slate-400">({withoutTeamsPct.toFixed(0)}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>

                  {/* Chart 2: Project Status Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-panel p-6 space-y-6 flex flex-col justify-between"
                  >
                    <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 size={14} />
                      </div>
                      Project Status Distribution
                    </h3>

                    {(() => {
                      const completed = analytics.project_status_distribution?.Completed ?? 0;
                      const ongoing = analytics.project_status_distribution?.Ongoing ?? 0;
                      const pending = analytics.project_status_distribution?.Pending ?? 0;
                      const total = completed + ongoing + pending;
                      
                      const completedPct = total > 0 ? (completed / total) * 100 : 0;
                      const ongoingPct = total > 0 ? (ongoing / total) * 100 : 0;
                      const pendingPct = total > 0 ? (pending / total) * 100 : 0;

                      return (
                        <div className="space-y-6 flex-grow flex flex-col justify-center">
                          {/* Segmented bar */}
                          <div className="h-6 w-full rounded-2xl overflow-hidden flex gap-0.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200/20 dark:border-slate-800/50">
                            {completedPct > 0 && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${completedPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full flex items-center justify-center text-[10px] font-black text-white"
                                title={`Completed: ${completed}`}
                              />
                            )}
                            {ongoingPct > 0 && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ongoingPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-center text-[10px] font-black text-white"
                                title={`Ongoing: ${ongoing}`}
                              />
                            )}
                            {pendingPct > 0 && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pendingPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full flex items-center justify-center text-[10px] font-black text-white"
                                title={`Pending: ${pending}`}
                              />
                            )}
                          </div>

                          {/* Cards grid */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 rounded-2xl p-3 flex flex-col">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-405 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Completed
                              </div>
                              <span className="text-base font-black text-slate-800 dark:text-white mt-1.5">
                                {completed} <span className="text-xs font-semibold text-slate-400">({completedPct.toFixed(0)}%)</span>
                              </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 rounded-2xl p-3 flex flex-col">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-405 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Ongoing
                              </div>
                              <span className="text-base font-black text-slate-800 dark:text-white mt-1.5">
                                {ongoing} <span className="text-xs font-semibold text-slate-400">({ongoingPct.toFixed(0)}%)</span>
                              </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 rounded-2xl p-3 flex flex-col">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-405 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                Pending
                              </div>
                              <span className="text-base font-black text-slate-800 dark:text-white mt-1.5">
                                {pending} <span className="text-xs font-semibold text-slate-400">({pendingPct.toFixed(0)}%)</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>

                  {/* Chart 3: Mentor Workload */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="glass-panel p-6 space-y-5"
                  >
                    <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Activity size={14} />
                      </div>
                      Mentor Workload
                    </h3>
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                      {Object.keys(analytics.mentor_workload || {}).length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic text-center py-4">No mentors with approved teams yet.</p>
                      ) : (
                        Object.entries(analytics.mentor_workload || {})
                          .sort((a, b) => b[1] - a[1]) // Sort workload descending
                          .slice(0, 6) // Display top 6
                          .map(([name, count], i) => {
                            const percentage = Math.min((count / 25) * 100, 100);
                            const isHigh = count >= 20;
                            const isMedium = count >= 10 && count < 20;
                            
                            return (
                              <div key={name} className="space-y-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-800/50 p-3 rounded-2xl">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-black uppercase">
                                      {name.charAt(0)}
                                    </div>
                                    <span className="truncate max-w-[150px]">{name}</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {isHigh && (
                                      <span className="text-[8px] font-black uppercase bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30">
                                        Near Limit
                                      </span>
                                    )}
                                    <span className={`font-black ${isHigh ? 'text-red-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {count} / 25
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-full h-3 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ type: "spring", stiffness: 60, delay: i * 0.05 }}
                                    className={`h-full rounded-full ${isHigh ? 'bg-gradient-to-r from-red-500 to-rose-600' : isMedium ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </motion.div>

                  {/* Chart 4: Monthly Project Creation Trend (SVG Line Chart) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-panel p-6 space-y-5 flex flex-col justify-between"
                  >
                    <h3 className="text-sm font-black text-slate-855 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Calendar size={14} />
                      </div>
                      Monthly Project Creation Trend
                    </h3>

                    {(() => {
                      const trendEntries = Object.entries(analytics.monthly_project_creation_trend || {});
                      
                      if (trendEntries.length === 0) {
                        return <p className="text-sm text-slate-400 font-medium italic text-center py-10 flex-grow flex items-center justify-center">No trend data available.</p>;
                      }

                      const trendWidth = 460;
                      const trendHeight = 180;
                      const paddingLeft = 30;
                      const paddingRight = 10;
                      const paddingTop = 15;
                      const paddingBottom = 30;

                      const chartWidth = trendWidth - paddingLeft - paddingRight;
                      const chartHeight = trendHeight - paddingTop - paddingBottom;

                      const maxVal = Math.max(...trendEntries.map(([_, val]) => val as number), 4);

                      const points = trendEntries.map(([label, val], idx) => {
                        const x = paddingLeft + (trendEntries.length > 1 ? (idx / (trendEntries.length - 1)) * chartWidth : chartWidth / 2);
                        const y = paddingTop + chartHeight - ((val as number) / maxVal) * chartHeight;
                        return { x, y, label, val: val as number };
                      });

                      // Construct path lines
                      let linePath = "";
                      let areaPath = "";
                      if (points.length > 0) {
                        linePath = `M ${points[0].x} ${points[0].y}`;
                        for (let i = 1; i < points.length; i++) {
                          linePath += ` L ${points[i].x} ${points[i].y}`;
                        }
                        areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
                      }

                      // Generate vertical grid lines
                      const yTicks = [0, Math.floor(maxVal * 0.33), Math.floor(maxVal * 0.66), maxVal];

                      return (
                        <div className="w-full overflow-x-auto flex-grow flex items-end">
                          <svg className="w-full min-w-[350px]" height={trendHeight} viewBox={`0 0 ${trendWidth} ${trendHeight}`}>
                            <defs>
                              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Horizontal gridlines & Y labels */}
                            {yTicks.map((tick, i) => {
                              const y = paddingTop + chartHeight - (tick / maxVal) * chartHeight;
                              return (
                                <g key={i}>
                                  <line
                                    x1={paddingLeft}
                                    y1={y}
                                    x2={trendWidth - paddingRight}
                                    y2={y}
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className="text-slate-100 dark:text-slate-800/50"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={paddingLeft - 8}
                                    y={y + 4}
                                    fontSize="8"
                                    fontWeight="bold"
                                    textAnchor="end"
                                    className="fill-slate-400 dark:fill-slate-500"
                                  >
                                    {tick}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Area fill */}
                            {areaPath && (
                              <path d={areaPath} fill="url(#trendGradient)" />
                            )}

                            {/* Trend Line */}
                            {linePath && (
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Hover circles / Tooltips */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill="#3b82f6"
                                  stroke="currentColor"
                                  className="text-white dark:text-slate-900 shadow"
                                  strokeWidth="2"
                                />
                                {/* Value tag */}
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  fontSize="9"
                                  fontWeight="black"
                                  textAnchor="middle"
                                  className="fill-blue-500 dark:fill-blue-400"
                                >
                                  {p.val}
                                </text>
                                {/* X Label */}
                                <text
                                  x={p.x}
                                  y={paddingTop + chartHeight + 16}
                                  fontSize="7.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  className="fill-slate-400 dark:fill-slate-500"
                                >
                                  {p.label.split(' ')[0]} {/* Show abbreviation */}
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      );
                    })()}
                  </motion.div>
                </div>

                {/* 3. Branch Breakdown Badges for the Active Year */}
                {analytics.students_by_branch && Object.keys(analytics.students_by_branch).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {globalYear ? `${globalYear === 1 ? '1st' : globalYear === 2 ? '2nd' : '3rd'} Year Branch Distribution` : 'All Years Branch Distribution'}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {Object.values(analytics.students_by_branch).reduce((a, b) => a + b, 0)} Total Students
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(analytics.students_by_branch)
                        .sort((a, b) => b[1] - a[1])
                        .map(([branch, count]) => (
                          <div
                            key={branch}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-sm"
                          >
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{branch}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-md shadow-xs">
                              {count}
                            </span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}

                {/* 4. Interactive Roster Explorer (Students & Teams for this Year) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-6 space-y-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {globalYear ? `${globalYear === 1 ? '1st' : globalYear === 2 ? '2nd' : '3rd'} Year Cohort Roster` : 'All Years Platform Roster'}
                        </h3>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {analyticsRosterTab === 'students' 
                            ? `${(analytics.students || []).length} Students` 
                            : `${(analytics.teams || []).length} Teams`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {analyticsRosterTab === 'students'
                          ? `Browse verified students enrolled in the ${globalYear ? (globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)') : 'undergraduate programs'}.`
                          : `Browse project teams formed by the ${globalYear ? (globalYear === 1 ? '1st Year' : globalYear === 2 ? '2nd Year' : '3rd Year') : 'all'} students.`}
                      </p>
                    </div>


                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Sub-tab toggle */}
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setAnalyticsRosterTab('students')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            analyticsRosterTab === 'students'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Users size={14} />
                          <span>Students</span>
                          <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-600/60 font-bold">
                            {(analytics.students || []).length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalyticsRosterTab('teams')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            analyticsRosterTab === 'teams'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Layers size={14} />
                          <span>Teams</span>
                          <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-600/60 font-bold">
                            {(analytics.teams || []).length}
                          </span>
                        </button>
                      </div>

                      {/* Quick Search in Roster */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder={analyticsRosterTab === 'students' ? 'Search student name, USN, branch...' : 'Search team name, topic...'}
                          value={analyticsRosterSearch}
                          onChange={(e) => setAnalyticsRosterSearch(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none w-56 focus:border-indigo-500 focus:w-64 transition-all"
                        />
                      </div>

                      {/* Export Roster Buttons */}
                      {(() => {
                        const activeRosterYear = globalYear || 1;
                        const yrBadge = activeRosterYear === 1 ? '1st Yr' : activeRosterYear === 2 ? '2nd Yr' : '3rd Yr';
                        return (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadReport(analyticsRosterTab === 'students' ? 'students' : 'teams', 'csv', activeRosterYear)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={`Export ${analyticsRosterTab} as CSV for ${yrBadge}`}
                            >
                              <Download size={13} />
                              <span>CSV ({yrBadge})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReport(analyticsRosterTab === 'students' ? 'students' : 'teams', 'excel', activeRosterYear)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={`Export ${analyticsRosterTab} as Excel for ${yrBadge}`}
                            >
                              <Download size={13} />
                              <span>Excel ({yrBadge})</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>


                  {/* Table Content */}
                  {analyticsRosterTab === 'students' ? (
                    <div className="overflow-x-auto">
                      {(() => {
                        const rawStudents = analytics.students || [];
                        const q = analyticsRosterSearch.toLowerCase().trim();
                        const filtered = rawStudents.filter(s => {
                          if (globalYear !== null && resolveStudentYear(s) !== globalYear) return false;
                          if (!q) return true;
                          return (
                            (s.full_name || '').toLowerCase().includes(q) ||
                            (s.usn || '').toLowerCase().includes(q) ||
                            (s.email || '').toLowerCase().includes(q) ||
                            (s.branch || '').toLowerCase().includes(q) ||
                            (s.team_name || '').toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 text-slate-400 font-medium">
                              <UserX size={32} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No students found matching your criteria in this year cohort.</p>
                            </div>
                          );
                        }

                        return (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-3 pl-2">Student</th>
                                <th className="pb-3">USN</th>
                                <th className="pb-3">Branch</th>
                                <th className="pb-3">Cohort / Year</th>
                                <th className="pb-3">Cycle</th>
                                <th className="pb-3 text-right pr-2">Team Assignment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                              {filtered.map((student) => {
                                const sYear = resolveStudentYear(student);
                                return (
                                <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-3 pl-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs uppercase border border-indigo-500/20 flex-shrink-0">
                                        {student.full_name.charAt(0) || 'S'}
                                      </div>
                                      <div>
                                        <div className="font-extrabold text-slate-900 dark:text-white">
                                          {student.full_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                          {student.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {student.usn}
                                  </td>
                                  <td className="py-3">
                                    <span className="font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 text-[11px]">
                                      {student.branch}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      sYear === 1 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                        : sYear === 2
                                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                    }`}>
                                      {sYear === 1 ? '1st Year (1st Sem)' : sYear === 2 ? '2nd Year (3rd Sem)' : `${sYear}rd Year`}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    {sYear === 1 && student.cycle && student.cycle !== 'N/A' ? (
                                      <span className="font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                                        {student.cycle}-Cycle
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">N/A</span>
                                    )}
                                  </td>

                                  <td className="py-3 text-right pr-2">
                                    {student.has_team ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                                        <CheckCircle2 size={13} />
                                        <span>{student.team_name}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/40">
                                        <AlertTriangle size={13} />
                                        <span>No Team</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            </tbody>

                          </table>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {(() => {
                        const rawTeams = analytics.teams || [];
                        const q = analyticsRosterSearch.toLowerCase().trim();
                        const filtered = rawTeams.filter(t => 
                          !q ||
                          t.name.toLowerCase().includes(q) ||
                          t.project_topic.toLowerCase().includes(q) ||
                          t.mentor_name.toLowerCase().includes(q) ||
                          String(t.id).includes(q)
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 text-slate-400 font-medium">
                              <Layers size={32} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No teams found matching your criteria in this year cohort.</p>
                            </div>
                          );
                        }

                        return (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-3 pl-2">Team</th>
                                <th className="pb-3">Project Topic</th>
                                <th className="pb-3">Assigned Mentor</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Members ({globalYear ? `${globalYear} yr` : 'all'})</th>
                                <th className="pb-3 text-right pr-2">Action</th>

                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                              {filtered.map((team) => (
                                <tr key={team.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-3 pl-2">
                                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                      <span>{team.name}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        ID: {team.id}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                      Theme: {team.project_theme || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="py-3 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300" title={team.project_topic}>
                                    {team.project_topic}
                                  </td>
                                  <td className="py-3 font-semibold text-slate-600 dark:text-slate-400">
                                    {team.mentor_name}
                                  </td>
                                  <td className="py-3">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      team.mentor_status === 'APPROVED'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                        : team.mentor_status === 'PENDING'
                                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                    }`}>
                                      {team.mentor_status}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="font-black text-slate-800 dark:text-slate-200 mr-1">
                                        {team.member_count} / 5
                                      </span>
                                      {(team.members || []).slice(0, 3).map((m, idx) => (
                                        <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                          {m.name.split(' ')[0]}
                                        </span>
                                      ))}
                                      {(team.members || []).length > 3 && (
                                        <span className="text-[10px] text-slate-400">
                                          +{team.members.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 text-right pr-2">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/teams?teamSearch=${encodeURIComponent(team.name)}`)}
                                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Manage</span>
                                      <ChevronRight size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              </>
            )}

          </motion.div>
        ) : activeTab === 'search' ? (
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Global Directory Filter: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong> active.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}

            {/* Google Search Bar Style */}
            <div className="flex items-center gap-3.5 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-full shadow-md hover:shadow-lg focus-within:shadow-lg focus-within:border-indigo-500/50 dark:focus-within:border-indigo-500/30 transition-all duration-300 w-full mb-2">

              <Search className="text-slate-400 dark:text-slate-550 flex-shrink-0" size={20} />
              <input
                type="text"
                placeholder="Search students, mentors, USN, team ID, branch, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-405"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {searchLoading ? (
              <div className="text-center py-12 text-slate-505 font-medium">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
                Searching database...
              </div>
            ) : (
              <>
                {/* Results columns */}
                {debouncedQuery.trim() ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Users */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Users size={16} className="text-[#1e3a8a]" /> Users ({filteredSearchUsers.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredSearchUsers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching users found in this cohort.</p>
                        ) : (
                          filteredSearchUsers.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => setSelectedUser(user)}
                              className="glass-panel p-4 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all cursor-pointer flex justify-between items-center border hover:border-slate-300 dark:hover:border-slate-700"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{user.full_name}</span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    user.is_mentor 
                                      ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900' 
                                      : 'bg-blue-50 dark:bg-blue-950/20 text-[#1e3a8a] dark:text-blue-400 border-blue-100 dark:border-blue-900'
                                  }`}>
                                    {user.is_mentor ? 'Mentor' : 'Student'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-405 font-semibold flex-wrap">
                                  {user.is_mentor ? (
                                    <span>Dept: {user.department}</span>
                                  ) : (
                                    <>
                                      <span>USN: {user.usn}</span>
                                      <span>•</span>
                                      <span>Branch: {user.branch}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="text-slate-400" size={16} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Column 2: Teams */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Layers size={16} className="text-[#1e3a8a]" /> Teams ({filteredSearchTeams.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredSearchTeams.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching teams found in this cohort.</p>
                        ) : (
                          filteredSearchTeams.map((team) => (
                            <div
                              key={team.id}
                              onClick={() => navigate(`/admin/teams?teamSearch=${encodeURIComponent(team.name)}`)}
                              className="glass-panel p-4 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all cursor-pointer flex justify-between items-center border hover:border-slate-300 dark:hover:border-slate-700"
                            >
                              <div className="space-y-1.5 flex-1 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{team.name}</span>
                                  <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                                    ID: {team.id}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                                  Topic: {team.project_topic}
                                </div>
                                <div className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">
                                  Mentor: {team.mentor_name}
                                </div>
                              </div>
                              <ChevronRight className="text-slate-400 flex-shrink-0" size={16} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 w-full">
                    {recentSearches.length > 0 && (
                      <div className="glass-panel p-6 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-indigo-500" /> Recent Searches
                          </h3>
                          <button
                            onClick={() => {
                              setRecentSearches([]);
                              localStorage.removeItem('recent_searches');
                            }}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term, index) => (
                            <div
                              key={index}
                              onClick={() => setSearchQuery(term)}
                              className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-all flex items-center gap-2 group"
                            >
                              <span>{term}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Users Directory Grid */}
                    <div className="glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/20">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-indigo-500" />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Platform Directory</span>
                          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{filteredAllUsers.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(['all', 'mentors', 'students'] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => setUserListFilter(f)}
                              className={`text-[10px] font-bold px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                                userListFilter === f
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      {directoryError && filteredAllUsers.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-rose-500 font-bold bg-rose-500/10 border border-rose-500/25 px-4 py-3 rounded-2xl inline-block">
                            Network directory temporarily offline. Please search above. (Error: {directoryError})
                          </p>
                        </div>
                      ) : allUsersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs font-semibold">
                          <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                          Loading platform directory...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 max-h-[550px] overflow-y-auto no-scrollbar">
                          {filteredAllUsers.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => setSelectedUser(user)}
                              className="glass-panel p-4 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 hover:border-slate-350 dark:hover:border-slate-750 transition-all cursor-pointer flex items-center gap-3.5 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl group"
                            >
                              {/* Avatar Initials */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                user.is_mentor
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {user.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              {/* Meta Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {user.full_name}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                                    user.is_mentor
                                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                      : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                  }`}>{user.is_mentor ? 'Mentor' : 'Student'}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                  {user.is_mentor
                                    ? `${user.department} · ${user.post}`
                                    : `${user.branch} · ${user.usn}`
                                  }
                                </div>
                                {!user.is_mentor && (
                                  <div className="text-[10px] mt-1 font-semibold truncate">
                                    {user.group ? (
                                      <span className="text-emerald-650 dark:text-emerald-400 font-bold">Team: {user.group.name}</span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500">No Team</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {filteredAllUsers.length === 0 && (
                            <div className="col-span-full text-center py-16 text-slate-400 text-xs font-semibold">No users match the filter criteria in this cohort.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : activeTab === 'mentors' ? (
          <motion.div 
            key="mentors"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Filtered by Global Cohort: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}

            {/* Search filter for Mentors */}
            <div className="glass-panel p-5 flex items-center gap-3">

              <Search className="text-slate-400 flex-shrink-0" size={20} />
              <input
                type="text"
                placeholder="Filter mentors by name or department..."
                value={mentorQuery}
                onChange={(e) => setMentorQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {mentorsLoading ? (
              <div className="text-center py-12 text-slate-505 font-medium">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
                Loading mentors workload...
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMentors.length === 0 ? (
                  <p className="text-sm text-slate-400 italic font-medium p-8 glass-panel text-center">No mentors matched your filter.</p>
                ) : (
                  filteredMentors.map((mentor) => {
                    const isExpanded = expandedMentorId === mentor.id;
                    const workloadPercent = Math.min((mentor.workload / 25) * 100, 100);
                    return (
                      <div key={mentor.id} className="glass-panel overflow-hidden border border-slate-200 dark:border-slate-800/80">
                        {/* Header Row */}
                        <div 
                          onClick={() => setExpandedMentorId(isExpanded ? null : mentor.id)}
                          className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/10 transition-all duration-200"
                        >
                          <div className="space-y-0.5">
                            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{mentor.full_name}</h3>
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-405 font-semibold flex-wrap">
                              <span>Post: {mentor.post}</span>
                              <span>•</span>
                              <span>Dept: {mentor.department}</span>
                              <span>•</span>
                              <span>Email: {mentor.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 flex-shrink-0">
                            {/* Workload Progress */}
                            <div className="text-right space-y-0.5">
                              <span className="block text-[9px] font-black text-slate-405 uppercase tracking-wider">Workload Capacity</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                                  <div style={{ width: `${workloadPercent}%` }} className="h-full bg-indigo-600 rounded-full"></div>
                                </div>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-350">{mentor.workload} / 25 teams</span>
                              </div>
                            </div>
                            <ChevronRight className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} size={16} />
                          </div>
                        </div>

                        {/* Expandable Details Section */}
                        {isExpanded && (
                          <div className="bg-slate-50/50 dark:bg-slate-900/10 p-5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-5">
                            {/* Bio if available */}
                            {mentor.bio && (
                              <div className="text-xs text-slate-500 font-medium italic">
                                "{mentor.bio}"
                              </div>
                            )}

                            {/* Assigned Teams grid */}
                            <div className="space-y-3.5">
                              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                                  <Layers size={13} /> Assigned Teams ({
                                    (mentor.assigned_teams || []).filter(t => globalYear === null || resolveTeamYear(t) === globalYear).length
                                  })
                                </h4>

                                {/* Assign new team select dropdown */}
                                <div className="flex items-center gap-2">
                                  <UserPlus size={14} className="text-[#1e3a8a]" />
                                  <select
                                    value=""
                                    onChange={(e) => handleAssignMentor(Number(e.target.value), mentor.id)}
                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-705 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
                                  >
                                    <option value="" disabled>+ Assign / Transfer Team...</option>
                                    {filteredUnassignedTeams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name} (ID: {team.id} - Current Mentor: {team.mentor_name})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {(mentor.assigned_teams || []).filter(t => globalYear === null || resolveTeamYear(t) === globalYear).length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium italic">This mentor has no active team assignments in this cohort.</p>
                              ) : (
                                <div className="flex flex-col gap-4">
                                  {(mentor.assigned_teams || []).filter(t => globalYear === null || resolveTeamYear(t) === globalYear).map((team) => (

                                    <div key={team.id} className="bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col justify-between gap-4">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{team.name}</span>
                                          <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-950">
                                            ID: {team.id}
                                          </span>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                                          Topic: {team.project_topic}
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Students</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {(team.students || []).length === 0 ? (
                                              <span className="text-[10px] text-slate-400 italic">No students assigned</span>
                                            ) : (
                                              (team.students || []).map((student, idx) => (
                                                <span key={idx} className="bg-slate-55 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                                                  {student}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Controls next to team card */}
                                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                                        {/* Reassign select */}
                                        <div className="flex items-center gap-1">
                                          <GitMerge size={12} className="text-slate-450" />
                                          <select
                                            value=""
                                            onChange={(e) => handleAssignMentor(team.id, Number(e.target.value))}
                                            className="bg-transparent border-none text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 outline-none cursor-pointer"
                                          >
                                            <option value="" disabled>Reassign Mentor...</option>
                                            {mentors.filter(other => other.id !== mentor.id).map(other => (
                                              <option key={other.id} value={other.id}>
                                                {other.full_name} ({other.workload}/25)
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                          onClick={() => handleRemoveMentor(team.id)}
                                          className="text-rose-600 hover:text-rose-500 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                        >
                                          <Trash2 size={12} /> Remove
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        ) : activeTab === 'teams' ? (
          <motion.div 
            key="teams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Filtered by Global Cohort: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong>. Showing {filteredTeams.length} teams.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}

            {/* Filters Section */}
            <div className="glass-panel p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Search size={10} /> Search Name / Topic / Mentor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={teamsSearchText}
                    onChange={(e) => setTeamsSearchText(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none placeholder-slate-400"
                  />
                  {teamsSearchText && (
                    <button
                      onClick={() => setTeamsSearchText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider flex items-center gap-1">
                  <Filter size={10} /> Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="">All Branches</option>
                  {allBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={10} /> Project Theme
                </label>
                <select
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="">All Themes / Topics</option>
                  {allThemes.map(t => (
                    <option key={t} value={t.toUpperCase()}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={10} /> Approval Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NOT_SUBMITTED">Draft / Not Submitted</option>
                </select>
              </div>
            </div>

            {teamsLoading ? (
              <div className="text-center py-12 text-slate-505 font-medium">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
                Loading student teams...
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTeams.length === 0 ? (
                  <p className="text-sm text-slate-400 italic font-medium p-8 glass-panel text-center">No teams match your filter criteria.</p>
                ) : (
                  filteredTeams.map((team) => (
                    <div key={team.id} className="glass-panel p-6 space-y-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      {/* Team Meta Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">{team.name}</h3>
                            <span className="text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-950/30 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full">
                              ID: {team.id}
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              team.mentor_status === 'APPROVED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900'
                                : team.mentor_status === 'PENDING'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-emerald-900'
                                : team.mentor_status === 'REJECTED'
                                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900'
                                : 'bg-slate-50 dark:bg-slate-950/20 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                            }`}>
                              {team.mentor_status || 'Draft'}
                            </span>
                          </div>
                          
                          <div className="text-xs font-semibold text-slate-505 dark:text-slate-400">
                            Project Theme: <span className="font-extrabold text-slate-700 dark:text-slate-300">{team.project_topic || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Top action row: Approve/Reject, Dissolve */}
                        <div className="flex flex-wrap gap-2.5 items-center">
                          {team.mentor_status !== 'APPROVED' && (
                            <button
                              onClick={() => handleApproveProject(team.id)}
                              className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-205 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-xs font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Check size={13} /> Approve
                            </button>
                          )}
                          
                          {team.mentor_status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                setRejectingTeamId(team.id);
                                setRejectionReasonText('');
                              }}
                              className="bg-rose-50 dark:bg-rose-950/30 border border-rose-205 dark:border-rose-900 text-rose-600 dark:text-rose-400 px-4 py-2 text-xs font-bold rounded-xl hover:bg-rose-600 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Slash size={13} /> Reject
                            </button>
                          )}

                          <button
                            onClick={() => handleDissolveTeam(team.id)}
                            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition cursor-pointer"
                            title="Force Dissolve Team"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Mentor block */}
                      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Assigned Mentor</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                            {team.mentor_name === 'N/A' ? 'No Mentor Assigned' : `${team.mentor_name} (${team.mentor_email})`}
                          </span>
                        </div>

                        {/* Assign/Change mentor */}
                        <div className="flex items-center gap-2">
                          <UserPlus size={14} className="text-[#1e3a8a]" />
                          <select
                            value=""
                            onChange={(e) => handleAssignMentor(team.id, Number(e.target.value))}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="" disabled>Change Mentor...</option>
                            {mentors.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} ({m.workload}/25)
                              </option>
                            ))}
                          </select>
                          
                          {team.mentor_name !== 'N/A' && (
                            <button
                              onClick={() => handleRemoveMentor(team.id)}
                              className="text-rose-600 hover:text-rose-505 font-bold text-xs uppercase tracking-wider cursor-pointer ml-1"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Student members roster */}
                      <div className="space-y-3">
                        <span className="block text-[10px] font-black text-slate-405 uppercase tracking-wider"> Roster & Student Transfers</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400 border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-bold">
                                <th className="pb-2">Name</th>
                                <th className="pb-2">USN</th>
                                <th className="pb-2">Branch</th>
                                <th className="pb-2">Email</th>
                                <th className="pb-2 text-right">Transfer Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(team.members || []).map((member) => (
                                <tr key={member.id} className="border-b border-slate-55 dark:border-slate-900/20 last:border-none">
                                  <td className="py-2.5 font-extrabold text-slate-800 dark:text-slate-200">{member.full_name}</td>
                                  <td className="py-2.5">{member.usn}</td>
                                  <td className="py-2.5 font-bold uppercase text-indigo-650 dark:text-blue-450">{member.branch}</td>
                                  <td className="py-2.5">{member.email}</td>
                                  <td className="py-2.5 text-right">
                                    {(member as any).is_admin || (member.email || '').toLowerCase() === 'ishaen.vihaan@gmail.com' ? (
                                      <select
                                        value=""
                                        onChange={(e) => handleMoveStudent(member.id, Number(e.target.value))}
                                        className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 outline-none cursor-pointer"
                                      >
                                        <option value="" disabled>Admin in Team (Action Required)</option>
                                        <option value="0">Remove Admin from Team</option>
                                      </select>
                                    ) : (
                                      <select
                                        value=""
                                        onChange={(e) => handleMoveStudent(member.id, Number(e.target.value))}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-650 dark:text-slate-400 outline-none cursor-pointer"
                                      >
                                        <option value="" disabled>Move Student...</option>
                                        <option value="0">Remove from Team (No Team)</option>
                                        {teams.filter(other => other.id !== team.id).map(other => (
                                          <option key={other.id} value={other.id}>
                                            To: {other.name} (ID: {other.id})
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              
                              {(team.members || []).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-3 text-center text-slate-400 italic">No students are currently in this team. Use the search tab or student rosters to transfer members here.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        ) : activeTab === 'academic' ? (
          <motion.div 
            key="academic"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8 text-left"
          >
            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Academic Settings Cohort Scope: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong> active.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}

            {/* Header Control Panel */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={22} />
                  Branch & Subject Cycle Configuration
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Assign each engineering department to C Cycle or P Cycle. Changes apply live across all student profiles immediately.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsAddBranchOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <UserPlus size={14} /> Add New Branch
                </button>
                <button
                  onClick={handleSaveAcademicSettings}
                  disabled={academicSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={14} /> {academicSaving ? "Saving..." : "Save Global Settings"}
                </button>
              </div>
            </div>

            {/* Main Content Grid: Left Table, Right Controls & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Branch & Cycle Table */}
              <div className="lg:col-span-2 glass-panel p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Active Departments ({Object.keys(academicSettings?.branch_mappings || {}).length})
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Total Enrolled Students{globalYear !== null ? ` (${globalYear === 1 ? '1st Year' : globalYear === 2 ? '2nd Year' : '3rd Year'})` : ''}: {academicSettings?.total_students || 0}
                  </span>
                </div>


                {academicLoading ? (
                  <div className="py-12 text-center text-slate-400 animate-pulse font-medium">
                    Loading academic branch configuration...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="pb-3">Code</th>
                          <th className="pb-3">Department Name</th>
                          <th className="pb-3 text-center">{globalYear !== null ? `Students (Yr ${globalYear})` : 'Students'}</th>
                          <th className="pb-3 text-center">Subject Cycle</th>
                          <th className="pb-3 text-right">Action</th>

                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-700 dark:text-slate-300">
                        {Object.entries(academicSettings?.branch_mappings || {}).map(([code, name]) => {
                          const currentCycle = academicSettings?.cycle_mappings?.[code] || 'P';
                          const count = academicSettings?.branch_counts?.[code] || 0;

                          return (
                            <tr key={code} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="py-3.5">
                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  {code}
                                </span>
                              </td>
                              <td className="py-3.5 font-bold text-slate-800 dark:text-slate-100">{name}</td>
                              <td className="py-3.5 text-center">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                  {count}
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                  <button
                                    onClick={() => handleUpdateCycle(code, 'C')}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                      currentCycle === 'C'
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    C-Cycle
                                  </button>
                                  <button
                                    onClick={() => handleUpdateCycle(code, 'P')}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                      currentCycle === 'P'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    P-Cycle
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteBranch(code)}
                                  title={`Remove ${code} branch`}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Side: Session Config & Live Email Parser Preview */}
              <div className="space-y-6">
                {/* Academic Session Calendar Config */}
                <div className="glass-panel p-6 space-y-4">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Calendar size={16} className="text-indigo-500" /> Academic Session Calendar
                  </h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Select the month when the new academic session begins. Student academic promotion (1st Year → 2nd Year) is computed dynamically relative to this month.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Session Start Month</label>
                    <select
                      value={academicSettings?.session_start_month || 8}
                      onChange={async (e) => {
                        const newMonth = Number(e.target.value);
                        if (!academicSettings) return;
                        setAcademicSettings({ ...academicSettings, session_start_month: newMonth });
                        try {
                          await api.put('/admin/academic-settings', { session_start_month: newMonth });
                        } catch (err: any) {
                          alert(err.response?.data?.detail || "Failed to update session start month");
                          fetchAcademicSettings();
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      <option value={7}>July (Semester Start)</option>
                      <option value={8}>August (Standard Academic Session)</option>
                      <option value={9}>September (Late Session)</option>
                    </select>
                  </div>
                </div>

                {/* Live Email Parsing & Academic Profile Preview */}
                <div className="glass-panel p-6 space-y-4">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Activity size={16} className="text-emerald-500" /> Live Profile Auto-Generation Tester
                  </h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Test how Campus Nexus automatically extracts and resolves academic profiles from student Google email addresses:
                  </p>
                  <div>
                    <input
                      type="email"
                      value={previewEmail}
                      onChange={(e) => setPreviewEmail(e.target.value)}
                      placeholder="e.g. student.cs25@rvce.edu.in"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  {(() => {
                    const clean = previewEmail.trim().toLowerCase();
                    const isRvce = clean.endsWith('@rvce.edu.in');
                    if (!isRvce) {
                      return (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-semibold">
                          ⚠️ Non-RVCE email. Login will be restricted to whitelisted admin accounts.
                        </div>
                      );
                    }
                    
                    // Simple frontend regex parse simulation
                    const match = clean.match(/^([a-z0-9\._]+)\.([a-z]{2,5})(\d{2})@rvce\.edu\.in$/);
                    const bCode = match ? match[2].toUpperCase() : 'CS';
                    const yy = match ? 2000 + Number(match[3]) : 2025;
                    const fullBranch = academicSettings?.branch_mappings?.[bCode] || `${bCode} Engineering`;
                    const cycle = academicSettings?.cycle_mappings?.[bCode] || 'P';
                    const yearsPassed = new Date().getFullYear() - yy;
                    const yearOfStudy = Math.max(1, Math.min(4, yearsPassed + 1));

                    return (
                      <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Branch Name:</span>
                          <span className="font-black text-slate-800 dark:text-slate-100">{fullBranch}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Joining Year:</span>
                          <span className="font-black text-slate-800 dark:text-slate-100">{yy}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Academic Year:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{yearOfStudy}{yearOfStudy === 1 ? 'st' : yearOfStudy === 2 ? 'nd' : 'th'} Year</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Subject Cycle:</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">{cycle === 'C' ? 'C-Cycle (Chemistry)' : 'P-Cycle (Physics)'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Add Branch Modal */}
            <AnimatePresence>
              {isAddBranchOpen && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="max-w-md w-full bg-white dark:bg-[#16161a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative z-50"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                        <UserPlus size={18} className="text-indigo-600 dark:text-indigo-400" /> Configure New Branch
                      </h3>
                      <button onClick={() => setIsAddBranchOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleAddBranch} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Branch Code (Short)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CY, DS, AI"
                          value={newBranchCode}
                          onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Full Branch Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Cyber Security Engineering"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Initial Subject Cycle</label>
                        <select
                          value={newBranchCycle}
                          onChange={(e) => setNewBranchCycle(e.target.value as 'C' | 'P')}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="C" className="bg-white dark:bg-slate-900">C-Cycle (Chemistry)</option>
                          <option value="P" className="bg-white dark:bg-slate-900">P-Cycle (Physics)</option>
                        </select>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddBranchOpen(false)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
                        >
                          Add Branch
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'ratings' ? (
          <motion.div 
            key="ratings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {ratingsError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-between">
                <span>{ratingsError}</span>
                <button
                  onClick={fetchRatings}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Global Cohort Active Banner */}
            {globalYear !== null && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>
                    Filtered by Global Cohort: <strong>{globalYear === 1 ? '1st Year (2026 Batch)' : globalYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}</strong>. Showing {filteredRatings.length} reviews.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGlobalYearChange(null)}
                  className="underline cursor-pointer hover:text-indigo-900 dark:hover:text-white"
                >
                  Clear Cohort Filter
                </button>
              </div>
            )}

            {/* Top KPI Metrics */}


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: Average Score */}
              <div className="glass-panel p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Overall Satisfaction</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                        {ratingsData?.average_score?.toFixed(1) || '5.0'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(ratingsData?.average_score || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                    />
                  ))}
                  <span className="ml-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Based on {ratingsData?.total || 0} reviews
                  </span>
                </div>
              </div>

              {/* Card 2: Total Ratings */}
              <div className="glass-panel p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total Submissions</span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      {ratingsData?.total || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30">
                    <Users size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold">
                    {ratingsData?.category_counts?.student || 0} Students
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold">
                    {ratingsData?.category_counts?.mentor || 0} Mentors
                  </span>
                </div>
              </div>

              {/* Card 3: 5-Star Satisfaction % */}
              <div className="glass-panel p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">5-Star Ratio</span>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                      {ratingsData?.total ? Math.round(((ratingsData?.breakdown?.[5] || 0) / ratingsData.total) * 100) : 100}%
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                    <Sparkles size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{ratingsData?.breakdown?.[5] || 0}</span> ratings gave a full 5/5 score
                </div>
              </div>

              {/* Card 4: Written Comments */}
              <div className="glass-panel p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Written Feedback</span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      {(ratingsData?.ratings || []).filter(r => r.feedback && r.feedback.trim()).length}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                    <MessageSquare size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Detailed comments & recommendations submitted
                </div>
              </div>
            </div>

            {/* Star Distribution & Feature Highlights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Star Rating Breakdown Bar Chart */}
              <div className="glass-panel p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    Star Rating Distribution
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">{ratingsData?.total || 0} Total Reviews</span>
                </div>
                
                <div className="space-y-3 pt-1">
                  {[5, 4, 3, 2, 1].map((starVal) => {
                    const count = ratingsData?.breakdown?.[starVal] || 0;
                    const total = ratingsData?.total || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={starVal} className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => setSelectedStarFilter(selectedStarFilter === starVal ? 'all' : starVal)}
                          className={`w-16 flex items-center gap-1 font-bold text-left cursor-pointer hover:underline ${
                            selectedStarFilter === starVal ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span>{starVal}</span>
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-[10px] text-slate-400 font-normal">Stars</span>
                        </button>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              starVal >= 4 ? 'bg-amber-400' : starVal === 3 ? 'bg-blue-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{count}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Most Appreciated Feature Tags */}
              <div className="glass-panel p-6 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-500" />
                      Appreciated Aspects & Tags
                    </h3>
                    <span className="text-xs font-semibold text-slate-400">User Highlighted</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-4">
                    {ratingsData?.tag_counts && Object.keys(ratingsData.tag_counts).length > 0 ? (
                      Object.entries(ratingsData.tag_counts)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([tag, count]) => (
                          <div
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
                          >
                            <span>{tag}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-800/60 text-[10px] font-black">
                              {count as number}
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-6">No feature tags highlighted yet.</p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
                  💡 Tip: Click any star rating above to filter specific user reviews.
                </div>
              </div>
            </div>

            {/* Filter and Action Toolbar */}
            <div className="glass-panel p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search reviews by user name, email, USN, or keywords..."
                  value={ratingSearchQuery}
                  onChange={(e) => setRatingSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Star Filter */}
                <select
                  value={selectedStarFilter}
                  onChange={(e) => setSelectedStarFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">All Stars ({ratingsData?.total || 0})</option>
                  <option value="5">5 Stars ({ratingsData?.breakdown?.[5] || 0})</option>
                  <option value="4">4 Stars ({ratingsData?.breakdown?.[4] || 0})</option>
                  <option value="3">3 Stars ({ratingsData?.breakdown?.[3] || 0})</option>
                  <option value="2">2 Stars ({ratingsData?.breakdown?.[2] || 0})</option>
                  <option value="1">1 Star ({ratingsData?.breakdown?.[1] || 0})</option>
                </select>

                {/* Role Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students ({ratingsData?.category_counts?.student || 0})</option>
                  <option value="mentor">Mentors ({ratingsData?.category_counts?.mentor || 0})</option>
                </select>

                {/* Feedback only toggle */}
                <button
                  type="button"
                  onClick={() => setOnlyWithFeedback(!onlyWithFeedback)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    onlyWithFeedback
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <MessageSquare size={13} />
                  <span>With Feedback Only</span>
                </button>

                {/* Refresh */}
                <button
                  onClick={fetchRatings}
                  title="Refresh Ratings"
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} className={ratingsLoading ? "animate-spin" : ""} />
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleExportRatingsCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer uppercase tracking-wider"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Ratings List / Feed */}
            {ratingsLoading && !ratingsData ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin mb-3" />
                <span className="text-xs font-semibold text-slate-400">Loading user ratings...</span>
              </div>
            ) : filteredRatings.length === 0 ? (
              <div className="glass-panel p-12 text-center space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Star size={24} />
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-200">No Ratings Found</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {ratingSearchQuery || selectedStarFilter !== 'all' || selectedCategoryFilter !== 'all' || onlyWithFeedback
                    ? "No user ratings match your current filter criteria. Try resetting the filters."
                    : "No ratings have been submitted yet. Ratings submitted by users will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Showing {filteredRatings.length} of {ratingsData?.total || 0} reviews</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRatings.map((item: any, idx: number) => {
                    const stars = item.score || 5;
                    const dateStr = item.updated_at || item.created_at;
                    const formattedDate = dateStr
                      ? new Date(dateStr).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Recently';

                    return (
                      <motion.div
                        key={item.user_id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all group"
                      >
                        {/* Top: User info & rating score */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                              {(item.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                  {item.user_name}
                                </h4>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  item.is_mentor 
                                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
                                }`}>
                                  {item.is_mentor ? 'Faculty Mentor' : `Student • ${item.branch || 'CS'}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {item.user_email} {item.usn ? `• USN: ${item.usn}` : item.department ? `• ${item.department}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Delete action */}
                          <button
                            onClick={() => handleDeleteRating(item.user_id, item.user_name)}
                            title="Delete this review"
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Stars & Emotion */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={16}
                                className={s <= stars ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {stars}/5
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">
                            {stars === 5 ? '• Amazing Experience' : stars === 4 ? '• Very Good' : stars === 3 ? '• Good' : stars === 2 ? '• Fair' : '• Needs Improvement'}
                          </span>
                        </div>

                        {/* Feature Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                              >
                                ✓ {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Written Feedback Quote */}
                        {item.feedback && item.feedback.trim() && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border-l-3 border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{item.feedback}"
                          </div>
                        )}

                        {/* Footer info */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px] font-medium text-slate-400">
                          <span>{formattedDate}</span>
                          <span className="capitalize">{item.category || 'General'} review</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (

          <motion.div 
            key="reports"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Year-Wise Report Center Cohort Header & View Switcher */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-sm shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Academic Year-Wise Report Center
                    </h2>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      reportYearTab === 1 
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' 
                        : reportYearTab === 2 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' 
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
                    }`}>
                      {reportYearTab === 1 ? '1st Year (2026 Batch)' : reportYearTab === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Reports are generated strictly and separately for each academic year. Cross-cohort data mixing is disabled.
                  </p>
                </div>
              </div>

              {/* Controls: Year Selector & View Mode Switcher */}
              <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                {/* View Layout Switcher */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 gap-1">
                  <button
                    type="button"
                    onClick={() => setReportViewLayout('tabs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      reportViewLayout === 'tabs'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Cohort Filter Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportViewLayout('sections')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      reportViewLayout === 'sections'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Year-Wise Sections
                  </button>
                </div>

                {/* Cohort Year Selector Tabs (in tabs mode) */}
                {reportViewLayout === 'tabs' && (
                  <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 gap-1">
                    {[
                      { yr: 1, label: "1st Year", batch: "2026 Batch", count: cohortStudentCounts[1] ?? 0 },
                      { yr: 2, label: "2nd Year", batch: "2025 Batch", count: cohortStudentCounts[2] ?? 0 },
                      { yr: 3, label: "3rd Year", batch: "2024 Batch", count: cohortStudentCounts[3] ?? 0 }
                    ].map(({ yr, label, batch, count }) => {
                      const isSelected = reportYearTab === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          title={batch}
                          onClick={() => {
                            setReportYearTab(yr);
                            handleGlobalYearChange(yr);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}>
                            {count} students
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Layout Mode 1: Tabs View (Focused on one Cohort at a time) */}
            {reportViewLayout === 'tabs' && (
              <div className="space-y-5">
                {/* Active Cohort Information Banner */}
                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  reportYearTab === 1
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200'
                    : reportYearTab === 2
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                    : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap size={20} className="shrink-0" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider block">
                          Active Cohort Scope: {reportYearTab === 1 ? '1st Year (2026 Batch - 1st & 2nd Semester)' : reportYearTab === 2 ? '2nd Year (2025 Batch - 3rd & 4th Semester)' : '3rd Year (2024 Batch - 5th & 6th Semester)'}
                        </span>
                        <p className="text-[11px] font-medium opacity-80 mt-0.5">
                          All reports below contain records strictly isolated to {reportYearTab === 1 ? '1st Year' : reportYearTab === 2 ? '2nd Year' : '3rd Year'} students and teams ({cohortStudentCounts[reportYearTab] ?? 0} students enrolled). Zero data overlap with other cohorts.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-current/20">
                        {cohortStudentCounts[reportYearTab] ?? 0} Students Enrolled
                      </span>
                    </div>
                  </div>
                  {(cohortStudentCounts[reportYearTab] ?? 0) === 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Notice: No students enrolled in this cohort yet.</span> All exports and previews for this cohort will show 0 student records (headers only). Older batch data (2025/2024) is strictly isolated and will never bleed into this report.
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid of 7 Report Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      dataset: "students",
                      title: "Students Master Directory",
                      desc: "Complete roster of enrolled students with USN, email, branch, cycle allocation, and team membership status.",
                      icon: Users
                    },
                    {
                      dataset: "approved_teams",
                      title: "Approved Teams Master",
                      desc: "Full institutional spreadsheet of approved project groups, project topics, faculty mentors, and student members.",
                      icon: CheckCircle2
                    },
                    {
                      dataset: "student_marks",
                      title: "Student Marks & Observations",
                      desc: "Complete breakdown of Phase 1, Phase 2, and Phase 3 marks, total scores, sections, and mentor observations.",
                      icon: Award
                    },
                    {
                      dataset: "mentors",
                      title: "Mentor Workload Directory",
                      desc: "Directory of faculty mentors, departments, designations, and active approved team allocations for this cohort.",
                      icon: UserCheck
                    },
                    {
                      dataset: "teams",
                      title: "Team Roster Mapping",
                      desc: "Cross-referenced matrix linking each team group to its student members, USNs, and department branches.",
                      icon: Layers
                    },
                    {
                      dataset: "marks",
                      title: "Evaluation Marks Summary",
                      desc: "Granular criteria grading breakdown for Problem Definition, Methodology, Execution, Prototype, and Presentation.",
                      icon: Activity
                    },
                    {
                      dataset: "projects",
                      title: "Project Themes & Allocations",
                      desc: "Catalog of active team project titles, themes, sub-topics, assigned faculty mentors, and approval statuses.",
                      icon: GitMerge
                    }
                  ].map((rep) => {
                    const activeCardYear = cardYearMap[rep.dataset] || reportYearTab;
                    const yrPill = activeCardYear === 1 ? '1st Yr' : activeCardYear === 2 ? '2nd Yr' : '3rd Yr';
                    const yrBadge = activeCardYear === 1 ? '1st Yr (2026)' : activeCardYear === 2 ? '2nd Yr (2025)' : '3rd Yr (2024)';
                    const Icon = rep.icon;

                    return (
                      <div 
                        key={rep.dataset}
                        className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300 rounded-3xl group shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-3">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl group-hover:scale-105 transition-transform">
                                <Icon size={18} />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                                  {rep.title}
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  {rep.dataset}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${
                              activeCardYear === 1 
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' 
                                : activeCardYear === 2 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' 
                                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
                            }`}>
                              {yrBadge}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            {rep.desc}
                          </p>

                          {/* Quick Year Selector Pills for this card */}
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Cohort Scope:</span>
                            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 gap-1">
                              {[1, 2, 3].map((y) => (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => setCardYearMap(prev => ({ ...prev, [rep.dataset]: y }))}
                                  className={`px-2 py-0.5 rounded-md font-extrabold transition-all cursor-pointer ${
                                    activeCardYear === y
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                  }`}
                                >
                                  {y === 1 ? '1st Yr' : y === 2 ? '2nd Yr' : '3rd Yr'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                          <button 
                            type="button"
                            onClick={() => handleTriggerPreview(rep.dataset, 'csv', activeCardYear)} 
                            className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-2.5 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 transition-all"
                            title={`Preview or Download ${rep.title} as CSV for ${yrPill}`}
                          >
                            <Download size={11} />
                            <span>CSV ({yrPill})</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleTriggerPreview(rep.dataset, 'excel', activeCardYear)} 
                            className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-2.5 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1 transition-all"
                            title={`Preview or Download ${rep.title} as Excel for ${yrPill}`}
                          >
                            <Download size={11} />
                            <span>Excel ({yrPill})</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleTriggerPreview(rep.dataset, 'pdf', activeCardYear)} 
                            className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-2.5 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1 transition-all"
                            title={`Preview or Download ${rep.title} as PDF for ${yrPill}`}
                          >
                            <Download size={11} />
                            <span>PDF ({yrPill})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Layout Mode 2: Sections View (All 3 Academic Years separated into visual sections) */}
            {reportViewLayout === 'sections' && (
              <div className="space-y-10">
                {[
                  {
                    yr: 1,
                    title: "1st Year (2026 Batch) Reports & Spreadsheets",
                    sem: "1st & 2nd Semester",
                    cycle: "Foundation & Physics/Chemistry Cycle Projects",
                    headerBg: "from-blue-600 to-indigo-700",
                    badge: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200"
                  },
                  {
                    yr: 2,
                    title: "2nd Year (2025 Batch) Reports & Spreadsheets",
                    sem: "3rd & 4th Semester",
                    cycle: "Core Experiential Learning Projects",
                    headerBg: "from-emerald-600 to-teal-700",
                    badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                  },
                  {
                    yr: 3,
                    title: "3rd Year (2024 Batch) Reports & Spreadsheets",
                    sem: "5th & 6th Semester",
                    cycle: "Advanced Capstone & Industry Problem Statements",
                    headerBg: "from-purple-600 to-pink-700",
                    badge: "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200"
                  }
                ].map((section) => (
                  <div key={section.yr} className="space-y-4">
                    {/* Section Header */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.headerBg} text-white flex items-center justify-center font-black text-sm shadow-md`}>
                          Y{section.yr}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                            <span>{section.title}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${section.badge}`}>
                              {section.sem}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {cohortStudentCounts[section.yr] ?? 0} students
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {section.cycle} • Data strictly isolated to {section.yr === 1 ? '1st Year' : section.yr === 2 ? '2nd Year' : '3rd Year'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto">
                        Year {section.yr} Isolated Section
                      </span>
                    </div>

                    {/* Section Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { dataset: "students", title: "Students Master List", icon: Users },
                        { dataset: "approved_teams", title: "Approved Teams Master", icon: CheckCircle2 },
                        { dataset: "student_marks", title: "Marks & Observations", icon: Award },
                        { dataset: "mentors", title: "Mentor Workloads", icon: UserCheck },
                        { dataset: "teams", title: "Team Roster Mapping", icon: Layers },
                        { dataset: "marks", title: "Evaluation Marks Summary", icon: Activity },
                        { dataset: "projects", title: "Project Themes & Allocations", icon: GitMerge }
                      ].map((card) => {
                        const Icon = card.icon;
                        const yrPill = section.yr === 1 ? '1st Yr' : section.yr === 2 ? '2nd Yr' : '3rd Yr';
                        return (
                          <div 
                            key={`${card.dataset}-${section.yr}`}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {card.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  Filtered strictly to {yrPill}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <button
                                type="button"
                                onClick={() => handleTriggerPreview(card.dataset, 'csv', section.yr)}
                                className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer"
                              >
                                CSV ({yrPill})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTriggerPreview(card.dataset, 'excel', section.yr)}
                                className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer"
                              >
                                Excel ({yrPill})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTriggerPreview(card.dataset, 'pdf', section.yr)}
                                className="py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer"
                              >
                                PDF ({yrPill})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal overlay */}
      <AnimatePresence>
        {rejectingTeamId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/40 backdrop-blur-sm">
            <motion.div
              role="dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl relative"
            >
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Reject Project Theme</h3>
              <p className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">Provide a reason explaining why the current project topic or theme is being rejected. This notification will be visible to the team members.</p>
              
              <textarea
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Type rejection observations here (e.g. Duplicate project topic, needs scope adjustment...)"
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-705 dark:text-slate-300 outline-none placeholder-slate-400 mb-5"
              ></textarea>
              
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setRejectingTeamId(null)}
                  className="px-4.5 py-2.5 font-bold text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-505 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectProject(rejectingTeamId)}
                  className="px-4.5 py-2.5 font-bold text-xs bg-rose-600 text-white rounded-xl hover:bg-rose-500 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Inspector Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/40 backdrop-blur-sm">
            <motion.div
              role="dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Modal Body */}
              <div className="space-y-6">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border mb-2 inline-block ${
                    selectedUser.is_mentor 
                      ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900' 
                      : 'bg-blue-50 dark:bg-blue-950/20 text-[#1e3a8a] dark:text-blue-400 border-blue-100 dark:border-blue-900'
                  }`}>
                    {selectedUser.is_mentor ? 'Mentor Profile' : 'Student Profile'}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedUser.full_name}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-405 font-bold uppercase tracking-wider mt-1.5">
                    <Mail size={13} /> {selectedUser.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  {selectedUser.is_mentor ? (
                    <>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.department}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designation / Post</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.post}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">USN</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.usn}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Branch</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.branch}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cycle</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.cycle}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Onboarding Bio (Displayed only for Mentors) */}
                {selectedUser.is_mentor && selectedUser.bio && (
                  <div className="border-l-4 border-indigo-500 bg-indigo-50/10 p-3.5 rounded-r-2xl border border-y-indigo-100/10 border-r-indigo-100/10">
                    <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Mentor Bio</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-relaxed italic">"{selectedUser.bio}"</p>
                  </div>
                )}

                {/* Group & Project Details for Students */}
                {!selectedUser.is_mentor && (
                  <div className="space-y-3 text-left">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned Team & Project Details</span>
                    {selectedUser.group ? (
                      <div
                        onClick={() => {
                          setSelectedUser(null);
                          navigate(`/admin/teams?teamSearch=${encodeURIComponent(selectedUser.group!.name)}`);
                        }}
                        className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer space-y-3 group/tile shadow-sm"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900 dark:text-white group-hover/tile:text-indigo-600 dark:group-hover/tile:text-indigo-400 transition-colors">
                              {selectedUser.group.name}
                            </span>
                            <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                              Team ID: {selectedUser.group.id}
                            </span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover/tile:text-indigo-600 dark:group-hover/tile:text-indigo-400 group-hover/tile:translate-x-0.5 transition-all">
                            <ChevronRight size={15} />
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {selectedUser.group.project_theme && selectedUser.group.project_theme !== "N/A" && (
                            <div>
                              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">Project Theme</span>
                              <span className="text-slate-800 dark:text-slate-200 font-bold bg-indigo-50/70 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 inline-block">
                                🎨 {selectedUser.group.project_theme}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Project Topic</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold block leading-snug">
                              📌 {selectedUser.group.project_topic || 'Not specified'}
                            </span>
                          </div>

                          {selectedUser.group.project_sub_topic && selectedUser.group.project_sub_topic !== "N/A" && (
                            <div>
                              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Sub-Topic / Domain</span>
                              <span className="text-slate-600 dark:text-slate-400 font-medium block">
                                💡 {selectedUser.group.project_sub_topic}
                              </span>
                            </div>
                          )}

                          {selectedUser.group.mentor_name && (
                            <div className="pt-1.5 border-t border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Assigned Mentor:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                👨‍🏫 {selectedUser.group.mentor_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <p className="text-xs text-slate-400 font-medium italic">This student is not currently assigned to any team or project.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Preview Loading Overlay */}
      {previewLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-8 text-center max-w-sm shadow-2xl flex flex-col items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Generating Preview</h4>
              <p className="text-xs text-slate-405 font-semibold">Fetching dataset records from database...</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Report Preview Modal */}
      <AnimatePresence>
        {previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              role="dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setPreviewData(null);
                  setPreviewDataset(null);
                  setPreviewFormat(null);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Title, Year Selector & Total Rows */}
              <div className="mb-4 pr-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-black text-slate-805 dark:text-white uppercase tracking-wider">{previewData.title}</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50">
                      {previewYear === 1 ? '1st Year (2026 Batch)' : previewYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Previewing 10 sample records of {previewData.total_rows} total rows strictly scoped to this academic year.
                  </p>
                </div>

                {/* Switch Preview Year */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">Cohort:</span>
                  {[
                    { yr: 1, label: "1st Yr (2026)" },
                    { yr: 2, label: "2nd Yr (2025)" },
                    { yr: 3, label: "3rd Yr (2024)" }
                  ].map(({ yr, label }) => {
                    const isSelected = previewYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleSwitchPreviewYear(yr)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 no-scrollbar mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      {previewData.columns.map((col, idx) => (
                        <th key={idx} className="p-3 font-bold text-slate-700 dark:text-slate-205 whitespace-nowrap uppercase tracking-wider text-[10px] border-r border-slate-200/60 dark:border-slate-800/60 last:border-r-0">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.length === 0 ? (
                      <tr>
                        <td colSpan={previewData.columns.length} className="p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto py-6">
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40">
                              <AlertTriangle size={24} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">
                              No Records in {previewYear === 1 ? '1st Year (2026 Batch)' : previewYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center leading-relaxed">
                              There are currently 0 records enrolled under this academic cohort. 
                              Data from other years is strictly isolated and will never be combined into this report.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      previewData.preview.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className="border-b border-slate-100 dark:border-slate-900 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          {previewData.columns.map((col, cIdx) => (
                            <td key={cIdx} className="p-3 text-slate-600 dark:text-slate-350 font-semibold max-w-[200px] truncate border-r border-slate-100 dark:border-slate-900 last:border-r-0" title={row[col]}>
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-150 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                  <span>Format:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider ${
                    previewFormat === 'csv' ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350" :
                    previewFormat === 'excel' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" :
                    "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                  }`}>
                    {previewFormat}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                    {previewYear === 1 ? '1st Year (2026 Batch)' : previewYear === 2 ? '2nd Year (2025 Batch)' : '3rd Year (2024 Batch)'}
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setPreviewDataset(null);
                      setPreviewFormat(null);
                    }}
                    className="flex-1 sm:flex-initial bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (previewDataset && previewFormat) {
                        handleDownloadReport(previewDataset, previewFormat, previewYear);
                      }
                      setPreviewData(null);
                      setPreviewDataset(null);
                      setPreviewFormat(null);
                    }}
                    className={`flex-1 sm:flex-initial font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider cursor-pointer text-white shadow-lg transition-all ${
                      previewFormat === 'csv' ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20" :
                      previewFormat === 'excel' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" :
                      "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    }`}
                  >
                    Confirm & Download ({previewYear === 1 ? '1st Yr' : previewYear === 2 ? '2nd Yr' : '3rd Yr'} {previewFormat?.toUpperCase()})
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
