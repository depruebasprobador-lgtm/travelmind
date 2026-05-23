import { useState } from 'react';
import { Plus, Trash2, Edit3, ExternalLink, Bed } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import PlaceSearch from '../PlaceSearch';
import EmptyState from '../EmptyState';
import ConfirmDialog from '../ConfirmDialog';
import { formatDate, formatCurrency, compareISODates } from '../../utils/helpers';

const EMPTY = { name: '', address: '', price: '', bookingLink: '', checkIn: '', checkOut: '', notes: '', lat: null, lng: null };

export default function AccommodationTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // accom

  const { addAccommodation, updateAccommodation, deleteAccommodation } = useTripStore();
  const saveStatus = useTripStore(s => s.saveStatus);
  const isSaving = saveStatus === 'saving';

  const resetForm = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(false);
    setFormError('');
  };

  const startEdit = (accom) => {
    setEditing(accom);
    setForm({
      name: accom.name,
      address: accom.address || '',
      price: accom.price || '',
      bookingLink: accom.bookingLink || '',
      checkIn: accom.checkIn || '',
      checkOut: accom.checkOut || '',
      notes: accom.notes || '',
      lat: accom.lat,
      lng: accom.lng,
    });
    setFormError('');
    setShowForm(true);
  };

  const validate = () => {
    if (!form.name.trim()) return 'El nombre es obligatorio.';
    if (form.checkIn && form.checkOut && compareISODates(form.checkOut, form.checkIn) < 0) {
      return 'El check-out no puede ser anterior al check-in.';
    }
    if (form.price !== '' && Number(form.price) < 0) {
      return 'El precio no puede ser negativo.';
    }
    return '';
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    const v = validate();
    if (v) { setFormError(v); return; }
    setFormError('');
    setIsSubmitting(true);
    const data = { ...form, price: Number(form.price) || 0 };
    const r = editing
      ? await updateAccommodation(trip.id, editing.id, data)
      : await addAccommodation(trip.id, data);
    setIsSubmitting(false);
    if (!r?.ok) return; // mantenemos el form abierto con los datos
    resetForm();
  };

  const handlePlaceSelect = (place) => {
    setForm(prev => ({ ...prev, address: place.displayName, lat: place.lat, lng: place.lng }));
  };

  const handleDeleteRequest = (a) => setConfirmDelete(a);
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const r = await deleteAccommodation(trip.id, confirmDelete.id);
    setConfirmDelete(null);
    return r;
  };

  // Orden cronológico por checkIn (los sin fecha al final)
  const accoms = [...(trip.accommodations || [])].sort((a, b) => {
    if (!a.checkIn && !b.checkIn) return 0;
    if (!a.checkIn) return 1;
    if (!b.checkIn) return -1;
    return compareISODates(a.checkIn, b.checkIn);
  });

  return (
    <div>
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar alojamiento"
          message={`¿Eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <div className="section-header">
        <h3>Alojamientos ({accoms.length})</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { resetForm(); setShowForm(true); }}
          disabled={isSaving}>
          <Plus size={14} /> Añadir
        </button>
      </div>

      {accoms.length > 0 ? accoms.map(a => (
        <div key={a.id} className="accom-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</h4>
              {a.address && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.address}</p>}
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.85rem', flexWrap: 'wrap' }}>
                {a.price > 0 && <span style={{ fontWeight: 600 }}>{formatCurrency(a.price)}</span>}
                {a.checkIn && <span>Check-in: {formatDate(a.checkIn)}</span>}
                {a.checkOut && <span>Check-out: {formatDate(a.checkOut)}</span>}
              </div>
              {a.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{a.notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {a.bookingLink && <a href={a.bookingLink} target="_blank" rel="noopener" className="btn btn-icon btn-sm"><ExternalLink size={14} /></a>}
              <button className="btn btn-icon btn-sm" onClick={() => startEdit(a)} disabled={isSaving}><Edit3 size={14} /></button>
              <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteRequest(a)} disabled={isSaving}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      )) : (
        <EmptyState icon={<Bed size={36} />} title="Sin alojamientos" description="Añade alojamientos para tu viaje." />
      )}

      {showForm && (
        <Modal
          title={editing ? 'Editar alojamiento' : 'Nuevo alojamiento'}
          onClose={isSubmitting ? () => {} : resetForm}
          footer={<>
            <button className="btn btn-secondary" onClick={resetForm} disabled={isSubmitting}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSubmitting || !form.name.trim()}>
              {isSubmitting ? 'Guardando...' : (editing ? 'Guardar' : 'Añadir')}
            </button>
          </>}>
          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--error)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>
              {formError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hotel Artemide" />
          </div>
          <div className="form-group">
            <label className="form-label">Buscar dirección</label>
            <PlaceSearch onSelect={handlePlaceSelect} placeholder="Buscar dirección..." />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Precio (€)</label>
              <input className="form-input" type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Link de reserva</label>
              <input className="form-input" value={form.bookingLink} onChange={e => setForm({ ...form, bookingLink: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Check-in</label>
              <input className="form-input" type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out</label>
              <input className="form-input" type="date" value={form.checkOut} min={form.checkIn || undefined} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
