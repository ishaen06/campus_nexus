import React from 'react';
import { ReproductionStep } from '../types';

interface ReproductionChecklistProps {
  steps: ReproductionStep[];
  onToggleStep?: (stepNum: number) => void;
  canEdit?: boolean;
}

export const ReproductionChecklist: React.FC<ReproductionChecklistProps> = ({
  steps,
  onToggleStep,
  canEdit = true,
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="card p-6 text-center text-xs text-[var(--text-tertiary)] border-dashed">
        No structured reproduction test steps recorded.
      </div>
    );
  }

  const verifiedCount = steps.filter((s) => s.is_verified).length;
  const isAllVerified = verifiedCount === steps.length && steps.length > 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Reproduction &amp; Verification Steps ({verifiedCount}/{steps.length} Verified)
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Click each step to toggle QA assertion verification status</p>
        </div>
        {isAllVerified && (
          <span className="badge badge-resolved">✓ All Steps Verified</span>
        )}
      </div>

      <div className="p-6 space-y-3">
        {steps.map((step) => (
          <div
            key={step.step_number}
            onClick={() => canEdit && onToggleStep && onToggleStep(step.step_number)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              step.is_verified
                ? 'bg-[var(--success-bg)] border-[var(--success-border)]'
                : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={step.is_verified}
                readOnly
                className="mt-1 w-4 h-4 accent-[var(--accent)] cursor-pointer"
                aria-label={`Step ${step.step_number} verification status`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[var(--text-primary)] font-mono">
                    Step {step.step_number}:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      step.is_verified
                        ? 'line-through text-[var(--text-tertiary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {step.action}
                  </span>
                </div>

                {(step.expected || step.actual) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    {step.expected && (
                      <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg">
                        <span className="font-bold text-emerald-600 block mb-0.5">Expected Result:</span>
                        <span className="text-[var(--text-secondary)]">{step.expected}</span>
                      </div>
                    )}
                    {step.actual && (
                      <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg">
                        <span className="font-bold text-red-600 block mb-0.5">Actual Behavior:</span>
                        <span className="text-[var(--text-secondary)]">{step.actual}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
