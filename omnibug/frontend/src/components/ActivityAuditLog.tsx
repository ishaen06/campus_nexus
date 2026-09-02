import React from 'react';
import { ActivityLog } from '../types';

interface ActivityAuditLogProps {
  activities: ActivityLog[];
}

export const ActivityAuditLog: React.FC<ActivityAuditLogProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="card p-8 text-center text-xs text-[var(--text-tertiary)] border-dashed">
        No defect modification history recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-40">User</th>
            <th className="w-44">Timestamp</th>
            <th className="w-36">Field / Action</th>
            <th>Old Value</th>
            <th>New Value</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr key={act.id}>
              <td className="font-bold text-xs">{act.user_name}</td>
              <td className="font-mono text-xs text-[var(--text-tertiary)]">
                {new Date(act.timestamp).toLocaleString()}
              </td>
              <td>
                <span className="badge badge-confirmed font-mono text-[11px]">
                  {act.field_name || act.action_type}
                </span>
              </td>
              <td className="font-mono text-xs text-red-500 line-through">
                {act.old_value || '—'}
              </td>
              <td className="font-mono text-xs text-emerald-600 font-semibold">
                {act.new_value || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
