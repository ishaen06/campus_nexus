import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Bug } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal: () => void;
}

const ACTIONS = [
  { label: 'Create new defect', shortcut: 'Alt+C', action: 'create' },
  { label: 'Open Kanban board', path: '/kanban' },
  { label: 'AI Triage Lab', path: '/ai-triage' },
  { label: 'Advanced Search', path: '/search' },
  { label: 'Analytics & Reports', path: '/analytics' },
  { label: 'Workspace Settings', path: '/settings' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenCreateModal }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Bug[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchBugs('');
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [isOpen, onClose]);

  const searchBugs = async (q: string) => {
    try {
      const bugs = await api.bugs.list({ search: q || undefined, limit: 8 });
      setResults(bugs);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="OmniBug Command & Quick Navigation Palette"
    >
      <div
        className="w-full overflow-hidden shadow-2xl"
        style={{
          maxWidth: 600,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          animation: 'modal-in 0.15s ease',
        }}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[var(--border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              searchBugs(e.target.value);
            }}
            placeholder="Type a defect ID, title keyword, or quick action…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                searchBugs('');
              }}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs font-semibold"
            >
              Clear
            </button>
          )}
          <kbd className="text-[10px] font-mono bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results / Suggestions Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {/* Quick Actions Group */}
          <div className="px-2 py-2">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 mb-1.5">
              Quick Navigation
            </div>
            <div className="space-y-1">
              {ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    onClose();
                    if (action.path) navigate(action.path);
                    else onOpenCreateModal();
                  }}
                  className="nav-item w-full text-left py-2.5 px-3 rounded-lg flex items-center justify-between"
                >
                  <span className="font-medium text-sm text-[var(--text-primary)]">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="text-[10px] font-mono bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-md">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Defect Match Results */}
          {results.length > 0 && (
            <div className="border-t border-[var(--border)] px-2 pt-3 pb-2 mt-1">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 mb-1.5">
                Matching Defects
              </div>
              <div className="space-y-1">
                {results.map((bug) => (
                  <button
                    key={bug.id}
                    onClick={() => {
                      onClose();
                      navigate(`/bugs/${bug.id}`);
                    }}
                    className="nav-item w-full text-left py-2.5 px-3 rounded-lg flex items-center gap-3"
                  >
                    <span className="font-mono font-bold text-xs text-[var(--accent)] flex-shrink-0">
                      {bug.key}
                    </span>
                    <span className="truncate text-sm font-medium text-[var(--text-primary)] flex-1">
                      {bug.title}
                    </span>
                    <span className={`badge badge-${bug.severity} flex-shrink-0 text-[10px]`}>
                      {bug.severity}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-tertiary)]"
          style={{ background: 'var(--bg-canvas)' }}
        >
          <span>Use &uarr; &darr; to navigate, Enter to select</span>
          <span className="font-mono">OmniBug Quick-Prompt</span>
        </div>
      </div>
    </div>
  );
};
