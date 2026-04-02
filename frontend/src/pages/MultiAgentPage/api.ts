// ==================== API ====================

const API_BASE = '/api';

export const api = {
  async createTeam(data: any) {
    try {
      const res = await fetch(`${API_BASE}/teams/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: null };
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message || '请求失败', data: null };
    }
  },

  async getTeams() {
    try {
      const res = await fetch(`${API_BASE}/teams`);
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: [] };
      const json = await res.json();
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message, data: [] };
    }
  },

  async getTeam(teamId: string) {
    try {
      const res = await fetch(`${API_BASE}/teams/teams/${teamId}`);
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: null };
      const json = await res.json();
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message, data: null };
    }
  },

  async createTask(data: any) {
    try {
      const res = await fetch(`${API_BASE}/teams/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: null };
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message || '请求失败', data: null };
    }
  },

  async getTasks(params?: { team_id?: string; status?: string }) {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${API_BASE}/teams/tasks${query ? `?${query}` : ''}`);
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: [] };
      const json = await res.json();
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message, data: [] };
    }
  },

  async getTaskStatus(taskId: string) {
    try {
      const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/status`);
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: null };
      const json = await res.json();
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message, data: null };
    }
  },

  async executeWorkflow(taskId: string) {
    try {
      const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/execute`, { method: 'POST' });
      if (!res.ok) return { code: -1, message: `HTTP ${res.status}`, data: null };
      const json = await res.json();
      return { code: 0, message: 'success', data: json };
    } catch (err: any) {
      return { code: -1, message: err.message, data: null };
    }
  },
};
