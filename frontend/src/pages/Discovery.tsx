import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Check, RefreshCw, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { getYearOfStudy, getClusterForBranch, BRANCH_CLUSTER_MAP } from './MyTeam';
import { getStudentSemester } from '../utils/academic';


interface UserProfile {
  id: number;
  full_name: string;
  branch: string;
  branch_code?: string;
  year_of_study: number;
  bio: string;
  interests: string[];
  goals: string[];
  profile_photo?: string;
  is_online?: boolean;
  is_mentor?: boolean;
  department?: string;
  post?: string;
  cycle?: string;
  joining_year?: number;
  usn?: string;
  email?: string;
  is_open_for_team?: boolean;
  in_team?: boolean;
}

interface GroupItem {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  member_ids: number[];
  is_public: boolean;
  members: any[];
  criteria_met: boolean;
  validation_error?: string | null;
  project_topic?: string | null;
  project_sub_topic?: string | null;
  project_theme?: string | null;
  allow_member_leave?: boolean;
  mentor_status?: string;
  department?: string;
  post?: string;
  cycle?: string;
}

const CLUSTERS = [
  { id: 'CS', label: 'CS Cluster', fullName: 'Computer Science (CI, CD, CS, CY)' },
  { id: 'EC', label: 'EC Cluster', fullName: 'Electronics (EC, EE, ET)' },
  { id: 'ME', label: 'ME Cluster', fullName: 'Mechanical (AS, IM, ME)' },
  { id: 'CV', label: 'CV Cluster', fullName: 'Civil & Bio (CV, BT, CH)' }
];

const BRANCH_OPTIONS = [
  { code: 'CS', label: 'Computer Science & Engineering (CS)', cluster: 'CS' },
  { code: 'CI', label: 'Artificial Intelligence & Machine Learning (CI/AI)', cluster: 'CS' },
  { code: 'IS', label: 'Information Science & Engineering (IS)', cluster: 'CS' },
  { code: 'CD', label: 'Computer Science - Data Science (CD)', cluster: 'CS' },
  { code: 'CY', label: 'Cyber Security (CY)', cluster: 'CS' },
  { code: 'EC', label: 'Electronics & Communication (EC)', cluster: 'EC' },
  { code: 'EE', label: 'Electrical & Electronics (EE)', cluster: 'EC' },
  { code: 'ET', label: 'Electronics & Telecommunication (ET)', cluster: 'EC' },
  { code: 'AS', label: 'Aerospace Engineering (AS/AE)', cluster: 'ME' },
  { code: 'IM', label: 'Industrial Engineering & Management (IM)', cluster: 'ME' },
  { code: 'ME', label: 'Mechanical Engineering (ME)', cluster: 'ME' },
  { code: 'CV', label: 'Civil Engineering (CV)', cluster: 'CV' },
  { code: 'BT', label: 'Biotechnology (BT)', cluster: 'CV' },
  { code: 'CH', label: 'Chemical Engineering (CH)', cluster: 'CV' }
];

const getUserBranchCode = (user: any): string => {
  if (user?.branch_code) return user.branch_code.toUpperCase().trim();
  const raw = (user?.branch || '').toUpperCase().trim();
  if (BRANCH_CLUSTER_MAP[raw]) return raw;
  
  const match = BRANCH_OPTIONS.find(b => 
    b.code === raw || raw.startsWith(b.code) || raw.includes(`(${b.code})`) || b.label.toUpperCase().includes(raw)
  );
  if (match) return match.code;

  if (user?.usn) {
    const m = user.usn.match(/^1R[VZ]\d{2}([A-Z]{2,3})\d{3}$/i);
    if (m && BRANCH_CLUSTER_MAP[m[1].toUpperCase()]) {
      return m[1].toUpperCase();
    }
  }
  return raw;
};

const getUserCluster = (user: any): string | null => {
  const code = getUserBranchCode(user);
  return getClusterForBranch(code) || BRANCH_CLUSTER_MAP[code] || null;
};


export default function Discovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'people' | 'teams'>(
    location.state?.activeTab === 'teams' ? 'teams' : 'people'
  );
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  
  // Teams tab state
  const [publicTeams, setPublicTeams] = useState<GroupItem[]>([]);
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filters state
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const isSecondYear = getYearOfStudy(me?.joining_year, me?.email, me?.usn) >= 2;


  // Swipe counter — ensures recycled cards get fresh component instances with new keys
  const [swipeCounter, setSwipeCounter] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const myRes = await api.get('/users/me');
      setMe(myRes.data);
      const res = await api.get('/users/discovery');
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load discovery feed", err);
    } finally {
      setLoading(false);
    }
  };

  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleToggleTeamStatus = async () => {
    if (!me || togglingStatus) return;
    const newStatus = me.is_open_for_team === false ? true : false;
    setTogglingStatus(true);
    try {
      const res = await api.put('/users/team-status', { is_open_for_team: newStatus });
      setMe(res.data);
      const discRes = await api.get('/users/discovery');
      setUsers(discRes.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update team availability status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const fetchPublicTeams = async () => {
    try {
      const res = await api.get('/chat/groups/public');
      setPublicTeams(res.data);
    } catch (err) {
      console.error("Failed to load public recruiting teams", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPublicTeams();
  }, []);

  // Sync state if navigation changes
  useEffect(() => {
    if (location.state?.activeTab === 'teams') {
      setActiveTab('teams');
    }
  }, [location.state]);

  const handleSwipeRight = async (userId: number) => {
    // Optimistic UI update
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await api.post('/connections/', { receiver_id: userId });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to send request");
      fetchUsers(); // Re-fetch on failure to sync state
    }
  };

  const handleSwipeLeft = async (userId: number) => {
    // Increment swipe counter so recycled users get fresh component instances
    setSwipeCounter(c => c + 1);
    // Optimistic UI update: Recycle the user to the bottom of the stack instantly
    setUsers(prev => {
      const index = prev.findIndex(u => u.id === userId);
      if (index === -1) return prev;
      const newUsers = [...prev];
      const [swipedUser] = newUsers.splice(index, 1);
      return [...newUsers, swipedUser];
    });

    try {
      await api.post(`/users/${userId}/dismiss`);
    } catch (err: any) {
      console.error("Failed to dismiss user", err);
    }
  };

  const handleChatWithAdmin = async (adminId: number, teamName: string) => {
    try {
      const res = await api.post('/connections/admin-chat', { receiver_id: adminId });
      const connectionId = res.data.connection_id || res.data.id;
      
      const myBranch = getUserBranchCode(me);
      const myCluster = getUserCluster(me);
      const introMessage = isSecondYear
        ? `Hi! I saw your team "${teamName}" in the Discover Teams feed and would love to join. My branch is ${myBranch} (${myCluster || ''} Cluster).`
        : `Hi! I saw your team "${teamName}" in the Discover Teams feed and would love to join. My cycle is ${(me?.cycle || 'P') === 'P' ? 'Physics (P-Cycle)' : 'Chemistry (C-Cycle)'}.`;

      navigate(`/chat/${connectionId}`, { state: { prefilledMessage: introMessage } });
    } catch (err) {
      console.error("Failed to initiate chat with team admin", err);
      alert("Could not start chat with team admin.");
    }
  };

  const openProfilePreview = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  const filteredUsers = users.filter(user => {
    if ((user as any).is_admin || (user as any).role === 'admin' || user.bio?.includes('Platform Administrator')) return false;
    
    // Strict team status: Only show people open for a team, never anyone in an active team
    if (user.is_open_for_team === false) return false;
    if (user.in_team === true) return false;

    // Strict academic year isolation: each student only sees peers from their OWN year
    const myYear = getYearOfStudy(me?.joining_year, me?.email, me?.usn);
    const uYear = getYearOfStudy(user.joining_year, user.email, user.usn);
    if (myYear && uYear && myYear !== uYear) return false;

    // Academic Year filter: Year 2+ uses Cluster; Year 1 uses Cycle
    if (isSecondYear) {
      if (clusterFilter !== 'all') {
        const uCluster = getUserCluster(user);
        if (uCluster !== clusterFilter) return false;
      }
    } else {
      if (cycleFilter !== 'all') {
        const uCycle = (user.cycle || '').toUpperCase();
        if (uCycle !== cycleFilter.toUpperCase()) return false;
      }
    }

    if (branchFilter !== 'all') {
      const uBranch = getUserBranchCode(user);
      if (uBranch !== branchFilter) return false;
    }

    return true;
  });


  return (
    <div className="relative flex flex-col items-center justify-start min-h-[calc(100vh-64px)] bg-transparent px-4 md:px-8 pt-8 pb-16 w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
      {/* Header: Navigation Tabs & Filter Controls */}
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab('people')}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
              activeTab === 'people' 
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            People
            {activeTab === 'people' && (
              <motion.div layoutId="discoveryTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
              activeTab === 'teams' 
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Teams
            {activeTab === 'teams' && (
              <motion.div layoutId="discoveryTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Filter Bar */}
        <div data-tour="discovery-filters" className="flex flex-row flex-wrap gap-2.5 items-center justify-center p-1.5 bg-slate-100/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-full border border-slate-200/60 dark:border-slate-800/60 shadow-sm text-xs">
          {/* Year 2: Cluster Filter | Year 1: Cycle Filter */}
          {isSecondYear ? (
            <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Cluster:</label>
              <select
                value={clusterFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setClusterFilter(val);
                  if (val !== 'all' && branchFilter !== 'all' && BRANCH_CLUSTER_MAP[branchFilter] !== val) {
                    setBranchFilter('all');
                  }
                }}
                className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer focus:outline-none focus:ring-0 p-0"
              >
                <option value="all" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">All Clusters</option>
                {CLUSTERS.map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">{c.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Cycle:</label>
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer focus:outline-none focus:ring-0 p-0"
              >
                <option value="all" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">All Cycles</option>
                <option value="P" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">Physics</option>
                <option value="C" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">Chemistry</option>
              </select>
            </div>
          )}

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Branch:</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer focus:outline-none focus:ring-0 p-0 max-w-[130px] truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">All Branches</option>
              {BRANCH_OPTIONS.filter(opt => isSecondYear && clusterFilter !== 'all' ? opt.cluster === clusterFilter : true).map(opt => (
                <option key={opt.code} value={opt.code} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">{opt.code}</option>
              ))}
            </select>
          </div>

          {(clusterFilter !== 'all' || cycleFilter !== 'all' || branchFilter !== 'all') && (
            <button
              onClick={() => {
                setClusterFilter('all');
                setCycleFilter('all');
                setBranchFilter('all');
              }}
              className="px-3 py-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 transition-colors cursor-pointer bg-white/80 dark:bg-slate-950/60 rounded-full border border-slate-200/50 dark:border-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Student Availability Toggle Banner */}
      {activeTab === 'people' && me && !me.is_admin && !me.is_mentor && (
        <div className="w-full max-w-md mx-auto mb-6 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                me.in_team ? 'bg-amber-400' : (me.is_open_for_team !== false ? 'bg-emerald-400' : 'bg-slate-400')
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                me.in_team ? 'bg-amber-500' : (me.is_open_for_team !== false ? 'bg-emerald-500' : 'bg-slate-500')
              }`}></span>
            </span>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                {me.in_team ? "In a Team" : (me.is_open_for_team !== false ? "Open for a Team" : "Marked In a Team")}
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                  me.in_team 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                    : (me.is_open_for_team !== false 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')
                }`}>
                  {me.in_team ? 'Team Member' : (me.is_open_for_team !== false ? 'Visible' : 'Hidden')}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {me.in_team 
                  ? "You belong to an active team and are hidden from Discovery"
                  : (me.is_open_for_team !== false 
                      ? "Classmates looking for teammates can discover you" 
                      : "Your profile is hidden from classmates looking for teammates")}
              </span>
            </div>
          </div>

          {!me.in_team ? (
            <button
              onClick={handleToggleTeamStatus}
              disabled={togglingStatus}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border shadow-xs cursor-pointer flex items-center gap-1 ${
                me.is_open_for_team !== false
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Click to toggle your availability status"
            >
              {togglingStatus ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : me.is_open_for_team !== false ? (
                <>✓ Open for Team</>
              ) : (
                <>🔒 In a Team</>
              )}
            </button>
          ) : (
            <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/30">
              Active Team
            </span>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'people' ? (
          <motion.div
            key="people"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm relative h-[600px] flex items-center justify-center"
          >
            {loading ? (
              <div className="text-center flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium tracking-wide">Finding amazing people...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <motion.div 
                data-tour="student-card"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl border border-dashed border-gray-200 dark:border-slate-800"
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No profiles found</h3>
                <p className="text-gray-500 dark:text-slate-450 mb-8 text-sm">
                  No profiles match your {isSecondYear ? 'cluster' : 'cycle'} or branch filters. Try clearing filters or checking back later.
                </p>
                <button 
                  onClick={fetchUsers}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 rounded-full text-indigo-600 dark:text-indigo-400 font-semibold shadow-[0_4px_14px_0_rgba(99,102,241,0.15)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <RefreshCw size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                  Refresh Feed
                </button>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredUsers.slice(0, 3).map((user, index) => {
                  const sameBranch = me && me.branch === user.branch;
                  const sharedInterests = me && me.interests ? me.interests.filter((i: string) => user.interests?.includes(i)).length : 0;
                  const mutualBadge = sameBranch ? "Same Branch" : (sharedInterests > 0 ? `${sharedInterests} Shared Interests` : null);

                  return (
                    <SwipeableCard 
                      key={`${user.id}-${swipeCounter}`} 
                      user={user} 
                      index={index} 
                      onSwipeRight={() => handleSwipeRight(user.id)}
                      onSwipeLeft={() => handleSwipeLeft(user.id)}
                      mutualBadge={mutualBadge}
                    />
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="teams"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-6xl mx-auto space-y-6 text-left"
          >
            {(() => {
              const visiblePublicTeams = publicTeams.filter(team => {
                if (me && team.member_ids.includes(me.id)) return false;
                
                // Strict academic year isolation: each student only sees recruiting teams from their OWN year
                const myYear = getYearOfStudy(me?.joining_year, me?.email, me?.usn);
                const studentMembers = (team.members || []).filter((m: any) => !m.is_mentor);
                if (studentMembers.length > 0) {
                  const teamYear = getYearOfStudy(studentMembers[0].joining_year, studentMembers[0].email, studentMembers[0].usn);
                  if (myYear && teamYear && myYear !== teamYear) return false;
                }

                // Cluster filter for Year 2+, Cycle filter for Year 1
                if (isSecondYear) {
                  if (clusterFilter !== 'all') {
                    const members = (team.members || []).filter((m: any) => !m.is_mentor);
                    const hasClusterMember = members.some((m: any) => getUserCluster(m) === clusterFilter);
                    const directCluster = (team as any).cluster;
                    if (!hasClusterMember && directCluster !== clusterFilter) return false;
                  }
                } else {
                  if (cycleFilter !== 'all') {
                    const hasCycleMember = (team.members || []).some((m: any) => (m.cycle || '').toUpperCase() === cycleFilter.toUpperCase());
                    if (!hasCycleMember) return false;
                  }
                }
                
                // Branch filter
                if (branchFilter !== 'all') {
                  const hasBranchMember = (team.members || []).some((m: any) => getUserBranchCode(m) === branchFilter);
                  if (!hasBranchMember) return false;
                }
                
                return true;
              });


              return (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Public Recruiting Teams ({visiblePublicTeams.length})</h2>
                  </div>

                  {visiblePublicTeams.length === 0 ? (
                    <div className="discover-empty-card p-12 text-center flex flex-col items-center justify-center w-full">
                      <span className="text-4xl mb-4 block">🔍</span>
                      <p className="text-gray-500 dark:text-slate-450 font-medium max-w-md">No public teams are looking for members right now. Check back later or create your own public team!</p>
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {visiblePublicTeams.map((team, idx) => {
                        const members = (team.members || []).filter((m: any) => !m.is_mentor);
                        const pCount = members.filter((m: any) => (m.cycle || '').toUpperCase() === 'P').length;
                        const cCount = members.filter((m: any) => (m.cycle || '').toUpperCase() === 'C').length;
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            key={`public-${team.id}`}
                            className="discover-team-card p-6 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div className="min-w-0 flex-1 pr-2">
                                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate w-full">{team.name}</h3>
                                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mt-0.5">
                                    Admin ID: {team.created_by}
                                  </span>
                                  {team.project_topic && (
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block truncate mt-1.5" title={team.project_topic}>
                                      Topic: {team.project_topic}
                                    </span>
                                  )}
                                  {team.project_theme && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight font-medium" title={team.project_theme}>
                                      Theme: {team.project_theme}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                  team.criteria_met 
                                  ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' 
                                  : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                }`}>
                                  {team.criteria_met ? '✓ Complete' : '⚠️ Recruiting'}
                                </span>
                              </div>

                              {/* Current Member Avatars */}
                              <div className="mb-4">
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Team Members ({members.length} / 5)</label>
                                <div className="flex -space-x-2.5">
                                  {members.map((member: any) => (
                                    <div 
                                      key={member.id} 
                                      onClick={(e) => openProfilePreview(member, e)}
                                      className="relative hover:scale-110 hover:z-30 transition-transform cursor-pointer"
                                      title={`${member.full_name} (${member.branch} • Cycle: ${member.cycle})`}
                                    >
                                      <Avatar 
                                        config={member.profile_photo ? { photo: member.profile_photo } : null} 
                                        name={member.full_name} 
                                        size={36} 
                                        className="ring-2 ring-white dark:ring-slate-950 shadow-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Team Composition Indicator (Year 2: Cluster & Branches, Year 1: Cycle Balance) */}
                              {(() => {
                                const yr = getYearOfStudy(members[0]?.joining_year, members[0]?.email, members[0]?.usn);
                                if (yr >= 2) {

                                  const branchCounts: Record<string, number> = {};
                                  members.forEach((m: any) => {
                                    const b = (m.branch_code || m.branch || 'CS').toUpperCase();
                                    branchCounts[b] = (branchCounts[b] || 0) + 1;
                                  });
                                  const clusters = [...new Set(Object.keys(branchCounts).map(b => getClusterForBranch(b)).filter(Boolean))];
                                  const clusterLabel = clusters.length === 1 ? `${clusters[0]} Cluster` : clusters.length > 1 ? 'Mixed Clusters' : 'Cluster';
                                  const branchesSummary = Object.entries(branchCounts).map(([b, cnt]) => `${cnt} ${b}`).join(' + ');

                                  return (
                                    <div className="bg-slate-50/60 dark:bg-slate-950/45 rounded-xl p-3.5 border border-slate-100 dark:border-white/5 space-y-1.5 mb-5 text-left">
                                      <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <span>Cluster:</span>
                                        <span className="font-black text-indigo-600 dark:text-indigo-400">{clusterLabel}</span>
                                      </div>
                                      <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <span>Branches:</span>
                                        <span className="font-black text-slate-800 dark:text-slate-200">{branchesSummary || 'None'}</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="bg-slate-50/60 dark:bg-slate-950/45 rounded-xl p-3.5 border border-slate-100 dark:border-white/5 space-y-1.5 mb-5 text-left">
                                    <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                      <span>Physics (P-Cycle):</span>
                                      <span className="font-black text-slate-800 dark:text-slate-200">{pCount}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                      <span>Chemistry (C-Cycle):</span>
                                      <span className="font-black text-slate-800 dark:text-slate-200">{cCount}</span>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>

                            {/* Join Team / Chat with Admin Button */}
                            <button
                              onClick={() => handleChatWithAdmin(team.created_by, team.name)}
                              className="w-full bg-indigo-600/90 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                            >
                              <Users size={14} />
                              Chat with Admin to Join
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Preview Modal */}
      <ProfilePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        user={previewUser}
      />
    </div>
  );
}

function SwipeableCard({ user, index, onSwipeRight, onSwipeLeft, mutualBadge }: { user: UserProfile, index: number, onSwipeRight: () => void, onSwipeLeft: () => void, mutualBadge: string | null }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const cardOpacity = useTransform(x, [-300, -200, 0, 200, 300], [0.5, 1, 1, 1, 0.5]);
  
  // Like/Nope overlay opacities — appear smoothly as you drag
  const likeOpacity = useTransform(x, [0, 60, 140], [0, 0.4, 1]);
  const nopeOpacity = useTransform(x, [0, -60, -140], [0, 0.4, 1]);

  // Background glow colors that intensify with drag
  const rightGlow = useTransform(x, [0, 80, 200], ['rgba(16,185,129,0)', 'rgba(16,185,129,0.06)', 'rgba(16,185,129,0.15)']);
  const leftGlow = useTransform(x, [0, -80, -200], ['rgba(239,68,68,0)', 'rgba(239,68,68,0.06)', 'rgba(239,68,68,0.15)']);

  // State for programmatic exit animation (button clicks)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const isTop = index === 0;

  // Scale for background cards: they subtly grow when top card is being dragged
  const backgroundScale = useTransform(x, [-200, 0, 200], [1, 1 - index * 0.045, 1]);

  useEffect(() => {
    if (!isTop) {
      x.set(0);
    }
  }, [isTop, x]);

  const handleDragEnd = (_event: any, info: any) => {
    const swipeThreshold = 80;
    const velocityThreshold = 500;
    
    // Tinder-like: either distance OR velocity triggers a swipe
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setExitDirection('right');
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setExitDirection('left');
    }
    // Otherwise the card springs back (handled by Framer Motion automatically)
  };

  // Button-triggered swipes
  const triggerSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction);
  };

  // Once exit animation completes, reset state and call the actual handler
  const handleExitComplete = () => {
    const dir = exitDirection;
    // Reset motion value and state BEFORE calling handler
    // so recycled cards start fresh
    x.set(0);
    setExitDirection(null);
    if (dir === 'right') {
      onSwipeRight();
    } else if (dir === 'left') {
      onSwipeLeft();
    }
  };

  // Exit animation variants
  const exitVariants = {
    initial: { x: 0, opacity: 1, rotate: 0 },
    exitLeft: { 
      x: -600, 
      opacity: 0, 
      rotate: -25,
      transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] as [number, number, number, number] } 
    },
    exitRight: { 
      x: 600, 
      opacity: 0, 
      rotate: 25,
      transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] as [number, number, number, number] } 
    },
  };

  return (
    <motion.div
      className="absolute w-full h-[550px] origin-bottom touch-none"
      style={{
        x: isTop && !exitDirection ? x : undefined,
        rotate: isTop && !exitDirection ? rotate : 0,
        opacity: isTop ? cardOpacity : 1,
        zIndex: 30 - index,
        y: index * 22,

      }}
      initial={false}
      animate={
        exitDirection === 'left' ? 'exitLeft' 
        : exitDirection === 'right' ? 'exitRight' 
        : { 
            scaleX: isTop ? 1 : (backgroundScale as any), 
            scaleY: 1, 
            y: index * 22,
            scale: isTop ? 1 : 1 - index * 0.045,
          }
      }
      variants={exitVariants}
      onAnimationComplete={() => {
        if (exitDirection) handleExitComplete();
      }}
      drag={isTop && !exitDirection ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div 
        data-tour={isTop ? "student-card" : undefined}
        className="discover-swipe-card w-full h-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing relative bg-white dark:bg-[#1e1e24] select-none"
      >
        
        {/* Like Overlay — fades in from left side as you drag right */}
        <motion.div 
          style={{ opacity: likeOpacity, backgroundColor: rightGlow }} 
          className="absolute inset-0 z-10 pointer-events-none rounded-[inherit]"
        />
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 left-6 z-20 pointer-events-none transform -rotate-12 border-4 border-green-500 rounded-xl px-4 py-1.5 bg-green-500/10 backdrop-blur-sm">
          <h2 className="text-4xl font-black text-green-500 uppercase tracking-widest drop-shadow-sm">LIKE</h2>
        </motion.div>
        
        {/* Nope Overlay — fades in from right side as you drag left */}
        <motion.div 
          style={{ opacity: nopeOpacity, backgroundColor: leftGlow }} 
          className="absolute inset-0 z-10 pointer-events-none rounded-[inherit]"
        />
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-10 right-6 z-20 pointer-events-none transform rotate-12 border-4 border-red-500 rounded-xl px-4 py-1.5 bg-red-500/10 backdrop-blur-sm">
          <h2 className="text-4xl font-black text-red-500 uppercase tracking-widest drop-shadow-sm">NOPE</h2>
        </motion.div>

        {/* Profile Image / Header Area */}
        <div className="h-2/5 bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] relative flex items-center justify-center p-6">
           {mutualBadge && (
             <div className="absolute top-4 left-4 bg-white/20 dark:bg-black/40 text-white backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-extrabold border border-white/20 shadow-sm z-20 whitespace-nowrap">
               ✨ {mutualBadge}
             </div>
           )}
           <div className="absolute top-4 right-4 bg-emerald-500/90 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/20 shadow-sm z-20 whitespace-nowrap flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
             Open for Team
           </div>
           <div className="w-32 h-32 relative">
              <div className="w-full h-full rounded-full overflow-hidden bg-white/20 border-[6px] border-white/50 backdrop-blur-sm shadow-xl flex items-center justify-center">
                 <Avatar config={(user as any).profile_photo ? { photo: (user as any).profile_photo } : null} name={user.full_name} size={120} />
              </div>
              {user.is_online && (
                <div className="absolute bottom-1.5 right-1.5 w-[22px] h-[22px] bg-green-500 border-[3px] border-white dark:border-slate-950 rounded-full z-20 shadow-md"></div>
              )}
           </div>
        </div>
        
        <div className="discover-swipe-card-body flex-1 p-6 flex flex-col relative bg-slate-50 dark:bg-[#16161a] border-t border-slate-200 dark:border-slate-850">
          <div className="mb-2 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{user.full_name}</h2>
              <p className="text-[15px] font-semibold text-indigo-600 mt-1 uppercase tracking-wide">
                {user.is_mentor 
                  ? `${user.post || 'Mentor'} • Department of ${user.department || 'N/A'}`
                  : `${user.branch || 'N/A'} • ${getStudentSemester(user)}`
                }

              </p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar py-2">
            {user.bio ? (
              <p className="text-gray-700 text-base leading-relaxed mb-6 font-medium">{user.bio}</p>
            ) : (
              <p className="text-gray-400 text-base italic mb-6">No bio provided</p>
            )}
            
            {user.interests && user.interests.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((int, i) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-50/80 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full shadow-sm">{int}</span>
                  ))}
                </div>
              </div>
            )}
            
            {user.goals && user.goals.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Goals</p>
                <div className="flex flex-wrap gap-2">
                  {user.goals.map((goal, i) => (
                    <span key={i} className="px-3 py-1.5 bg-green-50/80 text-green-700 border border-green-100 text-xs font-bold rounded-full shadow-sm">{goal}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="absolute -top-8 right-6 flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.12, rotate: -8, boxShadow: '0 8px 25px rgba(239,68,68,0.25)' }}
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); triggerSwipe('left'); }}
              className="w-16 h-16 bg-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-white/80 cursor-pointer"
            >
              <X size={28} strokeWidth={3.5} />
            </motion.button>
            <motion.button 
              data-tour={isTop ? "connect-button" : undefined}
              title="Connect"
              whileHover={{ scale: 1.12, rotate: 8, boxShadow: '0 8px 25px rgba(16,185,129,0.3)' }}
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); triggerSwipe('right'); }}
              className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-all border border-emerald-300/30 cursor-pointer"
            >
              <Check size={28} strokeWidth={3.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

