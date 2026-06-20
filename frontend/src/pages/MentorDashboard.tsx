import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderGit, 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search
} from 'lucide-react';
import Avatar from '../components/Avatar';

interface MemberItem {
  id: number;
  full_name: string;
  email: string;
  usn?: string | null;
  branch?: string | null;
  cycle?: string | null;
  avatar_config?: any;
}

interface TeamItem {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  project_topic?: string | null;
  mentor_status?: string;
  members: MemberItem[];
}

export default function MentorDashboard() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rejection Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTeamId, setRejectingTeamId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchPendingTeams = async () => {
    try {
      const res = await api.get('/chat/groups/mentor/teams');
      // Only keep pending approvals
      const pending = res.data.filter((t: any) => t.mentor_status === 'PENDING');
      setTeams(pending);
    } catch (err) {
      console.error("Error fetching pending groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTeams();
  }, []);

  const handleApproveTeam = async (teamId: number) => {
    if (!confirm('Are you sure you want to approve this team? This will assign you as their mentor and record their details.')) return;
    setSubmittingAction(true);
    try {
      await api.post(`/chat/groups/${teamId}/mentor-action`, {
        action: 'APPROVE'
      });
      alert('Team approved successfully!');
      await fetchPendingTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve team');
    } finally {
      setSubmittingAction(false);
    }
  };

  const triggerRejectModal = (teamId: number) => {
    setRejectingTeamId(teamId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectTeam = async () => {
    if (!rejectingTeamId || !rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post(`/chat/groups/${rejectingTeamId}/mentor-action`, {
        action: 'REJECT',
        rejection_reason: rejectionReason.trim()
      });
      setShowRejectModal(false);
      setRejectingTeamId(null);
      alert('Team request rejected.');
      await fetchPendingTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject team');
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredTeams = teams.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = t.name.toLowerCase().includes(query);
    const topicMatch = t.project_topic?.toLowerCase().includes(query) || false;
    const memberMatch = t.members.some(m => m.full_name.toLowerCase().includes(query));
    return nameMatch || topicMatch || memberMatch;
  });

  if (loading) {
    return (
      <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Confirmations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <FolderGit className="text-indigo-600 w-9 h-9" /> Pending Confirmations
        </h1>
        <p className="text-gray-500 font-medium mt-1">Review student team registrations and topic choices awaiting confirmation</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by team name, topic, or member..."
            className="w-full pl-9 pr-4 py-2.5 glass-input rounded-xl text-xs outline-none font-semibold text-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-400 bg-slate-900/10 dark:bg-slate-950/40 px-4 py-2.5 rounded-xl border border-white/5 shadow-sm shrink-0">
          Pending: <span className="text-amber-500 font-black">{teams.length} request(s)</span>
        </div>
      </div>

      {/* Warning Notice */}
      {teams.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-2xl flex gap-3 text-xs font-medium leading-relaxed mb-6 text-left">
          <AlertCircle size={20} className="shrink-0 animate-pulse" />
          <div>
            Please verify that each team's size (4 to 5 members) and academic cycle balance constraints (exactly 2 P + 2 C for 4 members; 3 P + 2 C or 2 P + 3 C for 5 members) are satisfied before approving. Approving a team registers them to your account and compiles their details to the teachers' database.
          </div>
        </div>
      )}

      {/* Confirmations List */}
      {filteredTeams.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-900/10 dark:bg-slate-950/40 flex items-center justify-center text-slate-500 border border-white/5 mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">All Caught Up!</h3>
          <p className="text-slate-500 text-xs font-medium mt-1.5 max-w-sm leading-relaxed">
            There are no pending confirmation requests awaiting your approval right now.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTeams.map((team) => (
            <motion.div
              layoutId={`confirm-card-${team.id}`}
              key={team.id}
              className="glass-panel p-6 border border-white/5 flex flex-col md:flex-row justify-between gap-6 text-left shadow-lg relative overflow-hidden"
            >
              <div className="flex-1 space-y-4">
                {/* Team Info */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                      Topic: {team.project_topic || 'Not Specified'}
                    </h3>
                    <p className="text-xs text-indigo-400 font-semibold mt-1">
                      Team: <span className="text-slate-600 dark:text-slate-200">{team.name}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full uppercase tracking-wider">
                    Pending
                  </span>
                </div>

                {/* Team Roster */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Roster ({team.members.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {team.members.map((member) => {
                      const isAdmin = member.id === team.created_by;
                      return (
                        <div key={member.id} className="bg-white/5 dark:bg-slate-950/20 border border-white/5 rounded-xl p-2.5 flex gap-3.5 items-center">
                          <div className="w-9 h-9 rounded-full border border-white/80 shadow-md overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                            <Avatar config={member.avatar_config || { emoji: '👨‍💻', bg: 0 }} name={member.full_name} size={30} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block flex items-center gap-1.5">
                              {member.full_name}
                              {isAdmin && (
                                <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                              )}
                            </span>
                            <span className="text-[9px] text-gray-500 font-semibold block">
                              {member.usn || 'No USN'} • {member.branch || 'N/A'} • {member.cycle ? `${member.cycle}-Cycle` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col justify-center items-center gap-2.5 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerRejectModal(team.id)}
                  disabled={submittingAction}
                  className="flex-1 md:flex-none w-full md:w-36 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer uppercase tracking-wider"
                >
                  <XCircle size={14} /> Disapprove
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveTeam(team.id)}
                  disabled={submittingAction}
                  className="flex-1 md:flex-none w-full md:w-36 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer uppercase tracking-wider"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Disapprove Reason Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingTeamId(null);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">Disapprove Team Registration</h3>
              <p className="text-gray-500 text-xs font-medium mb-4">
                Please provide a rejection reason so the team members can review, update their project topic/mentor parameters, and resubmit.
              </p>

              <textarea
                rows={4}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-xs text-slate-900 dark:text-slate-100 shadow-inner resize-none leading-relaxed"
                placeholder="Type rejection reason here (e.g. Duplicate project topic, incorrect mentor assignment, please readjust team rosters)..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />

              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingTeamId(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectTeam}
                  disabled={submittingAction || !rejectionReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submittingAction ? "Submitting..." : "Submit Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
