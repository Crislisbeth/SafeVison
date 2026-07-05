/**
 * SafeVision - Detection Detail Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    // Extract detection ID from URL path: /detection/{id}
    const pathParts = window.location.pathname.split('/');
    const detectionId = pathParts[pathParts.length - 1];

    if (detectionId) {
        loadDetection(detectionId);
    }
});

async function loadDetection(id) {
    try {
        const det = await apiFetch(`/api/detections/${id}`);
        if (!det) return;

        // Evidence image
        const img = document.getElementById('evidenceImage');
        if (det.evidence_url) {
            img.src = det.evidence_url;
        }

        // Camera info
        document.getElementById('evidenceCamera').textContent = `Cámara: ${det.camera_name}`;

        // Alert badge
        const alertEl = document.getElementById('evidenceAlert');
        alertEl.className = `badge badge-${det.alert_level}`;
        alertEl.textContent = alertLabel(det.alert_level);

        // Detail info
        const ts = new Date(det.timestamp);
        document.getElementById('detCamera').textContent = det.camera_name;
        document.getElementById('detCameraId').textContent = det.camera_id;
        document.getElementById('detDate').textContent = ts.toLocaleDateString('es-EC');
        document.getElementById('detTime').textContent = ts.toLocaleTimeString('es-EC', { hour12: false });
        document.getElementById('detAlert').textContent = alertLabel(det.alert_level);
        document.getElementById('detStatus').textContent = statusLabel(det.status);

        // Detection results
        renderResults(det.detections, det.summary);

    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

function renderResults(detections, summary) {
    const container = document.getElementById('detResults');

    if (!detections || detections.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-muted); font-size:0.9rem;">No se detectaron objetos en la imagen.</p>
        `;
        return;
    }

    // Summary cards
    const summaryItems = [];
    const icons = {
        mask: '😷',
        no_mask: '🚫',
        helmet: '⛑️',
        no_helmet: '⚠️',
        person: '👤',
    };
    const labels = {
        mask: 'Con mascarilla',
        no_mask: 'Sin mascarilla',
        helmet: 'Con casco',
        no_helmet: 'Sin casco',
        person: 'Persona',
    };

    // From summary
    if (summary) {
        for (const [key, count] of Object.entries(summary)) {
            if (count > 0) {
                summaryItems.push(`
                    <div class="result-item">
                        <div class="result-icon ${key}">${icons[key] || '📦'}</div>
                        <div class="result-info">
                            <div class="result-label">${labels[key] || key} (${count})</div>
                            <div class="result-conf">Categoría detectada</div>
                        </div>
                    </div>
                `);
            }
        }
    }

    // Individual detections
    const detItems = detections.map((det, i) => `
        <div class="result-item">
            <div class="result-icon ${det.category || 'person'}">${icons[det.category] || '📦'}</div>
            <div class="result-info">
                <div class="result-label">${det.label}</div>
                <div class="result-conf">Confianza: ${(det.confidence * 100).toFixed(1)}%</div>
            </div>
        </div>
    `);

    container.innerHTML = summaryItems.join('') || detItems.join('');
}

function alertLabel(level) {
    const labels = {
        high: '⚠ Alerta Alta',
        medium: '⚡ Alerta Media',
        low: '✅ Alerta Baja'
    };
    return labels[level] || level;
}

function statusLabel(status) {
    const labels = {
        active: '🟢 Activo',
        reviewed: '🔵 Revisado',
        archived: '⚪ Archivado',
    };
    return labels[status] || status;
}
