import { apiUrl, isNative, getServerUrl, getAuthToken } from './platform.js';

function headers(json = false) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';

  if (isNative && getServerUrl()) {
    const token = getAuthToken();
    if (token) h.Authorization = `Bearer ${token}`;
  } else if (!isNative) {
    const csrf = localStorage.getItem('nt:csrf');
    if (csrf) h['X-CSRF-Token'] = csrf;
  }
  return h;
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(apiUrl(`/api/v1/intervals${path}`), {
    method,
    credentials: 'include',
    headers: headers(body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = null;
  try { payload = await res.json(); } catch {}

  if (!res.ok) {
    const error = new Error(payload?.error || `Intervals request failed (${res.status})`);
    error.status = res.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

export const IntervalsClient = {
  status() {
    return request('/status');
  },

  config() {
    return request('/config');
  },

  saveConfig(config) {
    return request('/config', { method: 'PUT', body: config });
  },

  saveCredentials(apiKey) {
    return request('/credentials', { method: 'PUT', body: { apiKey } });
  },

  disconnect() {
    return request('/credentials', { method: 'DELETE' });
  },

  test(apiKey = '') {
    return request('/test', { method: 'POST', body: apiKey ? { apiKey } : {} });
  },

  workouts(oldest, newest) {
    const qs = new URLSearchParams({ oldest, newest });
    return request(`/workouts?${qs}`);
  },

  plan(date) {
    const qs = new URLSearchParams({ date });
    return request(`/plan?${qs}`);
  },
};
