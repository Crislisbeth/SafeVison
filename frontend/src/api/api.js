/**
 * SafeVision — API Client (React)
 * Fetch wrapper with JWT authentication
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Token Management ──────────────────────────────────
export function getToken() {
  return localStorage.getItem('sv_token');
}

export function setToken(token) {
  localStorage.setItem('sv_token', token);
}

export function removeToken() {
  localStorage.removeItem('sv_token');
  localStorage.removeItem('sv_user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('sv_user'));
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('sv_user', JSON.stringify(user));
}

// ── API Fetch ─────────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeToken();
      window.location.href = '/';
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error del servidor' }));
      throw new Error(error.detail || `Error ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('No se puede conectar al servidor');
    }
    throw err;
  }
}
