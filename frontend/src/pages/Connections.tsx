import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Search, Users, Plus, X, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';

interface ConnectionItem {
  connection_id: number;
  status: string;
  has_unread?: boolean;
  unread_count?: number;
  other_user: {
    id: number;
    full_name: string;
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
  // Profile modal states
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Group creation states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const navigate = useNavigate();

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
      console.error(err);
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {isMentor ? "Chats & Teams" : "Your Network"}
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {isMentor ? "Manage direct messages and group workspaces" : "Manage connections and launch direct messages"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {!isMentor && (
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
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-2.5 text-sm focus:outline-none rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Pending Section */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 text-left"
            >
              <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pending Requests ({pending.length})</h2>
              <div className="flex flex-col divide-y divide-slate-200/60 dark:divide-slate-800/80">
                {pending.map(conn => (
                  <div key={conn.connection_id} className="py-4 px-3 flex justify-between items-center hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-colors rounded-xl">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar preview trigger */}
                      <div 
                        onClick={(e) => openProfilePreview(conn.other_user, e)}
                        className="w-12 h-12 rounded-full overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                      >
                        <Avatar config={conn.other_user.profile_photo ? { photo: conn.other_user.profile_photo } : null} name={conn.other_user.full_name} size={44} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{conn.other_user.full_name}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {conn.other_user.is_mentor 
                            ? `${conn.other_user.post || 'Mentor'} (${conn.other_user.department || 'N/A'})` 
                            : `${conn.other_user.branch || 'CSE'} • ${conn.other_user.year_of_study ? (conn.other_user.year_of_study === 1 ? '1st Sem' : conn.other_user.year_of_study === 2 ? '2nd Sem' : conn.other_user.year_of_study === 3 ? '3rd Sem' : conn.other_user.year_of_study === 4 ? '4th Sem' : conn.other_user.year_of_study === 5 ? '5th Sem' : conn.other_user.year_of_study === 6 ? '6th Sem' : conn.other_user.year_of_study === 7 ? '7th Sem' : conn.other_user.year_of_study === 8 ? '8th Sem' : `${conn.other_user.year_of_study}th Sem`) : '1st Sem'}`
                          }
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAccept(conn.connection_id)}
                      className="bg-[#1e3a8a] dark:bg-white text-white dark:text-slate-900 p-2.5 rounded-full hover:opacity-90 transition shadow-sm cursor-pointer"
                    >
                      <UserCheck size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Chats Section */}
        {filteredGroups.length > 0 && (
          <div className="text-left mb-10">
            <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Group Chats ({filteredGroups.length})</h2>
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
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{group.name}</h3>
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

        {/* Chats Section */}
        <div className="text-left">
          <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">Active Chats ({matched.length})</h2>
          
          {matched.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <span className="text-4xl mb-4 block">👋</span>
              <p className="text-gray-500 font-medium">No matches yet. Swipe in Discovery to find connections!</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-200/60 dark:divide-slate-800/80">
              
              {/* Direct 1-on-1 Matches */}
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
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{conn.other_user.full_name}</h3>
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
                            : `${conn.other_user.branch || 'CSE'} • ${conn.other_user.year_of_study ? (conn.other_user.year_of_study === 1 ? '1st Sem' : conn.other_user.year_of_study === 2 ? '2nd Sem' : conn.other_user.year_of_study === 3 ? '3rd Sem' : conn.other_user.year_of_study === 4 ? '4th Sem' : conn.other_user.year_of_study === 5 ? '5th Sem' : conn.other_user.year_of_study === 6 ? '6th Sem' : conn.other_user.year_of_study === 7 ? '7th Sem' : conn.other_user.year_of_study === 8 ? '8th Sem' : `${conn.other_user.year_of_study}th Sem`) : '1st Sem'}`
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
                                {conn.other_user.branch || 'N/A'} • {conn.other_user.year_of_study ? (conn.other_user.year_of_study === 1 ? '1st Sem' : conn.other_user.year_of_study === 2 ? '2nd Sem' : conn.other_user.year_of_study === 3 ? '3rd Sem' : conn.other_user.year_of_study === 4 ? '4th Sem' : conn.other_user.year_of_study === 5 ? '5th Sem' : conn.other_user.year_of_study === 6 ? '6th Sem' : conn.other_user.year_of_study === 7 ? '7th Sem' : conn.other_user.year_of_study === 8 ? '8th Sem' : `${conn.other_user.year_of_study}th Sem`) : 'N/A'}
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
