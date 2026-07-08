import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import StatCard from '../components/StatCard.jsx';
import AnalyzeModal from '../components/AnalyzeModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch } from '../api/api.js';

function alertLabel(level) {
  const labels = { high: '⚠ Alta', medium: '⚡ Media', low: '✅ Baja' };
  return labels[level] || level;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    active_cameras: 0,
    today_detections: 0,
    total_detections: 0,
    high_alerts: 0,
    system_status: 'Operativo',
  });
  const [activity, setActivity] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch('/api/dashboard/stats');
      if (data) setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const data = await apiFetch('/api/dashboard/activity');
      if (data) setActivity(data);
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadActivity();
    const interval = setInterval(() => {
      loadStats();
      loadActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStats, loadActivity]);

  const handleDeleteDetection = async (id) => {
    if (!window.confirm('¿Desea eliminar esta detección?')) return;
    try {
      await apiFetch(`/api/detections/${id}`, { method: 'DELETE' });
      showToast('Detección eliminada', 'success');
      loadStats();
      loadActivity();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Desea eliminar TODAS las detecciones?')) return;
    try {
      if (activity.length === 0) {
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
  };

  const handleAnalyzeSuccess = (result) => {
    loadStats();
    loadActivity();
    setTimeout(() => navigate(`/detection/${result.id}`), 1000);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Panel de Control" />

        <div className="page-content">
          {/* Stats Cards */}
          <div className="stats-grid stagger">
            <StatCard icon="📷" value={stats.active_cameras} label="Cámaras Activas" color="cyan" />
            <StatCard icon="✅" value={stats.today_detections} label="Detecciones Hoy" color="green" />
            <StatCard icon="📋" value={stats.total_detections} label="Total Detecciones" color="orange" />
            <StatCard icon="⚠️" value={stats.high_alerts} label="Alertas Altas" color="red" />
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <Link to="/live" className="btn btn-primary" style={{ width: 'auto' }}>
              📹 Cámara en Vivo
            </Link>
            <button className="btn btn-secondary" onClick={() => setModalOpen(true)}>
              🔍 Analizar Imagen
            </button>
            <button className="btn btn-secondary" onClick={() => { loadStats(); loadActivity(); }}>
              🔄 Actualizar
            </button>
          </div>

          {/* Activity Table */}
          <div className="section-card">
            <div className="section-header">
              <h2>Actividad Reciente</h2>
              <button className="btn btn-sm btn-secondary" onClick={handleClearAll} style={{ fontSize: '0.75rem' }}>
                Limpiar todo
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Cámara</th>
                    <th>Tiempo</th>
                    <th>Alerta</th>
                    <th style={{ width: 50 }} />
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <h3>Sin actividad reciente</h3>
                          <p>Las detecciones aparecerán aquí cuando el sistema procese imágenes.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activity.map((item) => (
                      <tr key={item.id}>
                        <td
                          style={{ color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer' }}
                          onClick={() => navigate(`/detection/${item.id}`)}
                        >
                          {item.event}
                        </td>
                        <td>{item.camera}</td>
                        <td>{item.time}</td>
                        <td>
                          <span className={`badge badge-${item.alert_level}`}>
                            {alertLabel(item.alert_level)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-delete-capture"
                            onClick={() => handleDeleteDetection(item.id)}
                            title="Eliminar"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <AnalyzeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAnalyzeSuccess}
      />
    </div>
  );
}
