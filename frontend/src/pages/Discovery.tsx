import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Check, RefreshCw, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { useNavigate, useLocation } from 'react-router-dom';

interface UserProfile {
  id: number;
  full_name: string;
  branch: string;
  year_of_study: number;
  bio: string;
  interests: string[];
  goals: string[];
  avatar_config?: any;
  is_online?: boolean;
  is_mentor?: boolean;
  department?: string;
  post?: string;
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
  allow_member_leave?: boolean;
  mentor_status?: string;
}

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
    try {
      await api.post('/connections/', { receiver_id: userId });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to send request");
    }
  };

  const handleSwipeLeft = async (userId: number) => {
    try {
      await api.post(`/users/${userId}/dismiss`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert("Failed to dismiss user.");
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

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-64px)] bg-transparent px-4 md:px-8 pt-8 pb-16">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-8 justify-center w-full max-w-sm md:max-w-4xl mx-auto">
        <button
          onClick={() => setActiveTab('people')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider relative transition-all ${
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
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider relative transition-all ${
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
            ) : users.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-10 text-center w-full shadow-2xl flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <span className="text-4xl">🏜️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">You're all caught up!</h3>
                <p className="text-gray-500 dark:text-slate-450 mb-8 text-sm">No new profiles found. Try checking back later or adjusting your filters.</p>
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
                {users.map((user, index) => {
                  const sameBranch = me && me.branch === user.branch;
                  const sharedInterests = me && me.interests ? me.interests.filter((i: string) => user.interests?.includes(i)).length : 0;
                  const mutualBadge = sameBranch ? "Same Branch" : (sharedInterests > 0 ? `${sharedInterests} Shared Interests` : null);

                  return (
                    <SwipeableCard 
                      key={user.id} 
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
              const visiblePublicTeams = publicTeams.filter(team => 
                !me || !team.member_ids.includes(me.id)
              );

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
                        const members = team.members || [];
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
                                <div>
                                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{team.name}</h3>
                                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mt-0.5">
                                    Admin ID: {team.created_by}
                                  </span>
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
                                        config={member.avatar_config} 
                                        name={member.full_name} 
                                        size={36} 
                                        className="ring-2 ring-white dark:ring-slate-950 shadow-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Cycle Balance Indicator */}
                              <div className="bg-slate-50/60 dark:bg-slate-950/45 rounded-xl p-3.5 border border-slate-100 dark:border-white/5 space-y-1.5 mb-5">
                                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                  <span>Physics (P-Cycle):</span>
                                  <span className="font-black text-slate-800 dark:text-slate-200">{pCount}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                                  <span>Chemistry (C-Cycle):</span>
                                  <span className="font-black text-slate-800 dark:text-slate-200">{cCount}</span>
                                </div>
                              </div>
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
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Like/Nope Overlay Opacities
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -100], [0, 1]);

  const handleDragEnd = (_event: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  // Only allow top card to be dragged
  const isTop = index === 0;

  return (
    <motion.div
      className="absolute w-full h-[550px] origin-bottom"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        zIndex: 1000 - index,
        scaleX: 1 - index * 0.045,
        scaleY: 1,
        y: index * 22,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      animate={{ scaleX: 1 - index * 0.045, scaleY: 1, y: index * 22 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="discover-swipe-card w-full h-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing relative bg-white dark:bg-[#1e1e24]">
        
        {/* Like Overlay */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 left-6 z-20 pointer-events-none transform -rotate-12 border-4 border-green-500 rounded-xl px-4 py-1">
          <h2 className="text-4xl font-black text-green-500 uppercase tracking-widest">LIKE</h2>
        </motion.div>
        
        {/* Nope Overlay */}
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-10 right-6 z-20 pointer-events-none transform rotate-12 border-4 border-red-500 rounded-xl px-4 py-1">
          <h2 className="text-4xl font-black text-red-500 uppercase tracking-widest">NOPE</h2>
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
                 <Avatar config={(user as any).avatar_config} name={user.full_name} size={120} />
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
                  : `${user.branch || 'N/A'} • Year ${user.year_of_study || 'N/A'}`
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
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
              className="w-16 h-16 bg-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-white/80 cursor-pointer"
            >
              <X size={28} strokeWidth={3.5} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
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
