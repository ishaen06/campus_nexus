import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, realtime } from '../api';
import { User, UserRole } from '../types';
import { useA11y } from '../context/A11yContext';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { announce } = useA11y();

  const [tab, setTab] = useState<'login' | 'register' | 'sent'>('login');
  const [loginId, setLoginId] = useState('alex.chen@gecko.org');
  const [loginPwd, setLoginPwd] = useState('password123');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('qa_engineer');
  const [verLink, setVerLink] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login(loginId.trim(), loginPwd);
      realtime.connect(res.user);
      onLoginSuccess(res.user);
      announce(`Signed in as ${res.user.full_name}`);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: 'qa' | 'dev' | 'admin') => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.demoLogin(role);
      realtime.connect(res.user);
      onLoginSuccess(res.user);
      navigate('/');
    } catch {
      setError('Failed to start demo session');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.registerInit({
        full_name: regName.trim(),
        email: regEmail.trim(),
        username: regUsername.trim() || regEmail.split('@')[0],
        role: regRole,
        team: 'Engineering',
      });
      setSentEmail(res.email);
      setVerLink(res.verification_link || null);
      setSuccess(`Verification email sent to ${res.email}`);
      announce(success!);
      setTab('sent');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await api.auth.resendLink(sentEmail);
      setVerLink(res.verification_link || null);
      setSuccess('New link sent');
      announce('New link sent');
    } catch {
      setError('Failed to resend');
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Left Panel — Brand */}
      <div
        className="hidden lg:flex w-2/5 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
        }}
        aria-hidden="true"
      >
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:'-80px', left:'-80px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-100px', right:'-60px', width:'350px', height:'350px', borderRadius:'50%', background:'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              OB
            </div>
            <span className="text-white font-semibold text-lg">OmniBug</span>
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Enterprise defect<br />management, simplified.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            AI-powered triage, real-time collaboration, and deep developer tooling — all in one platform.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { label: 'Defects tracked', value: '12,400+' },
            { label: 'Teams active', value: '380+' },
            { label: 'Avg. resolution time', value: '4.2h' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-zinc-500 text-xs">{stat.label}</span>
              <span className="text-white font-semibold text-sm">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Form */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile Brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              OB
            </div>
            <span className="font-semibold text-[var(--text-primary)]">OmniBug</span>
          </div>

          {/* Tabs */}
          {tab !== 'sent' && (
            <div className="flex gap-1 bg-[var(--bg-raised)] rounded-lg p-1 mb-6">
              {(['login', 'register'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    tab === t
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg border text-sm" style={{ background:'var(--danger-bg)', borderColor:'var(--danger-border)', color:'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Welcome back</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Sign in to your workspace</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 mt-6">
                <div className="field">
                  <label htmlFor="login-id" className="field-label">Email or username</label>
                  <input
                    id="login-id" type="text" required
                    value={loginId} onChange={(e) => setLoginId(e.target.value)}
                    placeholder="you@company.com"
                    className="input"
                  />
                </div>
                <div className="field">
                  <label htmlFor="login-pwd" className="field-label">Password</label>
                  <input
                    id="login-pwd" type="password" required
                    value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="relative my-4">
                <hr className="divider" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="px-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-canvas)]">or continue with demo</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleDemo('qa')} className="btn btn-secondary btn-sm">
                  QA Tester
                </button>
                <button onClick={() => handleDemo('dev')} className="btn btn-secondary btn-sm">
                  Lead Developer
                </button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Create your account</h2>
                <p className="text-sm text-[var(--text-tertiary)]">We'll email you a link to set your password</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3 mt-6">
                <div className="field">
                  <label htmlFor="reg-name" className="field-label field-required">Full name</label>
                  <input id="reg-name" type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Sarah Connor" className="input" />
                </div>
                <div className="field">
                  <label htmlFor="reg-email" className="field-label field-required">Work email</label>
                  <input id="reg-email" type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="sarah@company.com" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="field">
                    <label htmlFor="reg-uname" className="field-label">Username</label>
                    <input id="reg-uname" type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="sconnor" className="input" />
                  </div>
                  <div className="field">
                    <label htmlFor="reg-role" className="field-label">Role</label>
                    <select id="reg-role" value={regRole} onChange={(e) => setRegRole(e.target.value as UserRole)} className="input">
                      <option value="qa_engineer">QA Engineer</option>
                      <option value="developer">Developer</option>
                      <option value="reporter">Reporter</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={loading || !regEmail || !regName} className="btn btn-primary w-full mt-2">
                  {loading ? 'Sending link…' : 'Send verification email'}
                </button>
              </form>
            </div>
          )}

          {/* Email Sent */}
          {tab === 'sent' && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background:'var(--accent-light)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Check your inbox</h2>
                <p className="text-sm text-[var(--text-tertiary)]">
                  We sent a password setup link to <br/>
                  <strong className="text-[var(--text-primary)] font-mono text-xs">{sentEmail}</strong>
                </p>
              </div>

              {verLink && (
                <div className="card text-left p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] border-b border-[var(--border)] pb-2">
                    <span className="font-medium">Email preview</span>
                    <span>Just now</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Set up your OmniBug password and activate your account:
                  </p>
                  <a
                    href={verLink}
                    className="btn btn-primary w-full text-center"
                    style={{ justifyContent: 'center' }}
                  >
                    Create password & activate account
                  </a>
                  <p className="text-[10px] text-[var(--text-tertiary)] break-all font-mono">{verLink}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <button onClick={() => setTab('register')} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  ← Back
                </button>
                <button onClick={handleResend} className="text-[var(--accent)] hover:underline font-medium">
                  Resend email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
