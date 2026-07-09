import { useState } from 'react';
import { KeyRound, Bed, Bus, Ticket, Phone, StickyNote, MapPin, ShieldAlert } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import { useToast } from '../Toast';
import { getKeyInfo, EMPTY_KEY_INFO } from '../../utils/keyInfo';

/**
 * Editor de "Datos clave" del viaje. Guarda en trip.keyInfo (payload JSONB).
 * Read-only si el viaje viene de copia local (modo emergencia): en ese caso
 * no fingimos guardados remotos.
 */
export default function KeyInfoModal({ trip, onClose }) {
  const toast = useToast();
  const saveKeyInfo = useTripStore(s => s.saveKeyInfo);
  const saveStatus = useTripStore(s => s.saveStatus);
  const isSaving = saveStatus === 'saving';
  const isSnapshot = !!trip.__isLocalSnapshot;

  const [form, setForm] = useState(() => getKeyInfo(trip));
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (submitting) return;
    if (isSnapshot) {
      toast('Estás en modo emergencia: no se pueden guardar cambios', 'error');
      return;
    }
    setSubmitting(true);
    // Limpieza mínima: strings recortados.
    const clean = {};
    for (const key of Object.keys(EMPTY_KEY_INFO)) {
      clean[key] = String(form[key] ?? '').trim();
    }
    const r = await saveKeyInfo(trip.id, clean);
    setSubmitting(false);
    if (!r?.ok) return; // StoreErrorBridge emite el toast de error
    toast('Datos clave guardados', 'success');
    onClose();
  };

  return (
    <Modal
      title="Datos clave del viaje"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cerrar</button>
          {!isSnapshot && (
            <button className="btn btn-primary" onClick={handleSave} disabled={submitting || isSaving}>
              <KeyRound size={15} /> Guardar datos clave
            </button>
          )}
        </>
      }
    >
      {isSnapshot && (
        <div className="keyinfo-readonly-note">
          <ShieldAlert size={15} />
          Estás viendo una copia local. Los datos clave son solo de consulta hasta recuperar conexión.
        </div>
      )}

      <p className="keyinfo-hint">Una referencia rápida para tenerlo todo a mano durante el viaje.</p>

      {/* Alojamiento */}
      <div className="keyinfo-group">
        <h4 className="keyinfo-group-title"><Bed size={15} /> Alojamiento</h4>
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input className="form-input" value={form.accommodationName} disabled={isSnapshot}
            onChange={e => set('accommodationName', e.target.value)} placeholder="Ej: Hotel Le Marais" />
        </div>
        <div className="form-group">
          <label className="form-label">Dirección</label>
          <input className="form-input" value={form.accommodationAddress} disabled={isSnapshot}
            onChange={e => set('accommodationAddress', e.target.value)} placeholder="Calle, número, ciudad" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Check-in</label>
            <input className="form-input" type="date" value={form.checkIn} disabled={isSnapshot}
              onChange={e => set('checkIn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-out</label>
            <input className="form-input" type="date" value={form.checkOut} disabled={isSnapshot}
              onChange={e => set('checkOut', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Enlace Google Maps del alojamiento</label>
          <input className="form-input" value={form.mapAccommodation} disabled={isSnapshot}
            onChange={e => set('mapAccommodation', e.target.value)} placeholder="https://maps.google.com/…" />
        </div>
      </div>

      {/* Transporte */}
      <div className="keyinfo-group">
        <h4 className="keyinfo-group-title"><Bus size={15} /> Transporte</h4>
        <div className="form-group">
          <label className="form-label">Ida</label>
          <input className="form-input" value={form.transportOut} disabled={isSnapshot}
            onChange={e => set('transportOut', e.target.value)} placeholder="Ej: Vuelo IB1234 · 08:20" />
        </div>
        <div className="form-group">
          <label className="form-label">Vuelta</label>
          <input className="form-input" value={form.transportBack} disabled={isSnapshot}
            onChange={e => set('transportBack', e.target.value)} placeholder="Ej: Tren 20:45" />
        </div>
      </div>

      {/* Recinto / evento */}
      <div className="keyinfo-group">
        <h4 className="keyinfo-group-title"><Ticket size={15} /> Recinto / evento</h4>
        <div className="form-group">
          <label className="form-label">Recinto / evento</label>
          <input className="form-input" value={form.venue} disabled={isSnapshot}
            onChange={e => set('venue', e.target.value)} placeholder="Ej: Accor Arena" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Apertura de puertas</label>
            <input className="form-input" type="time" value={form.doorsTime} disabled={isSnapshot}
              onChange={e => set('doorsTime', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora del evento</label>
            <input className="form-input" type="time" value={form.eventTime} disabled={isSnapshot}
              onChange={e => set('eventTime', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Enlace Google Maps del recinto</label>
          <input className="form-input" value={form.mapVenue} disabled={isSnapshot}
            onChange={e => set('mapVenue', e.target.value)} placeholder="https://maps.google.com/…" />
        </div>
      </div>

      {/* Extra */}
      <div className="keyinfo-group">
        <h4 className="keyinfo-group-title"><Phone size={15} /> Contacto y notas</h4>
        <div className="form-group">
          <label className="form-label">Contacto de emergencia</label>
          <input className="form-input" value={form.emergencyContact} disabled={isSnapshot}
            onChange={e => set('emergencyContact', e.target.value)} placeholder="Nombre y teléfono" />
        </div>
        <div className="form-group">
          <label className="form-label"><StickyNote size={13} style={{ verticalAlign: '-2px' }} /> Notas rápidas</label>
          <textarea className="form-input" rows={3} value={form.notes} disabled={isSnapshot}
            onChange={e => set('notes', e.target.value)} placeholder="Códigos de reserva, wifi, lo que sea…" />
        </div>
      </div>
    </Modal>
  );
}
