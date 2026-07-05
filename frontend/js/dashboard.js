/**
 * SafeVision - Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    startClock();
    loadStats();
    loadActivity();
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadStats();
        loadActivity();
    }, 30000);
});

async function loadStats() {
    try {
        const stats = await apiFetch('/api/dashboard/stats');
        if (!stats) return;

        animateValue('statCameras', stats.active_cameras);
        animateValue('statDetections', stats.today_detections);
        animateValue('statTotal', stats.total_detections);
        animateValue('statAlerts', stats.high_alerts);

        const statusEl = document.getElementById('systemStatus');
        if (statusEl) statusEl.textContent = stats.system_status;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadActivity() {
    try {
        const activity = await apiFetch('/api/dashboard/activity');
        if (!activity) return;

        const tbody = document.getElementById('activityBody');

        if (activity.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-icon">Sin actividad</div>
                            <h3>Sin actividad reciente</h3>
                            <p>Las detecciones apareceran aqui cuando el sistema procese imagenes.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = activity.map(item => `
            <tr>
                <td style="color:var(--text-primary); font-weight:500; cursor:pointer;" onclick="window.location.href='/detection/${item.id}'">${item.event}</td>
                <td>${item.camera}</td>
                <td>${item.time}</td>
                <td><span class="badge badge-${item.alert_level}">${alertLabel(item.alert_level)}</span></td>
                <td><button class="btn-delete-capture" onclick="deleteDetection('${item.id}')" title="Eliminar">&#10005;</button></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading activity:', err);
    }
}

function alertLabel(level) {
    const labels = {
        high: '⚠ Alta',
        medium: '⚡ Media',
        low: '✅ Baja'
    };
    return labels[level] || level;
}

function animateValue(id, finalValue) {
    const el = document.getElementById(id);
    if (!el) return;

    const current = parseInt(el.textContent) || 0;
    if (current === finalValue) {
        el.textContent = finalValue;
        return;
    }

    const duration = 600;
    const start = performance.now();

    function step(timestamp) {
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(current + (finalValue - current) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

// ── Image Analysis Modal ──────────────────────────────
function openAnalyzeModal() {
    document.getElementById('analyzeModal').style.display = 'flex';
}

function closeAnalyzeModal() {
    document.getElementById('analyzeModal').style.display = 'none';
    document.getElementById('analyzeFile').value = '';
}

async function analyzeImage() {
    const fileInput = document.getElementById('analyzeFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Seleccione una imagen primero', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        showToast('🔍 Analizando imagen...', 'info');
        const result = await apiFetch('/api/detections/analyze?camera_id=CAM-001', {
            method: 'POST',
            body: formData,
        });

        if (result) {
            closeAnalyzeModal();
            showToast('✅ Detección completada', 'success');
            loadStats();
            loadActivity();
            // Navigate to detection detail
            setTimeout(() => {
                window.location.href = `/detection/${result.id}`;
            }, 1000);
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

async function deleteDetection(id) {
    if (!confirm('Desea eliminar esta deteccion?')) return;

    try {
        await apiFetch(`/api/detections/${id}`, { method: 'DELETE' });
        showToast('Deteccion eliminada', 'success');
        loadStats();
        loadActivity();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

async function clearAllDetections() {
    if (!confirm('Desea eliminar TODAS las detecciones?')) return;

    try {
        const activity = await apiFetch('/api/dashboard/activity');
        if (!activity || activity.length === 0) {
            showToast('No hay detecciones para eliminar', 'info');
            return;
        }

        for (const item of activity) {
            await apiFetch(`/api/detections/${item.id}`, { method: 'DELETE' }).catch(() => {});
        }

        showToast('Todas las detecciones eliminadas', 'success');
        loadStats();
        loadActivity();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}
