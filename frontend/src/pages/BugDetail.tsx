import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, realtime } from '../api';
import { Bug, Comment, GitCommit as GitCommitType, ActivityLog, User as UserType, BugStatus, BugResolution, Product } from '../types';
import { DiffViewer } from '../components/DiffViewer';
import { ReproductionChecklist } from '../components/ReproductionChecklist';
import { ActivityAuditLog } from '../components/ActivityAuditLog';

interface BugDetailProps {
  currentUser: UserType | null;
  products: Product[];
}

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 py-3 border-b border-[var(--border)]">
    <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
    <div className="text-sm text-[var(--text-primary)] font-medium">{children}</div>
  </div>
);

export const BugDetail: React.FC<BugDetailProps> = ({ currentUser, products }) => {
  const { idOrKey } = useParams<{ idOrKey: string }>();
  const navigate = useNavigate();

  const isQaMode =
    currentUser?.role === 'reporter' ||
    currentUser?.role === 'qa_engineer' ||
    currentUser?.role === 'viewer';

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'commits'>('comments');

  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BugStatus>('in_progress');
  const [targetResolution, setTargetResolution] = useState<BugResolution>('fixed');
  const [duplicateOfKey, setDuplicateOfKey] = useState('');
  const [depTargetKey, setDepTargetKey] = useState('');
  const [depRelation, setDepRelation] = useState<'blocks' | 'depends_on'>('blocks');
  const [isTriaging, setIsTriaging] = useState(false);
  const [logHours, setLogHours] = useState(1);
  const [branchCopied, setBranchCopied] = useState(false);

  const fetchBugData = async () => {
    if (!idOrKey) return;
    setLoading(true);
    try {
      const bugData = await api.bugs.get(idOrKey);
      setBug(bugData);
      setTargetStatus(bugData.status);
      const [commData, commitData, actData, userList] = await Promise.all([
        api.comments.list(bugData.id),
        api.git.listBugCommits(bugData.id),
        api.audit.getBugHistory(bugData.id),
        api.auth.listUsers(),
      ]);
      setComments(commData);
      setCommits(commitData);
      setActivities(actData);
      setUsers(userList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugData();
    const refresh = () => fetchBugData();
    realtime.on('BUG_UPDATED', refresh);
    realtime.on('COMMENT_ADDED', refresh);
    realtime.on('STATUS_CHANGED', refresh);
    realtime.on('COMMIT_LINKED', refresh);
    return () => {
      realtime.off('BUG_UPDATED', refresh);
      realtime.off('COMMENT_ADDED', refresh);
      realtime.off('STATUS_CHANGED', refresh);
      realtime.off('COMMIT_LINKED', refresh);
    };
  }, [idOrKey]);

  const handleToggleReproStep = async (stepNum: number) => {
    if (!bug) return;
    try {
      const res = await api.bugs.toggleReproStep(bug.id, stepNum);
      setBug({ ...bug, reproduction_steps: res.reproduction_steps });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectTransition = async (newStatus: BugStatus, resolution: BugResolution = 'fixed') => {
    if (!bug) return;
    try {
      await api.bugs.transition(bug.id, {
        to_status: newStatus,
        resolution: ['resolved', 'closed', 'verified'].includes(newStatus) ? resolution : undefined,
      });
      fetchBugData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bug || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.comments.create(bug.id, { content: newComment.trim(), is_internal: isInternalComment });
      if (!isQaMode && targetStatus !== bug.status) {
        await api.bugs.transition(bug.id, {
          to_status: targetStatus,
          resolution: ['resolved', 'closed', 'verified'].includes(targetStatus) ? targetResolution : undefined,
          duplicate_of: targetResolution === 'duplicate' ? duplicateOfKey : undefined,
        });
      }
      setNewComment('');
      setIsInternalComment(false);
      fetchBugData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReactComment = async (commentId: string, emoji: string) => {
    try {
      const res = await api.comments.react(commentId, emoji);
      setComments(comments.map((c) => (c.id === commentId ? { ...c, reactions: res.reactions } : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkDependency = async () => {
    if (!bug || !depTargetKey.trim()) return;
    try {
      await api.bugs.linkDependency(bug.id, depTargetKey.trim(), depRelation);
      setDepTargetKey('');
      fetchBugData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogTime = async () => {
    if (!bug) return;
    try {
      await api.bugs.logTime(bug.id, logHours);
      fetchBugData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerAITriage = async () => {
    if (!bug) return;
    setIsTriaging(true);
    try {
      const res = await api.ai.triage({
        title: bug.title,
        description: bug.description,
        stack_trace: bug.stack_trace,
        product_id: bug.product_id,
      });
      await api.bugs.update(bug.id, {
        root_cause_analysis: {
          category: 'code_defect',
          description: res.root_cause_hypothesis,
          suggested_fix: res.suggested_fix_strategy,
          suggested_diff: res.suggested_diff_patch,
          confidence_score: res.confidence_score,
        },
      });
      fetchBugData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriaging(false);
    }
  };

  const handleCopyBranch = async () => {
    if (!bug) return;
    const res = await api.git.getBranchName(bug.id);
    navigator.clipboard.writeText(res.git_command);
    setBranchCopied(true);
    setTimeout(() => setBranchCopied(false), 2000);
  };

  const handleUpdateField = async (field: keyof Bug, value: any) => {
    if (!bug) return;
    try {
      const updated = await api.bugs.update(bug.id, { [field]: value });
      setBug(updated);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !bug) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-medium text-[var(--text-tertiary)]">Loading defect details…</div>
        </div>
      </div>
    );
  }

  const SEV_COLORS: Record<string, string> = {
    blocker: '#ef4444',
    critical: '#ef4444',
    major: '#f97316',
    normal: '#3b82f6',
    minor: '#a1a1aa',
  };

  /* =========================================================================
     QA WORKSPACE VIEW
     ========================================================================= */
  if (isQaMode) {
    return (
      <div className="page-container max-w-5xl space-y-8">
        {/* Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => navigate(-1)} className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                ← Back to Registry
              </button>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="font-mono text-xs font-bold text-[var(--accent)]">{bug.key}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{bug.title}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className={`badge badge-${bug.status}`}>{bug.status.replace('_', ' ')}</span>
              <span className={`badge badge-${bug.severity}`}>{bug.severity}</span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">Product: <strong>{bug.product_name}</strong></span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">Target Build: <strong className="font-mono">{bug.version}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">
              Assigned: <strong className="text-[var(--text-primary)]">{bug.assignee_name || 'Unassigned'}</strong>
            </span>
          </div>
        </div>

        {/* Retest Banner */}
        {bug.status === 'resolved' && (
          <div
            className="card p-6 space-y-4 border-2"
            style={{ borderColor: 'var(--success-border)', background: 'var(--success-bg)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--success)' }}>
                  Developer Fix Ready for Retest
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Please test in build <strong>{bug.version}</strong>. Verify checklist below and mark Pass or Fail.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleDirectTransition('closed', 'fixed')}
                className="btn btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              >
                ✓ Pass &amp; Close Defect
              </button>
              <button
                onClick={() => handleDirectTransition('reopened')}
                className="btn btn-danger"
              >
                ✕ Fail &amp; Reopen Defect
              </button>
            </div>
          </div>
        )}

        {/* Observed Description */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Observed Failure Description</h2>
          </div>
          <div className="p-6">
            <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
              {bug.description}
            </pre>
          </div>
        </div>

        {/* Reproduction Steps */}
        <ReproductionChecklist steps={bug.reproduction_steps} onToggleStep={handleToggleReproStep} canEdit={true} />

        {/* Stack Trace */}
        {bug.stack_trace && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Error Backtrace &amp; Evidence</h2>
            </div>
            <pre className="p-6 text-xs font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed bg-[var(--bg-raised)]">
              {bug.stack_trace}
            </pre>
          </div>
        )}

        {/* Discussion / QA Notes */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">QA Execution &amp; Retest Notes ({comments.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {comments.map((c) => (
              <div key={c.id} className="p-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]">{c.user_name}</span>
                  <span className="text-[var(--text-tertiary)] font-mono">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="p-6 border-t border-[var(--border)] space-y-4 bg-[var(--bg-canvas)]">
            <div className="field">
              <label htmlFor="qa-comment" className="field-label">Post Test Note</label>
              <textarea
                id="qa-comment"
                rows={3}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Document test run logs, environment details, or pass/fail observations…"
                className="input"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmittingComment || !newComment.trim()} className="btn btn-primary">
                {isSubmittingComment ? 'Posting…' : 'Post Test Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* =========================================================================
     DEVELOPER / LEAD WORKSPACE VIEW — Spacious 2-Column
     ========================================================================= */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Top Defect Action Bar */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              ← Back
            </button>
            <span className="h-4 w-px bg-[var(--border)]" />
            <span className="font-mono text-sm font-bold text-[var(--accent)]">{bug.key}</span>
            <span className={`badge badge-${bug.status}`}>{bug.status.replace('_', ' ')}</span>
            <span className={`badge badge-${bug.severity}`}>{bug.severity}</span>
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate hidden md:inline">
              {bug.title}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {bug.status === 'unconfirmed' && (
              <button onClick={() => handleDirectTransition('confirmed')} className="btn btn-secondary btn-sm">
                Accept Defect
              </button>
            )}
            {bug.status === 'confirmed' && (
              <button onClick={() => handleDirectTransition('in_progress')} className="btn btn-secondary btn-sm">
                Start Work
              </button>
            )}
            {(bug.status === 'in_progress' || bug.status === 'in_review') && (
              <button
                onClick={() => handleDirectTransition('resolved', 'fixed')}
                className="btn btn-sm"
                style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}
              >
                Mark Resolved
              </button>
            )}
            <button onClick={handleCopyBranch} className="btn btn-ghost btn-sm font-mono text-xs text-[var(--text-tertiary)]">
              {branchCopied ? '✓ Branch Copied' : 'Git Branch'}
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Window */}
      <div className="flex-1 overflow-hidden flex max-w-7xl mx-auto w-full">
        {/* Left Column: Defect Details & Threads */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Header Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">{bug.title}</h1>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Reported by <strong className="text-[var(--text-primary)]">{bug.reporter_name}</strong> in {bug.product_name} &gt; {bug.component_name}
            </p>
          </div>

          {/* Description Card */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Defect Description</h2>
            </div>
            <div className="p-6">
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                {bug.description}
              </pre>
            </div>
          </div>

          {/* Reproduction Checklist */}
          <ReproductionChecklist steps={bug.reproduction_steps} onToggleStep={handleToggleReproStep} />

          {/* Stack Trace */}
          {bug.stack_trace && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-base font-bold text-[var(--text-primary)]">Diagnostic Backtrace / Error Dump</h2>
              </div>
              <pre className="p-6 text-xs font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed bg-[var(--bg-raised)]">
                {bug.stack_trace}
              </pre>
            </div>
          )}

          {/* AI Root Cause Diagnostics */}
          <div className="card overflow-hidden border-2" style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)' }}>
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h2 className="text-base font-bold" style={{ color: 'var(--info)' }}>AI Root Cause Diagnostics</h2>
              </div>
              <button
                onClick={handleTriggerAITriage}
                disabled={isTriaging}
                className="btn btn-ghost btn-sm text-xs font-semibold"
              >
                {isTriaging ? 'Analyzing…' : '↺ Re-Analyze with AI'}
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  Root Cause Hypothesis
                </span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {bug.root_cause_analysis?.description || 'Click Re-Analyze to generate automated failure diagnosis.'}
                </p>
              </div>
              {bug.root_cause_analysis?.suggested_fix && (
                <div>
                  <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                    Suggested Remediation Strategy
                  </span>
                  <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {bug.root_cause_analysis.suggested_fix}
                  </p>
                </div>
              )}
              {bug.root_cause_analysis?.suggested_diff && (
                <div className="pt-2">
                  <DiffViewer diffText={bug.root_cause_analysis.suggested_diff} title="Suggested AI Patch" />
                </div>
              )}
            </div>
          </div>

          {/* Linked Commits */}
          {commits.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-base font-bold text-[var(--text-primary)]">Linked Git Commits ({commits.length})</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {commits.map((c) => (
                  <div key={c.id} className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--accent)] font-bold">{c.commit_sha.substring(0, 8)}</span>
                      <span className="text-[var(--text-tertiary)]">{c.repo_name}:{c.branch}</span>
                    </div>
                    <p className="text-sm font-mono text-[var(--text-primary)]">{c.message}</p>
                    {c.diff_snippet && <DiffViewer diffText={c.diff_snippet} title={`Diff ${c.commit_sha.substring(0, 7)}`} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion Tabs (Comments / History / Commits) */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-[var(--border)] px-4">
              {(['comments', 'history', 'commits'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-[var(--accent)] border-[var(--accent)]'
                      : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'comments' && `Comments (${comments.length})`}
                  {tab === 'history' && `Audit Log (${activities.length})`}
                  {tab === 'commits' && `Commits (${commits.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'comments' && (
              <div>
                <div className="divide-y divide-[var(--border)]">
                  {comments.map((c) => (
                    <div key={c.id} className={`p-6 space-y-3 ${c.is_internal ? 'bg-[var(--warning-bg)]/40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                          >
                            {c.user_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-[var(--text-primary)]">{c.user_name}</span>
                            {c.is_internal && (
                              <span className="badge badge-in_progress ml-2.5">Internal Note</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-[var(--text-tertiary)] font-mono">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap pl-11 leading-relaxed">{c.content}</p>
                      <div className="flex items-center gap-2 pl-11">
                        {['👍', '🚀', '👀', '🎉'].map((emoji) => {
                          const count = c.reactions?.[emoji]?.length || 0;
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReactComment(c.id, emoji)}
                              className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
                              style={{
                                background: count > 0 ? 'var(--accent-light)' : 'var(--bg-raised)',
                                borderColor: count > 0 ? 'var(--accent-glow)' : 'var(--border)',
                                color: count > 0 ? 'var(--accent)' : 'var(--text-tertiary)',
                              }}
                            >
                              {emoji} {count > 0 ? count : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="p-6 border-t border-[var(--border)] space-y-4 bg-[var(--bg-canvas)]">
                  <div className="field">
                    <label htmlFor="dev-comment" className="field-label">Add Comment &amp; Update State</label>
                    <textarea
                      id="dev-comment"
                      rows={3}
                      required
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share progress updates, code references, or resolution notes…"
                      className="input"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="accent-[var(--accent)] w-4 h-4"
                      />
                      Internal note only
                    </label>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs text-[var(--text-tertiary)] font-medium">State:</span>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as BugStatus)}
                        className="input input-sm w-auto"
                      >
                        <option value={bug.status}>Keep current ({bug.status})</option>
                        <option value="in_progress">In Progress</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      {targetStatus === 'resolved' && (
                        <select
                          value={targetResolution}
                          onChange={(e) => setTargetResolution(e.target.value as BugResolution)}
                          className="input input-sm w-auto"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="duplicate">Duplicate</option>
                          <option value="wontfix">Won't Fix</option>
                          <option value="worksforme">Works for Me</option>
                          <option value="invalid">Invalid</option>
                        </select>
                      )}
                      {targetResolution === 'duplicate' && (
                        <input
                          type="text"
                          value={duplicateOfKey}
                          onChange={(e) => setDuplicateOfKey(e.target.value.toUpperCase())}
                          placeholder="Dup of (e.g. GEC-101)"
                          className="input input-sm font-mono w-36"
                        />
                      )}
                      <button type="submit" disabled={isSubmittingComment || !newComment.trim()} className="btn btn-primary">
                        {isSubmittingComment ? 'Saving…' : 'Save & Advance'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'history' && <ActivityAuditLog activities={activities} />}

            {activeTab === 'commits' && (
              <div className="p-6 text-sm text-[var(--text-tertiary)]">
                {commits.length === 0 ? 'No commits linked.' : `${commits.length} commit(s) linked to this defect.`}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Metadata & Classification Panel */}
        <div className="w-80 flex-shrink-0 border-l border-[var(--border)] overflow-y-auto p-6 space-y-6 bg-[var(--bg-surface)]">
          <div>
            <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
              Classification &amp; Assignment
            </h2>

            <MetaRow label="Severity">
              <select value={bug.severity} onChange={(e) => handleUpdateField('severity', e.target.value)} className="input input-sm font-semibold">
                {['blocker', 'critical', 'major', 'normal', 'minor'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </MetaRow>

            <MetaRow label="Priority">
              <select value={bug.priority} onChange={(e) => handleUpdateField('priority', e.target.value)} className="input input-sm font-semibold">
                {['p1_urgent', 'p2_high', 'p3_medium', 'p4_low'].map((p) => (
                  <option key={p} value={p}>{p.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </MetaRow>

            <MetaRow label="Assigned Engineer">
              <select value={bug.assignee_id || ''} onChange={(e) => handleUpdateField('assignee_id', e.target.value)} className="input input-sm">
                <option value="">(Unassigned)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </MetaRow>

            <MetaRow label="Product &amp; Component">
              <span>{bug.product_name} / {bug.component_name}</span>
            </MetaRow>

            <MetaRow label="Build Version">
              <span className="font-mono">{bug.version || '—'}</span>
            </MetaRow>

            <MetaRow label="Target Milestone">
              <span>{bug.milestone_name || '—'}</span>
            </MetaRow>

            <MetaRow label="SLA Remaining">
              {bug.sla_breached ? (
                <span className="badge badge-critical font-bold">BREACHED</span>
              ) : (
                <span className="badge badge-resolved">{bug.sla_time_left_hours}h Remaining</span>
              )}
            </MetaRow>
          </div>

          {/* Time Logging Card */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Time Tracking</h3>
            <div className="text-base font-bold text-[var(--text-primary)] mb-3">
              {bug.spent_hours || 0}h logged
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={logHours}
                onChange={(e) => setLogHours(parseFloat(e.target.value) || 1)}
                className="input input-sm w-20 font-mono"
              />
              <button onClick={handleLogTime} className="btn btn-secondary btn-sm">
                Log Hours
              </button>
            </div>
          </div>

          {/* Dependencies Card */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Blockers &amp; Dependencies</h3>
            {bug.blocks?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-[var(--text-tertiary)] block mb-1">Blocks</span>
                <div className="flex flex-wrap gap-1.5">
                  {bug.blocks.map((k) => (
                    <span key={k} className="badge badge-critical font-mono">{k}</span>
                  ))}
                </div>
              </div>
            )}
            {bug.depends_on?.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-[var(--text-tertiary)] block mb-1">Depends on</span>
                <div className="flex flex-wrap gap-1.5">
                  {bug.depends_on.map((k) => (
                    <span key={k} className="badge badge-major font-mono">{k}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <select value={depRelation} onChange={(e) => setDepRelation(e.target.value as any)} className="input input-sm w-28">
                <option value="blocks">Blocks</option>
                <option value="depends_on">Depends on</option>
              </select>
              <input
                type="text"
                value={depTargetKey}
                onChange={(e) => setDepTargetKey(e.target.value.toUpperCase())}
                placeholder="ID (e.g. GEC-105)"
                className="input input-sm font-mono flex-1 min-w-0"
              />
              <button onClick={handleLinkDependency} className="btn btn-secondary btn-sm">
                Link
              </button>
            </div>
          </div>

          {/* Tags */}
          {bug.tags?.length > 0 && (
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {bug.tags.map((t) => (
                  <span key={t} className="badge" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
