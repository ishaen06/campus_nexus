import React, { useState } from 'react';
import { api } from '../api';
import { AITriageResponse, Product } from '../types';
import { DiffViewer } from '../components/DiffViewer';

interface AITriageCenterProps {
  products: Product[];
  onOpenCreateModal: () => void;
}

export const AITriageCenter: React.FC<AITriageCenterProps> = ({ products, onOpenCreateModal }) => {
  const [title, setTitle] = useState('Segmentation fault in layout reflow traversal');
  const [description, setDescription] = useState(
    'Under high DOM mutation loads, dynamic iframe rendering dereferences an uninitialized frame pointer in nsFlexContainerFrame.'
  );
  const [stackTrace, setStackTrace] = useState(
    `#0 0x00007ffff7a12bc4 in nsFlexContainerFrame::DoLayout at /src/layout/generic/nsFlexContainerFrame.cpp:4821\n#1 PresShell::DoReflow at /src/layout/base/PresShell.cpp:9430`
  );
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [result, setResult] = useState<AITriageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const data = await api.ai.triage({
        title,
        description,
        stack_trace: stackTrace,
        product_id: productId || undefined,
      });
      setResult(data);
    } catch (err) {
      console.error('AI Triage error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            AI Triage Lab &amp; Root Cause Analysis
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Automated stack trace analysis, classification, and code patch synthesis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Form Card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Failure Telemetry &amp; Log Input</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Paste stack trace dumps or error descriptions to diagnose root cause
            </p>
          </div>

          <form onSubmit={handleRunTriage} className="space-y-4">
            <div className="field">
              <label htmlFor="ai-product" className="field-label">Target Product Area</label>
              <select id="ai-product" value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.key_prefix} — {p.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="ai-title" className="field-label field-required">Defect Headline / Error Message</label>
              <input
                id="ai-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Null pointer dereference in async event loop"
                className="input"
              />
            </div>

            <div className="field">
              <label htmlFor="ai-desc" className="field-label">Observed Symptoms / Description</label>
              <textarea
                id="ai-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What occurred before the crash…"
                className="input"
              />
            </div>

            <div className="field">
              <label htmlFor="ai-stack" className="field-label">Crash Backtrace / Log Dump</label>
              <textarea
                id="ai-stack"
                rows={4}
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste stack frames or error logs…"
                className="input font-mono text-xs"
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading || !title.trim()} className="btn btn-primary btn-lg w-full">
                {loading ? 'Synthesizing Diagnosis…' : '⚡ Run AI Root Cause Analysis'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {loading && (
            <div className="card p-12 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Analyzing Crash Telemetry</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Parsing stack frames, comparing defect knowledgebase, and generating fix strategy…
                </p>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="card p-12 text-center border-dashed border-2">
              <span className="text-3xl mb-3 block">🔬</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Ready for Diagnostic Input</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">
                Fill in the defect symptoms and stack trace on the left, then trigger analysis to synthesize root cause hypotheses and code patches.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6 animate-in">
              {/* Summary Card */}
              <div className="card p-6 space-y-4 border-2" style={{ borderColor: 'var(--accent-glow)' }}>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Confidence Score
                    </span>
                    <div className="text-2xl font-bold text-[var(--accent)] mt-0.5">
                      {Math.round(result.confidence_score * 100)}%
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {result.predicted_severity && (
                      <span className={`badge badge-${result.predicted_severity}`}>
                        {result.predicted_severity}
                      </span>
                    )}
                    {result.predicted_component && (
                      <span className="badge badge-confirmed">
                        {result.predicted_component}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Root Cause Hypothesis
                  </h3>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                    {result.root_cause_hypothesis}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Suggested Remediation Strategy
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {result.suggested_fix_strategy}
                  </p>
                </div>
              </div>

              {/* Patch Diff */}
              {result.suggested_diff_patch && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Synthesized Code Patch Diff</h3>
                  </div>
                  <div className="p-4">
                    <DiffViewer diffText={result.suggested_diff_patch} title="Generated Patch" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
