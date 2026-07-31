import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Users, FolderGit, LogOut, User as UserIcon, Sun, Moon, MessageSquare, LayoutDashboard, ChevronDown, Bell, Download, AlertOctagon, BarChart3, Search, ChevronLeft, ChevronRight, Lock, Eye, EyeOff, ShieldAlert, ShieldCheck, GraduationCap } from 'lucide-react';
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

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
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    // Respect OS preference if user hasn't explicitly picked a theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [hasUnread, setHasUnread] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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
          // Always check lock status on every page load / navigation
          // This catches the case where the admin just logged in fresh (Layout may
          // already have isAdmin=true from a previous session, so the [isAdmin]
          // useEffect would never re-fire — this guarantees the lock always shows)
          const lastVerified = localStorage.getItem('adminLastVerified');
          if (!lastVerified) {
            setIsLocked(true);
          } else {
            const elapsed = Date.now() - Number(lastVerified);
            if (elapsed > LOCK_DURATION_MS) {
              setIsLocked(true);
            }
          }

          if (location.pathname === '/mentor-dashboard' || location.pathname === '/discovery' || location.pathname === '/' || location.pathname === '/profile-setup') {
            navigate('/admin/analytics');
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
    const semMap: Record<number, string> = {
      1: '1st Sem',
      2: '2nd Sem',
      3: '3rd Sem',
      4: '4th Sem',
      5: '5th Sem',
      6: '6th Sem',
      7: '7th Sem',
      8: '8th Sem'
    };
    const sem = semMap[user.year_of_study || 1] || `${user.year_of_study || 1}th Sem`;
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

  useEffect(() => {
    const checkUnreadNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Don't bother polling while the user is already on the notifications page
      if (window.location.pathname === '/notifications') {
        setHasUnreadNotifications(false);
        return;
      }
      try {
        const res = await api.get('/notifications/has-unread');
        setHasUnreadNotifications(res.data.has_unread === true);
      } catch (err) {
        console.error("Error checking notifications for unread status:", err);
      }
    };

    checkUnreadNotifications();
    const interval = setInterval(checkUnreadNotifications, 7000);

    const handleReadEvent = () => {
      setHasUnreadNotifications(false);
    };
    window.addEventListener('nexus_notifications_read', handleReadEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nexus_notifications_read', handleReadEvent);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminLastVerified');
    navigate('/login');
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Lock immediately if no verified session exists
    const lastVerified = localStorage.getItem('adminLastVerified');
    if (!lastVerified) {
      setIsLocked(true);
    } else {
      const elapsed = Date.now() - Number(lastVerified);
      if (elapsed > LOCK_DURATION_MS) {
        setIsLocked(true);
      }
    }

    // Check every 5 seconds for 10-minute expiry
    const interval = setInterval(() => {
      const stored = localStorage.getItem('adminLastVerified');
      if (!stored) {
        setIsLocked(true);
        return;
      }
      const elapsed = Date.now() - Number(stored);
      if (elapsed > LOCK_DURATION_MS) {
        setIsLocked(true);
      }
    }, 5000);

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
      setFailedAttempts(0);
      setShowPassword(false);
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      const remaining = MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= MAX_ATTEMPTS) {
        // Force full logout after 5 failed attempts
        setLockError('Too many failed attempts. Signing you out...');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('adminLastVerified');
          navigate('/login');
        }, 1500);
      } else {
        setLockError(`Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }
      setAdminPassword('');
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
    const profileItem = navItems.find(item => item.name === 'Profile');

    navItems = navItems.filter(item => 
      item.name !== 'Dashboard' && 
      item.name !== 'My Teams' && 
      item.name !== 'My Team' && 
      item.name !== 'Chats' && 
      item.name !== 'Discovery' && 
      item.name !== 'Project Dashboard' &&
      item.name !== 'Profile'
    );
    
    const hasAdminLink = navItems.some(item => item.name === 'Moderation Logs');
    if (!hasAdminLink) {
      navItems.push(
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 } as any,
        { name: 'Academic Settings', path: '/admin/academic', icon: GraduationCap } as any,
        { name: 'Global Search', path: '/admin/search', icon: Search } as any,
        { name: 'Mentors', path: '/admin/mentors', icon: UserIcon } as any,
        { name: 'Teams', path: '/admin/teams', icon: Users } as any,
        { name: 'Report Center', path: '/admin/reports', icon: Download } as any,
        { name: 'Moderation Logs', path: '/admin/moderation', icon: AlertOctagon } as any
      );
    }

    if (profileItem) {
      navItems.push(profileItem);
    }
  }
  const isProfileSetup = location.pathname === '/profile-setup';

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row", !isProfileSetup && "pb-20 md:pb-0")}>
      {/* Desktop Sidebar */}
      {!isProfileSetup && (
        <nav className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-slate-950/60 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.4)] z-50",
          isCollapsed ? "w-20" : "w-64"
        )}>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <Link to={isMentor ? "/mentor-dashboard" : "/discovery"} className="flex items-center gap-3">
                  <Logo size={44} showText={false} />
                  <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    <span className="text-[#1e3a8a] dark:text-[#3b82f6]">Campus</span> Nexus
                  </span>
                </Link>
              )}
              {isCollapsed && (
                <Link to={isMentor ? "/mentor-dashboard" : "/discovery"} className="mx-auto">
                  <Logo size={36} showText={false} />
                </Link>
              )}
              {!isCollapsed && (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg bg-transparent border border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 transition cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            {isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="mx-auto p-1.5 rounded-lg bg-transparent border border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 transition cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          <div className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
            {navItems.filter(item => item.name !== 'Profile' && item.name !== 'My Profile').map((item) => {
              const isActive = item.path.startsWith('/admin')
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              const danger = (item as any).danger;
              
              const isAdminPath = item.path.startsWith('/admin');
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center transition-all duration-300 font-medium relative",
                    isCollapsed ? "justify-center p-3 rounded-xl mx-auto w-12" : "justify-between px-4 py-3",
                    isAdminPath
                      ? (isActive
                          ? "border-l-4 border-[#1e3a8a] dark:border-blue-500 text-[#1e3a8a] dark:text-blue-400 bg-[#1e3a8a]/5 dark:bg-blue-950/20 rounded-none pl-3 font-semibold"
                          : "border-l-4 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 hover:text-slate-900 dark:hover:text-slate-100 rounded-none pl-3"
                        )
                      : (isActive
                          ? (danger ? "bg-red-500/10 text-red-400 rounded-2xl" : "bg-slate-900/80 shadow-sm shadow-indigo-950/50 text-indigo-400 rounded-2xl")
                          : (danger ? "text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-2xl" : "text-slate-400 hover:bg-slate-900/30 hover:text-slate-100 rounded-2xl")
                        )
                  )}
                >
                  <div className={cn("flex items-center gap-3", isCollapsed && "justify-center gap-0")}>
                    <Icon size={20} className={cn("shrink-0", danger ? "text-red-400" : (isActive ? (isAdminPath ? "text-[#1e3a8a] dark:text-blue-400" : "text-indigo-400") : "text-slate-400"))} />
                    {!isCollapsed && <span className="text-sm font-semibold tracking-wide">{item.name}</span>}
                  </div>
                  {!isCollapsed && (item as any).badge !== undefined && (item as any).badge > 0 && (
                    <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-bold">
                      {(item as any).badge}
                    </span>
                  )}
                  {item.name === 'Notifications' && hasUnreadNotifications && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                  )}
                  {(item.name === 'Connections' || item.name === 'Chats') && hasUnread && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200/20 dark:border-white/10 space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <img
                  src="/rvce_logo_header.png"
                  alt="RV College of Engineering"
                  className="w-full object-contain"
                  style={{
                    filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none',
                    maxHeight: '80px'
                  }}
                />
              </div>
            )}
            
            {/* Profile Card */}
            <div 
              className="relative"
              onMouseEnter={handleMouseEnterProfile}
              onMouseLeave={handleMouseLeaveProfile}
            >
              {showProfileDropdown && (
                <div className={cn(
                  "absolute bg-slate-100/95 dark:bg-slate-950/90 border border-slate-200/80 dark:border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-50",
                  isCollapsed ? "left-full bottom-0 ml-2 w-40" : "bottom-full left-0 right-0 mb-2"
                )}>
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

              {currentUser && (
                isCollapsed ? (
                  <div className="flex items-center justify-center w-full py-1 cursor-pointer">
                    <Avatar config={currentUser?.profile_photo ? { photo: currentUser.profile_photo } : null} name={currentUser?.full_name || ''} size={38} />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between w-full p-2.5 bg-slate-100/50 dark:bg-slate-900/40 hover:bg-slate-200/50 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 rounded-xl transition-all duration-300 text-left group backdrop-blur-md cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar config={currentUser?.profile_photo ? { photo: currentUser.profile_photo } : null} name={currentUser?.full_name || ''} size={36} />
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
                )
              )}
            </div>

          {/* Theme Toggle Switch */}
          {isCollapsed ? (
            <div className="flex items-center justify-center pt-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-transparent border border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 transition cursor-pointer"
                title="Toggle Light/Dark Theme"
              >
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 pt-0.5 pb-0 select-none">
              <span className={cn(
                "text-[10px] font-black tracking-wider uppercase transition-colors duration-300",
                theme === 'dark' ? "text-slate-100" : "text-slate-400 font-semibold"
              )}>
                Dark
              </span>
              
              <button
                onClick={toggleTheme}
                className="w-8 h-4 rounded-full bg-[#d2d6dc] dark:bg-[#475569] relative transition-colors duration-300 focus:outline-none cursor-pointer p-0.5 border border-slate-300/40 dark:border-slate-500/40 shadow-inner flex items-center shrink-0"
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full bg-[#fafafa] dark:bg-[#1e293b] flex items-center justify-center transition-all duration-300 shadow-sm absolute",
                    theme === 'dark' ? "left-[2px]" : "left-[16px]"
                  )}
                >
                  {theme === 'dark' ? (
                    <Moon size={9} className="text-[#2d3139]" strokeWidth={2.5} />
                  ) : (
                    <Sun size={9} className="text-amber-500" strokeWidth={2.5} />
                  )}
                </div>
              </button>

              <span className={cn(
                "text-[10px] font-black tracking-wider uppercase transition-colors duration-300",
                theme === 'light' ? "text-slate-900 font-black" : "text-slate-500 font-semibold"
              )}>
                Light
              </span>
            </div>
          )}
          </div>
        </nav>
      )}

      {/* Mobile Bottom Bar */}
      {!isProfileSetup && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-955/70 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.5)] z-50 pb-safe pt-2">
          <div className="flex justify-around items-center pb-2 px-2 w-full">
            {navItems
              .map((item) => {
                const isActive = item.path.startsWith('/admin')
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                const isAdminPath = item.path.startsWith('/admin');
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 transition-all duration-300 relative",
                      isActive 
                        ? (isAdminPath ? "text-[#1e3a8a] dark:text-blue-400 scale-110" : "text-indigo-400 scale-110") 
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium opacity-0 hidden">{item.name}</span>
                    {(item.name === 'Connections' || item.name === 'Chats') && hasUnread && (
                      <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                    )}
                    {item.name === 'Notifications' && hasUnreadNotifications && (
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
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 relative min-h-screen w-full",
        !isProfileSetup && (isCollapsed ? "md:ml-20" : "md:ml-64"),
        isLocked && isAdmin ? "blur-sm pointer-events-none select-none" : ""
      )}>
        <Outlet />
      </main>

      {/* Admin lock overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ background: theme === 'dark'
            ? 'radial-gradient(ellipse at center, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.99) 100%)'
            : 'radial-gradient(ellipse at center, rgba(241,245,249,0.97) 0%, rgba(226,232,240,0.99) 100%)' }}>
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
              style={{ background: 'radial-gradient(circle, #3730a3 0%, transparent 70%)' }} />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
              style={{ background: 'radial-gradient(circle, #1e3a8a 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
              style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-sm w-full flex flex-col items-center gap-7"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)'
                : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
              border: theme === 'dark' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.15)',
              borderRadius: '28px',
              padding: '2.5rem 2rem',
              boxShadow: theme === 'dark'
                ? '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.08)'
                : '0 0 0 1px rgba(0,0,0,0.04) inset, 0 32px 80px rgba(0,0,0,0.12), 0 0 60px rgba(99,102,241,0.06)'
            }}
          >
            {/* RVCE Logo — top of card, large and prominent */}
            <img
              src="/rvce_logo_header.png"
              alt="RV College of Engineering"
              className="w-44 object-contain"
              style={{ filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
            />

            {/* Lock icon with pulsing ring */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-24 h-24 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                className="absolute w-16 h-16 rounded-full border"
                style={{ borderColor: 'rgba(99,102,241,0.4)' }}
              />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.1) 100%)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.2)'
                }}>
                <Lock size={22} className="text-indigo-400" strokeWidth={2.5} />
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Campus Nexus</span>
              </div>
              <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Session Locked</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[260px] mx-auto">
                Your admin session has been locked for security. Enter your security password to continue.
              </p>
            </div>

            {/* Attempt warning badge */}
            {failedAttempts > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{
                  background: failedAttempts >= MAX_ATTEMPTS - 1
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(234,179,8,0.1)',
                  border: `1px solid ${ failedAttempts >= MAX_ATTEMPTS - 1 ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.25)' }`,
                  color: failedAttempts >= MAX_ATTEMPTS - 1 ? '#f87171' : '#facc15'
                }}
              >
                <ShieldAlert size={13} strokeWidth={2.5} />
                {failedAttempts >= MAX_ATTEMPTS
                  ? 'Signing out...'
                  : `${MAX_ATTEMPTS - failedAttempts} of ${MAX_ATTEMPTS} attempts remaining`}
              </motion.div>
            )}

            {/* Password form */}
            <form onSubmit={handleUnlock} className="w-full space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter security password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={failedAttempts >= MAX_ATTEMPTS}
                  className={`w-full px-4 py-3.5 pr-12 text-sm font-semibold focus:outline-none transition-all ${theme === 'dark' ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                  style={{
                    background: theme === 'dark' ? 'rgba(2,6,23,0.7)' : 'rgba(248,250,252,1)',
                    border: lockError
                      ? '1px solid rgba(239,68,68,0.5)'
                      : theme === 'dark' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '14px',
                    boxShadow: theme === 'dark' ? 'inset 0 2px 8px rgba(0,0,0,0.3)' : 'inset 0 2px 8px rgba(0,0,0,0.05)'
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {lockError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-rose-400 text-left pl-1"
                >
                  {lockError}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={verifying || failedAttempts >= MAX_ATTEMPTS || !adminPassword}
                className="w-full font-extrabold py-3.5 px-4 text-xs uppercase tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: verifying
                    ? 'rgba(79,70,229,0.5)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  borderRadius: '14px',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35), 0 1px 0 rgba(255,255,255,0.1) inset'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {verifying ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} strokeWidth={2.5} />
                      Unlock Session
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }} />
              <span className="text-[10px] text-slate-600 font-medium">or</span>
              <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }} />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors duration-200 cursor-pointer -mt-2"
            >
              <LogOut size={13} strokeWidth={2.5} />
              Sign out of account
            </button>

            {/* Re-lock timer note */}
            <p className="text-[10px] text-slate-700 text-center -mt-3">
              Session auto-locks every 10 minutes for security.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
