import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import Logo from '../components/Logo';

export default function AdminPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Basic session validation — verify token exists
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Verify if the user is actually the admin
    api.get('/users/me')
      .then(res => {
        const email = (res.data.email || '').toLowerCase().trim();
        if (email !== 'ishaen.vihaan@gmail.com') {
          navigate('/discovery');
        }
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/verify-admin-password', {
        password: password
      });
      
      // Verification success
      localStorage.setItem('admin_verified', 'true');
      navigate('/notifications');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Incorrect admin password.');
      setPassword('');
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
            Admin Verification Tab
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

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-2 p-4 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 rounded-2xl">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 text-center">
              🔑 Enter Admin Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-center text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/55 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Verifying..." : "Verify & Log in"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
