import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, realtime } from '../api';
import { User } from '../types';
import { useA11y } from '../context/A11yContext';

interface SetPasswordProps {
  onLoginSuccess: (user: User) => void;
}

export const SetPassword: React.FC<SetPasswordProps> = ({ onLoginSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { announce } = useA11y();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [fullName, setFullName] = useState('');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid verification link — token or email missing.');
      setValidating(false);
      return;
    }
    api.auth.validateToken(email, token)
      .then((res) => {
        setTokenValid(true);
        if (res.full_name) setFullName(res.full_name);
        announce('Link verified. Please create your password.');
      })
      .catch((err: any) => {
        setError(err.response?.data?.detail || 'This link is invalid or has expired.');
      })
      .finally(() => setValidating(false));
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPwd) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const res = await api.auth.setPasswordWithToken({ token, email, password });
      announce(`Account activated. Welcome, ${res.user.full_name}!`);
      realtime.connect(res.user);
      onLoginSuccess(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set password. Request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 auth-gradient" style={{ fontFamily:"'Inter', sans-serif" }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            OB
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-lg">OmniBug</span>
        </div>

        <div className="card overflow-hidden" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Create your password</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1 font-mono truncate">{email}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Loading */}
            {validating && (
              <div className="flex items-center gap-3 py-4">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[var(--text-secondary)]">Verifying link…</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-lg border text-sm" style={{ background:'var(--danger-bg)', borderColor:'var(--danger-border)', color:'var(--danger)' }}>
                {error}
              </div>
            )}

            {/* Invalid */}
            {!validating && !tokenValid && !error && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">This verification link has expired or already been used.</p>
                <button onClick={() => navigate('/login')} className="btn btn-primary">
                  Back to sign in
                </button>
              </div>
            )}

            {/* Form */}
            {!validating && tokenValid && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {fullName && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Hi <strong className="text-[var(--text-primary)]">{fullName}</strong> — choose a secure password to activate your account.
                  </p>
                )}

                <div className="field">
                  <label htmlFor="set-pwd" className="field-label field-required">New password</label>
                  <div className="relative">
                    <input
                      id="set-pwd" type={show ? 'text' : 'password'} required minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="input pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {show ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex gap-1 flex-1">
                        {[1,2,3].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: i <= strength ? strengthColor[strength] : 'var(--bg-raised)' }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium" style={{ color: strengthColor[strength] }}>
                        {strengthLabel[strength]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="set-confirm" className="field-label field-required">Confirm password</label>
                  <input
                    id="set-confirm" type={show ? 'text' : 'password'} required minLength={6}
                    value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Re-enter password"
                    className={`input ${confirmPwd && password !== confirmPwd ? 'input-error' : ''}`}
                  />
                  {confirmPwd && password !== confirmPwd && (
                    <p className="field-error mt-1">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || password.length < 6 || password !== confirmPwd}
                  className="btn btn-primary w-full"
                >
                  {submitting ? 'Activating account…' : 'Set password & sign in'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
