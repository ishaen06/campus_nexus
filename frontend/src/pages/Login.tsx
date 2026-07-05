import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import Logo from '../components/Logo';

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Connecting to Google...');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const navigate = useNavigate();
  
  const isAdminModeRef = useRef(isAdminMode);
  const adminPasswordRef = useRef(adminPassword);
  
  useEffect(() => {
    isAdminModeRef.current = isAdminMode;
  }, [isAdminMode]);
  
  useEffect(() => {
    adminPasswordRef.current = adminPassword;
  }, [adminPassword]);

  useEffect(() => {
    if (!loading) return;
    const statuses = [
      'Connecting to Google...',
      'Verifying Credentials...',
      'Securing Session...',
      'Fetching Profile Info...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % statuses.length;
      setLoadingStatus(statuses[idx]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      document.body.classList.add('auth-loading');
    } else {
      document.body.classList.remove('auth-loading');
    }
    return () => {
      document.body.classList.remove('auth-loading');
    };
  }, [loading]);

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        const btnContainer = document.getElementById("google-signin-btn");
        const parentWidth = btnContainer ? btnContainer.clientWidth : 368;
        const clampedWidth = Math.max(200, Math.min(400, parentWidth));

        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "917861196656-ir7d9pgojdukvfi8i5lufu3fdia1ljdj.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", width: clampedWidth, shape: "rectangular" }
        );
      }
    };

    const interval = setInterval(() => {
      if (window.google) {
        initializeGoogle();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/google', {
        credential: response.credential,
        admin_password: isAdminModeRef.current ? adminPasswordRef.current : null
      });
      localStorage.setItem('token', res.data.access_token);
      
      const meRes = await api.get('/users/me');
      const isUserAdmin = meRes.data.is_admin || meRes.data.email === 'ishaen.vihaan@gmail.com';
      
      if (isUserAdmin) {
        navigate('/notifications');
      } else if (meRes.data.is_mentor === null || meRes.data.is_mentor === undefined) {
        navigate('/profile-setup');
      } else if (meRes.data.is_mentor) {
        navigate('/mentor-dashboard');
      } else {
        if (meRes.data.usn && meRes.data.bio) {
          navigate('/discovery');
        } else {
          navigate('/profile-setup');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Google Authentication failed';
      setError(errorMsg);
      if (errorMsg.toLowerCase().includes("password required") || errorMsg.toLowerCase().includes("admin password")) {
        setIsAdminMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-500/35 to-purple-500/35 rounded-full blur-[130px] -z-10 animate-pulse"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/25 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/25 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDelay: '3s' }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-md w-full space-y-8 glass-panel p-10 relative z-10"
      >
        <div className="text-center flex flex-col items-center">
          <Logo size={110} showText={true} />
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-3">
            Sign in to your peer network
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-red-600 text-xs font-bold text-center bg-red-50/80 backdrop-blur-sm border border-red-100 p-3.5 rounded-2xl shadow-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 mt-4">
            {/* Status texts */}
            <div className="text-center space-y-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase transition-all duration-300">
                {loadingStatus}
              </p>
              <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-infinite-scroll"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            {isAdminMode && (
              <div className="space-y-2 p-4 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  🔑 Admin Password Required
                </label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-center w-full min-h-[44px]">
              <div id="google-signin-btn" className="w-full"></div>
            </div>
            
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdminMode(prev => !prev)}
                className={`text-xs font-bold px-4 py-2 rounded-full border transition-all cursor-pointer ${
                  isAdminMode 
                    ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
              >
                {isAdminMode ? "🔒 Switch to Normal Login" : "🔓 Switch to Admin Login"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
