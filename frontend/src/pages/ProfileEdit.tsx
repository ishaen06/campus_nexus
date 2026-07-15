import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search } from 'lucide-react';
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
  const [department, setDepartment] = useState('');
  const [post, setPost] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      originalVx: number;
      originalVy: number;
    }

    let particles: Particle[] = [];
    const PARTICLE_COUNT = 55;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const size = Math.random() * 2 + 1.2;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const vx = (Math.random() - 0.5) * 0.35;
        const vy = (Math.random() - 0.5) * 0.35;
        
        const colors = [
          'rgba(129, 140, 248, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(56, 189, 248, 0.7)',
          'rgba(147, 197, 253, 0.7)',
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particles.push({
          x,
          y,
          vx,
          vy,
          size,
          color,
          originalVx: vx,
          originalVy: vy,
        });
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      particles.forEach((p) => {
        let targetVx = p.originalVx;
        let targetVy = p.originalVy;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 180 && dist > 0.1) {
            const force = (180 - dist) / 180;
            targetVx += (dx / dist) * force * 0.5;
            targetVy += (dy / dist) * force * 0.5;
          }
        }

        p.vx += (targetVx - p.vx) * 0.08;
        p.vy += (targetVy - p.vy) * 0.08;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
          p.originalVx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
          p.originalVx *= -1;
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
          p.originalVy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
          p.originalVy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const alpha = ((100 - dist) / 100) * 0.15;
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        if (mouse.active) {
          const dx = mouse.x - p1.x;
          const dy = mouse.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = ((160 - dist) / 160) * 0.25;
            ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    api.get('/users/me').then(res => {
      setFullName(res.data.full_name || '');
      setIsMentor(res.data.is_mentor || false);
      setUsn(res.data.usn || '');
      setBranch(res.data.branch || '');
      setYear(res.data.year_of_study ? res.data.year_of_study.toString() : '');
      setBio(res.data.bio || '');
      setCycle(res.data.cycle || '');
      setDepartment(res.data.department || '');
      setPost(res.data.post || '');
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
    if (isMentor) {
      if (!department.trim() || !post.trim()) {
        alert('Please fill out your department and post/designation.');
        setSaving(false);
        return;
      }
    } else {
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
        department: isMentor ? department : null,
        post: isMentor ? post : null,
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
      <div 
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            active: true
          };
        }}
        onMouseEnter={() => {
          mouseRef.current.active = true;
        }}
        onMouseLeave={() => {
          mouseRef.current = { x: -1000, y: -1000, active: false };
        }}
        className="h-64 md:h-80 w-full bg-gradient-to-r from-[#000814] via-[#001d3d] to-[#000814] border-b border-slate-200 dark:border-slate-800 relative flex items-end justify-end p-6 overflow-hidden select-none"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {/* RVCE Logo - top left of cover */}
        <div className="absolute top-4 left-4 z-10">
          <img
            src="/rvce_logo_header.png"
            alt="RV College of Engineering"
            className="h-10 md:h-12 object-contain"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
          />
        </div>
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
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  {isMentor && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Computer Science & Engineering"
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                          value={department} onChange={e => setDepartment(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Post / Designation</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Assistant Professor"
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                          value={post} onChange={e => setPost(e.target.value)}
                        />
                      </div>
                    </>
                  )}
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
              className="w-full max-w-2xl overflow-y-auto flex flex-col p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative no-scrollbar max-h-[95vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer z-30"
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="w-full flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" /> Create Your Avatar
                </h3>
              </div>

              {/* Symmetrical Two-Column Layout */}
              <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
                {/* Left Side: Avatar Live Preview Card */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl md:w-1/3 shrink-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Live Preview</span>
                  <div className="w-36 h-36 rounded-full border-[6px] border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                    <Avatar config={avatarConfig} name={fullName} size={130} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-4">{fullName || "Your Avatar"}</span>
                </div>

                {/* Right Side: Options Panel Card Box */}
                <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col space-y-4">
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar text-left">
                    {/* Background Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Background Gradient</label>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <button
                            key={i} type="button"
                            onClick={() => setAvatarConfig(prev => ({ ...prev, bg: i }))}
                            className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                              avatarConfig.bg === i ? 'border-indigo-650 dark:border-indigo-400 scale-110 shadow-md' : 'border-transparent opacity-75'
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
                        className="w-full glass-input rounded-2xl px-4 py-3 pl-10 text-sm focus:outline-none transition-all text-slate-900 dark:text-white font-semibold"
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

                    {/* Category Tabs */}
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
                                ? 'bg-indigo-600/20 dark:bg-indigo-600/30 border-indigo-500 text-indigo-700 dark:text-slate-100 shadow-sm scale-105'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span>{cat.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Emoji Selection Grid */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        {emojiSearch ? 'Search Results' : `${activeCategory} Emojis`}
                      </label>
                      <div className="grid grid-cols-7 gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
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
                                    ? 'bg-indigo-650/25 dark:bg-indigo-600/30 border-indigo-500 shadow-md scale-105'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-950 dark:text-slate-100'
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
                    <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 p-3.5 rounded-2xl">
                      <div className="flex-1">
                        <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Type Custom Emoji</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Paste any specific emoji character from your device keyboard.</p>
                      </div>
                      <input
                        type="text"
                        maxLength={4}
                        className="w-12 h-12 glass-input rounded-xl text-center text-xl focus:outline-none transition-all text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700"
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

              {/* Modal Footer */}
              <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer uppercase tracking-wider"
                >
                  Confirm Avatar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
