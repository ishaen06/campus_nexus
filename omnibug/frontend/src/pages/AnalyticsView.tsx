import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../api';
import { AnalyticsSummary, ComponentDefectDensity, BurndownPoint, Product } from '../types';

interface AnalyticsViewProps {
  selectedProductId: string;
  products: Product[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ selectedProductId, products }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [burndown, setBurndown] = useState<BurndownPoint[]>([]);
  const [inflowOutflow, setInflowOutflow] = useState<any[]>([]);
  const [densities, setDensities] = useState<ComponentDefectDensity[]>([]);

  const fetchAnalytics = async () => {
    try {
      const [sum, burn, inout, den] = await Promise.all([
        api.analytics.getDashboardSummary(selectedProductId),
        api.analytics.getBurndown(selectedProductId, 14),
        api.analytics.getInflowOutflow(selectedProductId),
        api.analytics.getDefectDensity(selectedProductId),
      ]);
      setSummary(sum);
      setBurndown(burn);
      setInflowOutflow(inout);
      setDensities(den);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProductId]);

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Quality Analytics &amp; Reports
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Statistical summaries, sprint burndown trends, and component defect density
          </p>
        </div>
        <a
          href={api.analytics.exportCsvUrl(selectedProductId)}
          download="bug_report.csv"
          className="btn btn-secondary gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV Report
        </a>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="card p-6">
          <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Defects</div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{summary?.total_defects ?? 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">All time recorded</div>
        </div>

        <div className="card p-6">
          <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Open Issues</div>
          <div className="text-3xl font-bold tracking-tight text-[var(--accent)]">{summary?.open_defects ?? 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Active resolution queue</div>
        </div>

        <div className="card p-6">
          <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Release Blockers</div>
          <div className="text-3xl font-bold tracking-tight text-red-500">{summary?.blockers_count ?? 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Critical severity</div>
        </div>

        <div className="card p-6">
          <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">SLA Compliance</div>
          <div className="text-3xl font-bold tracking-tight text-emerald-500">{summary?.sla_compliance_percentage ?? 100}%</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Within target SLA</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Burndown Chart */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Sprint Defect Burndown (14 Days)</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Ideal burndown vs actual remaining open defect trajectory</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} name="Ideal Trajectory" />
                <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} name="Actual Remaining" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inflow vs Outflow */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Inflow vs Outflow Throughput</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">New incoming defects logged vs defects resolved/closed</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inflowOutflow} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="opened" fill="#ef4444" radius={[4, 4, 0, 0]} name="New Defects Opened" />
                <Bar dataKey="closed" fill="#10b981" radius={[4, 4, 0, 0]} name="Defects Resolved/Closed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Component Density Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Component Defect Density Ranking</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Defect concentration across architectural modules</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component / Module</th>
                <th className="text-right">Total Defects</th>
                <th className="text-right">Blockers</th>
                <th className="text-right">Critical</th>
                <th className="text-right">Major</th>
              </tr>
            </thead>
            <tbody>
              {densities.map((d) => (
                <tr key={d.component_id}>
                  <td className="font-semibold text-sm">{d.component_name}</td>
                  <td className="text-right font-mono font-bold text-sm text-[var(--accent)]">{d.total_defects}</td>
                  <td className="text-right font-mono font-bold text-sm text-red-500">{d.blockers}</td>
                  <td className="text-right font-mono font-bold text-sm text-orange-500">{d.critical}</td>
                  <td className="text-right font-mono text-sm text-[var(--text-secondary)]">{d.major}</td>
                </tr>
              ))}
              {densities.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--text-tertiary)] text-sm">
                    No component density metrics available
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
