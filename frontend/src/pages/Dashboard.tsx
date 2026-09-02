import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, realtime } from '../api';
import { Bug, AnalyticsSummary, ComponentDefectDensity, ActivityLog, User, Product, BugSeverity, BugStatus } from '../types';
import { useA11y } from '../context/A11yContext';

interface DashboardProps {
  selectedProductId: string;
  currentUser: User | null;
  onOpenCreateModal: () => void;
}

const StatCard = ({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}) => (
  <div className="card card-hover p-6 flex flex-col justify-between space-y-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
      {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
    </div>
    <div>
      <div className="text-3xl font-bold tracking-tight" style={{ color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--text-tertiary)] mt-1.5 font-medium">{sub}</div>}
    </div>
  </div>
);

const SeverityDot = ({ sev }: { sev: string }) => {
  const colors: Record<string, string> = {
    blocker: '#ef4444',
    critical: '#ef4444',
    major: '#f97316',
    normal: '#3b82f6',
    minor: '#a1a1aa',
  };
  return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[sev] || '#a1a1aa' }} />;
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
);

export const Dashboard: React.FC<DashboardProps> = ({ selectedProductId, currentUser, onOpenCreateModal }) => {
  const { announce } = useA11y();
  const isQaMode = currentUser?.role === 'reporter' || currentUser?.role === 'qa_engineer' || currentUser?.role === 'viewer';

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [densities, setDensities] = useState<ComponentDefectDensity[]>([]);
  const [allBugs, setAllBugs] = useState<Bug[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // QA form state
  const [qaTitle, setQaTitle] = useState('');
  const [qaDesc, setQaDesc] = useState('');
  const [qaProductId, setQaProductId] = useState('');
  const [qaComponentId, setQaComponentId] = useState('');
  const [qaBuildVersion, setQaBuildVersion] = useState('2.4.0-rc1');
  const [qaSeverity, setQaSeverity] = useState<BugSeverity>('major');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [prods, sum, den, bugs, acts] = await Promise.all([
        api.products.list(),
        api.analytics.getDashboardSummary(isQaMode ? undefined : selectedProductId),
        api.analytics.getDefectDensity(isQaMode ? undefined : selectedProductId),
        api.bugs.list({ product_id: selectedProductId !== 'all' ? selectedProductId : undefined, limit: 50 }),
        api.audit.getGlobalActivities(10),
      ]);
      setProducts(prods);
      setSummary(sum);
      setDensities(den);
      setAllBugs(bugs);
      setActivities(acts);
      if (!qaProductId && prods.length > 0) {
        setQaProductId(prods[0].id);
        setQaComponentId(prods[0].components?.[0]?.id || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const refresh = () => loadData();
    realtime.on('BUG_CREATED', refresh);
    realtime.on('BUG_UPDATED', refresh);
    realtime.on('STATUS_CHANGED', refresh);
    return () => {
      realtime.off('BUG_CREATED', refresh);
      realtime.off('BUG_UPDATED', refresh);
      realtime.off('STATUS_CHANGED', refresh);
    };
  }, [selectedProductId, isQaMode]);

  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const prod = products.find((p) => p.id === qaProductId);
      const compId = qaComponentId || prod?.components?.[0]?.id || '';
      const newBug = await api.bugs.create({
        title: qaTitle.trim(),
        description: qaDesc.trim(),
        product_id: qaProductId,
        component_id: compId,
        version: qaBuildVersion,
        severity: qaSeverity,
        priority: 'p2_high',
        status: 'unconfirmed' as any,
        environment: {
          os: 'QA Automation Rig',
          browser: 'Chromium Test Runner',
          hardware: 'x86_64',
          version: qaBuildVersion,
          environment_type: 'staging',
        },
        reproduction_steps: [],
        tags: ['qa-verified'],
      });
      const msg = `Defect ${newBug.key} logged successfully`;
      setSubmitSuccess(msg);
      announce(msg);
      setQaTitle('');
      setQaDesc('');
      loadData();
      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQaVerify = async (bugId: string, toStatus: BugStatus) => {
    try {
      await api.bugs.transition(bugId, { to_status: toStatus });
      announce(`Defect status updated to ${toStatus}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================================================================
     QA WORKSPACE VIEW
     ========================================================================= */
  if (isQaMode) {
    const retestQueue = allBugs.filter((b) => b.status === 'resolved');
    const currentProd = products.find((p) => p.id === qaProductId);

    return (
      <div className="page-container space-y-8">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">QA Test Center</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Test execution queue, verification workflows, and fast defect logging
            </p>
          </div>
          {retestQueue.length > 0 && (
            <span className="badge badge-in_progress px-3.5 py-1.5 text-xs">
              ⚡ {retestQueue.length} Fixes Ready for Retest
            </span>
          )}
        </div>

        {/* Success Alert */}
        {submitSuccess && (
          <div
            className="px-5 py-4 rounded-xl border text-sm font-semibold flex items-center justify-between"
            style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success)' }}
            role="status"
          >
            <span>✓ {submitSuccess}</span>
            <button onClick={() => setSubmitSuccess(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Retest Queue */}
        {retestQueue.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Fixes Awaiting QA Verification ({retestQueue.length})</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Developer resolved — verify in target build and sign off</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-28">Defect</th>
                    <th>Summary</th>
                    <th className="w-28">Severity</th>
                    <th className="w-36 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {retestQueue.map((bug) => (
                    <tr key={bug.id}>
                      <td className="font-mono font-bold text-xs">
                        <Link to={`/bugs/${bug.id}`} className="text-[var(--accent)] hover:underline">
                          {bug.key}
                        </Link>
                      </td>
                      <td className="font-medium">
                        <Link to={`/bugs/${bug.id}`} className="hover:text-[var(--accent)] transition-colors">
                          {bug.title}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge badge-${bug.severity}`}>{bug.severity}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleQaVerify(bug.id, 'closed')}
                            className="btn btn-sm"
                            style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }}
                          >
                            Pass
                          </button>
                          <button
                            onClick={() => handleQaVerify(bug.id, 'reopened')}
                            className="btn btn-sm"
                            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                          >
                            Fail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fast Log Defect Form */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Log Test Defect</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Quickly file observed failures into the defect tracking system</p>
          </div>
          <form onSubmit={handleQaSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="field">
                <label htmlFor="qa-product" className="field-label field-required">Product Area</label>
                <select
                  id="qa-product"
                  value={qaProductId}
                  onChange={(e) => {
                    setQaProductId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    setQaComponentId(p?.components?.[0]?.id || '');
                  }}
                  className="input"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.key_prefix} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="qa-comp" className="field-label field-required">Component</label>
                <select id="qa-comp" value={qaComponentId} onChange={(e) => setQaComponentId(e.target.value)} className="input">
                  {currentProd?.components?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="qa-sev" className="field-label field-required">Severity</label>
                <select id="qa-sev" value={qaSeverity} onChange={(e) => setQaSeverity(e.target.value as BugSeverity)} className="input">
                  <option value="blocker">Blocker</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="normal">Normal</option>
                  <option value="minor">Minor</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="qa-title" className="field-label field-required">Defect Summary</label>
              <input
                id="qa-title"
                type="text"
                required
                value={qaTitle}
                onChange={(e) => setQaTitle(e.target.value)}
                placeholder="Clear headline describing the observed defect…"
                className="input"
              />
            </div>

            <div className="field">
              <label htmlFor="qa-desc" className="field-label">Failure Details &amp; Steps</label>
              <textarea
                id="qa-desc"
                rows={3}
                value={qaDesc}
                onChange={(e) => setQaDesc(e.target.value)}
                placeholder="Describe actual vs expected behavior, test environment details, or error messages…"
                className="input"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={isSubmitting || !qaTitle.trim()} className="btn btn-primary btn-lg">
                {isSubmitting ? 'Logging Defect…' : 'Log Defect Report'}
              </button>
            </div>
          </form>
        </div>

        {/* All Defects Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)]">All Test Defects ({allBugs.length})</h2>
            <Link to="/bugs" className="text-xs text-[var(--accent)] font-semibold hover:underline">Full Registry →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-24">ID</th>
                  <th>Summary</th>
                  <th className="w-28">Severity</th>
                  <th className="w-32">Status</th>
                  <th className="w-36">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {allBugs.map((bug) => (
                  <tr key={bug.id}>
                    <td className="font-mono text-xs font-bold">
                      <Link to={`/bugs/${bug.id}`} className="text-[var(--accent)] hover:underline">
                        {bug.key}
                      </Link>
                    </td>
                    <td className="font-medium">
                      <Link to={`/bugs/${bug.id}`} className="hover:text-[var(--accent)] transition-colors">
                        {bug.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge badge-${bug.severity}`}>{bug.severity}</span>
                    </td>
                    <td>
                      <StatusBadge status={bug.status} />
                    </td>
                    <td className="text-xs text-[var(--text-tertiary)]">{bug.assignee_name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     DEVELOPER / LEAD WORKSPACE VIEW
     ========================================================================= */
  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Engineering Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time quality metrics, active defect pipeline, and engineering throughput
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/kanban" className="btn btn-secondary">
            Kanban Board
          </Link>
          <Link to="/analytics" className="btn btn-secondary">
            Full Reports
          </Link>
          <button onClick={onOpenCreateModal} className="btn btn-primary gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Defect
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Open Defects"
            value={summary?.open_defects ?? 0}
            sub={`of ${summary?.total_defects ?? 0} total logged`}
          />
          <StatCard
            label="Blockers"
            value={summary?.blockers_count ?? 0}
            sub="Release critical"
            accent="#ef4444"
          />
          <StatCard
            label="Security"
            value={summary?.security_vulnerabilities_count ?? 0}
            sub="CVE advisories"
            accent="#f97316"
          />
          <StatCard
            label="MTTR"
            value={`${summary?.mttr_hours ?? '—'}h`}
            sub="Avg. resolution time"
            accent="var(--success)"
          />
          <StatCard
            label="SLA On-Time"
            value={`${summary?.sla_compliance_percentage ?? 100}%`}
            sub="Compliance rate"
            accent="var(--success)"
          />
          <StatCard
            label="Readiness"
            value={`${summary?.release_readiness_score ?? 100}%`}
            sub="Release health"
            accent="var(--accent)"
          />
        </div>
      </section>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Defect Worklist */}
        <section className="lg:col-span-2 card overflow-hidden" aria-labelledby="worklist-heading">
          <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 id="worklist-heading" className="text-base font-bold text-[var(--text-primary)]">
                Active Defect Worklist <span className="text-[var(--text-tertiary)] font-normal text-sm">({allBugs.length})</span>
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Prioritized queue of defects for current release scope</p>
            </div>
            <Link to="/bugs" className="btn btn-ghost btn-sm text-[var(--accent)] font-semibold">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-24">ID</th>
                  <th className="w-28">Severity</th>
                  <th>Summary</th>
                  <th className="w-32">Status</th>
                  <th className="w-36">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {allBugs.slice(0, 15).map((bug) => (
                  <tr key={bug.id}>
                    <td className="font-mono text-xs font-bold">
                      <Link to={`/bugs/${bug.id}`} className="text-[var(--accent)] hover:underline">
                        {bug.key}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <SeverityDot sev={bug.severity} />
                        <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">{bug.severity}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/bugs/${bug.id}`} className="font-semibold text-sm hover:text-[var(--accent)] transition-colors line-clamp-1">
                        {bug.title}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={bug.status} />
                    </td>
                    <td className="text-xs text-[var(--text-tertiary)]">{bug.assignee_name || 'Unassigned'}</td>
                  </tr>
                ))}
                {allBugs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[var(--text-tertiary)] text-sm">
                      No open defects in current scope
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right 1 Col: Component Density & Live Activity */}
        <div className="space-y-8">
          {/* Component Defect Density Card */}
          <section className="card overflow-hidden" aria-labelledby="density-heading">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 id="density-heading" className="text-base font-bold text-[var(--text-primary)]">Component Defect Density</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Highest concentration of open defects</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th className="text-right w-20">Defects</th>
                    <th className="text-right w-24">Blockers</th>
                  </tr>
                </thead>
                <tbody>
                  {densities.map((c) => (
                    <tr key={c.component_id}>
                      <td className="font-semibold text-xs text-[var(--text-primary)]">{c.component_name}</td>
                      <td className="text-right font-mono font-bold text-sm text-[var(--accent)]">{c.total_defects}</td>
                      <td className="text-right font-mono font-bold text-sm" style={{ color: '#ef4444' }}>{c.blockers}</td>
                    </tr>
                  ))}
                  {densities.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-[var(--text-tertiary)] text-xs">
                        No component metrics available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Real-time Activity Timeline */}
          <section className="card p-6" aria-labelledby="activity-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="activity-heading" className="text-base font-bold text-[var(--text-primary)]">Live Activity</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live stream active" />
            </div>
            <ul className="space-y-4" role="list">
              {activities.map((act) => (
                <li key={act.id} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                  >
                    {act.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-bold text-[var(--text-primary)]">{act.user_name}</span>{' '}
                      {act.action_type === 'created' && 'reported defect'}
                      {act.action_type === 'transition' && 'transitioned status on'}
                      {act.action_type === 'linked_commit' && 'linked commit to'}
                      {act.action_type === 'added_comment' && 'commented on'}
                      {' '}
                      <Link to={`/bugs/${act.bug_id}`} className="font-mono font-bold text-[var(--accent)] hover:underline">
                        {act.bug_key}
                      </Link>
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </li>
              ))}
              {activities.length === 0 && (
                <li className="text-xs text-[var(--text-tertiary)] text-center py-4">No recent activity logged</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
