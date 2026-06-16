import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Avatar from './Avatar';

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    full_name: string;
    branch?: string | null;
    year_of_study?: number | null;
    bio?: string | null;
    interests?: string[] | null;
    goals?: string[] | null;
    avatar_config?: any | null;
    is_mentor?: boolean | null;
    usn?: string | null;
  } | null;
}

export default function ProfilePreviewModal({ isOpen, onClose, user }: ProfilePreviewModalProps) {
  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            className="w-full max-w-lg glass-panel overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-slate-800/80 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition shadow-sm z-50 cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Scrollable Container Wrapper */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
              {/* Header/Cover Section */}
              <div className="h-32 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border-b border-white/5 relative flex-shrink-0" />

              {/* Content Area */}
              <div className="p-6 pt-0 relative">
                {/* Avatar position offset */}
                <div className="flex justify-between items-end -mt-14 mb-4">
                  <div className="w-24 h-24 rounded-full border-[6px] border-white dark:border-[#1e1e24] shadow-xl overflow-hidden bg-white/20 flex items-center justify-center">
                    <Avatar config={user.avatar_config} name={user.full_name} size={84} />
                  </div>
                </div>

              {/* Name & Basic Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{user.full_name}</h2>
                <p className="text-[#1e3a8a] dark:text-indigo-400 font-bold text-sm uppercase tracking-wider mt-1">
                  {user.is_mentor ? 'Engineering Mentor' : `${user.branch || 'N/A'} • Year ${user.year_of_study || 'N/A'} ${user.usn ? `• ${user.usn}` : ''}`}
                </p>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">About Me</h3>
                {user.bio ? (
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80">{user.bio}</p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm italic">No bio provided</p>
                )}
              </div>

              {/* Interests */}
              {!user.is_mentor && user.interests && user.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1.5 bg-indigo-50/80 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full shadow-sm backdrop-blur-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {!user.is_mentor && user.goals && user.goals.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.goals.map((goal, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1.5 bg-green-50/80 text-green-700 border border-green-100 text-xs font-bold rounded-full shadow-sm backdrop-blur-sm"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
