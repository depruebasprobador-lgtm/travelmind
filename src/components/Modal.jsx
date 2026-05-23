import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal genérico con cierre defensivo:
 *   - Sólo se cierra al clicar fuera si el GESTO COMPLETO (mousedown→mouseup)
 *     ocurre en el overlay. Si el usuario empezó el clic dentro del modal y
 *     soltó fuera (ej: arrastrar al cerrar un dropdown nativo de select), NO
 *     cerramos.
 *   - Esc en cualquier momento cierra el modal.
 *   - Botón X y onClose explícitos siguen funcionando normal.
 */
export default function Modal({ title, children, onClose, footer }) {
  const overlayMouseDownRef = useRef(false);

  const handleMouseDown = (e) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    const startedOnOverlay = overlayMouseDownRef.current;
    overlayMouseDownRef.current = false;
    if (startedOnOverlay && e.target === e.currentTarget) {
      onClose && onClose();
    }
  };

  // Espejo táctil de mousedown/mouseup. En táctil, un tap en el contenido
  // dispara touchstart en el contenido (no en el overlay), así que no se
  // marca como "empezó en overlay" y no cierra.
  const handleTouchStart = (e) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal animate-in"
        // Defensa extra: cualquier click dentro del modal resetea la marca,
        // así si un select/dropdown abre y cierra capas, no consumimos como overlay.
        onMouseDown={(e) => { e.stopPropagation(); overlayMouseDownRef.current = false; }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
