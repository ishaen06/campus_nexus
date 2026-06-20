import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, BookOpen, Lock, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '../api';
import Logo from '../components/Logo';

export default function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    cycle: '',
    password: ''
  });
  const [isMentor, setIsMentor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const emailLower = form.email.toLowerCase();
    if (isMentor) {
      if (!emailLower.endsWith('@gmail.com')) {
        setError('Only Gmail addresses (@gmail.com) are allowed for mentors');
        return;
      }
    } else {
      if (!emailLower.endsWith('@rvce.edu.in') && !emailLower.endsWith('@gmail.com')) {
        setError('Only college email addresses (@rvce.edu.in) or Gmail (@gmail.com) are allowed');
        return;
      }
      if (!form.cycle) {
        setError('Please select your academic cycle (P-Cycle or C-Cycle)');
        return;
      }
    }
    
    setLoading(true);
    try {
      await api.post('/auth/register', {
        ...form,
        is_mentor: isMentor,
        cycle: isMentor ? 'P' : form.cycle
      });
      setShowOTP(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      setError('Email is missing. Please register again.');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: form.email, otp });
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
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!form.email) {
      setError('Email is missing. Please register again.');
      return;
    }
    setError('');
    setResendStatus('');
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email: form.email });
      setResendStatus('A new OTP has been sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
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
        {!showOTP ? (
          <>
            <div className="text-center flex flex-col items-center">
              <Logo size={90} showText={true} />
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-3">
                Create Account
              </h2>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                Join the Campus Nexus Community
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleRegister}>
              {error && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-red-600 text-xs font-bold text-center bg-red-50/80 backdrop-blur-sm border border-red-100 p-3.5 rounded-2xl shadow-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Role Selector */}
              <div className="flex gap-2 p-1.5 bg-slate-900/10 dark:bg-slate-950/40 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setIsMentor(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isMentor 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setIsMentor(true)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isMentor 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Mentor
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input
                    type="text" required placeholder={isMentor ? "Full Name (e.g. Dr. Ramesh Kumar)" : "Full Name"}
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                    value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input
                    type="email" required 
                    placeholder={isMentor ? "Email (@gmail.com)" : "Email (@rvce.edu.in or @gmail.com)"}
                    pattern={isMentor ? ".*@gmail\\.com$" : ".*@(rvce\\.edu\\.in|gmail\\.com)$"}
                    title={isMentor ? "Only Gmail (@gmail.com) addresses are allowed for mentors" : "Only emails ending with @rvce.edu.in or @gmail.com are allowed"}
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>

                {!isMentor && (
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 pointer-events-none z-10" />
                    <select
                      required
                      className="w-full pl-12 pr-4 py-3 glass-input rounded-2xl outline-none font-semibold shadow-sm cursor-pointer appearance-none"
                      value={form.cycle} onChange={e => setForm({...form, cycle: e.target.value})}
                    >
                      <option value="" disabled hidden>Academic Cycle</option>
                      <option value="P">Physics Cycle (P-Cycle)</option>
                      <option value="C">Chemistry Cycle (C-Cycle)</option>
                    </select>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input
                    type="password" required placeholder="Password"
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-2xl outline-none font-medium shadow-sm"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-4 px-4 glass-button text-sm font-black rounded-2xl text-indigo-700 hover:text-indigo-800 disabled:opacity-70 cursor-pointer shadow-md"
                >
                  {loading ? 'Registering...' : 'Register'}
                  {!loading && <ArrowRight className="absolute right-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </motion.button>
              </div>

              <div className="text-center text-sm font-semibold">
                <span className="text-gray-500">Already have an account? </span>
                <Link to="/login" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Back Button */}
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setShowOTP(false);
                setError('');
                setResendStatus('');
                setOtp('');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Register
            </motion.button>

            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20 mb-4">
                <ShieldCheck className="text-white w-7 h-7" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Verify OTP
              </h2>
              <p className="mt-2 text-sm text-gray-500 font-semibold leading-relaxed">
                We've sent a 6-digit passcode to <br />
                <span className="text-indigo-600 font-bold break-all">{form.email}</span>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
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
                  disabled={otpLoading || otp.length < 6}
                  className="group relative w-full flex justify-center py-4 px-4 glass-button text-sm font-black rounded-2xl text-indigo-700 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Continue'}
                  {!otpLoading && <ArrowRight className="absolute right-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
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
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer bg-transparent border-none outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resendLoading && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {resendLoading ? 'Sending...' : "Didn't receive the code? Resend OTP"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
