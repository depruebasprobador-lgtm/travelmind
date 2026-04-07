import { useState } from 'react';
import { Plus, Trash2, Edit3, ExternalLink, MapPin } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import PlaceSearch from '../PlaceSearch';
import EmptyState from '../EmptyState';

export default function PlacesTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '', link: '', lat: null, lng: null });

  const { addPlace, updatePlace, deletePlace } = useTripStore();

  const resetForm = () => {
    setForm({ name: '', address: '', description: '', link: '', lat: null, lng: null });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (place) => {
    setEditing(place);
    setForm({
      name: place.name,
      address: place.address || '',
      description: place.description || '',
      link: place.link || '',
      lat: place.lat,
      lng: place.lng
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updatePlace(trip.id, editing.id, form);
    else addPlace(trip.id, form);
    resetForm();
  };

  const handlePlaceSelect = (selected) => {
    setForm(prev => ({
      ...prev,
      name: prev.name || selected.name || selected.displayName.split(',')[0],
      address: selected.displayName,
      lat: selected.lat,
      lng: selected.lng
    }));
  };

  const places = trip.places || [];

  return (
    <div>
      <div className="section-header">
        <h3>Lugares a Visitar ({places.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> Añadir
        </button>
      </div>

      {places.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {places.map(p => (
            <div key={p.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</h4>
                  {p.address && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }}/>{p.address}</p>}
                  {p.description && <p style={{ fontSize: '0.85rem', marginTop: 8 }}>{p.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noopener" className="btn btn-icon btn-sm" title="Ver enlace">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button className="btn btn-icon btn-sm" onClick={() => startEdit(p)}><Edit3 size={14} /></button>
                  <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }} onClick={() => deletePlace(trip.id, p.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MapPin size={36} />} title="Sin lugares" description="Añade lugares que te gustaría visitar." />
      )}

      {showForm && (
        <Modal title={editing ? 'Editar lugar' : 'Nuevo lugar'} onClose={resetForm}
          footer={
            <>
              <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Guardar' : 'Añadir'}</button>
            </>
          }>
          <div className="form-group">
            <label className="form-label">Buscar lugar</label>
            <PlaceSearch onSelect={handlePlaceSelect} placeholder="Busca un lugar de interés..." />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Coliseo" />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="¿Por qué quieres visitarlo?" />
          </div>
          <div className="form-group">
            <label className="form-label">Enlace / Web</label>
            <input className="form-input" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
          </div>
        </Modal>
      )}
    </div>
  );
}
