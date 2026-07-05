/**
 * SafeVision - Login Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (getToken()) {
        window.location.href = '/dashboard';
        return;
    }

    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showError('Por favor complete todos los campos');
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginText.style.display = 'none';
        loginSpinner.style.display = 'block';
        hideError();

        try {
            const data = await apiFetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            if (data) {
                setToken(data.access_token);
                setUser(data.user);
                window.location.href = '/dashboard';
            }
        } catch (err) {
            showError(err.message || 'Credenciales incorrectas');
        } finally {
            loginBtn.disabled = false;
            loginText.style.display = 'inline';
            loginSpinner.style.display = 'none';
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.add('visible');
    }

    function hideError() {
        errorEl.classList.remove('visible');
    }
});
