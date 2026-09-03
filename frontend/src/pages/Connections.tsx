import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Plus, X, Sparkles, MessageSquare, UserPlus, Check, Inbox, Mail } from 'lucide-react';

import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { getStudentSemester } from '../utils/academic';

interface ConnectionItem {
  connection_id: number;
  status: string;
  has_unread?: boolean;
  unread_count?: number;
  other_user: {
    id: number;
    full_name: string;
    email?: string | null;
    usn?: string | null;
    is_mentor?: boolean;
    branch?: string | null;
    year_of_study?: number | null;
    bio?: string | null;
    interests?: string[] | null;
    goals?: string[] | null;
    profile_photo?: string | null;
    is_online?: boolean;
    department?: string | null;
    post?: string | null;
  };
}


export default function Connections() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [isMentor, setIsMentor] = useState(false);
  const [search, setSearch] = useState('');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'requests' ? 'requests' : 'messages';
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>(initialTab);

  // Profile modal states
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Group creation states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const navigate = useNavigate();

  const handleTabChange = (tab: 'messages' | 'requests') => {
    setActiveTab(tab);
    setSearchParams(tab === 'requests' ? { tab: 'requests' } : {});
  };

  const fetchData = async () => {
    try {
      const connRes = await api.get('/connections/');
      setConnections(connRes.data);
      
      const meRes = await api.get('/users/me');
      const isMentorUser = meRes.data.is_mentor;
      setIsMentor(isMentorUser);
      
      if (isMentorUser) {
        const groupsRes = await api.get('/chat/groups/mentor/teams');
        const approved = groupsRes.data.filter((t: any) => t.mentor_status === 'APPROVED');
        setGroupChats(approved);
      } else {
        const groupsRes = await api.get('/chat/groups');
        setGroupChats(groupsRes.data);
      }
    } catch (err) {
      console.error("Error fetching connections and groups:", err);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id: number) => {
    try {
      await api.put(`/connections/${id}/accept`);
      fetchData();
    } catch (err) {
      console.error("Error accepting connection:", err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/connections/${id}/reject`);
      fetchData();
    } catch (err) {
      console.error("Error declining connection:", err);
    }
  };

  const openProfilePreview = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      await api.post('/chat/groups', {
        name: groupName,
        member_ids: selectedMembers,
        is_public: false,
        project_topic: ''
      });
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to create group.");
    }
  };

  const toggleMemberSelection = (userId: number) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const pending = connections.filter(c => c.status === 'PENDING');
  
  const filteredPending = connections.filter(c => 
    c.status === 'PENDING' && 
    (c.other_user.full_name.toLowerCase().includes(search.toLowerCase()) ||
     (c.other_user.branch && c.other_user.branch.toLowerCase().includes(search.toLowerCase())))
  );

  // Filter matched peers by search query
  const matched = connections.filter(c => 
    c.status === 'ACCEPTED' && 
    c.other_user.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Filter group chats by search query
  const filteredGroups = groupChats.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.project_topic && g.project_topic.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 relative">
      <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {isMentor ? "Chats & Teams" : "Chats & Network"}
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {isMentor ? "Manage direct messages and group workspaces" : "Manage your messages, team workspaces, and connection requests"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {!isMentor && activeTab === 'messages' && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-full text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider whitespace-nowrap"
              >
                <Plus size={14} /> Create Group
              </button>
            )}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={activeTab === 'requests' ? "Search requests..." : "Search chats & groups..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-2.5 text-sm focus:outline-none rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Messages vs Requests) */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 mb-8 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('messages')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <MessageSquare size={15} />
              <span>Messages</span>
              {matched.some(c => c.has_unread) && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'messages' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {matched.length + filteredGroups.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('requests')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <UserPlus size={15} />
              <span>Requests</span>
              {pending.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === 'requests' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                }`}>
                  {pending.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-400 font-semibold hidden sm:block">
            {activeTab === 'messages' ? `${matched.length} Direct • ${filteredGroups.length} Groups` : `${pending.length} Pending Invites`}
          </div>
        </div>

        {/* ─── TAB 1: REQUESTS ─── */}
        {activeTab === 'requests' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-left"
          >
            {filteredPending.length === 0 ? (
              <div className="glass-panel p-16 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800/30">
                  <Inbox size={30} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Pending Requests</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
                  {search 
                    ? `No connection requests matching "${search}".` 
                    : "When classmates or mentors send you connection requests from Discovery, they will appear here."}
                </p>
                {!isMentor && (
                  <button
                    onClick={() => navigate('/discovery')}
                    className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Discover Classmates
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                    Pending Inbound Requests ({filteredPending.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPending.map(conn => (
                    <motion.div
                      key={conn.connection_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow bg-white/60 dark:bg-slate-900/60"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          onClick={(e) => openProfilePreview(conn.other_user, e)}
                          className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shrink-0"
                          title="Click to view profile"
                        >
                          <Avatar config={conn.other_user.profile_photo ? { photo: conn.other_user.profile_photo } : null} name={conn.other_user.full_name} size={56} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 
                              onClick={(e) => openProfilePreview(conn.other_user, e)}
                              className="font-bold text-slate-900 dark:text-slate-100 text-base truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              {conn.other_user.full_name}
                            </h3>
                            {conn.other_user.is_mentor && (
                              <span className="bg-[#1e3a8a]/10 dark:bg-white/10 text-[#1e3a8a] dark:text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Mentor
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {conn.other_user.is_mentor 
                              ? `${conn.other_user.post || 'Mentor'} (${conn.other_user.department || 'N/A'})` 
                              : `${(conn.other_user.branch || 'CSE').toUpperCase()} • ${getStudentSemester(conn.other_user)}${conn.other_user.usn ? ` • ${conn.other_user.usn}` : ''}`
                            }
                          </p>
                          {conn.other_user.email && (
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 truncate select-all">
                              <Mail size={12} className="text-emerald-500 shrink-0" />
                              <span>{conn.other_user.email}</span>
                            </p>
                          )}
                          {conn.other_user.bio && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 font-normal">
                              "{conn.other_user.bio}"
                            </p>
                          )}
                        </div>
                      </div>


                      <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          onClick={() => handleAccept(conn.connection_id)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Check size={15} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(conn.connection_id)}
                          className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X size={15} />
                          Decline
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TAB 2: MESSAGES ─── */}
        {activeTab === 'messages' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-10"
          >
            {/* Group Chats Section */}
            {filteredGroups.length > 0 && (
              <div className="text-left">
                <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Group Workspaces ({filteredGroups.length})
                </h2>
                <div className="flex flex-col divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  {filteredGroups.map((group, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={`group-${group.id}`} 
                      onClick={() => navigate(`/chat/group/${group.id}`, { state: { groupName: group.name } })}
                      className="py-5 px-3 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-all flex items-center justify-between group relative rounded-xl"
                    >
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-650 border border-white/10 flex items-center justify-center text-white hover:scale-105 transition-transform shadow-sm">
                            <Users size={22} className="text-white" />
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                              {group.name}
                            </h3>
                            <span className="bg-indigo-500/10 text-indigo-500 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              Group Chat
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                            Topic: {group.project_topic || 'Not Specified'} • {group.members?.length || 0} Members
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-4 shrink-0 text-right">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                          Open group workspace
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct 1-on-1 Active Chats Section */}
            <div className="text-left">
              <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Direct Messages ({matched.length})
              </h2>
              
              {matched.length === 0 && filteredGroups.length === 0 ? (
                <div className="glass-panel p-16 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-4xl mb-4 block">👋</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Active Messages Yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
                    {search ? `No chats matching "${search}".` : "Connect with classmates in Discovery to start chatting!"}
                  </p>
                  {!isMentor && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button
                        onClick={() => navigate('/discovery')}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Find Peers
                      </button>
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Create Group
                      </button>
                    </div>
                  )}
                </div>
              ) : matched.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {search ? `No direct chats matching "${search}".` : "No 1-on-1 direct messages yet."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  {matched.map((conn, idx) => {
                    const hasUnread = !!conn.has_unread;
                    const isOnline = !!conn.other_user.is_online;
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`conn-${conn.connection_id}`} 
                        onClick={() => navigate(`/chat/${conn.connection_id}`)}
                        className="py-5 px-3 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-all flex items-center justify-between group relative rounded-xl"
                      >
                        <div className="flex items-center gap-5 min-w-0 flex-1">
                          {/* Avatar preview trigger */}
                          <div className="relative shrink-0" onClick={(e) => openProfilePreview(conn.other_user, e)}>
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
                              <Avatar config={conn.other_user.profile_photo ? { photo: conn.other_user.profile_photo } : null} name={conn.other_user.full_name} size={48} />
                            </div>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm z-20"></div>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                                {conn.other_user.full_name}
                              </h3>
                              {conn.other_user.is_mentor && (
                                <span className="bg-[#1e3a8a]/10 dark:bg-white/10 text-[#1e3a8a] dark:text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Mentor
                                </span>
                              )}
                              {hasUnread && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                  {conn.unread_count && conn.unread_count > 0 ? `${conn.unread_count} New` : 'New'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {conn.other_user.is_mentor 
                                ? `${conn.other_user.post || 'Mentor'} (${conn.other_user.department || 'N/A'})` 
                                : `${(conn.other_user.branch || 'CSE').toUpperCase()} • ${getStudentSemester(conn.other_user)}`
                              }
                            </p>
                          </div>
                        </div>

                        {/* Right aligned status */}
                        <div className="flex items-center gap-4 pl-4 shrink-0 text-right">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {hasUnread ? (
                              <span className="text-[#1e3a8a] dark:text-white font-bold">New Message</span>
                            ) : (
                              <span>No new messages</span>
                            )}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Group Creation Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 relative z-10 shadow-2xl text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="text-indigo-600 dark:text-indigo-400" /> Create Group Chat
                </h3>
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-sm transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Group Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Study Group, Coding Session"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select Members</label>
                  {connections.filter(c => c.status === 'ACCEPTED' && !c.other_user.is_mentor).length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No connections available to create a group. Go connect with peers first!</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2 no-scrollbar">
                      {connections.filter(c => c.status === 'ACCEPTED' && !c.other_user.is_mentor).map(conn => (
                        <div 
                          key={conn.other_user.id} 
                          onClick={() => toggleMemberSelection(conn.other_user.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar config={conn.other_user.profile_photo ? { photo: conn.other_user.profile_photo } : null} name={conn.other_user.full_name} size={36} />
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{conn.other_user.full_name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                {(conn.other_user.branch || 'N/A').toUpperCase()} • {getStudentSemester(conn.other_user)}
                              </p>
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                          }`}>
                            {selectedMembers.includes(conn.other_user.id) && <Sparkles size={10} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  ℹ️ This is an unofficial group chat for connecting and studying. It has no size limits or academic cycle rules.
                </div>

                <motion.button 
                  whileHover={{ scale: (groupName.trim() && selectedMembers.length > 0) ? 1.02 : 1 }}
                  whileTap={{ scale: (groupName.trim() && selectedMembers.length > 0) ? 0.98 : 1 }}
                  type="submit" 
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="w-full bg-indigo-600 text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Create Group Chat
                </motion.button>
              </form>
            </motion.div>
          </div>
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
