import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Users, FolderGit, ShieldAlert, LogOut, User as UserIcon, Sun, Moon, MessageSquare, LayoutDashboard, ChevronDown, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import api from '../api';
import Logo from './Logo';
import Avatar from './Avatar';

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
        setIsAdmin(res.data.is_admin || res.data.email === 'ishaen.vihaan@gmail.com');
        setIsMentor(res.data.is_mentor);
        
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
    navigate('/login');
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
    const hasAdminLink = navItems.some(item => item.name === 'Admin');
    if (!hasAdminLink) {
      navItems.push({ name: 'Admin', path: '/admin', icon: ShieldAlert, danger: true } as any);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-slate-950/60 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.4)] z-50">
         <div className="p-6">
          <Link to={isMentor ? "/mentor-dashboard" : "/discovery"} className="flex items-center gap-3">
            <Logo size={36} showText={false} />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Campus Nexus
            </span>
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-2 mt-4">
          {navItems.filter(item => item.name !== 'Profile' && item.name !== 'My Profile').map((item) => {
            const isActive = location.pathname.startsWith(item.path);
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
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
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
    </div>
  );
}
