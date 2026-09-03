import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';
import Avatar from '../components/Avatar';
import { getStudentSemester } from '../utils/academic';

interface MemberInfo {
  id: number;
  full_name: string;
  email?: string | null;
  branch?: string | null;
  branch_code?: string | null;
  year_of_study?: number | null;
  profile_photo?: string | null;
  is_mentor?: boolean | null;
}

interface TeamInviteData {
  group_id: number;
  name: string;
  created_by: number;
  created_by_name?: string | null;
  project_topic?: string | null;
  project_sub_topic?: string | null;
  project_theme?: string | null;
  members: MemberInfo[];
  member_count: number;
  max_members: number;
  is_full: boolean;
  is_locked: boolean;
  can_join: boolean;
  reason?: string | null;
  already_member: boolean;
  in_other_team: boolean;
  other_team_name?: string | null;
}

export default function JoinTeam() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamInviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      sessionStorage.setItem('post_login_redirect', window.location.pathname);
      navigate('/login');
      return;
    }

    if (!inviteCode) {
      setError('Invalid or missing invite link.');
      setLoading(false);
      return;
    }

    fetchInviteDetails();
  }, [inviteCode]);

  const fetchInviteDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/chat/groups/invite/${inviteCode}`);
      setTeamData(res.data);
    } catch (err: any) {
      if (err.response?.status === 404 && err.response?.data?.detail === "Not Found") {
        setError('Backend server deployment is pending. Please trigger "Manual Deploy" -> "Deploy latest commit" on your Render dashboard, or retry in a few moments.');
      } else {
        setError(err.response?.data?.detail || 'This invite link is invalid, expired, or disabled.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode || joining) return;
    setJoining(true);
    try {
      await api.post(`/chat/groups/invite/${inviteCode}/join`);
      setJoinSuccess(true);
      setTimeout(() => {
        navigate('/my-team');
      }, 1800);
    } catch (err: any) {
      if (err.response?.status === 404 && err.response?.data?.detail === "Not Found") {
        alert('The backend server update is still deploying on Render. Please deploy the latest commit on Render dashboard and try again.');
      } else {
        alert(err.response?.data?.detail || 'Failed to join the team. Please try again.');
      }
      setJoining(false);
      fetchInviteDetails();
    }
  };


  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Checking invite link details...</p>
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to Join Team</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium leading-relaxed">
            {error || 'This invite link is invalid or no longer active.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/discovery')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Browse Discovery
            </button>
            <button
              onClick={() => navigate('/my-team')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              Go to My Team
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel p-8 text-center rounded-3xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">You joined {teamData.name}!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
            Taking you to your team dashboard and group chat...
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-full bg-emerald-500"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} /> Team Invitation
          </span>
          <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
            teamData.member_count >= 5
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800/40'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800/40'
          }`}>
            {teamData.member_count} / {teamData.max_members} Members
          </span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight capitalize mb-2">
          {teamData.name}
        </h1>

        {teamData.created_by_name && (
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
            Created by <span className="text-slate-800 dark:text-slate-200 font-bold">{teamData.created_by_name}</span>
          </p>
        )}

        {(teamData.project_topic || teamData.project_theme) && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 mb-6 space-y-1.5">
            {teamData.project_topic && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">Topic:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{teamData.project_topic}</span>
              </div>
            )}
            {teamData.project_theme && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">Theme:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{teamData.project_theme}</span>
              </div>
            )}
          </div>
        )}

        {/* Current Members Section */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users size={14} /> Team Roster ({teamData.members.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {teamData.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 shadow-xs"
              >
                <Avatar config={member.profile_photo ? { photo: member.profile_photo } : null} name={member.full_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{member.full_name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase truncate">
                    {(member.branch_code || member.branch || 'CSE').toUpperCase()} • {getStudentSemester(member)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status / CTA Box */}
        {teamData.already_member ? (
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">You are already in this team!</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400">Head over to your team chat to collaborate with your peers.</p>
            </div>
            <button
              onClick={() => navigate('/my-team')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              Open My Team <ArrowRight size={14} />
            </button>
          </div>
        ) : !teamData.can_join ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Cannot Join Team</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium pl-6">
              {teamData.reason}
            </p>
            <div className="pt-2 pl-6 flex gap-2">
              {teamData.in_other_team ? (
                <button
                  onClick={() => navigate('/my-team')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  View My Current Team
                </button>
              ) : (
                <button
                  onClick={() => navigate('/discovery')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Discover Other Students
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Your profile matches this team's academic criteria. You are eligible to join!</span>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider transition shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining Team...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Accept Invitation & Join Team</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
