import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { Sparkles, Search, X } from 'lucide-react';
import Avatar from '../components/Avatar';
import type { AvatarConfig } from '../components/Avatar';
import Logo from '../components/Logo';
import { EMOJI_CATEGORIES, searchEmojis } from '../utils/emojis';

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
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('');
  const [cycle, setCycle] = useState('P');
  const [department, setDepartment] = useState('');
  const [post, setPost] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({ emoji: '👨‍💻', bg: 0 });
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(res => {
      setFullName(res.data.full_name || '');
      const userIsMentor = res.data.is_mentor;
      
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
      if (res.data.avatar_config) {
        setAvatarConfig(res.data.avatar_config);
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
        avatar_config: avatarConfig,
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

  if (!roleSelected) {
    return (
      <div className="min-h-screen pt-20 px-4 md:px-0 flex items-center justify-center bg-transparent">
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
                setIsMentor(false);
                setRoleSelected(true);
              }}
              className="py-5 px-6 rounded-2xl border-2 border-indigo-500/20 hover:border-indigo-500 bg-white/5 hover:bg-indigo-500/5 transition-all text-left group cursor-pointer"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-400">I am a Student</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Connect with peers, create teams, and work on academic projects.</p>
            </button>
            
            <button
              onClick={() => {
                setIsMentor(true);
                setRoleSelected(true);
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
    <div className="min-h-screen pt-20 px-4 md:px-0">
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
          <div className="flex flex-col md:flex-row gap-6 items-stretch bg-slate-50 dark:bg-slate-900/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            {/* Left preview box */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl md:w-1/4 shrink-0">
              <div className="w-24 h-24 rounded-full border-[6px] border-slate-100 dark:border-slate-800 shadow-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                <Avatar config={avatarConfig} name={fullName} size={84} />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3">Preview</span>
            </div>

            {/* Right options box */}
            <div className="flex-1 w-full p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 animate-pulse" /> Set Your Profile Picture
              </h3>
              
              {/* Background selector */}
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Background Gradient</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i} type="button"
                      onClick={() => setAvatarConfig(prev => ({ ...prev, bg: i }))}
                      className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                        avatarConfig.bg === i ? 'border-indigo-600 scale-110 shadow animate-fade-in' : 'border-transparent opacity-75'
                      }`}
                      style={{
                        background: i === 0 ? "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)" :
                                    i === 1 ? "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)" :
                                    i === 2 ? "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)" :
                                    i === 3 ? "linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)" :
                                    i === 4 ? "linear-gradient(135deg, #c084fc 0%, #a855f7 100%)" :
                                              "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)"
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Searchable and Categorized Emoji Picker */}
              <div className="space-y-3">
                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    className="w-full glass-input rounded-xl px-3 py-2 pl-9 text-xs focus:outline-none transition-all text-slate-900 dark:text-white font-semibold"
                    placeholder="Search emojis (e.g. smile, heart, code, animal)..."
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                  />
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <Search size={14} />
                  </div>
                  {emojiSearch && (
                    <button
                      type="button"
                      onClick={() => setEmojiSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category tabs */}
                {!emojiSearch && (
                  <div className="flex gap-1.5 justify-between pb-1.5">
                    {EMOJI_CATEGORIES.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setActiveCategory(cat.name)}
                        title={cat.name}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all border cursor-pointer ${
                          activeCategory === cat.name
                            ? 'bg-indigo-650/20 dark:bg-indigo-600/30 border-indigo-500 text-indigo-755 dark:text-slate-100 shadow'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span>{cat.icon}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-7 gap-1.5 max-h-[100px] overflow-y-auto pr-1 no-scrollbar text-left">
                  {(() => {
                    const displayedEmojis = emojiSearch 
                      ? searchEmojis(emojiSearch)
                      : (EMOJI_CATEGORIES.find(c => c.name === activeCategory)?.emojis || []);
                    
                    if (displayedEmojis.length > 0) {
                      return displayedEmojis.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setAvatarConfig(prev => ({ ...prev, emoji: em }))}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110 active:scale-95 cursor-pointer border ${
                            avatarConfig.emoji === em
                              ? 'bg-indigo-650/25 dark:bg-indigo-650/35 border-indigo-500 shadow scale-105'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {em}
                        </button>
                      ));
                    } else {
                      return (
                        <div className="col-span-7 py-4 text-center text-[10px] text-slate-400 font-bold">
                          No matching emojis found
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Manual Type Custom */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-2 rounded-xl text-left">
                  <div className="flex-1">
                    <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Or Paste Custom Emoji</span>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">Enter a specific emoji character from your keyboard.</p>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    className="w-9 h-9 glass-input rounded-lg text-center text-lg focus:outline-none transition-all text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700"
                    value={avatarConfig.emoji || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAvatarConfig(prev => ({ ...prev, emoji: val }));
                    }}
                    placeholder="😎"
                  />
                </div>
              </div>
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
