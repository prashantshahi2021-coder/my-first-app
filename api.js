// ================================================================
// MEAT MART NEPAL — API Client
// ================================================================

const API_BASE = window.location.origin + '/api';

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────
const Auth = {
  getToken() { return localStorage.getItem('mmn_token'); },
  getRefreshToken() { return localStorage.getItem('mmn_refresh'); },
  getUser() { try { return JSON.parse(localStorage.getItem('mmn_user')); } catch { return null; } },
  getBranches() { try { return JSON.parse(localStorage.getItem('mmn_branches') || '[]'); } catch { return []; } },
  getActiveBranch() { try { return JSON.parse(localStorage.getItem('mmn_active_branch')); } catch { return null; } },

  setSession(data) {
    localStorage.setItem('mmn_token', data.accessToken);
    localStorage.setItem('mmn_refresh', data.refreshToken);
    localStorage.setItem('mmn_user', JSON.stringify(data.user));
    if (data.branches) localStorage.setItem('mmn_branches', JSON.stringify(data.branches));
    // Default active branch
    const branch = data.user.branch_id
      ? { id: data.user.branch_id, name: data.user.branch_name }
      : (data.branches && data.branches[1]) || (data.branches && data.branches[0]);
    localStorage.setItem('mmn_active_branch', JSON.stringify(branch));
  },

  setActiveBranch(branch) {
    localStorage.setItem('mmn_active_branch', JSON.stringify(branch));
  },

  clear() {
    ['mmn_token','mmn_refresh','mmn_user','mmn_branches','mmn_active_branch'].forEach(k => localStorage.removeItem(k));
  },

  isLoggedIn() { return !!this.getToken(); },
  isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; }
};

// ─── HTTP CLIENT ───────────────────────────────────────────────
const Http = {
  async request(method, path, body = null) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      let res = await fetch(API_BASE + path, opts);

      // Auto-refresh on 401
      if (res.status === 401) {
        const data = await res.json();
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${Auth.getToken()}`;
            res = await fetch(API_BASE + path, { ...opts, headers });
          } else {
            Auth.clear();
            window.location.reload();
            return;
          }
        } else {
          Auth.clear();
          window.location.reload();
          return;
        }
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      return json;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        // Offline mode — return cached data if available
        console.warn('API offline, using mock data');
        return null;
      }
      throw err;
    }
  },

  async refreshToken() {
    const rt = Auth.getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('mmn_token', data.accessToken);
      return true;
    } catch { return false; }
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  put(path, body)   { return this.request('PUT', path, body); },
  delete(path)      { return this.request('DELETE', path); },
};

// ─── BRANCH QUERY PARAM ───────────────────────────────────────
function branchParam() {
  const branch = Auth.getActiveBranch();
  return branch ? `?branch_id=${branch.id}` : '';
}
