import React, { useState, useEffect } from 'react';
import { api, realtime } from '../api';
import { GitCommit as GitCommitType } from '../types';
import { DiffViewer } from '../components/DiffViewer';

export const GitIntegrations: React.FC = () => {
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [commitMsg, setCommitMsg] = useState('fix(layout): guard against dangling frame references (fixes GEC-101)');
  const [repoName, setRepoName] = useState('gecko-render-core');
  const [branch, setBranch] = useState('main');
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchCommits = async () => {
    try {
      const data = await api.git.listAllCommits(20);
      setCommits(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCommits();

    const handleNewCommit = () => fetchCommits();
    realtime.on('COMMIT_LINKED', handleNewCommit);

    return () => {
      realtime.off('COMMIT_LINKED', handleNewCommit);
    };
  }, []);

  const handleSimulateCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) return;

    setIsSimulating(true);
    try {
      const res = await api.git.simulateCommit(commitMsg.trim(), repoName, branch);
      setLastResult(res);
      fetchCommits();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Git &amp; CI/CD Integration Hub
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Commit webhook processing, automated defect reference linking, and diff analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Simulator Card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Simulate Inbound Commit</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Test commit message defect key parsing (e.g. &quot;fixes GEC-101&quot;)
            </p>
          </div>

          <form onSubmit={handleSimulateCommit} className="space-y-4">
            <div className="field">
              <label htmlFor="git-repo" className="field-label">Repository</label>
              <input
                id="git-repo"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>

            <div className="field">
              <label htmlFor="git-branch" className="field-label">Branch</label>
              <input
                id="git-branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>

            <div className="field">
              <label htmlFor="git-msg" className="field-label field-required">Commit Message</label>
              <textarea
                id="git-msg"
                rows={3}
                required
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="e.g. fix(auth): resolve token refresh loop (fixes GEC-102)"
                className="input font-mono text-xs"
              />
            </div>

            <button type="submit" disabled={isSimulating || !commitMsg.trim()} className="btn btn-primary btn-lg w-full">
              {isSimulating ? 'Simulating Push…' : 'Push Test Commit'}
            </button>
          </form>

          {lastResult && (
            <div className="p-4 rounded-xl border space-y-2 bg-[var(--bg-canvas)] text-xs">
              <div className="font-bold text-[var(--text-primary)]">Webhook Result:</div>
              <div>Status: <span className="font-mono text-emerald-500 font-bold">{lastResult.status}</span></div>
              <div>Linked Defect: <span className="font-mono text-[var(--accent)] font-bold">{lastResult.bug_id || 'None'}</span></div>
            </div>
          )}
        </div>

        {/* Commits Log Feed */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Recent Linked Commits ({commits.length})
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Stream of commits processed by OmniBug webhooks</p>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[700px] overflow-y-auto">
            {commits.map((c) => (
              <div key={c.id} className="p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded">
                      {c.commit_sha.substring(0, 8)}
                    </span>
                    <span className="text-[var(--text-secondary)] font-medium">{c.author || 'Developer'}</span>
                  </div>
                  <span className="text-[var(--text-tertiary)]">{c.repo_name}:{c.branch}</span>
                </div>

                <p className="text-sm font-mono text-[var(--text-primary)] font-medium leading-relaxed">
                  {c.message}
                </p>

                {c.bug_id && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-[var(--text-tertiary)]">Linked Defect ID:</span>
                    <span className="badge badge-confirmed font-mono">
                      {c.bug_id}
                    </span>
                  </div>
                )}

                {c.diff_snippet && (
                  <div className="pt-2">
                    <DiffViewer diffText={c.diff_snippet} title={`Diff ${c.commit_sha.substring(0, 7)}`} />
                  </div>
                )}
              </div>
            ))}

            {commits.length === 0 && (
              <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">
                No git commits linked yet. Simulate a commit to see webhook processing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
