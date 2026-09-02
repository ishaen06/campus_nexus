import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, realtime } from '../api';
import { Bug, User as UserType } from '../types';
import { useA11y } from '../context/A11yContext';

interface BugListProps {
  selectedProductId: string;
  onOpenCreateModal: () => void;
}

const SevDot = ({ sev }: { sev: string }) => {
  const c: Record<string, string> = {
    blocker: '#ef4444',
    critical: '#ef4444',
    major: '#f97316',
    normal: '#3b82f6',
    minor: '#a1a1aa',
  };
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block" style={{ background: c[sev] || '#a1a1aa' }} />;
};

type SortField = 'key' | 'severity' | 'priority' | 'status' | 'created_at';

export const BugList: React.FC<BugListProps> = ({ selectedProductId, onOpenCreateModal }) => {
  const { announce } = useA11y();
  const [searchParams] = useSearchParams();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || 'all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState(searchParams.get('assignee_id') || 'all');

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const data = await api.bugs.list({
        product_id: selectedProductId !== 'all' ? selectedProductId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        assignee_id: assigneeFilter !== 'all' ? assigneeFilter : undefined,
        search: search || undefined,
      });
      setBugs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
    api.auth.listUsers().then(setUsers).catch(console.error);
    const refresh = () => fetchBugs();
    realtime.on('BUG_CREATED', refresh);
    realtime.on('BUG_UPDATED', refresh);
    realtime.on('STATUS_CHANGED', refresh);
    realtime.on('BULK_UPDATED', refresh);
    return () => {
      realtime.off('BUG_CREATED', refresh);
      realtime.off('BUG_UPDATED', refresh);
      realtime.off('STATUS_CHANGED', refresh);
      realtime.off('BULK_UPDATED', refresh);
    };
  }, [selectedProductId, statusFilter, severityFilter, assigneeFilter, search]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    announce(`Sorted by ${field} ${!sortAsc ? 'ascending' : 'descending'}`);
  };

  const sorted = [...bugs].sort((a, b) => {
    const va = a[sortField] ?? '';
    const vb = b[sortField] ?? '';
    return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
  });

  const toggleAll = () => {
    const next = selected.length === bugs.length ? [] : bugs.map((b) => b.id);
    setSelected(next);
    announce(next.length ? `Selected all ${next.length} defects` : 'Deselected all');
  };

  const bulkAction = async (action: string, value: string | boolean) => {
    if (!selected.length) return;
    try {
      await api.bugs.bulkAction({ bug_ids: selected, action, value });
      announce(`Updated ${selected.length} defects`);
      setSelected([]);
      fetchBugs();
    } catch (err) {
      console.error(err);
    }
  };

  const SortTh = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th className={className} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1.5">
        {label}
        <span className="text-[var(--text-tertiary)] font-normal">{sortField === field ? (sortAsc ? '↑' : '↓') : ''}</span>
      </span>
    </th>
  );

  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Defect Registry</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Browse, filter, search, and manage all software defect records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={api.analytics.exportCsvUrl(selectedProductId)}
            download="defects.csv"
            className="btn btn-secondary gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </a>
          <button onClick={onOpenCreateModal} className="btn btn-primary gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Defect
          </button>
        </div>
      </div>

      {/* Spacious Filter & Search Bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search defects by title, ID, or description…"
              className="input"
              aria-label="Search defects"
            />
          </div>

          <div className="w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              aria-label="Filter by status"
            >
              <option value="all">Status: All</option>
              <option value="unconfirmed">Unconfirmed</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>
          </div>

          <div className="w-44">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input"
              aria-label="Filter by severity"
            >
              <option value="all">Severity: All</option>
              <option value="blocker">Blocker</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="normal">Normal</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          <div className="w-48">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="input"
              aria-label="Filter by assignee"
            >
              <option value="all">Assignee: All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {(statusFilter !== 'all' || severityFilter !== 'all' || assigneeFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSeverityFilter('all');
                setAssigneeFilter('all');
                setSearch('');
              }}
              className="btn btn-ghost text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div
            className="flex items-center gap-3 p-3 mt-3 rounded-xl border"
            style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
          >
            <span className="text-xs font-bold text-[var(--accent)] pl-2">{selected.length} defects selected</span>
            <div className="h-4 w-px bg-[var(--border)] mx-1" />
            <button onClick={() => bulkAction('set_status', 'confirmed')} className="btn btn-secondary btn-sm">
              Mark Confirmed
            </button>
            <button onClick={() => bulkAction('set_status', 'resolved')} className="btn btn-secondary btn-sm">
              Mark Resolved
            </button>
            <button onClick={() => bulkAction('set_status', 'closed')} className="btn btn-secondary btn-sm">
              Mark Closed
            </button>
            <button
              onClick={async () => {
                if (window.confirm(`Delete ${selected.length} defect(s)?`)) {
                  await bulkAction('delete', true);
                }
              }}
              className="btn btn-danger btn-sm ml-auto"
            >
              Delete
            </button>
            <button onClick={() => setSelected([])} className="btn btn-ghost btn-sm text-[var(--text-tertiary)]">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selected.length > 0 && selected.length === bugs.length}
                    onChange={toggleAll}
                    className="accent-[var(--accent)] w-4 h-4 rounded cursor-pointer"
                    aria-label="Select all defects"
                  />
                </th>
                <SortTh field="key" label="ID" className="w-28" />
                <SortTh field="severity" label="Severity" className="w-28" />
                <SortTh field="priority" label="Priority" className="w-28" />
                <th>Summary</th>
                <th className="w-36">Assignee</th>
                <SortTh field="status" label="Status" className="w-32" />
                <th className="w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((bug) => (
                <tr key={bug.id} className={selected.includes(bug.id) ? 'bg-[var(--accent-light)]' : ''}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(bug.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(bug.id)
                            ? selected.filter((id) => id !== bug.id)
                            : [...selected, bug.id]
                        )
                      }
                      className="accent-[var(--accent)] w-4 h-4 rounded cursor-pointer"
                      aria-label={`Select defect ${bug.key}`}
                    />
                  </td>
                  <td className="font-mono text-xs font-bold">
                    <Link to={`/bugs/${bug.id}`} className="text-[var(--accent)] hover:underline">
                      {bug.key}
                    </Link>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <SevDot sev={bug.severity} />
                      <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">{bug.severity}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs font-semibold text-[var(--text-tertiary)]">
                    {bug.priority?.replace('_', ' ').toUpperCase()}
                  </td>
                  <td>
                    <Link to={`/bugs/${bug.id}`} className="font-semibold text-sm hover:text-[var(--accent)] transition-colors">
                      {bug.title}
                    </Link>
                  </td>
                  <td className="text-xs text-[var(--text-tertiary)] font-medium">{bug.assignee_name || 'Unassigned'}</td>
                  <td>
                    <span className={`badge badge-${bug.status}`}>{bug.status.replace('_', ' ')}</span>
                  </td>
                  <td className="text-right">
                    <Link to={`/bugs/${bug.id}`} className="btn btn-ghost btn-sm text-[var(--accent)] font-semibold">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[var(--text-tertiary)] text-sm">
                    <p className="font-medium text-base text-[var(--text-secondary)]">No defects match your filters</p>
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setSeverityFilter('all');
                        setAssigneeFilter('all');
                        setSearch('');
                      }}
                      className="mt-2 text-sm text-[var(--accent)] font-semibold hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[var(--text-tertiary)] text-sm">
                    Loading defects…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-canvas)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>Showing {sorted.length} of {bugs.length} total defects</span>
          <span>OmniBug Defect Tracking System</span>
        </div>
      </div>
    </div>
  );
};
