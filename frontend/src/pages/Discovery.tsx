import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Check, RefreshCw, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { getYearOfStudy, getClusterForBranch } from './MyTeam';


interface UserProfile {
  id: number;
  full_name: string;
  branch: string;
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

const BRANCH_OPTIONS = [
  { value: 'ASE', code: 'AS', label: 'Aerospace Eng (AS)' },
  { value: 'AI_ML', code: 'AI & ML', label: 'Artificial Intelligence (AI & ML)' },
  { value: 'BT', code: 'BT', label: 'Biotechnology (BT)' },
  { value: 'CH', code: 'CH', label: 'Chemical Eng (CH)' },
  { value: 'CV', code: 'CV', label: 'Civil Eng (CV)' },
  { value: 'CSE', code: 'CSE', label: 'Computer Science (CSE)' },
  { value: 'CSE_CY', code: 'CSE-CY', label: 'Cyber Security (CSE-CY)' },
  { value: 'CSE_DS', code: 'CSE-DS', label: 'Data Science (CSE-DS)' },
  { value: 'EEE', code: 'EEE', label: 'Electrical & Electronics (EEE)' },
  { value: 'ECE', code: 'ECE', label: 'Electronics & Comm (ECE)' },
  { value: 'ETE', code: 'ETE', label: 'Electronics & Telecom (ETE)' },
  { value: 'IEM', code: 'IEM', label: 'Industrial Eng & Mgmt (IEM)' },
  { value: 'ME', code: 'ME', label: 'Mechanical Eng (ME)' }
];

const matchBranch = (userBranch: string | null | undefined, filterVal: string) => {
  if (!userBranch || filterVal === 'all') return true;
  const uBranch = userBranch.toUpperCase().trim();
  const option = BRANCH_OPTIONS.find(o => o.value === filterVal);
  if (!option) return uBranch === filterVal.toUpperCase().trim();
  
  return uBranch === option.value.toUpperCase() || 
         uBranch === option.code.toUpperCase() ||
         uBranch.includes(option.code.toUpperCase()) ||
         uBranch.includes(option.value.toUpperCase());
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
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Swipe counter — ensures recycled cards get fresh component instances with new keys
  const [swipeCounter, setSwipeCounter] = useState(0);

  // Static branch options used instead of dynamic extraction

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
      
      const myCycle = me?.cycle || 'P';
      const cycleText = myCycle === 'P' ? 'Physics Cycle (P-Cycle)' : 'Chemistry Cycle (C-Cycle)';
      
      const introMessage = `Hi! I saw your team "${teamName}" in the Discover Teams feed and would love to join. My cycle is ${cycleText}.`;
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
    if (cycleFilter !== 'all') {
      const uCycle = (user.cycle || '').toUpperCase();
      if (uCycle !== cycleFilter.toUpperCase()) return false;
    }
    if (branchFilter !== 'all') {
      if (!matchBranch(user.branch, branchFilter)) return false;
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
        <div className="flex flex-row flex-wrap gap-2.5 items-center justify-center p-1.5 bg-slate-100/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-full border border-slate-200/60 dark:border-slate-800/60 shadow-sm text-xs">
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

          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Branch:</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer focus:outline-none focus:ring-0 p-0 max-w-[130px] truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">All Branches</option>
              {BRANCH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250">{opt.label}</option>
              ))}
            </select>
          </div>

          {(cycleFilter !== 'all' || branchFilter !== 'all') && (
            <button
              onClick={() => {
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-10 text-center w-full shadow-2xl flex flex-col items-center justify-center"
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No profiles found</h3>
                <p className="text-gray-500 dark:text-slate-450 mb-8 text-sm">No profiles match your cycle or branch filters. Try clearing filters or checking back later.</p>
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
                
                // Cycle filter
                if (cycleFilter !== 'all') {
                  const hasCycleMember = (team.members || []).some((m: any) => (m.cycle || '').toUpperCase() === cycleFilter.toUpperCase());
                  if (!hasCycleMember) return false;
                }
                
                // Branch filter
                if (branchFilter !== 'all') {
                  const hasBranchMember = (team.members || []).some((m: any) => matchBranch(m.branch, branchFilter));
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
                                const yr = members[0]?.joining_year ? getYearOfStudy(Number(members[0].joining_year)) : 2;
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
        zIndex: 1000 - index,
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
      <div className="discover-swipe-card w-full h-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing relative bg-white dark:bg-[#1e1e24] select-none">
        
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
                  : `${user.branch || 'N/A'} • ${user.year_of_study ? (user.year_of_study === 1 ? '1st Sem' : user.year_of_study === 2 ? '2nd Sem' : user.year_of_study === 3 ? '3rd Sem' : user.year_of_study === 4 ? '4th Sem' : user.year_of_study === 5 ? '5th Sem' : user.year_of_study === 6 ? '6th Sem' : user.year_of_study === 7 ? '7th Sem' : user.year_of_study === 8 ? '8th Sem' : `${user.year_of_study}th Sem`) : 'N/A'}`
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

