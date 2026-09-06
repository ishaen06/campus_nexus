import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import Logo from '../components/Logo';
import { HeartHandshake } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Connecting to Google...');
  const navigate = useNavigate();
  const [theme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);

  // Auto-redirect if already logged in with valid token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/users/me')
        .then(res => {
          if (res.data) {
            const isUserAdmin = res.data.is_admin || (res.data.email || '').toLowerCase().trim() === 'ishaen.vihaan@gmail.com';
            if (isUserAdmin) {
              navigate('/admin/analytics', { replace: true });
            } else if (!res.data.usn && !res.data.is_mentor) {
              navigate('/profile-setup', { replace: true });
            } else {
              const redirectUrl = sessionStorage.getItem('post_login_redirect');
              if (redirectUrl) {
                sessionStorage.removeItem('post_login_redirect');
                navigate(redirectUrl, { replace: true });
              } else {
                navigate('/discovery', { replace: true });
              }
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, [navigate]);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isWebview = /FBAN|FBAV|Instagram|WhatsApp|Line|MicroMessenger|Snapchat/i.test(ua);
    setIsInAppBrowser(isWebview);
  }, []);


  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is running as PWA (standalone display mode)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkStandalone);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        mediaQuery.removeEventListener('change', checkStandalone);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA installation outcome: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert("To install RVCE Campus Nexus on your device:\n\n1. In Chrome/Edge: Click the install icon in the address bar (next to bookmark star) or choose 'Install RVCE Campus Nexus' from the browser menu (three dots).\n2. In Safari (iOS): Tap the 'Share' button and select 'Add to Home Screen'.\n3. In Firefox: Click the menu button and select 'Install'.");
    }
  };


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
        credential: response.credential
      });
      localStorage.setItem('token', res.data.access_token);
      
      const meRes = await api.get('/users/me');
      const u = meRes.data;

      // Only clear session dismissal if user has NOT submitted a rating yet
      const alreadyRated = 
        localStorage.getItem('app_rating_submitted') === 'true' ||
        (u?.id && localStorage.getItem(`app_rating_submitted_${u.id}`) === 'true') ||
        (u?.email && localStorage.getItem(`app_rating_submitted_${u.email}`) === 'true') ||
        Boolean(u?.has_rated);

      if (alreadyRated) {
        localStorage.setItem('app_rating_submitted', 'true');
        if (u?.id) localStorage.setItem(`app_rating_submitted_${u.id}`, 'true');
        if (u?.email) localStorage.setItem(`app_rating_submitted_${u.email}`, 'true');
      } else {
        sessionStorage.removeItem('rating_modal_dismissed_session');
      }

      const isUserAdmin = meRes.data.is_admin || (meRes.data.email || '').toLowerCase().trim() === 'ishaen.vihaan@gmail.com';

      
      if (isUserAdmin) {
        localStorage.removeItem('adminLastVerified');
        navigate('/admin/analytics');
      } else if (meRes.data.is_mentor === null || meRes.data.is_mentor === undefined) {
        navigate('/profile-setup');
      } else if (meRes.data.is_mentor) {
        if (!meRes.data.department || !meRes.data.post) {
          navigate('/profile-setup');
        } else {
          navigate('/mentor-dashboard');
        }
      } else {
        if (!meRes.data.usn) {
          navigate('/profile-setup');
        } else {
          const redirectUrl = sessionStorage.getItem('post_login_redirect');
          if (redirectUrl) {
            sessionStorage.removeItem('post_login_redirect');
            navigate(redirectUrl);
          } else {
            navigate('/discovery');
          }
        }

      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google Authentication failed');
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
          {/* RVCE Logo — top of card, large and prominent */}
          <img
            src="/rvce_logo_header.png"
            alt="RV College of Engineering"
            className="w-56 object-contain mb-4"
            style={{ filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          />
          <Logo size={136} showText={true} />
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-3">
            Sign in to your peer network
          </p>
        </div>

        {isInAppBrowser && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-amber-600 dark:text-amber-400 text-xs font-semibold text-center bg-amber-50/80 dark:bg-amber-950/40 backdrop-blur-sm border border-amber-200/60 dark:border-amber-800/50 p-3 rounded-2xl shadow-sm space-y-1"
          >
            <p className="font-bold text-[11px] uppercase tracking-wide">Opened in WhatsApp / In-App Browser</p>
            <p className="text-[11px] font-normal leading-relaxed opacity-95">
              Google Sign-In may be restricted here. Tap the three dots (⋮) in the top right corner and tap <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong>.
            </p>
          </motion.div>
        )}

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
            <div className="flex justify-center w-full min-h-[44px]">
              <div id="google-signin-btn" className="w-full"></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-3">
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide">
                Made By <span className="font-bold text-slate-500 dark:text-slate-400">Ishaen Bethur</span>
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/35 dark:border-slate-800/30 bg-slate-100/10 dark:bg-slate-900/10 backdrop-blur-sm shadow-sm select-none">
                <HeartHandshake size={12} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Built for RVCE students
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Floating PWA Download Button in the top-right corner */}
      {!isStandalone && (
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-white/95 dark:hover:bg-slate-900/95 text-slate-800 dark:text-slate-100 font-extrabold py-2.5 px-4 rounded-full transition cursor-pointer text-[10px] uppercase tracking-wider border border-slate-200/50 dark:border-slate-800/60 shadow-lg hover:scale-[1.03] active:scale-[0.97] duration-150"
          >
            <img src="/app_logo.png" className="w-4.5 h-4.5 object-contain rounded-md" alt="" />
            Download App
          </button>
        </div>
      )}
    </div>
  );
}
