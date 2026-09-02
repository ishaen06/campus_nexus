import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import Avatar from '../components/Avatar';

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
  const [email, setEmail] = useState('');
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [cycle, setCycle] = useState('');
  const [joiningYear, setJoiningYear] = useState<number | null>(null);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [department, setDepartment] = useState('');
  const [post, setPost] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      setEmail(res.data.email || '');
      setIsMentor(res.data.is_mentor || false);
      setUsn(res.data.usn || '');
      setBranch(res.data.branch || '');
      setYear(res.data.year_of_study ? res.data.year_of_study.toString() : '1');
      setBio(res.data.bio || '');
      setCycle(res.data.cycle || '');
      setJoiningYear(res.data.joining_year || null);
      setDepartment(res.data.department || '');
      setPost(res.data.post || '');
      setInterests(res.data.interests || []);
      setGoals(res.data.goals || []);
      if (res.data.profile_photo) {
        setProfilePhoto(res.data.profile_photo);
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
    } else if (usn.trim()) {
      const cleanUsn = usn.trim().toLowerCase();
      const pattern = /^(1rv|1rz)\d{2}[a-z]{2,3}\d{3}$/;
      if (!pattern.test(cleanUsn)) {
        alert("Invalid USN format. USN must start with '1RV' or '1RZ', followed by a 2-digit year, 2-3 letter branch code, and end with 3 digits (e.g. 1RV24CS001)");
        setSaving(false);
        return;
      }

      // Validate USN matches college email ID prefix
      const cleanEmail = (email || '').trim().toLowerCase();
      if (cleanEmail.endsWith('@rvce.edu.in')) {
        const emailPrefix = cleanEmail.split('@')[0].trim();
        if (emailPrefix.startsWith('1rv') || emailPrefix.startsWith('1rz')) {
          if (cleanUsn !== emailPrefix) {
            alert(`USN validation error: Your USN (${cleanUsn.toUpperCase()}) does not match your college email ID (${cleanEmail}). Expected USN: ${emailPrefix.toUpperCase()}`);
            setSaving(false);
            return;
          }
        } else {
          const match = cleanEmail.match(/^([a-z0-9\._]+)\.([a-z]{2,5})(\d{2})@rvce\.edu\.in$/);
          if (match) {
            const emailBranch = match[2].toLowerCase();
            const emailYear = match[3];
            const usnMatch = cleanUsn.match(/^(1rv|1rz)(\d{2})([a-z]{2,3})\d{3}$/);
            if (usnMatch) {
              const usnYear = usnMatch[2];
              const usnBranch = usnMatch[3].toLowerCase();
              if (usnBranch !== emailBranch || usnYear !== emailYear) {
                alert(`USN validation error: USN branch/year (${usnBranch.toUpperCase()}/${usnYear}) does not match your college email details (${emailBranch.toUpperCase()}/${emailYear}).`);
                setSaving(false);
                return;
              }
            }
          }
        }
      }
    }
    try {
      await api.put('/users/me/profile', {
        full_name: fullName,
        usn: isMentor ? null : (usn.trim() ? usn.trim().toUpperCase() : null),
        department: isMentor ? department : null,
        post: isMentor ? post : null,
        bio,
        interests: isMentor ? null : interests,
        goals: isMentor ? null : goals,
        profile_photo: profilePhoto
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
      </div>

      <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 md:px-8 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Avatar & Basic Info) */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 flex flex-col items-center text-center"
            >
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

              {/* Profile photo circle */}
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center relative group cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all"
                title="Upload profile photo"
              >
                <Avatar config={profilePhoto ? { photo: profilePhoto } : null} name={fullName} size={120} />
                <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 gap-1">
                  <Camera className="text-white" size={22} />
                  <span className="text-white text-[10px] font-bold tracking-wide">Change Photo</span>
                </div>
              </div>

              {/* Remove photo button */}
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => setProfilePhoto(null)}
                  className="mt-2 flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                >
                  <X size={12} /> Remove photo
                </button>
              )}
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
                <h2 className="text-2xl font-black text-white tracking-tight">Edit Profile</h2>
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
                    <div className="col-span-2 space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">USN (University Seat Number)</label>
                        <input
                          type="text"
                          placeholder="e.g. 1RV25CS088"
                          className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-bold shadow-sm uppercase tracking-wider text-slate-800 dark:text-slate-100"
                          value={usn}
                          onChange={e => setUsn(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Branch</span>
                          <span className="block text-xs font-black text-slate-800 dark:text-slate-100 truncate mt-0.5" title={branch}>
                            {branch || 'Computer Science'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Joining Year</span>
                          <span className="block text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {joiningYear || 2025}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Academic Year</span>
                          <span className="block text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {year ? `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year` : '1st Year'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Subject Cycle</span>
                          <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {cycle === 'C' ? 'C-Cycle (Chemistry)' : 'P-Cycle (Physics)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About Me (Optional)</label>
                  <textarea
                    rows={4}
                    placeholder="Write a brief bio about yourself (optional)..."
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
    </div>
  );
}
