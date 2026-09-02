import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import Avatar from './Avatar';
import { getStudentSemester, getStudentYearDisplay } from '../utils/academic';

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: number;
    full_name: string;
    email?: string | null;
    branch?: string | null;
    branch_code?: string | null;
    year_of_study?: number | null;
    joining_year?: number | null;
    joiningYear?: number | null;
    bio?: string | null;
    interests?: string[] | null;
    goals?: string[] | null;
    profile_photo?: string | null;
    is_mentor?: boolean | null;
    usn?: string | null;
    department?: string | null;
    post?: string | null;
    [key: string]: any;
  } | null;
}

export default function ProfilePreviewModal({ isOpen, onClose, user }: ProfilePreviewModalProps) {
  if (!user) return null;

  const branchDisplay = (user.branch_code || user.branch || 'N/A').toUpperCase();
  const yearDisplay = getStudentYearDisplay(user);
  const semDisplay = getStudentSemester(user);


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
              <div className="h-32 bg-gradient-to-r from-[#000814] via-[#001d3d] to-[#000814] border-b border-slate-200 dark:border-slate-800 relative flex-shrink-0" />

              {/* Content Area */}
              <div className="p-6 pt-0 relative">
                {/* Avatar position offset */}
                <div className="flex justify-between items-end -mt-14 mb-4">
                  <div className="w-24 h-24 rounded-full border-[6px] border-white dark:border-[#1e1e24] shadow-xl overflow-hidden bg-white/20 flex items-center justify-center">
                    <Avatar config={user.profile_photo ? { photo: user.profile_photo } : null} name={user.full_name} size={84} />
                  </div>
                </div>

              {/* Name & Basic Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{user.full_name}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {user.is_mentor ? (
                    <span className="text-[#1e3a8a] dark:text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                      {user.post || 'Engineering Mentor'} • Department of {user.department || 'N/A'}
                    </span>
                  ) : (
                    <>
                      <span className="text-[#1e3a8a] dark:text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                        {branchDisplay}
                      </span>
                      <span className="text-slate-400 font-bold">•</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider">
                        {yearDisplay} • {semDisplay}
                      </span>

                      {user.usn && (
                        <>
                          <span className="text-slate-400 font-bold">•</span>
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {user.usn}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Email Address */}
                {user.email && (
                  <div className="flex items-center gap-2 mt-3 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 w-fit shadow-xs">
                    <Mail size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="select-all font-mono text-xs font-semibold">{user.email}</span>
                  </div>
                )}
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
