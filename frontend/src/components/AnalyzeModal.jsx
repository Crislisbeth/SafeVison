import { useState, useRef } from 'react';
import { apiFetch } from '../api/api.js';
import { useToast } from './Toast.jsx';

export default function AnalyzeModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    const file = fileRef.current?.files[0];
    if (!file) {
      showToast('Seleccione una imagen primero', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      showToast('🔍 Analizando imagen...', 'info');
      const result = await apiFetch('/api/detections/analyze?camera_id=CAM-001', {
        method: 'POST',
        body: formData,
      });

      if (result) {
        showToast('✅ Detección completada', 'success');
        onClose();
        if (onSuccess) onSuccess(result);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>🔍 Analizar Imagen</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          Suba una imagen para detectar mascarillas y cascos con YOLOv8.
        </p>
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          className="form-input"
          style={{ padding: 10 }}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? 'Analizando...' : 'Analizar'}
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
