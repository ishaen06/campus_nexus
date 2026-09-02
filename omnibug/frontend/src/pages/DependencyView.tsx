import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Bug } from '../types';
import { DependencyGraph } from '../components/DependencyGraph';

interface DependencyViewProps {
  selectedProductId: string;
}

export const DependencyView: React.FC<DependencyViewProps> = ({ selectedProductId }) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBugs = async () => {
      setLoading(true);
      try {
        const data = await api.bugs.list({
          product_id: selectedProductId !== 'all' ? selectedProductId : undefined,
          limit: 100,
        });
        setBugs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBugs();
  }, [selectedProductId]);

  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Dependency Tree &amp; Blocker Matrix
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Interactive visual mapping of release blockers and dependent prerequisite defects
          </p>
        </div>
      </div>

      <div className="card p-6 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-tertiary)]">
            Loading dependency graph…
          </div>
        ) : (
          <DependencyGraph bugs={bugs} />
        )}
      </div>
    </div>
  );
};
