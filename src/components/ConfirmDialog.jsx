import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Diálogo de confirmación con cierre defensivo (mismo patrón que Modal):
 * sólo se cierra al clicar fuera si el gesto completo (mousedown→mouseup)
 * ocurre en el overlay. Esc cancela.
 */
export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  const overlayMouseDownRef = useRef(false);

  const handleMouseDown = (e) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    const startedOnOverlay = overlayMouseDownRef.current;
    overlayMouseDownRef.current = false;
    if (startedOnOverlay && e.target === e.currentTarget) {
      onCancel && onCancel();
    }
  };

  const handleTouchStart = (e) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onCancel) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="modal animate-in"
        style={{ maxWidth: 420 }}
        onMouseDown={(e) => { e.stopPropagation(); overlayMouseDownRef.current = false; }}
      >
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={24} color={danger ? '#EF4444' : '#4F46E5'} />
          </div>
          <h3 style={{ marginBottom: 8 }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
