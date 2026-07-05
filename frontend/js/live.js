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
    showToast('📹 Cámara iniciada', 'success');
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
    showToast('⏹ Cámara detenida', 'info');
}

async function captureFrame() {
    const btnCapture = document.getElementById('btnCapture');
    btnCapture.disabled = true;

    try {
        showToast('📸 Capturando y analizando...', 'info');

        const result = await apiFetch('/api/camera/capture?camera_id=CAM-001', {
            method: 'POST',
        });

        if (result) {
            captures.unshift(result);
            renderCaptures();
            showToast('✅ Captura analizada correctamente', 'success');
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        btnCapture.disabled = false;
    }
}

function renderCaptures() {
    const container = document.getElementById('capturesList');

    if (captures.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:30px 10px;">
                <div class="empty-icon">📸</div>
                <h3>Sin capturas</h3>
                <p>Las capturas aparecerán aquí al presionar "Capturar y Analizar".</p>
            </div>
        `;
        return;
    }

    container.innerHTML = captures.map(cap => {
        const ts = new Date(cap.timestamp);
        const time = ts.toLocaleTimeString('es-EC', { hour12: false });
        const summary = cap.summary || {};

        let summaryText = [];
        if (summary.mask) summaryText.push(`😷 ${summary.mask}`);
        if (summary.no_mask) summaryText.push(`🚫 ${summary.no_mask}`);
        if (summary.helmet) summaryText.push(`⛑️ ${summary.helmet}`);
        if (summary.no_helmet) summaryText.push(`⚠️ ${summary.no_helmet}`);

        return `
            <div class="live-detection-item slide-up" onclick="window.location.href='/detection/${cap.id}'">
                <div class="det-header">
                    <span class="badge badge-${cap.alert_level}">${alertLabel(cap.alert_level)}</span>
                    <span class="det-time">${time}</span>
                </div>
                <div class="det-summary">${summaryText.join(' ') || 'Sin detecciones'}</div>
            </div>
        `;
    }).join('');
}

function alertLabel(level) {
    const labels = { high: '⚠ Alta', medium: '⚡ Media', low: '✅ Baja' };
    return labels[level] || level;
}
