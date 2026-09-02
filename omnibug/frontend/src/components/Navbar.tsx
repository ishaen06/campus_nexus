import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, realtime } from '../api';
import { User, Product } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useA11y } from '../context/A11yContext';

interface NavbarProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  products: Product[];
  onOpenCreateModal: () => void;
  onOpenCommandPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  setCurrentUser,
  selectedProductId,
  setSelectedProductId,
  products,
  onOpenCreateModal,
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { announce } = useA11y();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);

  const isQaMode =
    currentUser?.role === 'reporter' ||
    currentUser?.role === 'qa_engineer' ||
    currentUser?.role === 'viewer';

  const handleSwitchToRole = async (targetRole: 'qa' | 'dev') => {
    try {
      const res = await api.auth.demoLogin(targetRole);
      setCurrentUser(res.user);
      realtime.connect(res.user);
      announce(`Switched to ${targetRole === 'qa' ? 'QA Tester' : 'Lead Developer'} workspace`);
      navigate('/');
    } catch (err) {
      console.error('Role switch error:', err);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setUserMenuOpen(false);
    announce('Logged out of OmniBug');
    navigate('/login');
  };

  const handleReseed = async () => {
    if (window.confirm('Reset database to default test records?')) {
      setIsReseeding(true);
      try {
        await api.auth.reseed();
        announce('Database reseeded');
        window.location.reload();
      } catch (e) {
        console.error(e);
      } finally {
        setIsReseeding(false);
      }
    }
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('#user-menu-root')) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenuOpen]);

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'OB';

  return (
    <header
      role="banner"
      style={{ height: 'var(--nav-height)' }}
      className="bg-[var(--bg-surface)] border-b border-[var(--border)] sticky top-0 z-30 flex-shrink-0"
    >
      <div className="h-full px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Section: Brand & Product Scope */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg py-1 px-1.5 -ml-1.5"
            aria-label="OmniBug Dashboard"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
            >
              OB
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[var(--text-primary)] text-base tracking-tight">OmniBug</span>
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">
                {isQaMode ? 'QA Workspace' : 'Engineering'}
              </span>
            </div>
          </Link>

          <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

          {/* Product Scope Selector Pill */}
          <div className="hidden sm:flex items-center bg-[var(--bg-raised)] border border-[var(--border)] rounded-lg px-2.5 py-1">
            <span className="text-xs text-[var(--text-tertiary)] mr-2 font-medium">Scope:</span>
            <label htmlFor="nav-product-select" className="sr-only">Select product scope</label>
            <select
              id="nav-product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-[var(--text-primary)] cursor-pointer outline-none pr-4"
              style={{
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-width='1.5' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
              }}
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key_prefix} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Section: Global Search / Command Palette Bar */}
        <div className="flex-1 max-w-xl px-4 hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            type="button"
            className="w-full h-10 px-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-tertiary)] flex items-center justify-between hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] transition-all cursor-pointer shadow-xs group"
            aria-label="Search defects or jump to page (Ctrl+K)"
          >
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span className="text-xs font-medium">Search defects, jump to page, run actions…</span>
            </div>
            <kbd className="text-[11px] font-mono font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-md shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Workspace Controls & User Menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Role Mode Switcher (QA / Dev) */}
          <div
            className="hidden sm:flex items-center bg-[var(--bg-raised)] rounded-xl p-1 border border-[var(--border)]"
            role="group"
            aria-label="Switch workspace mode"
          >
            <button
              type="button"
              onClick={() => handleSwitchToRole('qa')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                isQaMode
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs font-bold'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              QA
            </button>
            <button
              type="button"
              onClick={() => handleSwitchToRole('dev')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                !isQaMode
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs font-bold'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Dev
            </button>
          </div>

          {/* New Defect Primary Button */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="btn btn-primary h-10 px-4 rounded-xl gap-2 font-semibold shadow-xs"
            aria-label="Create new defect (Alt+C)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New Defect</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* User Profile Menu */}
          <div id="user-menu-root" className="relative">
            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="h-10 pl-2 pr-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border)] flex items-center gap-2.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                  aria-label={`User menu for ${currentUser.full_name}`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                  >
                    {initials}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold text-[var(--text-primary)]">
                    {currentUser.full_name.split(' ')[0]}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)] hidden md:block">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 animate-in"
                    role="menu"
                  >
                    <div className="px-4 py-3.5 border-b border-[var(--border)]">
                      <div className="text-sm font-bold text-[var(--text-primary)]">{currentUser.full_name}</div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{currentUser.email}</div>
                      <div className="mt-2.5">
                        <span className="badge badge-confirmed">
                          {currentUser.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleReseed}
                        disabled={isReseeding}
                        className="w-full text-left px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] transition-colors flex items-center justify-between"
                        role="menuitem"
                      >
                        <span>Reset demo database</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">↺</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
