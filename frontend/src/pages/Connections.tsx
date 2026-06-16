import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Search } from 'lucide-react';
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
    avatar_config?: any | null;
    is_online?: boolean;
  };
}

export default function Connections() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [search, setSearch] = useState('');
  // Profile modal states
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const connRes = await api.get('/connections/');
      setConnections(connRes.data);
    } catch (err) {
      console.error(err);
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

  const pending = connections.filter(c => c.status === 'PENDING');
  
  // Filter matched peers by search query
  const matched = connections.filter(c => 
    c.status === 'ACCEPTED' && 
    c.other_user.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 relative">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Your Network
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Manage connections and launch direct messages
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
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
                        <Avatar config={conn.other_user.avatar_config} name={conn.other_user.full_name} size={44} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{conn.other_user.full_name}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {conn.other_user.is_mentor 
                            ? 'Engineering Mentor' 
                            : `${conn.other_user.branch || 'CSE'} • Year ${conn.other_user.year_of_study || 1}`
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
                          <Avatar config={conn.other_user.avatar_config} name={conn.other_user.full_name} size={48} />
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
                            ? 'Engineering Mentor' 
                            : `${conn.other_user.branch || 'CSE'} • Year ${conn.other_user.year_of_study || 1}`
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

      {/* Profile Detail Preview Modal */}
      <ProfilePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        user={previewUser}
      />
    </div>
  );
}
