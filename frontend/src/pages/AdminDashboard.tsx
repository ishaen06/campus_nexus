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
  Sparkles 
} from 'lucide-react';

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'moderation' | 'analytics'>('moderation');
  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

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

  useEffect(() => {
    fetchReports();
    fetchAnalytics();

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
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
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
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  );
}
