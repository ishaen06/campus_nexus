import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { getWsURL } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, ShieldAlert, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
interface Message {
  id?: number;
  sender_id?: number;
  content: string;
  created_at?: string;
  type?: 'message' | 'system_warning';
  message?: string;
  is_read?: boolean;
  reactions?: Record<string, string>;
}

export default function Chat() {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    api.get('/users/me').then(res => setUserId(res.data.id)).catch(() => navigate('/login'));
    
    api.get('/connections/').then(res => {
      const matchingConn = res.data.find((c: any) => c.connection_id === parseInt(connectionId || ''));
      if (matchingConn) {
        setChatPartner(matchingConn.other_user);
      }
    }).catch(console.error);
    
    api.get(`/chat/${connectionId}/messages`).then(res => {
      const formatted = res.data.map((m: any) => ({ ...m, type: 'message' }));
      setMessages(formatted);
    }).catch(console.error);

    const socket = new WebSocket(getWsURL(`/chat/ws/${connectionId}`));
    
    socket.onopen = () => {
      // Upon opening, mark unread messages as read? The backend GET request handles it.
      // But we should notify the other person via WS.
      // Wait, we need to send read receipts for new messages.
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
        setOtherUserTyping(false);
        // Automatically mark as read if it's from the other user and we're looking at the chat
        if (data.sender_id !== userId) {
          socket.send(JSON.stringify({ type: 'read', message_id: data.id }));
        }
      } else if (data.type === 'system_warning') {
        setMessages(prev => [...prev, { type: 'system_warning', content: data.message }]);
      } else if (data.type === 'typing' && data.sender_id !== userId) {
        setOtherUserTyping(true);
      } else if (data.type === 'stop_typing' && data.sender_id !== userId) {
        setOtherUserTyping(false);
      } else if (data.type === 'read_receipt') {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, is_read: true } : m));
      } else if (data.type === 'reaction_update') {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
      }
    };
    
    ws.current = socket;

    return () => {
      socket.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [connectionId, navigate, userId]);

  useEffect(() => {
    if (location.state?.prefilledMessage) {
      setInput(location.state.prefilledMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

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

  const handleReport = async () => {
    if (!chatPartner) return;
    const reason = window.prompt(`Please enter the reason for reporting ${chatPartner.full_name}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Report reason cannot be empty.");
      return;
    }
    try {
      await api.post(`/users/${chatPartner.id}/report`, { reason });
      alert("Report submitted successfully. The administration team will review this case.");
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || "Failed to submit report.");
    }
  };

  const handleReaction = (msgId: number, reaction: string) => {
    if (!ws.current) return;
    ws.current.send(JSON.stringify({ type: 'react', message_id: msgId, reaction }));
    setHoveredMsgId(null);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent relative overflow-hidden">
      {/* Glass Header */}
      <div className="absolute top-0 w-full glass-panel border-b border-white/20 border-x-0 border-t-0 rounded-none px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/connections')} className="p-2 bg-white/80 rounded-full text-gray-500 hover:text-gray-900 transition-colors shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          {chatPartner && (
            <div 
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 border border-white/40 flex items-center justify-center">
                <Avatar config={chatPartner.profile_photo ? { photo: chatPartner.profile_photo } : null} name={chatPartner.full_name} size={38} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight leading-none">{chatPartner.full_name}</h2>
                {otherUserTyping ? (
                  <span className="text-[11px] font-semibold text-blue-500 animate-pulse mt-1">typing...</span>
                ) : (
                  <span className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wide">{chatPartner.branch}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleReport} className="p-2 bg-white/80 rounded-full text-gray-400 hover:text-yellow-500 transition-colors shadow-sm cursor-pointer" title="Report">
            <ShieldAlert size={18} />
          </button>
        </div>
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
                onMouseEnter={() => setHoveredMsgId(msg.id || null)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                <div className={`flex relative max-w-[75%] md:max-w-[60%] group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Message Bubble */}
                  <div className={`px-4 py-2 shadow-sm relative backdrop-blur-sm ${
                    isMine 
                      ? 'bg-indigo-600/80 text-white border border-indigo-500/30 rounded-[16px] rounded-br-[4px]' 
                      : 'bg-white/40 border border-white/30 text-gray-800 rounded-[16px] rounded-bl-[4px]'
                  }`}>
                    <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                    
                    {/* Read Receipts */}
                    {isMine && msg.id && (
                      <div className="flex justify-end mt-1">
                        {msg.is_read ? (
                          <CheckCheck size={14} className="text-blue-300" />
                        ) : (
                          <Check size={14} className="text-gray-300" />
                        )}
                      </div>
                    )}

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`absolute -bottom-5 ${isMine ? 'left-4' : 'right-4'} bg-white border border-gray-200 shadow-md rounded-full px-2 py-1 flex gap-1 z-20 text-[12px] min-w-max`}>
                        {Object.values(msg.reactions).map((r, idx) => (
                          <span key={idx}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Picker (Hover) */}
                  {hoveredMsgId === msg.id && msg.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute top-1/2 -translate-y-1/2 flex gap-2 bg-white shadow-xl border border-gray-100 rounded-full px-3 py-2 z-30 ${isMine ? 'right-[100%] mr-2' : 'left-[100%] ml-2'}`}
                    >
                      {['❤️', '😂', '👍', '🔥'].map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => handleReaction(msg.id!, emoji)}
                          className="hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {otherUserTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-gray-100 rounded-[24px] rounded-bl-[8px] px-5 py-4 shadow-sm">
                <div className="flex gap-1.5 items-center h-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}
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
            className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} className="ml-1" />
          </motion.button>
        </form>
      </div>
      {/* Profile Detail Preview Modal */}
      <ProfilePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        user={chatPartner}
      />
    </div>
  );
}
