/**
 * SafeVision - API Helper
 * Fetch wrapper with JWT authentication
 */

const API_BASE = '';

// ── Token Management ──────────────────────────────────
function getToken() {
    return localStorage.getItem('sv_token');
}

function setToken(token) {
    localStorage.setItem('sv_token', token);
}

function removeToken() {
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('sv_user'));
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('sv_user', JSON.stringify(user));
}

// ── Auth Check ────────────────────────────────────────
function requireAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/';
        return false;
    }
    // Set user info in UI
    const user = getUser();
    if (user) {
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        if (avatarEl) avatarEl.textContent = user.full_name?.charAt(0) || 'A';
        if (nameEl) nameEl.textContent = user.full_name || user.username;
        if (roleEl) roleEl.textContent = user.role || 'user';
    }
    return true;
}

// ── API Fetch ─────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser will set multipart boundary)
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

// ── Logout ────────────────────────────────────────────
function logout() {
    removeToken();
    window.location.href = '/';
}

// ── Sidebar Toggle ────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Close sidebar when clicking overlay
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }
});

// ── Toast Notifications ───────────────────────────────
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

// ── Clock ─────────────────────────────────────────────
function startClock() {
    const el = document.getElementById('headerTime');
    if (!el) return;

    function update() {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('es-EC', { hour12: false });
    }
    update();
    setInterval(update, 1000);
}
