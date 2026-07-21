import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, X, Eye, EyeOff, Lock, ChevronLeft } from 'lucide-react';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';

const INTERESTS_LIST = [
  "Startups", "Entrepreneurship", "Artificial Intelligence", "Robotics",
  "Gaming", "Finance", "Stock Markets", "Sports", "Movies", "Music",
  "Photography", "Content Creation", "Research", "Public Speaking", "Technology"
];

const GOALS_LIST = [
  "Prepare for placements", "Build a startup", "Find study partners",
  "Participate in hackathons", "Network with peers", "Higher studies",
  "Learn new technologies"
];

export default function ProfileSetup() {
  const [fullName, setFullName] = useState('');
  const [isMentor, setIsMentor] = useState<boolean | null>(null);
  const [roleSelected, setRoleSelected] = useState(false);
  const [pendingRole, setPendingRole] = useState<boolean | null>(null); // role chosen but password not yet verified
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('');
  const [cycle, setCycle] = useState('P');
  const [department, setDepartment] = useState('');
  const [post, setPost] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(res => {
      setFullName(res.data.full_name || '');
      const userEmail = (res.data.email || '').toLowerCase().trim();
      const isRvce = userEmail.endsWith('@rvce.edu.in');
      const userIsMentor = isRvce ? false : res.data.is_mentor;
      
      if (userIsMentor !== null && userIsMentor !== undefined) {
        setIsMentor(userIsMentor);
        setRoleSelected(true);
        if (userIsMentor) {
          if (res.data.department && res.data.post && res.data.bio) {
            navigate('/mentor-dashboard');
          }
        } else {
          if (res.data.usn && res.data.bio) {
            navigate('/discovery');
          }
        }
      } else {
        setIsMentor(null);
        setRoleSelected(false);
      }
      
      const isComplete = userIsMentor === true 
        ? (res.data.department && res.data.post && res.data.bio)
        : (userIsMentor === false && res.data.usn && res.data.bio);
      setShowSkip(!!isComplete);
      
      setUsn(res.data.usn || '');
      setBranch(res.data.branch || '');
      setCycle(res.data.cycle || 'P');
      setDepartment(res.data.department || '');
      setPost(res.data.post || '');
      setBio(res.data.bio || '');
      setInterests(res.data.interests || []);
      setGoals(res.data.goals || []);
      if (res.data.profile_photo) {
        setProfilePhoto(res.data.profile_photo);
      }
    }).catch(() => {
      navigate('/login');
    });
  }, [navigate]);

  const toggleSelection = (item: string, list: string[], setList: any) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMentor === null) {
      alert('Please select your role first.');
      return;
    }
    
    if (isMentor) {
      if (!department.trim() || !post.trim()) {
        alert('Please fill out your department and post/designation.');
        return;
      }
    } else {
      if (!usn.trim() || !branch.trim()) {
        alert('Please fill out your USN and Branch.');
        return;
      }
      const cleanUsn = usn.trim().toLowerCase();
      const pattern = /^(1rv|1rz)\d{2}[a-z]{2,3}\d{3}$/i;
      if (!pattern.test(cleanUsn)) {
        alert("USN must start with '1rv' or '1rz', have 2-digit year, 2 to 3 letter branch, and end with a 3-digit number (e.g. 1RV22CS001)");
        return;
      }
    }

    try {
      await api.put('/users/me/profile', {
        is_mentor: isMentor,
        bio,
        interests: isMentor ? [] : interests,
        goals: isMentor ? [] : goals,
        profile_photo: profilePhoto,
        usn: isMentor ? null : usn.toUpperCase(),
        branch: isMentor ? null : branch,
        cycle: isMentor ? 'P' : cycle,
        department: isMentor ? department : null,
        post: isMentor ? post : null
      });
      navigate(isMentor ? '/mentor-dashboard' : '/discovery');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save profile');
    }
  };

  // Password gate: shown after role is selected but before verified
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = pendingRole ? 'mentor123' : 'student123';
    if (passwordInput === correctPassword) {
      setIsMentor(pendingRole);
      setPasswordVerified(true);
      setRoleSelected(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  if (!roleSelected) {
    // Password gate screen
    if (pendingRole !== null && !passwordVerified) {
      return (
        <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-transparent w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm w-full glass-panel p-8 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                pendingRole 
                  ? 'bg-emerald-500/10 border-2 border-emerald-500/30' 
                  : 'bg-indigo-500/10 border-2 border-indigo-500/30'
              }`}>
                <Lock size={28} className={pendingRole ? 'text-emerald-400' : 'text-indigo-400'} />
              </div>
            </div>

            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingRole ? 'Mentor Access' : 'Student Access'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs font-semibold">
              Enter your access password to continue
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-6 text-left space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  placeholder="Enter access password"
                  className="w-full px-4 py-3 pr-12 glass-input rounded-2xl outline-none font-semibold text-slate-900 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs font-semibold text-rose-500 dark:text-rose-400 text-center"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!passwordInput.trim()}
                className={`w-full py-3 px-4 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  pendingRole
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                }`}
              >
                Continue
              </button>
            </form>

            <button
              onClick={() => { setPendingRole(null); setPasswordInput(''); setPasswordError(''); }}
              className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mx-auto cursor-pointer"
            >
              <ChevronLeft size={14} /> Back to role selection
            </button>
          </motion.div>
        </div>
      );
    }

    // Role selection screen
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-transparent w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-panel p-8 text-center"
        >
          <div className="flex justify-center">
            <Logo size={112} showText={true} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-6">Welcome to Campus Nexus!</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-xs font-bold uppercase tracking-wider">Please select your role to continue</p>
          
          <div className="flex flex-col gap-4 mt-8">
            <button
              onClick={() => {
                setPendingRole(false);
                setPasswordInput('');
                setPasswordError('');
              }}
              className="py-5 px-6 rounded-2xl border-2 border-indigo-500/20 hover:border-indigo-500 bg-white/5 hover:bg-indigo-500/5 transition-all text-left group cursor-pointer"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-400">I am a Student</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Connect with peers, create teams, and work on academic projects.</p>
            </button>
            
            <button
              onClick={() => {
                setPendingRole(true);
                setPasswordInput('');
                setPasswordError('');
              }}
              className="py-5 px-6 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 bg-white/5 hover:bg-emerald-500/5 transition-all text-left group cursor-pointer"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-400">I am a Mentor</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Supervise academic teams, evaluate projects, and review topics.</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-transparent w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto glass-panel p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Complete Profile</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Let others know who you are beyond your resume.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-8">
          {/* Avatar Setup Preview & Builder */}
          <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 dark:bg-slate-900/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            {/* Hidden file input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 400;
                    const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setProfilePhoto(canvas.toDataURL('image/jpeg', 0.82));
                  };
                  img.src = ev.target?.result as string;
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />

            {/* Left preview box / Profile Photo upload circle */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl md:w-1/3 shrink-0">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-28 h-28 rounded-full border-[6px] border-slate-100 dark:border-slate-800 shadow-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative group cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all"
                title="Upload profile photo"
              >
                <Avatar config={profilePhoto ? { photo: profilePhoto } : null} name={fullName} size={100} />
                <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 gap-1">
                  <Camera className="text-white" size={20} />
                  <span className="text-white text-[9px] font-bold tracking-wide">Upload Photo</span>
                </div>
              </div>
              
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => setProfilePhoto(null)}
                  className="mt-3 flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-455 font-bold transition-colors cursor-pointer"
                >
                  <X size={12} /> Remove Photo
                </button>
              )}
            </div>

            {/* Right instruction details */}
            <div className="flex-1 w-full p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-2 text-left">
              <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <Sparkles size={16} className="text-indigo-650 dark:text-indigo-400 animate-pulse" /> Profile Picture Setup
              </h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Upload a professional profile photo. If no photo is uploaded, your avatar will default to your initials on a clean gradient background.
              </p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Camera size={14} /> Choose Image File...
              </button>
            </div>
          </div>

          {/* Onboarding fields depending on role */}
          {isMentor ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">Department</label>
                <input
                  type="text" required placeholder="Department (e.g. CSE, ISE, ECE)"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-xs text-slate-900 dark:text-slate-100 shadow-inner"
                  value={department} onChange={e => setDepartment(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">Post / Designation</label>
                <input
                  type="text" required placeholder="Designation (e.g. Assistant Professor)"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-xs text-slate-900 dark:text-slate-100 shadow-inner"
                  value={post} onChange={e => setPost(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">USN</label>
                <input
                  type="text" required placeholder="USN (e.g. 1RV22CS001)"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-xs text-slate-900 dark:text-slate-100 shadow-inner"
                  value={usn} onChange={e => setUsn(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">Branch</label>
                <input
                  type="text" required placeholder="Branch (e.g. CSE, ISE, ECE)"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-xs text-slate-900 dark:text-slate-100 shadow-inner"
                  value={branch} onChange={e => setBranch(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">Academic Cycle</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold text-xs text-slate-900 dark:text-slate-100 shadow-inner cursor-pointer"
                  value={cycle} onChange={e => setCycle(e.target.value)}
                >
                  <option value="P">Physics (P-Cycle)</option>
                  <option value="C">Chemistry (C-Cycle)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 text-left">Short Bio</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-3 glass-input rounded-2xl outline-none resize-none text-slate-900 dark:text-white"
              placeholder="Tell us a little bit about yourself..."
              value={bio} onChange={e => setBio(e.target.value)}
            />
          </div>

          {!isMentor && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 text-left">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS_LIST.map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleSelection(interest, interests, setInterests)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                        interests.includes(interest) 
                        ? 'bg-indigo-600/80 backdrop-blur text-white border border-indigo-400' 
                        : 'bg-white/30 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-white/20 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-700 backdrop-blur'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 text-left">Goals</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS_LIST.map(goal => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleSelection(goal, goals, setGoals)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                        goals.includes(goal) 
                        ? 'bg-green-600/80 backdrop-blur text-white border border-green-400' 
                        : 'bg-white/30 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-white/20 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-700 backdrop-blur'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {showSkip && (
              <button 
                type="button"
                onClick={() => navigate(isMentor ? '/mentor-dashboard' : '/discovery')}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black py-4 px-4 rounded-2xl transition-all cursor-pointer text-center text-sm"
              >
                Skip Setup
              </button>
            )}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="flex-1 bg-indigo-600 text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer text-sm"
            >
              Save Profile & Start Exploring
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
