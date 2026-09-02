import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Bug, Product } from '../types';

interface AdvancedSearchProps {
  products: Product[];
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ products }) => {
  const [nlQuery, setNlQuery] = useState('Show all P1 blockers with security vulnerabilities');
  const [isNlSearching, setIsNlSearching] = useState(false);

  // Structured query filters
  const [productId, setProductId] = useState('all');
  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [keyword, setKeyword] = useState('');

  const [results, setResults] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);

  const executeSearch = async () => {
    setLoading(true);
    try {
      const data = await api.bugs.list({
        product_id: productId !== 'all' ? productId : undefined,
        status: status !== 'all' ? status : undefined,
        severity: severity !== 'all' ? severity : undefined,
        search: keyword.trim() || undefined,
      });
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;

    setIsNlSearching(true);
    try {
      const res = await api.ai.nlSearch(nlQuery.trim());
      const data = await api.bugs.list({
        severity: res.interpreted_filters?.['$or'] ? 'blocker' : undefined,
        is_security: res.interpreted_filters?.is_security_vulnerability ? true : undefined,
      });
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsNlSearching(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [productId, status, severity]);

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Advanced Search &amp; Query Builder
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Natural language AI search, multi-parameter boolean queries, and filter sets
          </p>
        </div>
      </div>

      {/* AI Natural Language Query Box */}
      <div className="card p-6 border-2" style={{ borderColor: 'var(--accent-glow)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">✨</span>
          <h2 className="text-base font-bold text-[var(--text-primary)]">AI Natural Language Query</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Type queries in plain English (e.g. &quot;Find high severity memory leaks assigned to Alex in v2.4&quot;)
        </p>

        <form onSubmit={handleNlSearch} className="flex gap-3">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="Ask AI to query defects in plain language…"
            className="input font-medium"
          />
          <button type="submit" disabled={isNlSearching || !nlQuery.trim()} className="btn btn-primary px-6 flex-shrink-0">
            {isNlSearching ? 'Analyzing…' : 'AI Query'}
          </button>
        </form>
      </div>

      {/* Structured Multi-Parameter Query Filter Bar */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Structured Boolean Query Builder</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="field">
            <label className="field-label">Keyword / Text</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyword…"
              className="input"
            />
          </div>

          <div className="field">
            <label className="field-label">Product Scope</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.key_prefix} — {p.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Status State</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="all">All Statuses</option>
              <option value="unconfirmed">Unconfirmed</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Severity Level</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="input">
              <option value="all">All Severities</option>
              <option value="blocker">Blocker</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="normal">Normal</option>
              <option value="minor">Minor</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => {
              setKeyword('');
              setProductId('all');
              setStatus('all');
              setSeverity('all');
            }}
            className="btn btn-secondary"
          >
            Reset Filters
          </button>
          <button onClick={executeSearch} className="btn btn-primary px-6">
            Search Records
          </button>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Matching Defect Records ({results.length})
          </h2>
          {results.length > 0 && (
            <span className="text-xs text-[var(--text-tertiary)]">Ordered by relevance</span>
          )}
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
                <th className="w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((bug) => (
                <tr key={bug.id}>
                  <td className="font-mono text-xs font-bold">
                    <Link to={`/bugs/${bug.id}`} className="text-[var(--accent)] hover:underline">
                      {bug.key}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${bug.severity}`}>{bug.severity}</span>
                  </td>
                  <td>
                    <Link to={`/bugs/${bug.id}`} className="font-semibold text-sm hover:text-[var(--accent)] transition-colors">
                      {bug.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${bug.status}`}>{bug.status.replace('_', ' ')}</span>
                  </td>
                  <td className="text-xs text-[var(--text-tertiary)]">{bug.assignee_name || 'Unassigned'}</td>
                  <td className="text-right">
                    <Link to={`/bugs/${bug.id}`} className="btn btn-ghost btn-sm text-[var(--accent)] font-semibold">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-[var(--text-tertiary)]">
                    No defects found matching current search parameters
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-[var(--text-tertiary)]">
                    Running query…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
