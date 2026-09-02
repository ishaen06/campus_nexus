import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { CreateBugModal } from './components/CreateBugModal';
import { SkipLink } from './components/SkipLink';
import { A11yAnnouncer } from './components/A11yAnnouncer';
import { A11yToolbar } from './components/A11yToolbar';
import { ThemeProvider } from './context/ThemeContext';
import { A11yProvider } from './context/A11yContext';

import { Dashboard } from './pages/Dashboard';
import { BugList } from './pages/BugList';
import { BugKanban } from './pages/BugKanban';
import { BugDetail } from './pages/BugDetail';
import { DependencyView } from './pages/DependencyView';
import { Milestones } from './pages/Milestones';
import { AITriageCenter } from './pages/AITriageCenter';
import { GitIntegrations } from './pages/GitIntegrations';
import { AdvancedSearch } from './pages/AdvancedSearch';
import { AnalyticsView } from './pages/AnalyticsView';
import { SettingsView } from './pages/SettingsView';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';

import { api, realtime } from './api';
import { User, Product } from './types';

const FULL_SCREEN_ROUTES = ['/login', '/signup', '/set-password'];

function isFullScreenRoute(): boolean {
  return FULL_SCREEN_ROUTES.some((r) => window.location.pathname.startsWith(r));
}

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInitialData = async () => {
    try {
      let user: User | null = null;
      const storedUser = localStorage.getItem('omnibug_user');
      if (storedUser) {
        user = JSON.parse(storedUser);
      } else {
        const demo = await api.auth.demoLogin('admin');
        user = demo.user;
      }
      setCurrentUser(user);
      realtime.connect(user);
      const prods = await api.products.list();
      setProducts(prods);
    } catch (err) {
      console.error('Error initializing app:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
        >
          OB
        </div>
        <div className="text-sm text-[var(--text-tertiary)] font-medium">Loading OmniBug…</div>
        <div className="w-32 h-1 bg-[var(--bg-raised)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              animation: 'loading-bar 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes loading-bar {
            0%   { width: 0%; margin-left: 0%; }
            50%  { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <A11yProvider>
      <ThemeProvider>
        <Router>
          <SkipLink />
          <A11yAnnouncer />

          <Routes>
            {/* Full-screen auth routes — no shell */}
            <Route path="/login"        element={<Login onLoginSuccess={(u) => setCurrentUser(u)} />} />
            <Route path="/signup"       element={<Login onLoginSuccess={(u) => setCurrentUser(u)} />} />
            <Route path="/set-password" element={<SetPassword onLoginSuccess={(u) => setCurrentUser(u)} />} />

            {/* App shell routes */}
            <Route
              path="/*"
              element={
                <div className="app-shell">
                  <Navbar
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    selectedProductId={selectedProductId}
                    setSelectedProductId={setSelectedProductId}
                    products={products}
                    onOpenCreateModal={() => setCreateModalOpen(true)}
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  />

                  <div className="content-shell">
                    <Sidebar currentUser={currentUser} />

                    <main
                      id="main-content"
                      tabIndex={-1}
                      className="flex-1 overflow-y-auto focus:outline-none"
                      style={{ background: 'var(--bg-canvas)' }}
                    >
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <Dashboard
                              selectedProductId={selectedProductId}
                              currentUser={currentUser}
                              onOpenCreateModal={() => setCreateModalOpen(true)}
                            />
                          }
                        />
                        <Route
                          path="/bugs"
                          element={
                            <BugList
                              selectedProductId={selectedProductId}
                              onOpenCreateModal={() => setCreateModalOpen(true)}
                            />
                          }
                        />
                        <Route path="/bugs/:idOrKey" element={<BugDetail currentUser={currentUser} products={products} />} />
                        <Route
                          path="/kanban"
                          element={
                            <BugKanban
                              selectedProductId={selectedProductId}
                              onOpenCreateModal={() => setCreateModalOpen(true)}
                            />
                          }
                        />
                        <Route path="/dependencies" element={<DependencyView selectedProductId={selectedProductId} />} />
                        <Route path="/milestones" element={<Milestones products={products} selectedProductId={selectedProductId} />} />
                        <Route path="/ai-triage" element={<AITriageCenter products={products} onOpenCreateModal={() => setCreateModalOpen(true)} />} />
                        <Route path="/git" element={<GitIntegrations />} />
                        <Route path="/search" element={<AdvancedSearch products={products} />} />
                        <Route path="/analytics" element={<AnalyticsView selectedProductId={selectedProductId} products={products} />} />
                        <Route
                          path="/settings"
                          element={
                            <SettingsView
                              products={products}
                              currentUser={currentUser}
                              onRefreshProducts={async () => {
                                const prods = await api.products.list();
                                setProducts(prods);
                              }}
                            />
                          }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </div>

                  <CreateBugModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => {}}
                    products={products}
                    currentUser={currentUser}
                  />

                  <CommandPalette
                    isOpen={commandPaletteOpen}
                    onClose={() => setCommandPaletteOpen(false)}
                    onOpenCreateModal={() => {
                      setCommandPaletteOpen(false);
                      setCreateModalOpen(true);
                    }}
                  />

                  <A11yToolbar />
                </div>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </A11yProvider>
  );
}

export default App;
