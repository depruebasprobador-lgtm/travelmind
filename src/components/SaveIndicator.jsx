import { Check } from 'lucide-react';
import useTripStore from '../data/store';

export default function SaveIndicator() {
  const saveStatus = useTripStore(s => s.saveStatus);

  return (
    <div className={`save-indicator ${saveStatus !== 'idle' ? 'visible' : ''}`}>
      {saveStatus === 'saving' && <span>Guardando...</span>}
      {saveStatus === 'saved' && <><Check size={14} /> <span>Guardado</span></>}
    </div>
  );
}
