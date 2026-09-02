import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, realtime } from '../api';
import { Bug, BugStatus } from '../types';

interface BugKanbanProps {
  selectedProductId: string;
  onOpenCreateModal: () => void;
}

const COLUMNS: { id: BugStatus; label: string; accent: string }[] = [
  { id: 'unconfirmed', label: 'Unconfirmed', accent: '#94a3b8' },
  { id: 'confirmed',   label: 'Confirmed',   accent: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', accent: '#f59e0b' },
  { id: 'in_review',   label: 'In Review',   accent: '#8b5cf6' },
  { id: 'resolved',    label: 'Resolved',    accent: '#10b981' },
  { id: 'closed',      label: 'Closed',      accent: '#64748b' },
];

const NEXT_STATUS: Record<BugStatus, BugStatus> = {
  unconfirmed: 'confirmed',
  confirmed:   'in_progress',
  in_progress: 'in_review',
  in_review:   'resolved',
  resolved:    'closed',
  verified:    'closed',
  closed:      'reopened',
  reopened:    'in_progress',
};

const SEV_COLOR: Record<string, string> = {
  blocker: '#ef4444',
  critical: '#ef4444',
  major: '#f97316',
  normal: '#3b82f6',
  minor: '#a1a1aa',
};

export const BugKanban: React.FC<BugKanbanProps> = ({ selectedProductId, onOpenCreateModal }) => {
  const [bugs, setBugs] = useState<Bug[]>([]);

  const fetchBugs = async () => {
    try {
      const data = await api.bugs.list({
        product_id: selectedProductId !== 'all' ? selectedProductId : undefined,
        limit: 200,
      });
      setBugs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBugs();
    const refresh = () => fetchBugs();
    realtime.on('BUG_CREATED', refresh);
    realtime.on('BUG_UPDATED', refresh);
    realtime.on('STATUS_CHANGED', refresh);
    return () => {
      realtime.off('BUG_CREATED', refresh);
      realtime.off('BUG_UPDATED', refresh);
      realtime.off('STATUS_CHANGED', refresh);
    };
  }, [selectedProductId]);

  const handleAdvance = async (bugId: string, currentStatus: BugStatus) => {
    try {
      await api.bugs.transition(bugId, {
        to_status: NEXT_STATUS[currentStatus],
        resolution: NEXT_STATUS[currentStatus] === 'resolved' ? 'fixed' : undefined,
      });
      fetchBugs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-8 py-5 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Kanban Process Board
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Stage progression tracker &bull; {bugs.length} total defects in workflow
          </p>
        </div>
        <button onClick={onOpenCreateModal} className="btn btn-primary gap-2 shadow-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Defect
        </button>
      </div>

      {/* Spacious Horizontal Columns */}
      <div className="flex-1 overflow-x-auto p-8 bg-[var(--bg-canvas)]">
        <div className="flex gap-5 h-full items-start min-w-max pb-4">
          {COLUMNS.map((col) => {
            const colBugs = bugs.filter((b) => b.status === col.id);
            return (
              <div
                key={col.id}
                className="w-80 flex-shrink-0 rounded-2xl flex flex-col shadow-xs"
                style={{
                  maxHeight: 'calc(100vh - 160px)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                {/* Column Header */}
                <div
                  className="px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-[var(--border)]"
                  style={{ borderTop: `3px solid ${col.accent}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: col.accent }}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {colBugs.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[var(--bg-canvas)]/40">
                  {colBugs.map((bug) => (
                    <div
                      key={bug.id}
                      className="card p-4 space-y-3 card-hover cursor-pointer group shadow-xs"
                      style={{ borderLeftWidth: 4, borderLeftColor: SEV_COLOR[bug.severity] || '#a1a1aa' }}
                    >
                      {/* Top Row: Key + Severity */}
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/bugs/${bug.id}`}
                          className="font-mono text-xs font-bold text-[var(--accent)] hover:underline"
                        >
                          {bug.key}
                        </Link>
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            color: SEV_COLOR[bug.severity] || '#a1a1aa',
                            background: 'var(--bg-raised)',
                          }}
                        >
                          {bug.severity}
                        </span>
                      </div>

                      {/* Title */}
                      <Link
                        to={`/bugs/${bug.id}`}
                        className="block text-sm font-semibold text-[var(--text-primary)] leading-snug hover:text-[var(--accent)] transition-colors line-clamp-2"
                      >
                        {bug.title}
                      </Link>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)]">
                        <span className="truncate max-w-[120px] font-medium text-[var(--text-secondary)]">
                          {bug.assignee_name || 'Unassigned'}
                        </span>

                        {col.id !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvance(bug.id, bug.status);
                            }}
                            className="btn btn-ghost btn-sm text-[11px] font-semibold text-[var(--accent)] opacity-80 group-hover:opacity-100 px-2 py-1"
                            aria-label={`Advance ${bug.key} to next state`}
                          >
                            Advance →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {colBugs.length === 0 && (
                    <div
                      className="py-10 text-center text-xs font-medium text-[var(--text-tertiary)] rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)]/50"
                    >
                      No defects in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
