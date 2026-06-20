import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is missing. Please register again.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
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
      setError(err.response?.data?.detail || 'Verification failed. Incorrect OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email is missing. Please register again.');
      return;
    }
    setError('');
    setResendStatus('');
    try {
      await api.post('/auth/resend-otp', { email });
      setResendStatus('A new OTP has been sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-[80px] -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-md w-full space-y-8 glass-panel p-10 relative z-10"
      >
        {/* Back Button */}
        <motion.button
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => navigate('/register')}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Register
        </motion.button>

        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20 mb-4">
            <ShieldCheck className="text-white w-7 h-7" strokeWidth={2} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Verify OTP
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-semibold leading-relaxed">
            We've sent a 6-digit passcode to <br />
            <span className="text-indigo-600 font-bold break-all">{email || 'your email'}</span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-red-600 text-xs font-bold text-center bg-red-50/80 backdrop-blur-sm border border-red-100 p-3.5 rounded-2xl shadow-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <input
              type="text"
              required
              className="w-full px-4 py-4 glass-input rounded-2xl outline-none font-bold text-center tracking-[0.75em] text-2xl"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
            />
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || otp.length < 6}
              className="group relative w-full flex justify-center py-4 px-4 glass-button text-sm font-black rounded-2xl text-indigo-700 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
              {!loading && <ArrowRight className="absolute right-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </motion.button>
          </div>

          {resendStatus && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-xs font-bold text-center mt-2"
            >
              {resendStatus}
            </motion.p>
          )}

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleResend}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              Didn't receive the code? Resend OTP
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
