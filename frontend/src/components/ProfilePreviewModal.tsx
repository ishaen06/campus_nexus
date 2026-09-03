import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, GraduationCap, Copy, Check } from 'lucide-react';
import Avatar from './Avatar';
import { getStudentSemester, getStudentYearDisplay } from '../utils/academic';
import api from '../api';

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
  const [displayUser, setDisplayUser] = useState<any>(user);
  const [copiedField, setCopiedField] = useState<'email' | 'usn' | null>(null);

  useEffect(() => {
    setDisplayUser(user);
    if (isOpen && user?.id && (!user.email || !user.usn)) {
      api.get(`/users/${user.id}/public-profile`)
        .then(res => {
          if (res.data) {
            setDisplayUser((prev: any) => ({ ...prev, ...res.data }));
          }
        })
        .catch(err => {
          console.warn("Could not fetch extended profile details:", err);
        });
    }
  }, [isOpen, user?.id]);

  if (!user) return null;

  const current = displayUser || user;
  const branchDisplay = (current.branch_code || current.branch || 'N/A').toUpperCase();
  const yearDisplay = getStudentYearDisplay(current);
  const semDisplay = getStudentSemester(current);

  const copyToClipboard = (text: string, field: 'email' | 'usn') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div 
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 bg-white dark:bg-[#1e1e24] !bg-white dark:!bg-[#1e1e24] overflow-hidden flex flex-col max-h-[88vh]"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-md z-50 cursor-pointer"
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
                    <Avatar config={current.profile_photo ? { photo: current.profile_photo } : null} name={current.full_name} size={84} />
                  </div>
                </div>

                {/* Name & Academic Tags */}
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{current.full_name}</h2>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {current.is_mentor ? (
                      <span className="text-[#1e3a8a] dark:text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                        {current.post || 'Engineering Mentor'} • Department of {current.department || 'N/A'}
                      </span>
                    ) : (
                      <>
                        <span className="text-[#1e3a8a] dark:text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                          {branchDisplay}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider">
                          {yearDisplay} • {semDisplay}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Academic Identity: Prominent USN & College Email Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {/* USN Display */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <GraduationCap size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">USN / Roll No.</p>
                        <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 uppercase truncate select-all">
                          {current.usn || (current.id ? `RVCE-${current.id}` : 'Not Provided')}
                        </p>
                      </div>
                    </div>
                    {current.usn && (
                      <button
                        onClick={() => copyToClipboard(current.usn, 'usn')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                        title="Copy USN"
                      >
                        {copiedField === 'usn' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>

                  {/* College Email Display */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Mail size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">College Email</p>
                        <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate select-all">
                          {current.email || 'Not Provided'}
                        </p>
                      </div>
                    </div>
                    {current.email && (
                      <button
                        onClick={() => copyToClipboard(current.email, 'email')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedField === 'email' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

              {/* Bio */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">About Me</h3>
                {current.bio ? (
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80">{current.bio}</p>
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
