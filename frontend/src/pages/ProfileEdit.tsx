import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, X, Search } from 'lucide-react';
import Avatar from '../components/Avatar';
import type { AvatarConfig } from '../components/Avatar';
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

export default function ProfileEdit() {
  const [fullName, setFullName] = useState('');
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [cycle, setCycle] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({ emoji: '👨‍💻', bg: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(res => {
      setFullName(res.data.full_name || '');
      setIsMentor(res.data.is_mentor || false);
      setUsn(res.data.usn || '');
      setBranch(res.data.branch || '');
      setYear(res.data.year_of_study ? res.data.year_of_study.toString() : '');
      setBio(res.data.bio || '');
      setCycle(res.data.cycle || '');
      setInterests(res.data.interests || []);
      setGoals(res.data.goals || []);
      if (res.data.avatar_config) {
        setAvatarConfig(res.data.avatar_config);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const toggleSelection = (item: string, list: string[], setList: any) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (!isMentor) {
      const cleanUsn = usn.trim().toLowerCase();
      const pattern = /^(1rv|1rz)\d{2}[a-z]{2,3}\d{3}$/;
      if (!pattern.test(cleanUsn)) {
        alert("USN must start with '1rv' or '1rz', have 2-digit year, 2 to 3 letter branch, and end with a 3-digit number (e.g. 1RV22CS001)");
        setSaving(false);
        return;
      }
    }
    try {
      await api.put('/users/me/profile', {
        full_name: fullName,
        usn: isMentor ? null : usn.toUpperCase(),
        branch: isMentor ? null : branch,
        year_of_study: isMentor ? null : (parseInt(year) || null),
        cycle: isMentor ? null : cycle,
        bio, 
        interests: isMentor ? null : interests, 
        goals: isMentor ? null : goals,
        avatar_config: avatarConfig
      });
      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="pt-20 text-center animate-pulse flex flex-col items-center">
      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Loading your persona...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pb-24 relative overflow-hidden">
      {/* Dynamic Cover Image */}
      <div className="h-64 md:h-80 w-full bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-white/5 relative flex items-end justify-end p-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <button className="glass-panel border-none px-4 py-2 flex items-center gap-2 text-white font-semibold hover:bg-white/20 transition-colors z-10">
          <Camera size={18} />
          Edit Cover
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Avatar & Basic Info) */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 flex flex-col items-center text-center"
            >
              <div 
                onClick={() => setShowAvatarModal(true)}
                className="w-32 h-32 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center relative group cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all"
                title="Customize Avatar"
              >
                <Avatar config={avatarConfig} name={fullName} size={120} />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Sparkles className="text-white" size={24} />
                </div>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mt-4 tracking-tight">{fullName}</h1>
              <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mt-1">
                {isMentor ? 'Mentor' : `${branch} • Year ${year}`}
              </p>
            </motion.div>
          </div>

          {/* Right Column (Editable Profile) */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-8"
            >
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Edit Profile</h2>
              </div>
              
              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={isMentor ? "col-span-2" : ""}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  {!isMentor && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">USN</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. 1RV22CS001"
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold shadow-sm uppercase"
                          value={usn} onChange={e => setUsn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Branch</label>
                        <select
                          required
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold shadow-sm cursor-pointer"
                          value={branch} onChange={e => setBranch(e.target.value)}
                        >
                          <option value="" disabled hidden>Select Branch</option>
                          <option value="ASE">Aerospace Eng (AS)</option>
                          <option value="AI_ML">Artificial Intelligence (AI & ML)</option>
                          <option value="BT">Biotechnology (BT)</option>
                          <option value="CH">Chemical Eng (CH)</option>
                          <option value="CV">Civil Eng (CV)</option>
                          <option value="CSE">Computer Science (CSE)</option>
                          <option value="CSE_CY">Cyber Security (CSE-CY)</option>
                          <option value="CSE_DS">Data Science (CSE-DS)</option>
                          <option value="EEE">Electrical & Electronics (EEE)</option>
                          <option value="ECE">Electronics & Comm (ECE)</option>
                          <option value="ETE">Electronics & Telecom (ETE)</option>
                          <option value="IEM">Industrial Eng & Mgmt (IEM)</option>
                          <option value="ME">Mechanical Eng (ME)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Academic Cycle</label>
                        <select
                          required
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold shadow-sm cursor-pointer"
                          value={cycle} onChange={e => setCycle(e.target.value)}
                        >
                          <option value="" disabled hidden>Select Cycle</option>
                          <option value="P">Physics Cycle (P-Cycle)</option>
                          <option value="C">Chemistry Cycle (C-Cycle)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Year of Study</label>
                        <select
                          required
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold shadow-sm cursor-pointer"
                          value={year} onChange={e => setYear(e.target.value)}
                        >
                          <option value="" disabled hidden>Select Year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About Me</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none resize-none font-medium shadow-sm leading-relaxed"
                    value={bio} onChange={e => setBio(e.target.value)}
                  />
                </div>

                {!isMentor && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {INTERESTS_LIST.map(interest => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleSelection(interest, interests, setInterests)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                              interests.includes(interest) 
                              ? 'bg-indigo-600/80 backdrop-blur text-white border border-indigo-400' 
                              : 'bg-white/30 text-gray-600 border border-white/20 hover:bg-white/50 backdrop-blur'
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Goals</label>
                      <div className="flex flex-wrap gap-2">
                        {GOALS_LIST.map(goal => (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => toggleSelection(goal, goals, setGoals)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                              goals.includes(goal) 
                              ? 'bg-green-600/80 backdrop-blur text-white border border-green-400' 
                              : 'bg-white/30 text-gray-600 border border-white/20 hover:bg-white/50 backdrop-blur'
                            }`}
                          >
                            {goal}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex justify-end">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={saving}
                    className="bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-70 cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Avatar Customize Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-2xl overflow-y-auto flex flex-col md:flex-row gap-6 p-6 rounded-[28px] border border-white/10 shadow-2xl relative no-scrollbar max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-200 transition-colors cursor-pointer z-30"
              >
                <X size={20} />
              </button>

              {/* Left Side: Avatar Live Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl md:w-1/3 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Live Preview</span>
                <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center relative">
                  <Avatar config={avatarConfig} name={fullName} size={150} />
                </div>
                <span className="text-sm font-bold text-slate-200 mt-4">{fullName || "Your Avatar"}</span>
              </div>

              {/* Right Side: Options Panel */}
              <div className="flex-1 space-y-5">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sparkles size={20} className="text-indigo-400" /> Create Your Avatar
                </h3>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                  {/* Background Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Background Gradient</label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i} type="button"
                          onClick={() => setAvatarConfig(prev => ({ ...prev, bg: i }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                            avatarConfig.bg === i ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent opacity-75'
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

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full glass-input rounded-2xl px-4 py-3 pl-10 text-sm focus:outline-none transition-all text-slate-100 font-semibold"
                      placeholder="Search emojis (e.g. smile, heart, code, animal)..."
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Search size={16} />
                    </div>
                    {emojiSearch && (
                      <button
                        type="button"
                        onClick={() => setEmojiSearch('')}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Category Tabs (hidden during active search) */}
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
                              ? 'bg-indigo-600/30 border-indigo-500 text-slate-100 shadow-md scale-105'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                          }`}
                        >
                          <span>{cat.icon}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Emoji Selection Grid */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {emojiSearch ? 'Search Results' : `${activeCategory} Emojis`}
                    </label>
                    <div className="grid grid-cols-7 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
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
                              className={`w-10 h-10 flex items-center justify-center rounded-xl text-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer border ${
                                avatarConfig.emoji === em
                                  ? 'bg-indigo-600/40 border-indigo-500 shadow-lg shadow-indigo-600/20 scale-105'
                                  : 'bg-white/5 border-white/5 hover:bg-white/15 text-slate-200'
                              }`}
                            >
                              {em}
                            </button>
                          ));
                        } else {
                          return (
                            <div className="col-span-7 py-8 text-center text-xs text-slate-400 font-bold">
                              No matching emojis found
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Manual / Specific Emoji Input */}
                  <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type Custom Emoji</span>
                      <p className="text-[10px] text-slate-500">Paste any specific emoji character from your device keyboard.</p>
                    </div>
                    <input
                      type="text"
                      maxLength={4}
                      className="w-12 h-12 glass-input rounded-xl text-center text-xl focus:outline-none transition-all text-slate-100 font-bold border border-white/10"
                      value={avatarConfig.emoji || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvatarConfig(prev => ({ ...prev, emoji: val }));
                      }}
                      placeholder="😎"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setShowAvatarModal(false)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Confirm Avatar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
