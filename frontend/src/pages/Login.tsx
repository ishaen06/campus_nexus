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
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-3"></div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider animate-pulse">Signing in with Google...</p>
          </div>
        ) : (
          <div className="flex justify-center w-full min-h-[44px] mt-8">
            <div id="google-signin-btn" className="w-full"></div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
