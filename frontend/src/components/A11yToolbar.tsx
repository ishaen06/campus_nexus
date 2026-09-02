import React, { useState, useEffect } from 'react';
import { useA11y, FontSize } from '../context/A11yContext';

export const A11yToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    fontSize,
    setFontSize,
    highContrast,
    toggleHighContrast,
    reducedMotion,
    toggleReducedMotion,
    dyslexicFont,
    toggleDyslexicFont,
    resetSettings,
    announce,
  } = useA11y();

  // Keyboard shortcut listener: Alt+A to toggle modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          announce(next ? 'Accessibility controls opened' : 'Accessibility controls closed');
          return next;
        });
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        announce('Accessibility controls closed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, announce]);

  return (
    <>
      {/* Floating Accessibility Trigger Button (Bottom Left) */}
      <button
        onClick={() => {
          setIsOpen(true);
          announce('Accessibility settings dialog opened');
        }}
        title="Accessibility Settings (Alt+A)"
        className="fixed bottom-6 left-6 z-40 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white w-11 h-11 rounded-2xl shadow-xl border border-white/20 focus:ring-4 focus:ring-amber-400 focus:outline-none flex items-center justify-center transition-all hover:scale-105"
        aria-label="Open Accessibility Settings Panel (Shortcut: Alt+A)"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="text-lg" aria-hidden="true">♿</span>
        <span className="sr-only">Accessibility Controls</span>
      </button>

      {/* Accessibility Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-dialog-title"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="modal-panel max-w-lg">
            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">♿</span>
                <h2 id="a11y-dialog-title" className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  Accessibility &amp; Assistive Controls
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  announce('Accessibility settings closed');
                }}
                className="btn btn-ghost btn-sm text-[var(--text-tertiary)]"
                aria-label="Close accessibility controls (Escape)"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="modal-body space-y-6 text-xs">
              {/* 1. Font Size Adjustment */}
              <div className="space-y-2">
                <label className="block font-bold text-sm text-[var(--text-primary)]">
                  1. Text &amp; Display Scaling
                </label>
                <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Text Size Selection">
                  {(['normal', 'large', 'xlarge'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={fontSize === size}
                      onClick={() => setFontSize(size)}
                      className={`py-2.5 px-3 rounded-xl font-bold border transition-all text-center ${
                        fontSize === size
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-raised)]'
                      }`}
                    >
                      {size === 'normal' && 'Standard (100%)'}
                      {size === 'large' && 'Medium (115%)'}
                      {size === 'xlarge' && 'Large (130%)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Visual & Contrast Preferences */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <span className="block font-bold text-sm text-[var(--text-primary)]">
                  2. Visual &amp; Cognitive Preferences
                </span>

                {/* High Contrast */}
                <label className="flex items-center justify-between p-3.5 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)]">
                  <div>
                    <span className="font-bold text-xs block text-[var(--text-primary)]">
                      High Contrast Mode (WCAG AAA)
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Enforces maximum border delineation and deep contrast ratios.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={toggleHighContrast}
                    className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
                    aria-label="Toggle high contrast mode"
                  />
                </label>

                {/* Reduced Motion */}
                <label className="flex items-center justify-between p-3.5 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)]">
                  <div>
                    <span className="font-bold text-xs block text-[var(--text-primary)]">
                      Reduce Motion &amp; Transitions
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Disables animations, smooth scrolling, and transitions.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={toggleReducedMotion}
                    className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
                    aria-label="Toggle reduced motion"
                  />
                </label>

                {/* Readability Spacing */}
                <label className="flex items-center justify-between p-3.5 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)]">
                  <div>
                    <span className="font-bold text-xs block text-[var(--text-primary)]">
                      Enhanced Readability Spacing
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Increases letter tracking and line heights for dyslexia support.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dyslexicFont}
                    onChange={toggleDyslexicFont}
                    className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
                    aria-label="Toggle enhanced readability spacing"
                  />
                </label>
              </div>

              {/* 3. Keyboard Shortcuts Reference */}
              <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                <span className="block font-bold text-sm text-[var(--text-primary)]">
                  3. Keyboard Shortcuts Legend
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-[var(--bg-raised)] rounded-lg border border-[var(--border)] flex items-center justify-between">
                    <span>Command Search:</span>
                    <kbd className="bg-[var(--bg-surface)] px-1.5 py-0.5 rounded font-mono font-bold border border-[var(--border)]">Ctrl+K</kbd>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-raised)] rounded-lg border border-[var(--border)] flex items-center justify-between">
                    <span>Accessibility Menu:</span>
                    <kbd className="bg-[var(--bg-surface)] px-1.5 py-0.5 rounded font-mono font-bold border border-[var(--border)]">Alt+A</kbd>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-raised)] rounded-lg border border-[var(--border)] flex items-center justify-between">
                    <span>Create Defect:</span>
                    <kbd className="bg-[var(--bg-surface)] px-1.5 py-0.5 rounded font-mono font-bold border border-[var(--border)]">Alt+C</kbd>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-raised)] rounded-lg border border-[var(--border)] flex items-center justify-between">
                    <span>Skip to Main:</span>
                    <kbd className="bg-[var(--bg-surface)] px-1.5 py-0.5 rounded font-mono font-bold border border-[var(--border)]">Tab (Top)</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer flex items-center justify-between">
              <button
                type="button"
                onClick={resetSettings}
                className="btn btn-ghost text-xs text-[var(--text-secondary)]"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-primary px-6"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
