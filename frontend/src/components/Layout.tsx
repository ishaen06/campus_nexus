import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Users, FolderGit, LogOut, User as UserIcon, Sun, Moon, MessageSquare, LayoutDashboard, ChevronDown, Bell, Download, AlertOctagon, BarChart3, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import api from '../api';
import Logo from './Logo';
import Avatar from './Avatar';
import { motion } from 'framer-motion';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<any>(null);
  
  // Admin lock states
  const [isLocked, setIsLocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleMouseEnterProfile = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setShowProfileDropdown(true);
  };

  const handleMouseLeaveProfile = () => {
    const id = setTimeout(() => {
      setShowProfileDropdown(false);
    }, 350);
    setDropdownTimeout(id);
  };
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    api.get('/users/me')
      .then(res => {
        setCurrentUser(res.data);
        const userIsAdmin = res.data.is_admin || res.data.email === 'ishaen.vihaan@gmail.com';
        setIsAdmin(userIsAdmin);
        setIsMentor(res.data.is_mentor);
        
        if (userIsAdmin) {
          if (location.pathname === '/mentor-dashboard' || location.pathname === '/discovery' || location.pathname === '/' || location.pathname === '/profile-setup') {
            navigate('/admin');
          }
          return;
        }
        
        const needsSetup = res.data.is_mentor === null || res.data.is_mentor === undefined
          || (res.data.is_mentor === false && (!res.data.usn || !res.data.bio))
          || (res.data.is_mentor === true && (!res.data.department || !res.data.post || !res.data.bio));
          
        if (needsSetup && location.pathname !== '/profile-setup') {
          navigate('/profile-setup');
        }
      })
      .catch(() => {
        navigate('/login');
      });
  }, [location.pathname, navigate]);

  const getStudentSub = (user: any) => {
    if (!user) return '';
    if (!user.branch) return 'Student';
    const semMap: Record<number, string> = { 1: '1st Sem', 2: '3rd Sem', 3: '5th Sem', 4: '7th Sem' };
    const sem = semMap[user.year_of_study || 1] || '1st Sem';
    return `${user.branch} ${sem}`;
  };

  useEffect(() => {
    const checkUnread = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await api.get('/connections/');
        const connections = res.data;
        const unread = Array.isArray(connections) && connections.some((c: any) => c.has_unread);
        setHasUnread(unread);
      } catch (err) {
        console.error("Error fetching connections for unread status:", err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 7000); // Check every 7 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminLastVerified');
    navigate('/login');
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Set first verification time if not set
    if (!localStorage.getItem('adminLastVerified')) {
      localStorage.setItem('adminLastVerified', Date.now().toString());
    }

    const interval = setInterval(() => {
      const lastVerified = Number(localStorage.getItem('adminLastVerified') || Date.now());
      const elapsed = Date.now() - lastVerified;
      if (elapsed > 15 * 60 * 1000) { // 15 minutes
        setIsLocked(true);
      }
    }, 5000); // Check status every 5 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;
    setVerifying(true);
    setLockError('');
    try {
      await api.post('/admin/verify-reauth', { password: adminPassword });
      localStorage.setItem('adminLastVerified', Date.now().toString());
      setIsLocked(false);
      setAdminPassword('');
      setLockError('');
    } catch (err: any) {
      setLockError(err.response?.data?.detail || 'Invalid admin security password');
    } finally {
      setVerifying(false);
    }
  };

  let navItems = isMentor
    ? [
        { name: 'Dashboard', path: '/mentor-dashboard', icon: LayoutDashboard },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'My Teams', path: '/my-teams', icon: Users },
        { name: 'Chats', path: '/connections', icon: MessageSquare },
        { name: 'My Profile', path: '/profile/edit', icon: UserIcon },
      ]
    : [
        { name: 'Discovery', path: '/discovery', icon: Compass },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Chats', path: '/connections', icon: MessageSquare },
        { name: 'My Team', path: '/my-team', icon: Users },
        { name: 'Project Dashboard', path: '/project-dashboard', icon: FolderGit },
        { name: 'Profile', path: '/profile/edit', icon: UserIcon },
      ];
  
  if (isAdmin) {
    // Admin should only have access to Notifications, Admin panel, and Profile
    navItems = navItems.filter(item => 
      item.name !== 'Dashboard' && 
      item.name !== 'My Teams' && 
      item.name !== 'My Team' && 
      item.name !== 'Chats' && 
      item.name !== 'Discovery' && 
      item.name !== 'Project Dashboard'
    );
    
    const hasAdminLink = navItems.some(item => item.name === 'Moderation Logs');
    if (!hasAdminLink) {
      navItems.push(
        { name: 'Analytics', path: '/admin?tab=analytics', icon: BarChart3 } as any,
        { name: 'Global Search', path: '/admin?tab=search', icon: Search } as any,
        { name: 'Mentors', path: '/admin?tab=mentors', icon: UserIcon } as any,
        { name: 'Teams', path: '/admin?tab=teams', icon: Users } as any,
        { name: 'Report Center', path: '/admin?tab=reports', icon: Download } as any,
        { name: 'Moderation Logs', path: '/admin?tab=moderation', icon: AlertOctagon } as any
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-slate-950/60 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.4)] z-50">
        <div className="p-6">
          <Link to={isMentor ? "/mentor-dashboard" : "/discovery"} className="flex items-center gap-3">
            <Logo size={44} showText={false} />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Campus Nexus
            </span>
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-2 mt-4">
          {navItems.filter(item => item.name !== 'Profile' && item.name !== 'My Profile').map((item) => {
            const queryTab = new URLSearchParams(location.search).get('tab') || 'moderation';
            const isActive = item.path.includes('?tab=')
              ? location.pathname === '/admin' && item.path.endsWith(`?tab=${queryTab}`)
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            const danger = (item as any).danger;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 font-medium",
                  isActive 
                    ? (danger ? "bg-red-500/10 text-red-400" : "bg-slate-900/80 shadow-sm shadow-indigo-950/50 text-indigo-400")
                    : (danger ? "text-slate-400 hover:bg-red-500/10 hover:text-red-400" : "text-slate-400 hover:bg-slate-900/30 hover:text-slate-100")
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={cn(isActive && !danger && "text-indigo-400")} strokeWidth={isActive ? 2.5 : 2} />
                  {item.name}
                </div>
                {(item.name === 'Connections' || item.name === 'Chats') && hasUnread && (
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          {/* Profile Card */}
          <div 
            className="relative"
            onMouseEnter={handleMouseEnterProfile}
            onMouseLeave={handleMouseLeaveProfile}
          >
            {showProfileDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/80 dark:border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-50">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate('/profile/edit');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon size={14} />
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}

            <div
              className="flex items-center justify-between w-full p-2.5 bg-slate-100/50 dark:bg-slate-900/40 hover:bg-slate-200/50 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-xl transition-all duration-300 text-left group backdrop-blur-md cursor-default"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar config={currentUser?.avatar_config} name={currentUser?.full_name || ''} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser?.full_name || 'Loading...'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    {currentUser?.is_mentor ? `${currentUser.post || 'Mentor'} (${currentUser.department || 'N/A'})` : getStudentSub(currentUser)}
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0 ml-2" />
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Theme Toggle Switch */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3">
              <Sun size={20} className="text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Light Mode
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-300 focus:outline-none cursor-pointer",
                theme === 'light' ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-sm",
                  theme === 'light' ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-950/70 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.5)] z-50 pb-safe pt-2 px-6">
        <div className="flex justify-between items-center pb-2">
          {navItems
            .filter(item => !isAdmin || item.name === 'Notifications' || item.name === 'Moderation Logs' || item.name === 'Profile' || item.name === 'My Profile')
            .map((item) => {
              const queryTab = new URLSearchParams(location.search).get('tab') || 'moderation';
              const isActive = item.path.includes('?tab=')
                ? location.pathname === '/admin' && item.path.endsWith(`?tab=${queryTab}`)
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.name === 'Moderation Logs' && isAdmin ? '/admin?tab=moderation' : item.path}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 transition-all duration-300 relative",
                    isActive ? "text-indigo-400 scale-110" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium opacity-0 hidden">{item.name}</span>
                  {(item.name === 'Connections' || item.name === 'Chats') && hasUnread && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                  )}
                </Link>
              );
            })}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative min-h-screen">
        <Outlet />
      </main>

      {/* Admin lock overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Logo size={48} />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">Admin Session Locked</h2>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                For security, please enter the admin password to unlock your session.
              </p>
            </div>
            
            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
                {lockError && (
                  <p className="text-xs text-rose-500 font-bold mt-2 text-left">{lockError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {verifying ? 'Unlocking...' : 'Unlock Session'}
              </button>
            </form>
            
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 transition cursor-pointer"
            >
              Log out of account
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
