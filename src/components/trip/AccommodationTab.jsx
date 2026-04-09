import { useState } from 'react';
import { Plus, Trash2, Edit3, ExternalLink, Bed } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import PlaceSearch from '../PlaceSearch';
import EmptyState from '../EmptyState';
import { formatDate, formatCurrency } from '../../utils/helpers';

export default function AccommodationTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', price: '', bookingLink: '', checkIn: '', checkOut: '', notes: '', lat: null, lng: null });

  const { addAccommodation, updateAccommodation, deleteAccommodation } = useTripStore();

  const resetForm = () => {
    setForm({ name: '', address: '', price: '', bookingLink: '', checkIn: '', checkOut: '', notes: '', lat: null, lng: null });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (accom) => {
    setEditing(accom);
    setForm({ name: accom.name, address: accom.address || '', price: accom.price || '', bookingLink: accom.bookingLink || '', checkIn: accom.checkIn || '', checkOut: accom.checkOut || '', notes: accom.notes || '', lat: accom.lat, lng: accom.lng });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = { ...form, price: Number(form.price) || 0 };
    if (editing) updateAccommodation(trip.id, editing.id, data);
    else addAccommodation(trip.id, data);
    resetForm();
  };

  const handlePlaceSelect = (place) => {
    setForm(prev => ({ ...prev, address: place.displayName, lat: place.lat, lng: place.lng }));
  };

  const accoms = trip.accommodations || [];

  return (
    <div>
      <div className="section-header">
        <h3>Alojamientos ({accoms.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
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
              <button className="btn btn-icon btn-sm" onClick={() => startEdit(a)}><Edit3 size={14} /></button>
              <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }} onClick={() => deleteAccommodation(trip.id, a.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      )) : (
        <EmptyState icon={<Bed size={36} />} title="Sin alojamientos" description="Añade alojamientos para tu viaje." />
      )}

      {showForm && (
        <Modal title={editing ? 'Editar alojamiento' : 'Nuevo alojamiento'} onClose={resetForm}
          footer={<><button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Guardar' : 'Añadir'}</button></>}>
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
              <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
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
              <input className="form-input" type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
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
