import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import api from '../api';
import Logo from '../components/Logo';

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      if (meRes.data.is_mentor === null || meRes.data.is_mentor === undefined) {
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
      setError(err.response?.data?.detail || 'Google Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects username
      formData.append('password', password);
      
      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('token', res.data.access_token);
      
      const meRes = await api.get('/users/me');
      if (meRes.data.is_mentor) {
        navigate('/mentor-dashboard');
      } else {
        if (meRes.data.bio) {
          navigate('/discovery');
        } else {
          navigate('/profile-setup');
        }
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        navigate('/verify-otp', { state: { email } });
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password');
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

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-red-600 text-xs font-bold text-center bg-red-50/80 backdrop-blur-sm border border-red-100 p-3.5 rounded-2xl shadow-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3.5 glass-input rounded-2xl outline-none font-medium shadow-sm"
                placeholder="College Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3.5 glass-input rounded-2xl outline-none font-medium shadow-sm"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 glass-button text-sm font-black rounded-2xl text-indigo-700 hover:text-indigo-800 disabled:opacity-70 cursor-pointer shadow-md"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="absolute right-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </motion.button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200/20"></div>
            <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-slate-200/20"></div>
          </div>

          <div className="flex justify-center w-full min-h-[44px]">
            <div id="google-signin-btn" className="w-full"></div>
          </div>
          
          <div className="text-center text-sm font-semibold">
            <span className="text-gray-500">Don't have an account? </span>
            <Link to="/register" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-4">
              Register here
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
