import { useEffect, useRef } from 'react';
import useTripStore from '../data/store';
import { useToast } from './Toast';

/**
 * Puente entre el estado del store y el ToastProvider global.
 *
 * El store no puede llamar a `useToast()` directamente (no es un componente).
 * En vez de eso, cuando una operación de persistencia falla setea
 * `saveError = { id, message, operation }` en el estado. Este componente
 * lo escucha y emite un toast user-friendly. Tras emitir, hace `ackSaveError`
 * para que el mismo error no se vuelva a mostrar.
 *
 * Se monta una sola vez en App.jsx dentro del <ToastProvider>.
 */
export default function StoreErrorBridge() {
  const toast = useToast();
  const saveError = useTripStore(s => s.saveError);
  const ackSaveError = useTripStore(s => s.ackSaveError);
  const lastShownIdRef = useRef(null);

  useEffect(() => {
    if (!saveError || !toast) return;
    // Defensa: cada error trae un id único; no emitimos dos veces el mismo.
    if (saveError.id === lastShownIdRef.current) return;
    lastShownIdRef.current = saveError.id;
    toast(saveError.message, 'error', 5000);
    ackSaveError();
  }, [saveError, toast, ackSaveError]);

  return null;
}
