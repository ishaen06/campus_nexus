import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Product, User, BugSeverity, BugPriority } from '../types';
import { useA11y } from '../context/A11yContext';

interface CreateBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBug: any) => void;
  products: Product[];
  currentUser: User | null;
}

export const CreateBugModal: React.FC<CreateBugModalProps> = ({
  isOpen, onClose, onSuccess, products, currentUser,
}) => {
  const { announce } = useA11y();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [componentId, setComponentId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [priority, setPriority] = useState<BugPriority>('p3_medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [isSecurity, setIsSecurity] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [steps, setSteps] = useState([{ step_number: 1, action: '', expected: '', actual: '', is_verified: false }]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [os, setOs] = useState('Linux');
  const [browser, setBrowser] = useState('Chrome');

  useEffect(() => {
    if (!isOpen) return;
    announce('Create defect dialog opened');
    titleRef.current?.focus();

    const ua = navigator.userAgent;
    setOs(ua.includes('Win') ? 'Windows 11' : ua.includes('Mac') ? 'macOS' : 'Linux');
    setBrowser(ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 'Chrome');

    if (products.length > 0 && !productId) {
      setProductId(products[0].id);
      setComponentId(products[0].components?.[0]?.id || '');
    }
    api.auth.listUsers().then(setUsers).catch(console.error);
  }, [isOpen, products]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) { onClose(); announce('Dialog closed'); } };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [isOpen]);

  useEffect(() => {
    if (title.length < 5) { setDuplicates([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.ai.checkDuplicates({ title, description, product_id: productId });
        setDuplicates(res.matches || []);
        if (res.matches?.length > 0) announce(`Warning: ${res.matches.length} similar defects found`);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, description, productId]);

  const currentProduct = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !productId) return;
    setIsSubmitting(true);
    try {
      const newBug = await api.bugs.create({
        title: title.trim(),
        description: description.trim(),
        product_id: productId,
        component_id: componentId || currentProduct?.components?.[0]?.id || '',
        milestone_id: milestoneId || undefined,
        severity, priority,
        status: 'unconfirmed' as any,
        assignee_id: assigneeId || undefined,
        version: version || '1.0.0',
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        is_security_vulnerability: isSecurity,
        environment: { os, browser, version, hardware: 'PC', environment_type: 'production' },
        reproduction_steps: steps.filter((s) => s.action.trim() !== ''),
        stack_trace: stackTrace.trim() || undefined,
        estimated_hours: 4,
      });
      announce(`Defect ${newBug.key} created`);
      onSuccess(newBug);
      onClose();
      // Reset
      setTitle(''); setDescription(''); setStackTrace(''); setTagsInput('');
      setSteps([{ step_number: 1, action: '', expected: '', actual: '', is_verified: false }]);
      setSeverity('normal'); setPriority('p3_medium');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-bug-title"
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              +
            </div>
            <h2 id="create-bug-title" className="text-sm font-semibold text-[var(--text-primary)]">
              Create defect {currentProduct && `— ${currentProduct.name}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm text-[var(--text-tertiary)]"
            aria-label="Close dialog"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body space-y-5">
          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg border text-xs space-y-1"
              style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning)' }}
            >
              <div className="font-semibold">Possible duplicates detected:</div>
              <ul className="space-y-0.5">
                {duplicates.slice(0, 2).map((m) => (
                  <li key={m.id} className="font-mono">
                    {m.key}: <span className="font-sans text-[var(--text-secondary)]">{m.title}</span>
                    <span className="ml-2 font-bold">{m.similarity_score}% match</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="m-product" className="field-label field-required">Product</label>
              <select
                id="m-product" required value={productId}
                onChange={(e) => { setProductId(e.target.value); const p = products.find((x) => x.id === e.target.value); setComponentId(p?.components?.[0]?.id || ''); }}
                className="input"
              >
                {products.map((p) => <option key={p.id} value={p.id}>{p.key_prefix} — {p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="m-component" className="field-label field-required">Component</label>
              <select id="m-component" required value={componentId} onChange={(e) => setComponentId(e.target.value)} className="input">
                {currentProduct?.components?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="field">
            <label htmlFor="m-title" className="field-label field-required">Defect summary</label>
            <input
              id="m-title" ref={titleRef} type="text" required
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Concise description of the defect…"
              className="input"
            />
          </div>

          {/* Description */}
          <div className="field">
            <label htmlFor="m-desc" className="field-label field-required">Details</label>
            <textarea
              id="m-desc" rows={3} required
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the defect, expected vs actual behavior…"
              className="input"
            />
          </div>

          {/* Classification row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="field">
              <label htmlFor="m-severity" className="field-label field-required">Severity</label>
              <select id="m-severity" required value={severity} onChange={(e) => setSeverity(e.target.value as BugSeverity)} className="input">
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="normal">Normal</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="m-priority" className="field-label">Priority</label>
              <select id="m-priority" value={priority} onChange={(e) => setPriority(e.target.value as BugPriority)} className="input">
                <option value="p1_urgent">P1 Urgent</option>
                <option value="p2_high">P2 High</option>
                <option value="p3_medium">P3 Medium</option>
                <option value="p4_low">P4 Low</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="m-assignee" className="field-label">Assignee</label>
              <select id="m-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Steps */}
          <fieldset>
            <legend className="text-xs font-semibold text-[var(--text-primary)] mb-2">Reproduction steps</legend>
            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-tertiary)] w-4 flex-shrink-0">{idx + 1}.</span>
                  <input
                    type="text" value={s.action}
                    onChange={(e) => { const u = [...steps]; u[idx] = { ...u[idx], action: e.target.value }; setSteps(u); }}
                    placeholder="Step action"
                    className="input input-sm flex-1"
                    aria-label={`Step ${idx + 1} action`}
                  />
                  <input
                    type="text" value={s.expected || ''}
                    onChange={(e) => { const u = [...steps]; u[idx] = { ...u[idx], expected: e.target.value }; setSteps(u); }}
                    placeholder="Expected"
                    className="input input-sm w-1/3"
                    aria-label={`Step ${idx + 1} expected result`}
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSteps(steps.filter((_, i) => i !== idx).map((step, i) => ({ ...step, step_number: i + 1 })))}
                      className="btn btn-ghost btn-icon btn-sm text-[var(--danger)]"
                      aria-label={`Remove step ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSteps([...steps, { step_number: steps.length + 1, action: '', expected: '', actual: '', is_verified: false }])}
                className="btn btn-ghost btn-sm text-[var(--text-tertiary)]"
              >
                + Add step
              </button>
            </div>
          </fieldset>

          {/* Stack trace */}
          <div className="field">
            <label htmlFor="m-stack" className="field-label">Stack trace / error log</label>
            <textarea
              id="m-stack" rows={2}
              value={stackTrace} onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Paste error output or backtrace…"
              className="input font-mono text-xs"
            />
          </div>

          {/* Extra options row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="field">
              <label htmlFor="m-version" className="field-label">Version</label>
              <input id="m-version" type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="input input-sm font-mono" />
            </div>
            <div className="field">
              <label htmlFor="m-tags" className="field-label">Tags (comma-separated)</label>
              <input id="m-tags" type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="regression, ui, perf" className="input input-sm" />
            </div>
            <div className="field pt-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--text-secondary)]">
                <input type="checkbox" checked={isSecurity} onChange={(e) => setIsSecurity(e.target.checked)} className="accent-[var(--accent)] w-4 h-4" />
                Security vulnerability
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            type="submit"
            form=""
            disabled={isSubmitting || !title.trim()}
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating…' : 'Create defect'}
          </button>
        </div>
      </div>
    </div>
  );
};
