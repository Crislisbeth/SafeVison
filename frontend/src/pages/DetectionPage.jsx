import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch } from '../api/api.js';

const icons = { mask: '😷', no_mask: '🚫', helmet: '⛑️', no_helmet: '⚠️', person: '👤' };
const labels = { mask: 'Con mascarilla', no_mask: 'Sin mascarilla', helmet: 'Con casco', no_helmet: 'Sin casco', person: 'Persona' };

function alertLabel(level) {
  const map = { high: '⚠ Alerta Alta', medium: '⚡ Alerta Media', low: '✅ Alerta Baja' };
  return map[level] || level;
}

function statusLabel(status) {
  const map = { active: '🟢 Activo', reviewed: '🔵 Revisado', archived: '⚪ Archivado' };
  return map[status] || status;
}

export default function DetectionPage() {
  const { detectionId } = useParams();
  const [detection, setDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const det = await apiFetch(`/api/detections/${detectionId}`);
        if (det) setDetection(det);
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [detectionId, showToast]);

  const renderResults = () => {
    if (!detection) return null;
    const { detections: dets, summary } = detection;

    if (!dets || dets.length === 0) {
      return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No se detectaron objetos en la imagen.</p>;
    }

    // Summary items
    const summaryItems = [];
    if (summary) {
      for (const [key, count] of Object.entries(summary)) {
        if (count > 0) {
          summaryItems.push(
            <div className="result-item" key={`sum-${key}`}>
              <div className={`result-icon ${key}`}>{icons[key] || '📦'}</div>
              <div className="result-info">
                <div className="result-label">{labels[key] || key} ({count})</div>
                <div className="result-conf">Categoría detectada</div>
              </div>
            </div>
          );
        }
      }
    }

    if (summaryItems.length > 0) return <>{summaryItems}</>;

    // Individual detections fallback
    return dets.map((det, i) => (
      <div className="result-item" key={i}>
        <div className={`result-icon ${det.category || 'person'}`}>{icons[det.category] || '📦'}</div>
        <div className="result-info">
          <div className="result-label">{det.label}</div>
          <div className="result-conf">Confianza: {(det.confidence * 100).toFixed(1)}%</div>
        </div>
      </div>
    ));
  };

  const ts = detection ? new Date(detection.timestamp) : null;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="🔍 Detalle de Detección">
          <Link to="/dashboard" className="btn btn-secondary btn-sm">← Volver al Dashboard</Link>
        </Header>

        <div className="page-content">
          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ width: 32, height: 32, border: '3px solid transparent', borderTopColor: 'var(--uide-navy)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto' }} />
              <p style={{ marginTop: 16 }}>Cargando detección...</p>
            </div>
          ) : detection ? (
            <div className="detection-layout">
              {/* Evidence Image */}
              <div className="evidence-container slide-up">
                <div className="evidence-image-wrapper">
                  {detection.evidence_url ? (
                    <img src={detection.evidence_url} alt="Evidencia de detección" />
                  ) : (
                    <div className="empty-state" style={{ color: '#8892a4' }}>
                      <div className="empty-icon">📷</div>
                      <p>Sin imagen de evidencia</p>
                    </div>
                  )}
                </div>
                <div className="evidence-footer">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Cámara: {detection.camera_name}
                  </span>
                  <span className={`badge badge-${detection.alert_level}`}>
                    {alertLabel(detection.alert_level)}
                  </span>
                </div>
              </div>

              {/* Detail Sidebar */}
              <div className="detail-sidebar slide-up">
                <div className="detail-card">
                  <h3>Información</h3>
                  <div className="detail-item">
                    <span className="label">Cámara</span>
                    <span className="value">{detection.camera_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">ID Cámara</span>
                    <span className="value">{detection.camera_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Fecha</span>
                    <span className="value">{ts?.toLocaleDateString('es-EC')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Hora</span>
                    <span className="value">{ts?.toLocaleTimeString('es-EC', { hour12: false })}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Nivel de Alerta</span>
                    <span className="value">{alertLabel(detection.alert_level)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Estado</span>
                    <span className="value">{statusLabel(detection.status)}</span>
                  </div>
                </div>

                <div className="detail-card">
                  <h3>Resultados de Detección</h3>
                  <div className="detection-results">
                    {renderResults()}
                  </div>
                </div>

                <div className="detail-card">
                  <h3>Acciones</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Link to="/dashboard" className="btn btn-secondary" style={{ textAlign: 'center' }}>
                      ← Volver al Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">❌</div>
              <h3>Detección no encontrada</h3>
              <p>La detección solicitada no existe o fue eliminada.</p>
              <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
                ← Volver al Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
