/**
 * SafeVision - Live Camera Logic
 */

let isStreaming = false;
let captures = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
});

function startCamera() {
    const token = getToken();
    const stream = document.getElementById('cameraStream');
    const placeholder = document.getElementById('feedPlaceholder');
    const liveIndicator = document.getElementById('liveIndicator');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnCapture = document.getElementById('btnCapture');

    // Set stream source with auth token as query param
    stream.src = `/api/camera/stream?token=${token}`;
    stream.style.display = 'block';
    placeholder.style.display = 'none';
    liveIndicator.style.display = 'flex';

    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';
    btnCapture.style.display = 'inline-flex';

    isStreaming = true;
    showToast('Camara iniciada', 'success');
}

function stopCamera() {
    const stream = document.getElementById('cameraStream');
    const placeholder = document.getElementById('feedPlaceholder');
    const liveIndicator = document.getElementById('liveIndicator');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnCapture = document.getElementById('btnCapture');

    stream.src = '';
    stream.style.display = 'none';
    placeholder.style.display = 'block';
    liveIndicator.style.display = 'none';

    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
    btnCapture.style.display = 'none';

    isStreaming = false;

    // Release camera on server
    apiFetch('/api/camera/release', { method: 'POST' }).catch(() => { });
    showToast('Camara detenida', 'info');
}

async function captureFrame() {
    const btnCapture = document.getElementById('btnCapture');
    btnCapture.disabled = true;

    try {
        showToast('Capturando y analizando...', 'info');

        const result = await apiFetch('/api/camera/capture?camera_id=CAM-001', {
            method: 'POST',
        });

        if (result) {
            captures.unshift(result);
            renderCaptures();
            showToast('Captura analizada correctamente', 'success');
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        btnCapture.disabled = false;
    }
}

async function deleteCapture(index, id, event) {
    event.stopPropagation(); // Don't navigate to detection detail

    if (!confirm('Desea eliminar esta captura?')) return;

    try {
        await apiFetch(`/api/detections/${id}`, { method: 'DELETE' });
        captures.splice(index, 1);
        renderCaptures();
        showToast('Captura eliminada', 'success');
    } catch (err) {
        showToast(`Error al eliminar: ${err.message}`, 'error');
    }
}

function clearAllCaptures() {
    if (captures.length === 0) return;
    if (!confirm('Desea eliminar todas las capturas?')) return;

    // Delete all from backend
    const promises = captures.map(cap =>
        apiFetch(`/api/detections/${cap.id}`, { method: 'DELETE' }).catch(() => {})
    );

    Promise.all(promises).then(() => {
        captures = [];
        renderCaptures();
        showToast('Todas las capturas eliminadas', 'success');
    });
}

function renderCaptures() {
    const container = document.getElementById('capturesList');

    if (captures.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:30px 10px;">
                <div class="empty-icon">Sin capturas</div>
                <p>Las capturas apareceran aqui al presionar "Capturar y Analizar".</p>
            </div>
        `;
        return;
    }

    container.innerHTML = captures.map((cap, index) => {
        const ts = new Date(cap.timestamp);
        const time = ts.toLocaleTimeString('es-EC', { hour12: false });
        const summary = cap.summary || {};

        let summaryText = [];
        if (summary.mask) summaryText.push(`Mascarilla: ${summary.mask}`);
        if (summary.no_mask) summaryText.push(`Sin mascarilla: ${summary.no_mask}`);
        if (summary.helmet) summaryText.push(`Casco: ${summary.helmet}`);
        if (summary.no_helmet) summaryText.push(`Sin casco: ${summary.no_helmet}`);

        return `
            <div class="live-detection-item slide-up">
                <div class="det-header">
                    <span class="badge badge-${cap.alert_level}">${alertLabel(cap.alert_level)}</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="det-time">${time}</span>
                        <button class="btn-delete-capture" onclick="deleteCapture(${index}, '${cap.id}', event)" title="Eliminar captura">&#10005;</button>
                    </div>
                </div>
                <div class="det-summary" onclick="window.location.href='/detection/${cap.id}'" style="cursor:pointer;">
                    ${summaryText.join(' | ') || 'Sin detecciones'}
                </div>
            </div>
        `;
    }).join('');
}

function alertLabel(level) {
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return labels[level] || level;
}
