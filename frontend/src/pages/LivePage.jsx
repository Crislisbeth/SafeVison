import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch, getToken, API_BASE } from '../api/api.js';

function alertLabel(level) {
  const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
  return labels[level] || level;
}

export default function LivePage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [captureLoading, setCaptureLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const startCamera = () => {
    setIsStreaming(true);
    showToast('Cámara iniciada', 'success');
  };

  const stopCamera = () => {
    setIsStreaming(false);
    apiFetch('/api/camera/release', { method: 'POST' }).catch(() => {});
    showToast('Cámara detenida', 'info');
  };

  const captureFrame = async () => {
    setCaptureLoading(true);
    try {
      showToast('Capturando y analizando...', 'info');
      const result = await apiFetch('/api/camera/capture?camera_id=CAM-001', {
        method: 'POST',
      });
      if (result) {
        setCaptures((prev) => [result, ...prev]);
        showToast('Captura analizada correctamente', 'success');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setCaptureLoading(false);
    }
  };

  const deleteCapture = async (index, id) => {
    if (!window.confirm('¿Desea eliminar esta captura?')) return;
    try {
      await apiFetch(`/api/detections/${id}`, { method: 'DELETE' });
      setCaptures((prev) => prev.filter((_, i) => i !== index));
      showToast('Captura eliminada', 'success');
    } catch (err) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const clearAllCaptures = async () => {
    if (captures.length === 0) return;
    if (!window.confirm('¿Desea eliminar todas las capturas?')) return;
    const promises = captures.map((cap) =>
      apiFetch(`/api/detections/${cap.id}`, { method: 'DELETE' }).catch(() => {})
    );
    await Promise.all(promises);
    setCaptures([]);
    showToast('Todas las capturas eliminadas', 'success');
  };

  const token = getToken();
  const streamUrl = `${API_BASE}/api/camera/stream?token=${token}`;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="📹 Cámara en Vivo">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </Header>

        <div className="page-content">
          <div className="live-layout">
            {/* Camera Feed */}
            <div className="camera-feed">
              <div className="feed-header">
                <div className="camera-status">
                  {isStreaming && (
                    <div className="live-indicator">
                      <span className="dot" />
                      LIVE
                    </div>
                  )}
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Entrada Principal (CAM-001)
                  </span>
                </div>
              </div>

              <div className="feed-container">
                {isStreaming ? (
                  <img src={streamUrl} alt="Live feed" />
                ) : (
                  <div className="feed-placeholder">
                    <div className="icon">📹</div>
                    <h3>Cámara desactivada</h3>
                    <p>Presione "Iniciar Cámara" para comenzar la transmisión en vivo con detección de seguridad.</p>
                  </div>
                )}
              </div>

              <div className="feed-controls">
                {!isStreaming ? (
                  <button className="btn btn-success" onClick={startCamera}>
                    ▶ Iniciar Cámara
                  </button>
                ) : (
                  <>
                    <button className="btn btn-danger" onClick={stopCamera}>
                      ⏹ Detener
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ width: 'auto' }}
                      onClick={captureFrame}
                      disabled={captureLoading}
                    >
                      📸 Capturar y Analizar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Captures Sidebar */}
            <div className="live-sidebar">
              <div className="section-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="section-header">
                  <h2>Capturas Recientes</h2>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={clearAllCaptures}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Limpiar todo
                  </button>
                </div>
                <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
                  {captures.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 10px' }}>
                      <div className="empty-icon">📸</div>
                      <h3>Sin capturas</h3>
                      <p>Las capturas aparecerán aquí al presionar "Capturar y Analizar".</p>
                    </div>
                  ) : (
                    captures.map((cap, index) => {
                      const ts = new Date(cap.timestamp);
                      const time = ts.toLocaleTimeString('es-EC', { hour12: false });
                      const summary = cap.summary || {};
                      const summaryParts = [];
                      if (summary.mask) summaryParts.push(`Mascarilla: ${summary.mask}`);
                      if (summary.no_mask) summaryParts.push(`Sin mascarilla: ${summary.no_mask}`);
                      if (summary.helmet) summaryParts.push(`Casco: ${summary.helmet}`);
                      if (summary.no_helmet) summaryParts.push(`Sin casco: ${summary.no_helmet}`);

                      return (
                        <div key={cap.id} className="live-detection-item slide-up">
                          <div className="det-header">
                            <span className={`badge badge-${cap.alert_level}`}>
                              {alertLabel(cap.alert_level)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="det-time">{time}</span>
                              <button
                                className="btn-delete-capture"
                                onClick={(e) => { e.stopPropagation(); deleteCapture(index, cap.id); }}
                                title="Eliminar captura"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div
                            className="det-summary"
                            onClick={() => navigate(`/detection/${cap.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            {summaryParts.join(' | ') || 'Sin detecciones'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
