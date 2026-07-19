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
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  group: { id: number; name: string; project_topic: string } | null;
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
  members: {
    id: number;
    full_name: string;
    usn: string;
    email: string;
    branch: string;
    cycle: string;
  }[];
}

interface AdminDashboardProps {
  tab?: 'moderation' | 'analytics' | 'search' | 'mentors' | 'teams' | 'reports';
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

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: MatchedUser[]; teams: MatchedTeam[] }>({ users: [], teams: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<MatchedUser[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [userListFilter, setUserListFilter] = useState<'all' | 'students' | 'mentors'>('all');
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
  const [branchFilter, setBranchFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectingTeamId, setRejectingTeamId] = useState<number | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Report Preview states
  const [previewDataset, setPreviewDataset] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; columns: string[]; preview: any[]; total_rows: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data || null);
    } catch (err: any) {
      console.error("Failed to load analytics data", err);
      setAnalyticsError(err.response?.data?.detail || "Failed to load database metrics. Please ensure the backend server is running.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchMentorsData = async () => {
    try {
      const res = await api.get('/admin/mentors');
      setMentors(res.data || []);
      const resTeams = await api.get('/admin/unassigned-teams');
      setAllTeams(resTeams.data || []);
    } catch (err) {
      console.error("Failed to fetch mentor management data", err);
    } finally {
      setMentorsLoading(false);
    }
  };

  const fetchTeamsData = async () => {
    setTeamsLoading(true);
    try {
      const res = await api.get('/admin/teams');
      setTeams(res.data || []);
    } catch (err) {
      console.error("Failed to fetch teams data", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Trigger search on debounced query change
  useEffect(() => {
    const performSearch = async () => {
      const q = debouncedQuery.trim();
      if (!q) {
        setSearchResults({ users: [], teams: [] });
        return;
      }
      setSearchLoading(true);
      try {
        const res = await api.get(`/admin/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data || { users: [], teams: [] });
        addRecentSearch(q);
      } catch (err) {
        console.error("Failed to perform global search", err);
      } finally {
        setSearchLoading(false);
      }
    };
    performSearch();
  }, [debouncedQuery]);

  useEffect(() => {
    fetchReports();
    fetchAnalytics();
    fetchMentorsData();
    fetchTeamsData();
    // Fetch all users for the search directory
    const fetchAllUsers = async () => {
      setAllUsersLoading(true);
      try {
        const res = await api.get('/admin/users');
        setAllUsers(res.data || []);
      } catch (err) {
        console.error('Failed to fetch all users', err);
      } finally {
        setAllUsersLoading(false);
      }
    };
    fetchAllUsers();

    // Auto-refresh analytics every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleBan = async (userId: number) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    
    try {
      await api.post(`/admin/ban/${userId}`);
      alert("User has been banned.");
      fetchReports();
    } catch (err: any) {
      alert("Failed to ban user");
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
      await api.post(`/admin/groups/move-student?student_id=${studentId}&target_group_id=${targetGroupId}`);
      alert("Student updated successfully.");
      fetchTeamsData();
      fetchMentorsData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to move student.");
    }
  };

  // Report Center trigger download
  const handleDownloadReport = async (dataset: string, format: string) => {
    try {
      const response = await api.get(`/admin/reports/download?dataset=${dataset}&format=${format}`, {
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
      
      const blob = new Blob([response.data], { type: mimeMap[format] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${dataset}_report_${dateStr}.${extensionMap[format]}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Failed to download report", err);
      alert("Failed to download report. Please check your admin permissions.");
    }
  };

  const handleTriggerPreview = async (dataset: string, format: string) => {
    setPreviewDataset(dataset);
    setPreviewFormat(format);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/admin/reports/preview?dataset=${dataset}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error("Failed to load report preview", err);
      alert("Failed to load report preview. Opening direct download...");
      handleDownloadReport(dataset, format);
      setPreviewDataset(null);
      setPreviewFormat(null);
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
    const matchesBranch = !branchFilter || (t.members || []).some(m => (m.branch || "N/A").trim().toUpperCase() === branchFilter);
    const matchesTheme = !themeFilter || (t.project_topic || "N/A").trim().toUpperCase() === themeFilter;
    const matchesStatus = !statusFilter || t.mentor_status === statusFilter;
    return matchesBranch && matchesTheme && matchesStatus;
  });

  const filteredMentors = (mentors || []).filter(m => 
    (m.full_name || "").toLowerCase().includes(mentorQuery.toLowerCase()) ||
    (m.department || "").toLowerCase().includes(mentorQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto py-10 px-4 md:px-8 space-y-8">
      {/* Header section with context-aware Title, Subtitle */}
      {activeTab !== 'reports' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-[#1e3a8a] w-8 h-8" />
              {activeTab === 'moderation' && "Moderation Logs"}
              {activeTab === 'analytics' && "Analytics Dashboard"}
              {activeTab === 'search' && "Global Database Search"}
              {activeTab === 'mentors' && "Mentor Workloads"}
              {activeTab === 'teams' && "Teams & Project Roster"}
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">
              {activeTab === 'moderation' && "Monitor campus network activity, safety logs, and report violations."}
              {activeTab === 'analytics' && "Real-time statistics, registrations, approvals, and workloads."}
              {activeTab === 'search' && "Query users, mentors, and student groups across the database."}
              {activeTab === 'mentors' && "Manage project assignment capacity, reallocations, and workload."}
              {activeTab === 'teams' && "View and filter student project teams, transfer members, and approve themes."}
            </p>
          </div>
        </div>
      )}



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
            {reports.map((report, index) => (
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

                <div className="flex items-center flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  {report.reported && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBan(report.reported!.id)}
                      className="w-full md:w-auto px-6 py-3 font-extrabold rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-700 dark:hover:text-white transition-all duration-300 text-sm shadow-sm cursor-pointer"
                    >
                      Ban User
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-16 text-slate-400 font-semibold glass-panel p-10 max-w-md mx-auto mt-10">
                <span className="text-4xl block mb-4">🛡️</span>
                No reports found. Everyone is behaving well!
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
                  onClick={fetchAnalytics}
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
                        <Users size={16} className="text-[#1e3a8a]" /> Users ({(searchResults.users || []).length})
                      </h3>
                      <div className="space-y-3">
                        {(searchResults.users || []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching users found.</p>
                        ) : (
                          (searchResults.users || []).map((user) => (
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
                        <Layers size={16} className="text-[#1e3a8a]" /> Teams ({(searchResults.teams || []).length})
                      </h3>
                      <div className="space-y-3">
                        {(searchResults.teams || []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching teams found.</p>
                        ) : (
                          (searchResults.teams || []).map((team) => (
                            <div
                              key={team.id}
                              onClick={() => navigate(`/my-teams/${team.id}`)}
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
                              className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              onClick={() => setSearchQuery(term)}
                            >
                              <span>{term}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecentSearches(prev => {
                                    const updated = prev.filter((_, i) => i !== index);
                                    localStorage.setItem('recent_searches', JSON.stringify(updated));
                                    return updated;
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-500 transition-colors rounded p-0.5"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Users Directory Grid */}
                    <div className="glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/20">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-indigo-500" />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Platform Directory</span>
                          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{allUsers.length}</span>
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
                      {allUsersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs font-semibold">
                          <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                          Loading platform directory...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 max-h-[550px] overflow-y-auto no-scrollbar">
                          {allUsers
                            .filter(u => userListFilter === 'all' ? true : userListFilter === 'mentors' ? u.is_mentor : !u.is_mentor)
                            .map((user) => (
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
                          {allUsers.filter(u => userListFilter === 'all' ? true : userListFilter === 'mentors' ? u.is_mentor : !u.is_mentor).length === 0 && (
                            <div className="col-span-full text-center py-16 text-slate-400 text-xs font-semibold">No users match the filter criteria.</div>
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
                                  <Layers size={13} /> Assigned Teams ({(mentor.assigned_teams || []).length})
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
                                    {(allTeams || []).map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name} (ID: {team.id} - Current Mentor: {team.mentor_name})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {(mentor.assigned_teams || []).length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium italic">This mentor has no active team assignments.</p>
                              ) : (
                                <div className="flex flex-col gap-4">
                                  {(mentor.assigned_teams || []).map((team) => (
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
            {/* Filters Section */}
            <div className="glass-panel p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                    {/* Student transfer select */}
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
        ) : (
          <motion.div 
            key="reports"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Grid of Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 6: Approved Teams Detailed CSV */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-[#1e3a8a] dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-xl">
                      <Users size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Approved Teams Export</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Full master spreadsheet of approved teams, project topics, mentors, and all individual student member details.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('approved_teams', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('approved_teams', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('approved_teams', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>

              {/* Card 7: Student Phase Marks CSV */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                      <CheckCircle2 size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Student Marks & Observations</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Complete breakdown of Phase 1, 2, and 3 marks, total scores, sections, year of study, and specific mentor observations.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('student_marks', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('student_marks', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('student_marks', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>

              {/* Card 2: Mentors */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border border-purple-100 dark:border-purple-900 rounded-xl">
                      <User size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Mentor Workload</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Directory of mentors, their departments, designations, and active approved team allocations.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('mentors', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('mentors', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('mentors', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>

              {/* Card 3: Team Members */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                      <Layers size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Team Roster Mapping</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Cross-referenced sheet linking each group name to its student members and their branches.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('teams', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('teams', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('teams', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>

              {/* Card 4: Marks */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-655 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-xl">
                      <Activity size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Evaluation Marks Summary</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Comprehensive Phase 1, Phase 2, Phase 3 grading and total marks allocated to students.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('marks', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('marks', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('marks', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>

              {/* Card 5: Projects */}
              <div className="glass-panel p-6 flex flex-col justify-between gap-5 hover:border-slate-350 dark:hover:border-slate-750 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                      <GitMerge size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Project Allocation</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">List of active team project titles, themes/topics, and their assigned mentors.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <button onClick={() => handleTriggerPreview('projects', 'csv')} className="bg-transparent border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-slate-655 dark:text-slate-400">CSV</button>
                  <button onClick={() => handleTriggerPreview('projects', 'excel')} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-emerald-700 dark:text-emerald-400 transition">Excel</button>
                  <button onClick={() => handleTriggerPreview('projects', 'pdf')} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 hover:bg-rose-600 hover:text-white font-extrabold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-rose-700 dark:text-rose-400 transition">PDF</button>
                </div>
              </div>
            </div>
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

                {selectedUser.bio && (
                  <div className="border-l-4 border-indigo-500 bg-indigo-50/10 p-3.5 rounded-r-2xl border border-y-indigo-100/10 border-r-indigo-100/10">
                    <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Onboarding Bio</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-relaxed italic">"{selectedUser.bio}"</p>
                  </div>
                )}

                {/* Group Details */}
                {!selectedUser.is_mentor && (
                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned Team Details</span>
                    {selectedUser.group ? (
                      <div
                        onClick={() => {
                          setSelectedUser(null);
                          navigate(`/my-teams/${selectedUser.group!.id}`);
                        }}
                        className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 hover:border-indigo-100 dark:hover:border-indigo-900/40 transition cursor-pointer flex justify-between items-center group/tile"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover/tile:text-indigo-600 dark:group-hover/tile:text-indigo-400 transition-colors">{selectedUser.group.name}</span>
                            <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900">
                              ID: {selectedUser.group.id}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Topic:</span>
                            <span className="text-slate-700 dark:text-slate-355 font-semibold">{selectedUser.group.project_topic}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-slate-400 group-hover/tile:text-indigo-600 dark:group-hover/tile:text-indigo-400 group-hover/tile:translate-x-0.5 transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-405 font-medium italic">This student is not currently assigned to any team.</p>
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

              {/* Title & Total Rows */}
              <div className="mb-4 pr-8">
                <h3 className="text-lg font-black text-slate-805 dark:text-white uppercase tracking-wider">{previewData.title}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Preview showing the first 10 rows of {previewData.total_rows} total rows inside this dataset.
                </p>
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
                    {previewData.preview.map((row, rIdx) => (
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-150 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                  <span>Target Format:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider ${
                    previewFormat === 'csv' ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350" :
                    previewFormat === 'excel' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" :
                    "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                  }`}>
                    {previewFormat}
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
                        handleDownloadReport(previewDataset, previewFormat);
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
                    Confirm & Download
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
