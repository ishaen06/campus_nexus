import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Sparkles, FolderGit, Lock } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';

interface ConnectionItem {
  connection_id: number;
  status: string;
  other_user: {
    id: number;
    full_name: string;
    is_mentor?: boolean;
    branch?: string | null;
    year_of_study?: number | null;
    bio?: string | null;
    interests?: string[] | null;
    goals?: string[] | null;
    avatar_config?: any | null;
  };
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

export default function MyTeam() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Group creation modal states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [projectTopic, setProjectTopic] = useState('');

  // Profile modal states
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const connRes = await api.get('/connections/');
      setConnections(connRes.data);
      const groupRes = await api.get('/chat/groups');
      setGroups(groupRes.data);
    } catch (err) {
      console.error("Error fetching data on MyTeam page:", err);
    }
  };

  useEffect(() => {
    fetchData();
    api.get('/users/me')
      .then(res => setCurrentUser(res.data))
      .catch(console.error);

    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, []);

  const getSelectedCriteriaStatus = () => {
    if (!currentUser) return { met: false, text: "Loading user profile..." };
    
    // Creator (admin) is always included
    const allMembers = [currentUser, ...selectedMembers.map(id => {
      const conn = connections.find(c => c.other_user.id === id);
      return conn ? conn.other_user : null;
    }).filter(Boolean)];
    
    const size = allMembers.length;
    if (size < 4 || size > 5) {
      return { met: false, text: `Team must contain 4 to 5 members (currently has ${size})` };
    }
    
    let pCount = 0;
    let cCount = 0;
    for (const m of allMembers) {
      const cycleUpper = (m.cycle || '').trim().toUpperCase();
      if (cycleUpper === 'P') pCount++;
      else if (cycleUpper === 'C') cCount++;
      else return { met: false, text: `Member '${m.full_name}' has not selected a cycle` };
    }
    
    if (size === 4) {
      if (pCount !== 2 || cCount !== 2) {
        return { met: false, text: `Cycle balance failed: A team of 4 must have exactly 2 P-Cycle and 2 C-Cycle members (Found ${pCount} P, ${cCount} C)` };
      }
    } else if (size === 5) {
      if (!((pCount === 3 && cCount === 2) || (pCount === 2 && cCount === 3))) {
        return { met: false, text: `Cycle balance failed: A team of 5 must have either (3 P + 2 C) or (2 P + 3 C) members (Found ${pCount} P, ${cCount} C)` };
      }
    }
    
    return { met: true, text: "Team criteria fulfilled! Ready to form." };
  };

  const validation = getSelectedCriteriaStatus();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      await api.post('/chat/groups', {
        name: groupName,
        member_ids: selectedMembers,
        is_public: isPublic,
        project_topic: projectTopic
      });
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setIsPublic(false);
      setProjectTopic('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to create team.");
    }
  };

  const toggleMemberSelection = (userId: number) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const openProfilePreview = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              My Team
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Manage your team details, topic, and members list
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {groups.length > 0 ? (
            (() => {
              const team = groups[0];
              const isAdmin = team.created_by === currentUser?.id;
              const members = team.members || [];
              const pCount = members.filter((m: any) => (m.cycle || '').toUpperCase() === 'P').length;
              const cCount = members.filter((m: any) => (m.cycle || '').toUpperCase() === 'C').length;
              const isSizeValid = members.length >= 4 && members.length <= 5;
              const isBalanceValid = pCount >= 2 && cCount >= 2;

              return (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Left: General info and project topic */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Active Team Dashboard</span>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight capitalize">{team.name}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            team.is_public 
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/20' 
                              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/30'
                          }`}>
                            {team.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                          
                          {/* Members Rule Status Indicator */}
                          <div 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border backdrop-blur-sm cursor-help ${
                              isSizeValid 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                            title={`Members count: 4 to 5 required (Currently has ${members.length})`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSizeValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{members.length}/5 Members</span>
                          </div>

                          {/* Cycle Balance Status Indicator */}
                          {!isBalanceValid && (
                            <div 
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border backdrop-blur-sm cursor-help bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                              title={`Cycle Balance: Min 2 P-Cycle & 2 C-Cycle required (Found ${pCount} P, ${cCount} C)`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Cycle Balance</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project Topic Details */}
                      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-5 mb-6 text-left">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Project Topic</span>
                        <div className="flex items-center gap-3">
                          <FolderGit className="text-indigo-600 dark:text-indigo-400 w-5 h-5 shrink-0" />
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {team.project_topic ? team.project_topic : "No topic entered yet"}
                          </p>
                        </div>
                      </div>

                      {/* Admin Settings Panel */}
                      {isAdmin && (
                        <div className="space-y-4 mb-6 text-left">
                          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Admin Settings</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {/* Toggle for Public Visibility */}
                            <div className={`flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/60 transition-all ${team.mentor_status === 'APPROVED' ? 'opacity-65' : 'hover:bg-slate-50 dark:hover:bg-slate-900/20'}`}>
                              <div className="pr-4">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>🌐 Public Visibility</span>
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">
                                  {team.mentor_status === 'APPROVED' 
                                    ? "🔒 Locked to Private after mentor approval" 
                                    : "Toggle whether this group is public for others to see and request to join"}
                                </span>
                              </div>
                              <label className={`relative inline-flex items-center select-none shrink-0 ${team.mentor_status === 'APPROVED' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={team.is_public || false} 
                                  disabled={team.mentor_status === 'APPROVED'}
                                  onChange={async (e) => {
                                    try {
                                      const res = await api.put(`/chat/groups/${team.id}/toggle-privacy?is_public=${e.target.checked}`);
                                      const updated = groups.map(g => g.id === team.id ? { ...g, is_public: res.data.is_public } : g);
                                      setGroups(updated);
                                    } catch (err) {
                                      console.error("Failed to toggle privacy status:", err);
                                      alert("Failed to update privacy settings.");
                                    }
                                  }}
                                  className="sr-only peer" 
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>

                            {/* Toggle for Allow Members to Leave */}
                            {team.mentor_status === 'APPROVED' && (
                              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/60 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/20">
                                <div className="pr-4">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <span>🔓 Allow Members to Leave</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">
                                    Let team members leave the group chat after mentor approval has locked it
                                  </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                                  <input 
                                    type="checkbox" 
                                    checked={team.allow_member_leave || false} 
                                    onChange={async (e) => {
                                      try {
                                        const res = await api.put(`/chat/groups/${team.id}/toggle-leave?allow=${e.target.checked}`);
                                        const updated = groups.map(g => g.id === team.id ? { ...g, allow_member_leave: res.data.allow_member_leave } : g);
                                        setGroups(updated);
                                      } catch (err) {
                                        console.error("Failed to toggle leave status:", err);
                                        alert("Failed to update leaving permissions.");
                                      }
                                    }}
                                    className="sr-only peer" 
                                  />
                                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* CTA / Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <button
                          onClick={() => navigate(`/chat/group/${team.id}`)}
                          className="flex-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          <Users size={15} />
                          Open Team Chat
                        </button>

                        {isAdmin ? (
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to disband this team? All chat history and memberships will be deleted.")) {
                                try {
                                  await api.delete(`/chat/groups/${team.id}/disband`);
                                  fetchData();
                                } catch (err: any) {
                                  alert(err.response?.data?.detail || "Failed to disband team.");
                                }
                              }
                            }}
                            className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                          >
                            Disband Team
                          </button>
                        ) : (
                          team.mentor_status === 'APPROVED' && !team.allow_member_leave ? (
                            <button
                              disabled
                              title="Leaving the team is locked after mentor approval unless allowed by the admin"
                              className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/20 cursor-not-allowed flex items-center gap-1.5 shrink-0"
                            >
                              <Lock size={12} /> Leave Locked
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const reason = prompt("Enter a reason for leaving the team (optional):");
                                if (reason === null) return;
                                try {
                                    await api.post(`/chat/groups/${team.id}/leave`, { reason });
                                    fetchData();
                                  } catch (err: any) {
                                    alert(err.response?.data?.detail || "Failed to leave team.");
                                  }
                                }}
                                className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                              >
                                Leave Team
                              </button>
                          )
                        )}
                      </div>
                      </div>
                    </div>
  
                    {/* Right: Members list */}
                    <div className="space-y-4 text-left">
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Team Members ({members.length}/5)</h3>
                      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80">
                        {members.map((member: any) => {
                          const isMemberAdmin = member.id === team.created_by;
                          return (
                            <div
                              key={member.id}
                              onClick={(e) => openProfilePreview(member, e)}
                              className="py-4.5 px-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/20 cursor-pointer transition-all rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar config={member.avatar_config} name={member.full_name} size={40} />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{member.full_name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {member.branch && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        {member.branch.toUpperCase()}
                                      </span>
                                    )}
                                    {member.branch && member.cycle && (
                                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    )}
                                    {member.cycle && (
                                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                        member.cycle.toUpperCase() === 'P' 
                                          ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' 
                                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                                      }`}>
                                        {member.cycle.toUpperCase()}-Cycle
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
  
                              {isMemberAdmin ? (
                                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                  Admin
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[9px] bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                    Member
                                  </span>
                                  {isAdmin && (
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to make ${member.full_name} the admin? You will lose admin privileges.`)) {
                                          try {
                                            await api.put(`/chat/groups/${team.id}/transfer-admin?new_admin_id=${member.id}`);
                                            fetchData();
                                          } catch (err: any) {
                                            alert(err.response?.data?.detail || "Failed to transfer admin privileges.");
                                          }
                                        }
                                      }}
                                      className="text-[9px] border border-indigo-200 dark:border-indigo-900/45 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                                      title="Make Admin"
                                    >
                                      + Admin
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </div>
              );
            })()
          ) : (
            /* Empty state when not in a team */
            <div className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/20 mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">No Active Team</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                You are not currently in a team. You must either create a new group chat with your connections or search for recruiting public teams to join.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
                >
                  Create a Team
                </button>
                <button
                  onClick={() => navigate('/discovery', { state: { activeTab: 'teams' } })}
                  className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                >
                  Find Teams
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Group Creation Glass Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md glass-panel p-8 relative z-10 bg-white/40"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Users className="text-indigo-600" /> Group Chat
                </h3>
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="p-1.5 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-sm cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Group Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Project Team, Placements"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project Topic</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IoT Smart Parking System"
                    value={projectTopic}
                    onChange={e => setProjectTopic(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Members</label>
                  {connections.filter(c => c.status === 'ACCEPTED').length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No matches available to create a group.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2 no-scrollbar">
                      {connections.filter(c => c.status === 'ACCEPTED').map(conn => (
                        <div 
                          key={conn.other_user.id} 
                          onClick={() => toggleMemberSelection(conn.other_user.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-600/10 border-indigo-400/40 shadow-sm'
                            : 'bg-white/20 border-white/10 hover:bg-white/45'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar config={conn.other_user.avatar_config} name={conn.other_user.full_name} size={36} />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{conn.other_user.full_name}</p>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase">
                                {conn.other_user.is_mentor 
                                  ? 'Mentor' 
                                  : `${conn.other_user.branch || 'N/A'} • Year ${conn.other_user.year_of_study || 'N/A'}`
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-gray-300 bg-white/50'
                          }`}>
                            {selectedMembers.includes(conn.other_user.id) && <Sparkles size={10} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <div>
                    <label className="block text-xs font-bold text-gray-950 tracking-tight">Make Team Public</label>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Let others find and join this team</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPublic} 
                      onChange={e => setIsPublic(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Team criteria status message */}
                <div className={`p-3.5 rounded-2xl border text-xs font-semibold ${
                  validation.met 
                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400' 
                    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                  <p>{validation.text}</p>
                </div>

                <motion.button 
                  whileHover={{ scale: (groupName.trim() && selectedMembers.length <= 4) ? 1.02 : 1 }}
                  whileTap={{ scale: (groupName.trim() && selectedMembers.length <= 4) ? 0.98 : 1 }}
                  type="submit" 
                  disabled={!groupName.trim() || selectedMembers.length > 4}
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
