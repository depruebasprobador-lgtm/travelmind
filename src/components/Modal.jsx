import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, footer }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-in">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
