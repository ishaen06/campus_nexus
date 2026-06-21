import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { getWsURL } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, AlertTriangle, Users, Settings, X, Sparkles, UserMinus, UserPlus, Check } from 'lucide-react';
import Avatar from '../components/Avatar';

interface GroupMessage {
  id?: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  created_at?: string;
  type?: 'message' | 'system_warning';
  reactions?: Record<string, string>;
}

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialGroupName = location.state?.groupName || 'Group Chat';
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [groupDetails, setGroupDetails] = useState<any>(null);
  
  // Settings modal states
  const [showSettings, setShowSettings] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamIsPublic, setTeamIsPublic] = useState(false);
  const [teamMembers, setTeamMembers] = useState<number[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [projectTopic, setProjectTopic] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    // 1. Get current user ID
    api.get('/users/me').then(res => {
      setUserId(res.data.id);
      setIsMentor(res.data.is_mentor);
    }).catch(() => navigate('/login'));
    
    // 2. Get Group Info
    api.get(`/chat/groups/${groupId}`).then(res => {
      setGroupDetails(res.data);
    }).catch(err => {
      console.error(err);
      setApiError(err.response?.data?.detail || err.message || "Failed to load group details");
    });

    // 3. Fetch Message History
    api.get(`/chat/groups/${groupId}/messages`).then(res => {
      setMessages(res.data);
    }).catch(console.error);

    const socket = new WebSocket(getWsURL(`/chat/ws/group/${groupId}`));
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
        // Remove typing state for this sender
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[data.sender_id];
          return updated;
        });
      } else if (data.type === 'system_warning') {
        setMessages(prev => [...prev, { type: 'system_warning', content: data.message, sender_id: 0 }]);
      } else if (data.type === 'typing') {
        if (data.sender_id !== userId) {
          setTypingUsers(prev => ({ ...prev, [data.sender_id]: data.sender_name }));
        }
      } else if (data.type === 'stop_typing') {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[data.sender_id];
          return updated;
        });
      } else if (data.type === 'reaction_update') {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
      }
    };
    
    ws.current = socket;

    return () => {
      socket.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [groupId, navigate, userId]);

  useEffect(() => {
    if (groupDetails) {
      setTeamName(groupDetails.name);
      setTeamIsPublic(groupDetails.is_public);
      setTeamMembers(groupDetails.member_ids);
      setProjectTopic(groupDetails.project_topic || '');
    }
  }, [groupDetails, showSettings]);

  useEffect(() => {
    if (showSettings && groupDetails?.created_by === userId) {
      api.get('/connections/').then(res => {
        const accepted = res.data.filter((c: any) => c.status === 'ACCEPTED');
        setConnections(accepted);
      }).catch(console.error);
    }
  }, [showSettings, groupDetails, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (!isTyping && ws.current) {
      setIsTyping(true);
      ws.current.send(JSON.stringify({ type: 'typing' }));
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (ws.current) ws.current.send(JSON.stringify({ type: 'stop_typing' }));
    }, 1500);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws.current) return;
    
    ws.current.send(JSON.stringify({ content: input }));
    setInput('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    ws.current.send(JSON.stringify({ type: 'stop_typing' }));
  };

  const getTypersText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Multiple people are typing...';
  };

  const getCycleOfUser = (uid: number) => {
    const existing = groupDetails?.members?.find((m: any) => m.id === uid);
    if (existing) return existing.cycle;
    
    const conn = connections.find((c: any) => c.other_user.id === uid);
    if (conn) return conn.other_user.cycle;
    
    if (uid === userId) {
      const me = groupDetails?.members?.find((m: any) => m.id === userId);
      if (me) return me.cycle;
    }
    return null;
  };

  const getUserName = (uid: number) => {
    const existing = groupDetails?.members?.find((m: any) => m.id === uid);
    if (existing) return existing.full_name;
    
    const conn = connections.find((c: any) => c.other_user.id === uid);
    if (conn) return conn.other_user.full_name;
    
    if (uid === userId) return 'You (Admin)';
    return 'Unknown';
  };

  const getBranchOfUser = (uid: number) => {
    const existing = groupDetails?.members?.find((m: any) => m.id === uid);
    if (existing) return existing.branch;
    
    const conn = connections.find((c: any) => c.other_user.id === uid);
    if (conn) return conn.other_user.branch;
    
    return '';
  };

  const getAvatarConfigOfUser = (uid: number) => {
    const existing = groupDetails?.members?.find((m: any) => m.id === uid);
    if (existing) return existing.avatar_config;
    
    const conn = connections.find((c: any) => c.other_user.id === uid);
    if (conn) return conn.other_user.avatar_config;
    
    return null;
  };

  const studentsInTeam = teamMembers.filter(uid => {
    const memberObj = groupDetails?.members?.find((m: any) => m.id === uid);
    return memberObj ? !memberObj.is_mentor : true;
  });
  const totalSize = studentsInTeam.length;
  const pCount = studentsInTeam.filter(uid => getCycleOfUser(uid) === 'P').length;
  const cCount = studentsInTeam.filter(uid => getCycleOfUser(uid) === 'C').length;
  const isSizeValid = totalSize >= 4 && totalSize <= 5;
  const isBalanceValid = pCount >= 2 && cCount >= 2;

  const handleSaveSettings = async () => {
    try {
      const filteredMembers = teamMembers.filter(id => {
        if (id === userId) return false;
        const memberObj = groupDetails?.members?.find((m: any) => m.id === id);
        return memberObj ? !memberObj.is_mentor : true;
      });
      const res = await api.put(`/chat/groups/${groupId}`, {
        name: teamName,
        is_public: teamIsPublic,
        member_ids: filteredMembers,
        project_topic: projectTopic
      });
      setGroupDetails(res.data);
      setShowSettings(false);
      
      api.get(`/chat/groups/${groupId}/messages`).then(mRes => setMessages(mRes.data));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update team settings.");
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-screen bg-transparent relative overflow-hidden">
      {/* Glass Header */}
      <div className="absolute top-0 w-full glass-panel border-b border-white/20 border-x-0 border-t-0 rounded-none px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/80 rounded-full text-gray-500 hover:text-gray-900 transition-colors shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          
          <button 
            onClick={() => groupDetails && setShowSettings(true)}
            className={`flex items-center gap-3 bg-transparent border-0 text-left p-0 focus:outline-none ${groupDetails ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white border border-white/20">
              <Users size={20} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[15px] font-bold text-gray-950 tracking-tight leading-none">
                {groupDetails ? groupDetails.name : initialGroupName}
              </h2>
              {getTypersText() ? (
                <span className="text-[11px] font-semibold text-blue-500 animate-pulse mt-1">
                  {getTypersText()}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                  {groupDetails ? `${groupDetails.member_ids.length} Members` : 'Active'}
                </span>
              )}
            </div>
          </button>
        </div>

        {groupDetails && (
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-indigo-400 hover:text-indigo-300 transition-all shadow-sm cursor-pointer"
            title={groupDetails.created_by === userId ? "Manage Team" : "Team Info"}
          >
            <Settings size={18} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-10 pt-24 pb-24 space-y-4 flex flex-col no-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => {
            if (msg.type === 'system_warning') {
              return (
                <motion.div 
                  key={`sys-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center my-4"
                >
                  <div className="bg-red-50/90 backdrop-blur-md border border-red-100 text-red-600 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm uppercase tracking-wide">
                    <AlertTriangle size={14} />
                    {msg.content}
                  </div>
                </motion.div>
              );
            }

            const isMine = msg.sender_id === userId;
            const uniqueKey = msg.id ? `msg-${msg.id}` : `temp-${i}`;

            return (
              <motion.div 
                key={uniqueKey} 
                initial={{ opacity: 0, y: 10, scale: 0.95, originX: isMine ? 1 : 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col relative ${isMine ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name (for other group members) */}
                {!isMine && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2 mb-1">
                    {msg.sender_name || 'Group Peer'}
                  </span>
                )}

                <div className={`flex relative max-w-[75%] md:max-w-[60%] group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Message Bubble */}
                  <div className={`px-4 py-2 shadow-sm relative backdrop-blur-sm ${
                    isMine 
                      ? 'bg-indigo-600/80 text-white border border-indigo-500/30 rounded-[16px] rounded-br-[4px]' 
                      : 'bg-white/40 border border-white/30 text-gray-800 rounded-[16px] rounded-bl-[4px]'
                  }`}>
                    <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-6" />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full glass-panel border-x-0 border-b-0 rounded-none p-4 z-20 pb-safe md:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 glass-input rounded-full px-6 py-3 focus:outline-none transition-all shadow-sm font-medium"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit" 
            disabled={!input.trim()}
            className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={18} className="ml-1" />
          </motion.button>
        </form>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative no-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {groupDetails?.created_by === userId ? "Manage Team Settings" : "Team Information"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {!groupDetails ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {apiError ? (
                    <>
                      <AlertTriangle className="text-rose-500 mb-3" size={32} />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{apiError}</p>
                      <button 
                        onClick={() => navigate('/connections')} 
                        className="mt-4 bg-indigo-650 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer uppercase tracking-wider"
                      >
                        Back to Chats
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                      <p className="text-xs font-semibold text-slate-500">Loading team details...</p>
                    </>
                  )}
                </div>
              ) : (
                <>
              {/* Team Name Input */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block text-left">Team Name</label>
                <input
                  type="text"
                  className="w-full glass-input rounded-2xl px-4 py-3 focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  disabled={groupDetails?.created_by !== userId}
                />
              </div>

              {/* Project Topic Input */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block text-left">Project Topic</label>
                <input
                  type="text"
                  className="w-full glass-input rounded-2xl px-4 py-3 focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                  value={projectTopic}
                  onChange={(e) => setProjectTopic(e.target.value)}
                  placeholder="Enter project topic..."
                  disabled={groupDetails?.created_by !== userId}
                />
              </div>

              {/* Public/Private Toggle */}
              <div className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl mb-6 ${groupDetails?.mentor_status === 'APPROVED' ? 'opacity-65' : ''}`}>
                <div className="flex flex-col gap-1 pr-4 text-left">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Public Team Visibility</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {groupDetails?.mentor_status === 'APPROVED' 
                      ? "🔒 Locked to Private after mentor approval." 
                      : "When public, other students can find your team in the 'Find Teams' directory and contact you."}
                  </span>
                </div>
                <label className={`relative inline-flex items-center shrink-0 ${groupDetails?.created_by !== userId || groupDetails?.mentor_status === 'APPROVED' ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={teamIsPublic}
                    onChange={(e) => setTeamIsPublic(e.target.checked)}
                    className="sr-only peer"
                    disabled={groupDetails?.created_by !== userId || groupDetails?.mentor_status === 'APPROVED'}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Team Criteria Validation Checklist */}
              <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">Team Formation Rules</span>
                
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSizeValid ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'}`}>
                    {isSizeValid ? <Check size={10} className="stroke-[3.5]" /> : <AlertTriangle size={10} className="stroke-[2.5]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isSizeValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      4 to 5 Members
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Currently has {totalSize} member{totalSize === 1 ? '' : 's'} (including you).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isBalanceValid ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'}`}>
                    {isBalanceValid ? <Check size={10} className="stroke-[3.5]" /> : <AlertTriangle size={10} className="stroke-[2.5]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isBalanceValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      Cycle Balance (Exactly 50% P-Cycle & 50% C-Cycle)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Found {pCount} P-Cycle, {cCount} C-Cycle.
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Members List */}
              <div className="space-y-3 mb-6 text-left">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">Current Members ({totalSize}/5)</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                  {groupDetails?.mentor_name && (
                    <div className="flex items-center justify-between p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/10 flex items-center justify-center">
                          <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{groupDetails.mentor_name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{groupDetails.mentor_email}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        groupDetails.mentor_status === 'APPROVED'
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-850 text-indigo-750 dark:text-indigo-350'
                          : groupDetails.mentor_status === 'PENDING'
                            ? 'bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-850 text-amber-750 dark:text-amber-350'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {groupDetails.mentor_status === 'APPROVED' ? 'Mentor' : `Mentor (${groupDetails.mentor_status})`}
                      </span>
                    </div>
                  )}
                  {teamMembers.map((uid) => {
                    const memberObj = groupDetails?.members?.find((m: any) => m.id === uid);
                    if (memberObj?.is_mentor) return null;
                    const name = getUserName(uid);
                    const branch = getBranchOfUser(uid);
                    const cycle = getCycleOfUser(uid);
                    const avatarConfig = getAvatarConfigOfUser(uid);
                    const isMemberAdmin = uid === groupDetails?.created_by;
                    const isCurrentUserAdmin = groupDetails?.created_by === userId;

                    return (
                      <div key={uid} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-750 overflow-hidden flex items-center justify-center">
                            {avatarConfig ? (
                              <Avatar config={avatarConfig} className="w-full h-full" />
                            ) : (
                              <Users size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{name}</span>
                            <div className="flex items-center gap-2">
                              {branch && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">{branch}</span>}
                              {cycle && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cycle === 'P' ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30' : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'}`}>
                                  {cycle}-Cycle
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isMemberAdmin ? (
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Admin
                          </span>
                        ) : isCurrentUserAdmin ? (
                          <button
                            onClick={() => setTeamMembers(prev => prev.filter(id => id !== uid))}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-rose-400 transition-all cursor-pointer"
                            title="Remove from Team"
                          >
                            <UserMinus size={14} />
                          </button>
                        ) : (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-500/20 border border-slate-200 dark:border-slate-500/30 text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Member
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Members Section */}
              {groupDetails?.created_by === userId && (
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">Add Matched Connections</label>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                    {connections
                      .filter((c) => !teamMembers.includes(c.other_user.id))
                      .map((c) => {
                        const u = c.other_user;
                        const isFull = teamMembers.length >= 5;

                        return (
                          <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-750 overflow-hidden flex items-center justify-center">
                                {u.avatar_config ? (
                                  <Avatar config={u.avatar_config} className="w-full h-full" />
                                ) : (
                                  <Users size={16} className="text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.full_name}</span>
                                <div className="flex items-center gap-2">
                                  {u.branch && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">{u.branch}</span>}
                                  {u.cycle && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${u.cycle === 'P' ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30' : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'}`}>
                                      {u.cycle}-Cycle
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (isFull) {
                                  alert("A team cannot exceed 5 members.");
                                  return;
                                }
                                setTeamMembers(prev => [...prev, u.id]);
                              }}
                              disabled={isFull}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isFull 
                                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                              }`}
                              title={isFull ? "Team is full" : "Add to Team"}
                            >
                              <UserPlus size={14} />
                            </button>
                          </div>
                        );
                      })}
                    {connections.filter((c) => !teamMembers.includes(c.other_user.id)).length === 0 && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block text-center py-4">
                        No other matched connections to add.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
                {groupDetails?.created_by === userId ? (
                  <>
                    <button
                      onClick={handleSaveSettings}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer text-center uppercase tracking-wider"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="flex-1 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer text-center uppercase tracking-wider"
                  >
                    Close Info
                  </button>
                )}
              </div>

              {/* Destructive Actions */}
              {!isMentor && (
                <div className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-2">
                  {groupDetails?.created_by === userId ? (
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to disband this team? All chat history and memberships will be deleted.")) {
                          try {
                            await api.delete(`/chat/groups/${groupId}/disband`);
                            setShowSettings(false);
                            navigate('/connections');
                          } catch (err: any) {
                            alert(err.response?.data?.detail || "Failed to disband team.");
                          }
                        }
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center uppercase tracking-wider"
                    >
                      Disband Team
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        const reason = prompt("Enter a reason for leaving the team (optional):");
                        if (reason === null) return; // cancelled
                        try {
                          await api.post(`/chat/groups/${groupId}/leave`, { reason });
                          setShowSettings(false);
                          navigate('/connections');
                        } catch (err: any) {
                          alert(err.response?.data?.detail || "Failed to leave team.");
                        }
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center uppercase tracking-wider"
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
