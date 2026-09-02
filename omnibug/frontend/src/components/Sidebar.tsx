import React from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  currentUser: User | null;
}

const Icon = ({ path, size = 18 }: { path: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="flex-shrink-0"
  >
    <path d={path} />
  </svg>
);

const icons = {
  dashboard:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  bugs:         'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  kanban:       'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4m6-18h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-6 0V3',
  deps:         'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  milestones:   'M18 8h1a4 4 0 0 1 0 8h-1m-12 0H5a4 4 0 0 1 0-8h1m2 0h8m-8 8h8M9 8v8',
  ai:           'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 6v6m0 0h6',
  git:          'M16 3h5m0 0v5m0-5L10 14M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
  search:       'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35',
  analytics:    'M18 20V10M12 20V4M6 20v-6',
  settings:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.2-3a7.2 7.2 0 0 1-.072 1.02l2.2 1.72-2 3.46-2.58-.97a7.2 7.2 0 0 1-1.76 1.02l-.39 2.77h-3.98l-.39-2.77a7.2 7.2 0 0 1-1.76-1.02l-2.58.97-2-3.46 2.2-1.72a7.2 7.2 0 0 1 0-2.04L2.72 9.8l2-3.46 2.58.97a7.2 7.2 0 0 1 1.76-1.02L9.45 3.5h3.98l.39 2.77a7.2 7.2 0 0 1 1.76 1.02l2.58-.97 2 3.46-2.2 1.72c.047.336.072.676.072 1.02z',
  qa:           'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4',
  filter:       'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

interface NavItemDef {
  to: string;
  label: string;
  iconKey: keyof typeof icons;
  end?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser }) => {
  const isQaMode =
    currentUser?.role === 'reporter' ||
    currentUser?.role === 'qa_engineer' ||
    currentUser?.role === 'viewer';

  const devNav: NavItemDef[] = [
    { to: '/', label: 'Dashboard', iconKey: 'dashboard', end: true },
    { to: '/bugs', label: 'Defect Registry', iconKey: 'bugs' },
    { to: '/kanban', label: 'Kanban Board', iconKey: 'kanban' },
    { to: '/dependencies', label: 'Dependencies', iconKey: 'deps' },
    { to: '/milestones', label: 'Milestones', iconKey: 'milestones' },
    { to: '/ai-triage', label: 'AI Triage Lab', iconKey: 'ai' },
    { to: '/git', label: 'Git & CI/CD', iconKey: 'git' },
    { to: '/search', label: 'Advanced Search', iconKey: 'search' },
    { to: '/analytics', label: 'Analytics & Reports', iconKey: 'analytics' },
    { to: '/settings', label: 'Workspace Settings', iconKey: 'settings' },
  ];

  const qaNav: NavItemDef[] = [
    { to: '/', label: 'QA Test Center', iconKey: 'qa', end: true },
    { to: '/bugs', label: 'Defect Registry', iconKey: 'bugs' },
    { to: '/search', label: 'Query Builder', iconKey: 'search' },
    { to: '/bugs?status=resolved', label: 'Fixes for Retest', iconKey: 'filter' },
  ];

  const quickLinks: NavItemDef[] = [
    { to: '/bugs?severity=blocker', label: 'Release Blockers', iconKey: 'filter' },
    { to: `/bugs?assignee_id=${currentUser?.id || 'me'}`, label: 'Assigned to Me', iconKey: 'filter' },
    { to: '/bugs?status=in_progress', label: 'In Progress', iconKey: 'filter' },
  ];

  const navItems = isQaMode ? qaNav : devNav;

  return (
    <aside
      role="navigation"
      aria-label="Sidebar navigation"
      style={{ width: 'var(--sidebar-width)' }}
      className="bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col h-full flex-shrink-0 overflow-y-auto"
    >
      <div className="flex-1 py-5 px-3.5 space-y-6">
        {/* Main Navigation Group */}
        <section aria-labelledby="main-nav-label">
          <div id="main-nav-label" className="nav-section-label">
            {isQaMode ? 'QA Workspace' : 'Core Workspace'}
          </div>
          <ul className="space-y-1 mt-1" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon path={icons[item.iconKey]} size={16} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </section>

        {/* Quick Filters Group (Dev mode) */}
        {!isQaMode && (
          <section aria-labelledby="filters-nav-label">
            <div id="filters-nav-label" className="nav-section-label">
              Saved Views
            </div>
            <ul className="space-y-1 mt-1" role="list">
              {quickLinks.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] opacity-60 flex-shrink-0 ml-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Footer Status / User Card */}
      {currentUser && (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)]/50 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {currentUser.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {currentUser.full_name}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                {isQaMode ? 'QA Engineer' : 'Lead Developer'}
              </div>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online" />
        </div>
      )}
    </aside>
  );
};
