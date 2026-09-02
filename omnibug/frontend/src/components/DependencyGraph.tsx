import React from 'react';
import { Link } from 'react-router-dom';
import { Bug } from '../types';

interface DependencyGraphProps {
  bugs: Bug[];
  activeBugKey?: string;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ bugs, activeBugKey }) => {
  const linkedBugs = bugs.filter((b) => (b.blocks && b.blocks.length > 0) || (b.depends_on && b.depends_on.length > 0));

  if (linkedBugs.length === 0) {
    return (
      <div className="bg-[#f8fafc] border border-[#cbd5e1] p-6 text-center text-xs text-slate-500 font-mono">
        (No active blocker dependencies recorded in this scope)
      </div>
    );
  }

  return (
    <fieldset className="bz-fieldset">
      <legend className="bz-legend">Dependency Tree & Blocker Matrix</legend>

      <table className="bz-table">
        <thead>
          <tr>
            <th className="w-24">Defect</th>
            <th>Summary</th>
            <th className="w-28">Severity</th>
            <th className="w-28">Status</th>
            <th>Blocks (Is Blocker For)</th>
            <th>Depends On (Prerequisites)</th>
          </tr>
        </thead>
        <tbody>
          {linkedBugs.map((bug) => {
            const isCurrent = activeBugKey === bug.key;

            return (
              <tr key={bug.id} className={isCurrent ? 'bg-[#fffde7]' : ''}>
                <td className="font-mono font-bold">
                  <Link to={`/bugs/${bug.id}`}>{bug.key}</Link>
                </td>
                <td className="font-medium text-slate-900">
                  <Link to={`/bugs/${bug.id}`}>{bug.title}</Link>
                </td>
                <td>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold badge-${bug.severity}`}>
                    {bug.severity}
                  </span>
                </td>
                <td>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold status-${bug.status}`}>
                    {bug.status}
                  </span>
                </td>
                <td>
                  {bug.blocks && bug.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {bug.blocks.map((k) => (
                        <span key={k} className="px-1.5 py-0.5 bg-[#ffebee] border border-[#ef9a9a] text-[#c62828] font-mono text-[11px] font-bold rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 font-mono">---</span>
                  )}
                </td>
                <td>
                  {bug.depends_on && bug.depends_on.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {bug.depends_on.map((k) => (
                        <span key={k} className="px-1.5 py-0.5 bg-[#fff3e0] border border-[#ffcc80] text-[#e65100] font-mono text-[11px] font-bold rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 font-mono">---</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
};
