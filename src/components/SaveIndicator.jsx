import { Check, AlertTriangle } from 'lucide-react';
import useTripStore from '../data/store';

export default function SaveIndicator() {
  const saveStatus = useTripStore(s => s.saveStatus);

  return (
    <div
      className={`save-indicator ${saveStatus !== 'idle' ? 'visible' : ''} save-indicator--${saveStatus}`}
      style={saveStatus === 'error' ? { color: 'var(--error)' } : undefined}
      role={saveStatus === 'error' ? 'alert' : undefined}
    >
      {saveStatus === 'saving' && <span>Guardando...</span>}
      {saveStatus === 'saved' && <><Check size={14} /> <span>Guardado</span></>}
      {saveStatus === 'error' && <><AlertTriangle size={14} /> <span>Error al guardar</span></>}
    </div>
  );
}
