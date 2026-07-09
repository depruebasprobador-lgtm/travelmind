import { useState } from 'react';
import { Bed, Ticket, KeyRound, AlertCircle } from 'lucide-react';
import {
  getKeyInfo, accommodationMapsUrl, venueMapsUrl, keyInfoMissingEssentials,
} from '../../utils/keyInfo';
import KeyInfoModal from './KeyInfoModal';

/**
 * Accesos rápidos a los Datos clave del viaje, reutilizable en Centro de mando
 * y Modo Hoy:
 *   - "Volver al alojamiento" (si hay dirección o link)
 *   - "Ir al recinto" (si hay recinto o link)
 *   - "Datos clave" (abre el editor)
 *   - aviso discreto si faltan datos clave importantes
 */
export default function KeyInfoAccess({ trip }) {
  const [open, setOpen] = useState(false);
  const k = getKeyInfo(trip);
  const accomUrl = accommodationMapsUrl(k);
  const venueUrl = venueMapsUrl(k);
  const missing = keyInfoMissingEssentials(trip);

  return (
    <div className="keyinfo-access">
      <div className="keyinfo-access-row">
        {accomUrl && (
          <a className="btn btn-secondary btn-sm keyinfo-access-btn"
            href={accomUrl} target="_blank" rel="noopener noreferrer">
            <Bed size={14} /> Volver al alojamiento
          </a>
        )}
        {venueUrl && (
          <a className="btn btn-secondary btn-sm keyinfo-access-btn"
            href={venueUrl} target="_blank" rel="noopener noreferrer">
            <Ticket size={14} /> Ir al recinto
          </a>
        )}
        <button className="btn btn-ghost btn-sm keyinfo-access-btn" onClick={() => setOpen(true)}>
          <KeyRound size={14} /> Datos clave
        </button>
      </div>

      {missing && (
        <p className="keyinfo-missing">
          <AlertCircle size={12} /> Completa datos clave antes de salir
        </p>
      )}

      {open && <KeyInfoModal trip={trip} onClose={() => setOpen(false)} />}
    </div>
  );
}
