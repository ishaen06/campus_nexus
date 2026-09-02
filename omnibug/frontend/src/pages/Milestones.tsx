import React, { useState } from 'react';
import { api } from '../api';
import { Product } from '../types';

interface MilestonesProps {
  products: Product[];
  selectedProductId: string;
}

export const Milestones: React.FC<MilestonesProps> = ({ products, selectedProductId }) => {
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);
  const [activeChangelog, setActiveChangelog] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const milestones = currentProduct?.milestones || [];

  const handleGenerateChangelog = async (msId: string) => {
    try {
      const res = await api.products.getMilestoneChangelog(msId);
      setActiveChangelog(res);
      setChangelogModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyChangelog = () => {
    if (activeChangelog?.changelog_markdown) {
      navigator.clipboard.writeText(activeChangelog.changelog_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Milestones &amp; Release Roadmap
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track release milestone health, open blockers, and generate changelog reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((ms) => {
          const readiness = ms.readiness_score ?? 100;
          const isClosed = ms.status === 'closed';
          const progressColor =
            readiness > 80 ? 'var(--success)' : readiness > 50 ? 'var(--warning)' : 'var(--danger)';

          return (
            <div key={ms.id} className="card card-hover p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{ms.name}</h2>
                  <span className={`badge ${isClosed ? 'badge-closed' : 'badge-in_progress'}`}>
                    {isClosed ? 'Closed' : 'Active'}
                  </span>
                </div>
                {ms.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{ms.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-tertiary)] uppercase tracking-wider">Release Readiness</span>
                    <span style={{ color: progressColor }}>{readiness}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${readiness}%`, background: progressColor }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[var(--text-tertiary)] block">Open Defects</span>
                    <span className="font-bold text-sm text-red-500 font-mono">{ms.open_defects_count ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)] block">Target Date</span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {ms.target_date ? new Date(ms.target_date).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleGenerateChangelog(ms.id)}
                  className="btn btn-secondary w-full text-xs font-semibold"
                >
                  Generate Release Changelog
                </button>
              </div>
            </div>
          );
        })}

        {milestones.length === 0 && (
          <div className="col-span-full card p-16 text-center text-[var(--text-tertiary)] text-sm">
            No milestones configured for this product. Add milestones in Workspace Settings.
          </div>
        )}
      </div>

      {/* Changelog Modal */}
      {changelogModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChangelogModalOpen(false);
          }}
        >
          <div className="modal-panel max-w-2xl">
            <div className="modal-header">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Generated Release Changelog</h3>
              <button
                onClick={() => setChangelogModalOpen(false)}
                className="btn btn-ghost btn-sm text-[var(--text-tertiary)]"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre className="p-4 bg-[var(--bg-raised)] rounded-xl font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {activeChangelog?.changelog_markdown || 'No changes found.'}
              </pre>
            </div>
            <div className="modal-footer">
              <button onClick={() => setChangelogModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
              <button onClick={handleCopyChangelog} className="btn btn-primary">
                {copied ? '✓ Copied Markdown' : 'Copy Markdown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
