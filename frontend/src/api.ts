import axios from 'axios';
import {
  User, Product, Component, Milestone, Bug, Comment, GitCommit,
  ActivityLog, AITriageResponse, DuplicateCheckResponse,
  AnalyticsSummary, ComponentDefectDensity, BurndownPoint, AuthMessageResponse
} from './types';

const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000/ws/collaboration';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('omnibug_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// WebSocket Real-time Manager
type EventCallback = (data: any) => void;
class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimer: any = null;

  public connect(user?: User | null) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const userId = user?.id || 'anonymous';
    const username = encodeURIComponent(user?.full_name || 'Anonymous User');
    const role = user?.role || 'viewer';
    const wsUrl = `${WS_BASE}?user_id=${userId}&username=${username}&role=${role}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('⚡ Connected to OmniBug Real-Time Collaboration Hub');
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event;
          if (eventType && this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach((cb) => cb(payload.data));
          }
          if (this.listeners.has('*')) {
            this.listeners.get('*')?.forEach((cb) => cb(payload));
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(user), 3000);
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket connection error (retrying):', err);
      };
    } catch (e) {
      console.error('WebSocket initialization error:', e);
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  public disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const realtime = new RealtimeClient();

// --- Typed API Services ---

export const api = {
  // Auth & Personas
  auth: {
    registerInit: async (data: { email: string; full_name: string; username?: string; role?: string; team?: string }) => {
      const res = await apiClient.post<AuthMessageResponse>('/auth/register-init', data);
      return res.data;
    },
    validateToken: async (email: string, token: string) => {
      const res = await apiClient.get<{ valid: boolean; email: string; full_name?: string; message?: string }>(
        `/auth/validate-token?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );
      return res.data;
    },
    setPasswordWithToken: async (data: { token: string; email: string; password: string }) => {
      const res = await apiClient.post<{ access_token: string; user: User }>('/auth/set-password-with-token', data);
      localStorage.setItem('omnibug_token', res.data.access_token);
      localStorage.setItem('omnibug_user', JSON.stringify(res.data.user));
      return res.data;
    },
    resendLink: async (email: string) => {
      const res = await apiClient.post<AuthMessageResponse>('/auth/resend-link', { email });
      return res.data;
    },
    login: async (emailOrUsername: string, password: string) => {
      const res = await apiClient.post<{ access_token: string; user: User }>('/auth/login', {
        email_or_username: emailOrUsername,
        password,
      });
      localStorage.setItem('omnibug_token', res.data.access_token);
      localStorage.setItem('omnibug_user', JSON.stringify(res.data.user));
      return res.data;
    },
    demoLogin: async (roleName: string) => {
      const res = await apiClient.post<{ access_token: string; user: User }>(`/auth/demo-login/${roleName}`);
      localStorage.setItem('omnibug_token', res.data.access_token);
      localStorage.setItem('omnibug_user', JSON.stringify(res.data.user));
      return res.data;
    },
    getMe: async () => {
      const res = await apiClient.get<User>('/auth/me');
      return res.data;
    },
    listUsers: async () => {
      const res = await apiClient.get<User[]>('/auth/users');
      return res.data;
    },
    logout: () => {
      localStorage.removeItem('omnibug_token');
      localStorage.removeItem('omnibug_user');
    },
    reseed: async () => {
      const res = await apiClient.post<{ message: string }>('/auth/reseed');
      return res.data;
    },
  },

  // Products & Milestones
  products: {
    list: async () => {
      const res = await apiClient.get<Product[]>('/products');
      return res.data;
    },
    get: async (id: string) => {
      const res = await apiClient.get<Product>(`/products/${id}`);
      return res.data;
    },
    create: async (data: Partial<Product>) => {
      const res = await apiClient.post<Product>('/products', data);
      return res.data;
    },
    createComponent: async (data: { product_id: string; name: string; description?: string; default_assignee_id?: string; default_qa_contact_id?: string }) => {
      const res = await apiClient.post<Component>('/components', data);
      return res.data;
    },
    createMilestone: async (data: { product_id: string; name: string; description?: string; target_date?: string; status?: string; is_release_blocker?: boolean; release_notes?: string }) => {
      const res = await apiClient.post<Milestone>('/milestones', data);
      return res.data;
    },
    getMilestoneChangelog: async (milestoneId: string) => {
      const res = await apiClient.get<{ milestone_name: string; total_resolved: number; changelog_markdown: string }>(`/milestones/${milestoneId}/changelog`);
      return res.data;
    },
  },

  // Bugs Lifecycle & Actions
  bugs: {
    list: async (params?: {
      product_id?: string;
      component_id?: string;
      milestone_id?: string;
      status?: string;
      severity?: string;
      priority?: string;
      assignee_id?: string;
      reporter_id?: string;
      is_security?: boolean;
      tag?: string;
      search?: string;
      limit?: number;
      skip?: number;
    }) => {
      const res = await apiClient.get<Bug[]>('/bugs', { params });
      return res.data;
    },
    get: async (idOrKey: string) => {
      const res = await apiClient.get<Bug>(`/bugs/${idOrKey}`);
      return res.data;
    },
    create: async (data: Partial<Bug>) => {
      const res = await apiClient.post<Bug>('/bugs', data);
      return res.data;
    },
    update: async (bugId: string, data: Partial<Bug>) => {
      const res = await apiClient.put<Bug>(`/bugs/${bugId}`, data);
      return res.data;
    },
    transition: async (bugId: string, data: { to_status: string; resolution?: string | null; comment?: string; root_cause_category?: string; duplicate_of?: string }) => {
      const res = await apiClient.post<Bug>(`/bugs/${bugId}/transition`, data);
      return res.data;
    },
    bulkAction: async (data: { bug_ids: string[]; action: string; value: any; comment?: string }) => {
      const res = await apiClient.post<{ message: string; modified_count?: number }>('/bugs/bulk', data);
      return res.data;
    },
    toggleReproStep: async (bugId: string, stepNumber: number) => {
      const res = await apiClient.post<{ reproduction_steps: any[] }>(`/bugs/${bugId}/reproduction-steps/${stepNumber}/toggle`);
      return res.data;
    },
    logTime: async (bugId: string, spentHours: number, remainingHours?: number) => {
      const res = await apiClient.post<{ spent_hours: number; remaining_hours: number }>(`/bugs/${bugId}/time`, null, {
        params: { spent_hours: spentHours, remaining_hours: remainingHours },
      });
      return res.data;
    },
    linkDependency: async (bugId: string, targetKey: string, relation: 'blocks' | 'depends_on') => {
      const res = await apiClient.post<{ message: string; blocks: string[]; depends_on: string[] }>(`/bugs/${bugId}/link-dependency`, null, {
        params: { target_key: targetKey, relation },
      });
      return res.data;
    },
    delete: async (bugId: string) => {
      const res = await apiClient.delete(`/bugs/${bugId}`);
      return res.data;
    },
  },

  // Comments & Collaboration
  comments: {
    list: async (bugId: string) => {
      const res = await apiClient.get<Comment[]>(`/bugs/${bugId}/comments`);
      return res.data;
    },
    create: async (bugId: string, data: { content: string; is_internal?: boolean; attachments?: string[] }) => {
      const res = await apiClient.post<Comment>(`/bugs/${bugId}/comments`, data);
      return res.data;
    },
    react: async (commentId: string, emoji: string) => {
      const res = await apiClient.post<{ reactions: Record<string, string[]> }>(`/comments/${commentId}/react`, null, {
        params: { emoji },
      });
      return res.data;
    },
    delete: async (commentId: string) => {
      const res = await apiClient.delete(`/comments/${commentId}`);
      return res.data;
    },
  },

  // Git & Webhooks
  git: {
    listBugCommits: async (bugId: string) => {
      const res = await apiClient.get<GitCommit[]>(`/git/bugs/${bugId}/commits`);
      return res.data;
    },
    listAllCommits: async (limit = 50) => {
      const res = await apiClient.get<GitCommit[]>('/git/commits', { params: { limit } });
      return res.data;
    },
    simulateCommit: async (commitMsg: string, repoName = 'gecko-render-core', branch = 'main', diffSnippet?: string) => {
      const res = await apiClient.post<{ commit_sha: string; linked_bugs: string[]; message: string }>('/git/simulate-commit', null, {
        params: { commit_msg: commitMsg, repo_name: repoName, branch, diff_snippet: diffSnippet },
      });
      return res.data;
    },
    getBranchName: async (bugId: string) => {
      const res = await apiClient.post<{ branch_name: string; git_command: string }>(`/git/branch-name/${bugId}`);
      return res.data;
    },
  },

  // AI Triage & Analysis
  ai: {
    triage: async (data: { title: string; description: string; stack_trace?: string; product_id?: string }) => {
      const res = await apiClient.post<AITriageResponse>('/ai/triage', data);
      return res.data;
    },
    checkDuplicates: async (data: { title: string; description: string; product_id?: string }) => {
      const res = await apiClient.post<DuplicateCheckResponse>('/ai/check-duplicates', data);
      return res.data;
    },
    nlSearch: async (query: string) => {
      const res = await apiClient.post<{ query: string; interpreted_filters: any }>('/ai/nl-search', { query });
      return res.data;
    },
  },

  // BI Analytics & Reporting
  analytics: {
    getDashboardSummary: async (productId?: string) => {
      const res = await apiClient.get<AnalyticsSummary>('/analytics/dashboard-summary', {
        params: { product_id: productId },
      });
      return res.data;
    },
    getDefectDensity: async (productId?: string) => {
      const res = await apiClient.get<ComponentDefectDensity[]>('/analytics/defect-density', {
        params: { product_id: productId },
      });
      return res.data;
    },
    getBurndown: async (productId?: string, days = 14) => {
      const res = await apiClient.get<BurndownPoint[]>('/analytics/burndown', {
        params: { product_id: productId, days },
      });
      return res.data;
    },
    getInflowOutflow: async (productId?: string) => {
      const res = await apiClient.get<{ day: string; opened: number; resolved: number }[]>('/analytics/inflow-outflow', {
        params: { product_id: productId },
      });
      return res.data;
    },
    exportCsvUrl: (productId?: string) => `${API_BASE}/analytics/export/csv${productId ? `?product_id=${productId}` : ''}`,
    exportJsonUrl: (productId?: string) => `${API_BASE}/analytics/export/json${productId ? `?product_id=${productId}` : ''}`,
  },

  // Audit Trails
  audit: {
    getGlobalActivities: async (limit = 50) => {
      const res = await apiClient.get<ActivityLog[]>('/audit/activities', { params: { limit } });
      return res.data;
    },
    getBugHistory: async (bugId: string) => {
      const res = await apiClient.get<ActivityLog[]>(`/audit/bugs/${bugId}`);
      return res.data;
    },
  },

  // Workflows
  workflows: {
    getStates: async () => {
      const res = await apiClient.get<any[]>('/workflows/states');
      return res.data;
    },
    getSlaPolicies: async () => {
      const res = await apiClient.get<any[]>('/workflows/sla-policies');
      return res.data;
    },
  },
};
