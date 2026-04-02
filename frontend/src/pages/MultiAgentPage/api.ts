// ==================== API ====================

const API_BASE = '/api';

export const api = {
  async createTeam(data: any) {
    const res = await fetch(`${API_BASE}/teams/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getTeams() {
    const res = await fetch(`${API_BASE}/teams`);
    return res.json();
  },

  async getTeam(teamId: string) {
    const res = await fetch(`${API_BASE}/teams/teams/${teamId}`);
    return res.json();
  },

  async createTask(data: any) {
    const res = await fetch(`${API_BASE}/teams/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getTasks(params?: { team_id?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/teams/tasks${query ? `?${query}` : ''}`);
    return res.json();
  },

  async getTaskStatus(taskId: string) {
    const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/status`);
    return res.json();
  },

  async executeWorkflow(taskId: string) {
    const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/execute`, { method: 'POST' });
    return res.json();
  },
};
