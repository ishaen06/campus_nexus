import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Product, User } from '../types';

interface SettingsViewProps {
  products: Product[];
  currentUser: User | null;
  onRefreshProducts: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ products, currentUser, onRefreshProducts }) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'workflows' | 'sla' | 'rbac'>('hierarchy');

  // New Product Modal
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrefix, setNewProdPrefix] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // New Component State
  const [selectedProdForComp, setSelectedProdForComp] = useState(products[0]?.id || '');
  const [newCompName, setNewCompName] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');

  // Workflow states & SLA policies
  const [workflowStates, setWorkflowStates] = useState<any[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.workflows.getStates().then(setWorkflowStates).catch(console.error);
    api.workflows.getSlaPolicies().then(setSlaPolicies).catch(console.error);
    api.auth.listUsers().then(setUsers).catch(console.error);
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrefix.trim()) return;

    setIsCreatingProduct(true);
    try {
      await api.products.create({
        name: newProdName.trim(),
        key_prefix: newProdPrefix.trim().toUpperCase(),
        description: newProdDesc.trim(),
      });
      setNewProdName('');
      setNewProdPrefix('');
      setNewProdDesc('');
      onRefreshProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !selectedProdForComp) return;

    try {
      await api.products.createComponent({
        product_id: selectedProdForComp,
        name: newCompName.trim(),
        description: newCompDesc.trim(),
      });
      setNewCompName('');
      setNewCompDesc('');
      onRefreshProducts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Workspace Configuration &amp; Administration
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage product hierarchies, custom workflow states, SLA rules, and team access
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-2">
        {(
          [
            { id: 'hierarchy', label: 'Products & Components' },
            { id: 'workflows', label: 'Workflow States' },
            { id: 'sla', label: 'SLA Escalation Policies' },
            { id: 'rbac', label: 'User Roles & Access' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-[var(--accent)] border-[var(--accent)]'
                : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hierarchy Tab */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Product */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Register New Product Area</h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="field-label field-required">Product Name</label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Gecko Core"
                      className="input"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label field-required">Key Prefix</label>
                    <input
                      type="text"
                      required
                      value={newProdPrefix}
                      onChange={(e) => setNewProdPrefix(e.target.value)}
                      placeholder="e.g. GEC"
                      className="input uppercase font-mono"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <input
                    type="text"
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Brief description of product domain…"
                    className="input"
                  />
                </div>
                <button type="submit" disabled={isCreatingProduct} className="btn btn-primary">
                  {isCreatingProduct ? 'Creating…' : 'Register Product'}
                </button>
              </form>
            </div>

            {/* Create Component */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Add Architectural Component</h2>
              <form onSubmit={handleCreateComponent} className="space-y-4">
                <div className="field">
                  <label className="field-label field-required">Parent Product</label>
                  <select
                    value={selectedProdForComp}
                    onChange={(e) => setSelectedProdForComp(e.target.value)}
                    className="input"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.key_prefix} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label field-required">Component Name</label>
                  <input
                    type="text"
                    required
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="e.g. Layout / Reflow Engine"
                    className="input"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <input
                    type="text"
                    value={newCompDesc}
                    onChange={(e) => setNewCompDesc(e.target.value)}
                    placeholder="Component module scope…"
                    className="input"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Component
                </button>
              </form>
            </div>
          </div>

          {/* Product Hierarchy List */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Existing Products &amp; Components</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {products.map((p) => (
                <div key={p.id} className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-light)] px-2.5 py-1 rounded">
                        {p.key_prefix}
                      </span>
                      <span className="font-bold text-base text-[var(--text-primary)]">{p.name}</span>
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)]">{p.components?.length || 0} components</span>
                  </div>
                  {p.description && <p className="text-xs text-[var(--text-secondary)]">{p.description}</p>}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {p.components?.map((c) => (
                      <span key={c.id} className="badge" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflow States Tab */}
      {activeTab === 'workflows' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Configured Workflow States</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>State ID</th>
                <th>Display Label</th>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {workflowStates.map((ws) => (
                <tr key={ws.id || ws.name}>
                  <td className="font-mono text-xs font-bold text-[var(--accent)]">{ws.name}</td>
                  <td className="font-semibold">{ws.label || ws.name}</td>
                  <td><span className="badge badge-confirmed">{ws.category || 'Standard'}</span></td>
                  <td className="text-xs text-[var(--text-secondary)]">{ws.description || 'Process stage'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SLA Policies Tab */}
      {activeTab === 'sla' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">SLA Thresholds &amp; Escalation Rules</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity Tier</th>
                <th>Response Time Limit</th>
                <th>Resolution Target</th>
                <th>Escalation Pathway</th>
              </tr>
            </thead>
            <tbody>
              {slaPolicies.map((sla, idx) => (
                <tr key={idx}>
                  <td className="font-bold uppercase text-xs">{sla.severity || 'Blocker'}</td>
                  <td className="font-mono">{sla.response_hours || 2} hours</td>
                  <td className="font-mono font-bold text-emerald-500">{sla.resolve_hours || 12} hours</td>
                  <td className="text-xs text-[var(--text-secondary)]">{sla.escalation_channel || 'Engineering Lead & On-Call'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RBAC Tab */}
      {activeTab === 'rbac' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]">User Directory &amp; Roles ({users.length})</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-bold">{u.full_name}</td>
                  <td className="font-mono text-xs text-[var(--text-secondary)]">{u.email}</td>
                  <td>
                    <span className="badge badge-confirmed font-semibold">
                      {u.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--text-tertiary)]">{u.team || 'Engineering'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
