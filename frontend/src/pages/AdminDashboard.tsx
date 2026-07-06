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
  BarChart3, 
  Sparkles,
  Search,
  Mail,
  ChevronRight,
  X,
  UserPlus,
  Trash2,
  GitMerge,
  Filter,
  Check,
  Slash
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'moderation' | 'analytics' | 'search' | 'mentors' | 'teams'>('moderation');
  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: MatchedUser[]; teams: MatchedTeam[] }>({ users: [], teams: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MatchedUser | null>(null);

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

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err: any) {
      console.error("Failed to load analytics data", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchMentorsData = async () => {
    try {
      const res = await api.get('/admin/mentors');
      setMentors(res.data);
      const resTeams = await api.get('/admin/unassigned-teams');
      setAllTeams(resTeams.data);
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
      setTeams(res.data);
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
        setSearchResults(res.data);
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

  // Filters computed lists
  const allBranches = Array.from(new Set(
    teams.flatMap(t => t.members.map(m => (m.branch || "N/A").trim().toUpperCase()))
  )).filter(Boolean);

  const allThemes = Array.from(new Set(
    teams.map(t => (t.project_topic || "N/A").trim().toUpperCase())
  )).filter(Boolean);

  const filteredTeams = teams.filter(t => {
    const matchesBranch = !branchFilter || t.members.some(m => (m.branch || "N/A").trim().toUpperCase() === branchFilter);
    const matchesTheme = !themeFilter || (t.project_topic || "N/A").trim().toUpperCase() === themeFilter;
    const matchesStatus = !statusFilter || t.mentor_status === statusFilter;
    return matchesBranch && matchesTheme && matchesStatus;
  });

  const filteredMentors = mentors.filter(m => 
    m.full_name.toLowerCase().includes(mentorQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(mentorQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-[#1e3a8a] w-10 h-10" /> Moderation & Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-1">Monitor campus network activity, safety logs, and real-time statistics</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              try {
                const res = await api.get('/admin/download-approved-teams', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'approved_teams.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err) {
                console.error("Failed to download teams CSV", err);
                alert("Failed to download spreadsheet.");
              }
            }}
            className="bg-[#1e3a8a] hover:bg-[#152a63] text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
          >
            Download Teams
          </button>
          
          <button
            onClick={async () => {
              try {
                const res = await api.get('/admin/download-student-marks', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'student_phase_marks.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err) {
                console.error("Failed to download student marks CSV", err);
                alert("Failed to download marks spreadsheet.");
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
          >
            Download Marks
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`py-3.5 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer ${
            activeTab === 'moderation' 
              ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Moderation Logs ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3.5 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'analytics' 
              ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Analytics Dashboard <Sparkles size={14} className="text-[#1e3a8a] animate-pulse" />
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`py-3.5 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'search' 
              ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Global Search <Search size={14} />
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`py-3.5 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'mentors' 
              ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Mentors <User size={14} />
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-3.5 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'teams' 
              ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Teams Management <Users size={14} />
        </button>
      </div>

      {/* Tab Contents */}
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
            {analyticsLoading || !analytics ? (
              <div className="text-center py-16 text-slate-500 font-medium">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
                Loading database metrics...
              </div>
            ) : (
              <>
                {/* 1. Counts Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 rounded-2xl">
                      <Users size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.counts.total_students}</span>
                    </div>
                  </div>

                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <User size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mentors</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.counts.total_mentors}</span>
                    </div>
                  </div>

                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 col-span-2 sm:col-span-1">
                    <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 text-purple-600 dark:text-purple-400 rounded-2xl">
                      <Layers size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved / Total Teams</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {analytics.counts.approved_teams} <span className="text-sm font-semibold text-slate-400">/ {analytics.counts.total_teams}</span>
                      </span>
                    </div>
                  </div>

                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 col-span-2 sm:col-span-1">
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400 rounded-2xl">
                      <Clock size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Teams</span>
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{analytics.counts.pending_teams}</span>
                    </div>
                  </div>

                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 col-span-1">
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.counts.total_events}</span>
                    </div>
                  </div>

                  <div className="glass-panel p-5 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 col-span-1">
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-2xl">
                      <MessageSquare size={22} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifs Sent</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.counts.total_notifications}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Students by Branch (Bar Chart) */}
                  <div className="glass-panel p-6 space-y-6">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={16} className="text-[#1e3a8a]" /> Students by Branch
                    </h3>
                    <div className="space-y-4 pt-2">
                      {Object.keys(analytics.students_by_branch).length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic">No student branch data available.</p>
                      ) : (
                        Object.entries(analytics.students_by_branch).map(([branch, count]) => {
                          const maxVal = Math.max(...Object.values(analytics.students_by_branch), 1);
                          const percentage = (count / maxVal) * 100;
                          return (
                            <div key={branch} className="space-y-1">
                              <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                <span>{branch}</span>
                                <span>{count} student(s)</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-full h-3.5 overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ type: "spring", stiffness: 80, delay: 0.1 }}
                                  className="h-full bg-gradient-to-r from-blue-500 to-[#1e3a8a] rounded-full"
                                ></motion.div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Teams by Department (Bar Chart) */}
                  <div className="glass-panel p-6 space-y-6">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={16} className="text-[#1e3a8a]" /> Teams by Department
                    </h3>
                    <div className="space-y-4 pt-2">
                      {Object.keys(analytics.teams_by_department).length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic">No department workload data available.</p>
                      ) : (
                        Object.entries(analytics.teams_by_department).map(([dept, count]) => {
                          const maxVal = Math.max(...Object.values(analytics.teams_by_department), 1);
                          const percentage = (count / maxVal) * 100;
                          return (
                            <div key={dept} className="space-y-1">
                              <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                <span>{dept}</span>
                                <span>{count} team(s)</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-full h-3.5 overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ type: "spring", stiffness: 80, delay: 0.2 }}
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-700 rounded-full"
                                ></motion.div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Mentor Workload (Horizontal Lists) */}
                  <div className="glass-panel p-6 space-y-6">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Activity size={16} className="text-indigo-600" /> Mentor Workload (Approved Teams)
                    </h3>
                    <div className="space-y-4 pt-2">
                      {Object.keys(analytics.mentor_workload).length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic">No mentors with active approved teams.</p>
                      ) : (
                        Object.entries(analytics.mentor_workload).map(([name, count]) => {
                          const percentage = Math.min((count / 25) * 100, 100);
                          return (
                            <div key={name} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                  {name}
                                </span>
                                <span className="font-extrabold">{count} / 25 teams</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-full h-3 overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ type: "spring", stiffness: 80 }}
                                  className="h-full bg-indigo-600 rounded-full"
                                ></motion.div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Project Approval Status (Segmented block representation) */}
                  <div className="glass-panel p-6 space-y-6">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" /> Project Approval Status
                    </h3>
                    <div className="space-y-4 pt-2">
                      <div className="h-6 w-full rounded-2xl overflow-hidden flex border border-slate-200/40 dark:border-slate-800/40 bg-slate-100 dark:bg-slate-900/50">
                        {Object.entries(analytics.project_approval_status).map(([status, count]) => {
                          const total = Object.values(analytics.project_approval_status).reduce((a, b) => a + b, 0) || 1;
                          const percentage = (count / total) * 100;
                          if (percentage === 0) return null;
                          const colorMap: Record<string, string> = {
                            APPROVED: "bg-emerald-500",
                            PENDING: "bg-amber-500",
                            REJECTED: "bg-rose-500",
                            "NOT SUBMITTED": "bg-slate-400"
                          };
                          return (
                            <motion.div
                              key={status}
                              initial={{ flexGrow: 0 }}
                              animate={{ flexGrow: percentage }}
                              transition={{ duration: 0.5 }}
                              style={{ width: `${percentage}%` }}
                              className={`h-full ${colorMap[status] || "bg-slate-400"} hover:brightness-105 transition-all cursor-pointer`}
                              title={`${status}: ${count}`}
                            ></motion.div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span>Approved: {analytics.project_approval_status.APPROVED}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span>Pending: {analytics.project_approval_status.PENDING}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <span>Rejected: {analytics.project_approval_status.REJECTED}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                          <span>Draft: {analytics.project_approval_status["NOT SUBMITTED"]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Registrations (List leaderboard) */}
                  <div className="glass-panel p-6 space-y-6 col-span-1 md:col-span-2">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={16} className="text-[#1e3a8a]" /> Event Registration Leaderboard
                    </h3>
                    <div className="space-y-3.5 pt-2">
                      {Object.keys(analytics.event_registrations).length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic">No events posted yet.</p>
                      ) : (
                        Object.entries(analytics.event_registrations)
                          .sort((a, b) => b[1] - a[1])
                          .map(([title, rsvps], rank) => (
                            <div key={title} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/35 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 hover:scale-[1.005] transition-all">
                              <div className="w-7 h-7 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-black text-xs">
                                #{rank + 1}
                              </div>
                              <div className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-200">
                                {title}
                              </div>
                              <div className="text-xs font-black text-[#1e3a8a] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-full border border-blue-100 dark:border-blue-900">
                                {rsvps} RSVP(s)
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
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
            {/* Search Input Bar */}
            <div className="glass-panel p-5 flex items-center gap-3">
              <Search className="text-slate-400 flex-shrink-0" size={20} />
              <input
                type="text"
                placeholder="Search by student/mentor name, USN, team ID, team name, branch, or project title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {searchLoading ? (
              <div className="text-center py-12 text-slate-500 font-medium">
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
                        <Users size={16} className="text-[#1e3a8a]" /> Users ({searchResults.users.length})
                      </h3>
                      <div className="space-y-3">
                        {searchResults.users.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching users found.</p>
                        ) : (
                          searchResults.users.map((user) => (
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
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold flex-wrap">
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
                        <Layers size={16} className="text-[#1e3a8a]" /> Teams ({searchResults.teams.length})
                      </h3>
                      <div className="space-y-3">
                        {searchResults.teams.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-medium p-4 glass-panel text-center">No matching teams found.</p>
                        ) : (
                          searchResults.teams.map((team) => (
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
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
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
                  <div className="text-center py-16 text-slate-400 font-semibold glass-panel p-10 max-w-sm mx-auto">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    Enter keywords above to query the database.
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
              <div className="text-center py-12 text-slate-500 font-medium">
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
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/10 transition-all duration-200"
                        >
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">{mentor.full_name}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold flex-wrap">
                              <span>Post: {mentor.post}</span>
                              <span>•</span>
                              <span>Dept: {mentor.department}</span>
                              <span>•</span>
                              <span>Email: {mentor.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 flex-shrink-0">
                            {/* Workload Progress */}
                            <div className="text-right space-y-1">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Workload Capacity</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                                  <div style={{ width: `${workloadPercent}%` }} className="h-full bg-indigo-600 rounded-full"></div>
                                </div>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{mentor.workload} / 25 teams</span>
                              </div>
                            </div>
                            <ChevronRight className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} size={18} />
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
                                  <Layers size={13} /> Assigned Teams ({mentor.assigned_teams.length})
                                </h4>

                                {/* Assign new team select dropdown */}
                                <div className="flex items-center gap-2">
                                  <UserPlus size={14} className="text-[#1e3a8a]" />
                                  <select
                                    value=""
                                    onChange={(e) => handleAssignMentor(Number(e.target.value), mentor.id)}
                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
                                  >
                                    <option value="" disabled>+ Assign / Transfer Team...</option>
                                    {allTeams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name} (ID: {team.id} - Current Mentor: {team.mentor_name})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {mentor.assigned_teams.length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium italic">This mentor has no active team assignments.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {mentor.assigned_teams.map((team) => (
                                    <div key={team.id} className="bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col justify-between gap-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{team.name}</span>
                                          <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-950">
                                            ID: {team.id}
                                          </span>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                                          Topic: {team.project_topic}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                          Students: {team.students.join(', ') || 'None'}
                                        </div>
                                      </div>

                                      {/* Controls next to team card */}
                                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                                        {/* Reassign select */}
                                        <div className="flex items-center gap-1">
                                          <GitMerge size={12} className="text-slate-400" />
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
        ) : (
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter size={10} /> Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="">All Branches</option>
                  {allBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={10} /> Project Theme
                </label>
                <select
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="">All Themes / Topics</option>
                  {allThemes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={10} /> Approval Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
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
              <div className="text-center py-12 text-slate-500 font-medium">
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
                            <span className="text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full">
                              ID: {team.id}
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              team.mentor_status === 'APPROVED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900'
                                : team.mentor_status === 'PENDING'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900'
                                : team.mentor_status === 'REJECTED'
                                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900'
                                : 'bg-slate-50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                            }`}>
                              {team.mentor_status || 'Draft'}
                            </span>
                          </div>
                          
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Project Theme: <span className="font-extrabold text-slate-700 dark:text-slate-350">{team.project_topic || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Top action row: Approve/Reject, Dissolve */}
                        <div className="flex flex-wrap gap-2.5 items-center">
                          {team.mentor_status !== 'APPROVED' && (
                            <button
                              onClick={() => handleApproveProject(team.id)}
                              className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-xs font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1.5"
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
                              className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 px-4 py-2 text-xs font-bold rounded-xl hover:bg-rose-600 hover:text-white transition cursor-pointer flex items-center gap-1.5"
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
                              className="text-rose-600 hover:text-rose-500 font-bold text-xs uppercase tracking-wider cursor-pointer ml-1"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Student members roster */}
                      <div className="space-y-3">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider"> Roster & Student Transfers</span>
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
                              {team.members.map((member) => (
                                <tr key={member.id} className="border-b border-slate-55 dark:border-slate-900/20 last:border-none">
                                  <td className="py-2.5 font-extrabold text-slate-800 dark:text-slate-200">{member.full_name}</td>
                                  <td className="py-2.5">{member.usn}</td>
                                  <td className="py-2.5 font-bold uppercase text-indigo-600 dark:text-blue-450">{member.branch}</td>
                                  <td className="py-2.5">{member.email}</td>
                                  <td className="py-2.5 text-right">
                                    {/* Student transfer select */}
                                    <select
                                      value=""
                                      onChange={(e) => handleMoveStudent(member.id, Number(e.target.value))}
                                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
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
                              
                              {team.members.length === 0 && (
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
        )}
      </AnimatePresence>

      {/* Rejection Modal overlay */}
      <AnimatePresence>
        {rejectingTeamId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass-panel p-6 shadow-2xl relative"
            >
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Reject Project Theme</h3>
              <p className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">Provide a reason explaining why the current project topic or theme is being rejected. This notification will be visible to the team members.</p>
              
              <textarea
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Type rejection observations here (e.g. Duplicate project topic, needs scope adjustment...)"
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none placeholder-slate-400 mb-5"
              ></textarea>
              
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setRejectingTeamId(null)}
                  className="px-4.5 py-2.5 font-bold text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass-panel p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    <Mail size={13} /> {selectedUser.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
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
                        className="glass-panel p-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/35 transition cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{selectedUser.group.name}</span>
                            <span className="text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900">
                              ID: {selectedUser.group.id}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                            Topic: {selectedUser.group.project_topic}
                          </div>
                        </div>
                        <ChevronRight className="text-slate-400" size={16} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">This student is not currently assigned to any team.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
