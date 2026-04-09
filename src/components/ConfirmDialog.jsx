import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal animate-in" style={{ maxWidth: 420 }}>
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{message}</p>
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
