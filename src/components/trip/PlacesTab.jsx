import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, ExternalLink, MapPin, CalendarPlus } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import PlaceSearch from '../PlaceSearch';
import EmptyState from '../EmptyState';
import { formatDateShort, normalizeItinerary } from '../../utils/helpers';

// Mapeo etiqueta de Place → tipo de actividad de itinerario
const PLACE_TAG_TO_ACTIVITY_TYPE = {
  restaurante: 'lunch',
  cafe: 'cafe',
  mirador: 'visit',
  monumento: 'visit',
  actividad: 'activity',
  foto: 'activity',
};

const PLACE_TAGS = [
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'cafe',        label: 'Café',        icon: '☕',  color: '#b45309', bg: 'rgba(180,83,9,0.12)'   },
  { id: 'mirador',     label: 'Mirador',     icon: '🏔️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'monumento',   label: 'Monumento',   icon: '🏛️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'actividad',   label: 'Actividad',   icon: '🎯', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'foto',        label: 'Foto',        icon: '📸', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
];

export default function PlacesTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', address: '', description: '', link: '',
    lat: null, lng: null, tags: []
  });
  const [activeFilter, setActiveFilter] = useState(null);

  const { addPlace, updatePlace, deletePlace, addActivity } = useTripStore();
  const saveStatus = useTripStore(s => s.saveStatus);
  const isSaving = saveStatus === 'saving';
  const [addToDayMenu, setAddToDayMenu] = useState(null); // placeId
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const addToDayMenuRef = useRef(null);

  // Click-outside: cierra el menú "Añadir al día" si el usuario clica fuera.
  // Compatible con táctil (pointerdown captura tap inicial). No depende de
  // onMouseLeave, que no funciona en móvil.
  useEffect(() => {
    if (!addToDayMenu) return;
    const onPointerDown = (e) => {
      if (addToDayMenuRef.current && !addToDayMenuRef.current.contains(e.target)) {
        setAddToDayMenu(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [addToDayMenu]);

  const itinerary = useMemo(
    () => normalizeItinerary(trip.itinerary || []),
    [trip.itinerary],
  );

  const handleAddToDay = async (place, dayId) => {
    if (isSaving) return;
    const tag = (place.tags || [])[0];
    const type = PLACE_TAG_TO_ACTIVITY_TYPE[tag] || 'visit';
    const r = await addActivity(trip.id, dayId, {
      name: place.name,
      place: place.address || place.name,
      lat: place.lat || null,
      lng: place.lng || null,
      type,
      time: '',
      endTime: '',
      notes: place.description || '',
      cost: null,
      reservationUrl: place.link || '',
      reservationCode: '',
      fromPlaceId: place.id,
    });
    if (!r?.ok) return;
    setAddToDayMenu(null);
  };

  const resetForm = () => {
    setForm({ name: '', address: '', description: '', link: '', lat: null, lng: null, tags: [] });
    setEditing(null);
    setShowForm(false);
    setFormError('');
  };

  const startEdit = (place) => {
    setEditing(place);
    setForm({
      name: place.name,
      address: place.address || '',
      description: place.description || '',
      link: place.link || '',
      lat: place.lat,
      lng: place.lng,
      tags: place.tags || [],
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setFormError('');
    setIsSubmitting(true);
    const r = editing
      ? await updatePlace(trip.id, editing.id, form)
      : await addPlace(trip.id, form);
    setIsSubmitting(false);
    if (!r?.ok) return;
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

  const toggleFormTag = (tagId) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const places = trip.places || [];

  const tagCounts = PLACE_TAGS.reduce((acc, tag) => {
    acc[tag.id] = places.filter(p => (p.tags || []).includes(tag.id)).length;
    return acc;
  }, {});

  const filteredPlaces = activeFilter
    ? places.filter(p => (p.tags || []).includes(activeFilter))
    : places;

  return (
    <div>
      <div className="section-header">
        <h3>Lugares a Visitar ({places.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> Añadir
        </button>
      </div>

      {/* Filter bar */}
      {places.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setActiveFilter(null)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: '1.5px solid var(--border)',
              background: activeFilter === null ? 'var(--primary)' : 'transparent',
              color: activeFilter === null ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}>
            Todos ({places.length})
          </button>
          {PLACE_TAGS.filter(tag => tagCounts[tag.id] > 0).map(tag => (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(activeFilter === tag.id ? null : tag.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${tag.color}`,
                background: activeFilter === tag.id ? tag.color : tag.bg,
                color: activeFilter === tag.id ? '#fff' : tag.color,
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s',
              }}>
              {tag.icon} {tag.label} ({tagCounts[tag.id]})
            </button>
          ))}
        </div>
      )}

      {filteredPlaces.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '16px' }}>
          {filteredPlaces.map(p => {
            const placeTags = PLACE_TAGS.filter(t => (p.tags || []).includes(t.id));
            return (
              <div key={p.id} className="card" style={{ padding: '16px' }}>
                {placeTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {placeTags.map(tag => (
                      <span key={tag.id} style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: tag.bg,
                        color: tag.color,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}>
                        {tag.icon} {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</h4>
                    {p.address && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {p.address}
                      </p>
                    )}
                    {p.description && (
                      <p style={{ fontSize: '0.85rem', marginTop: 8 }}>{p.description}</p>
                    )}
                  </div>
                  <div
                    ref={addToDayMenu === p.id ? addToDayMenuRef : null}
                    style={{ display: 'flex', gap: 4, marginLeft: 12, position: 'relative' }}
                  >
                    {itinerary.length > 0 && (
                      <button
                        className="btn btn-icon btn-sm"
                        title="Añadir al itinerario"
                        aria-haspopup="menu"
                        aria-expanded={addToDayMenu === p.id}
                        onClick={(e) => {
                          // Detenemos la propagación para que el pointerdown del
                          // click-outside no nos cierre justo al abrir.
                          e.stopPropagation();
                          setAddToDayMenu(addToDayMenu === p.id ? null : p.id);
                        }}
                        style={{ color: 'var(--primary)' }}>
                        <CalendarPlus size={14} />
                      </button>
                    )}
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener" className="btn btn-icon btn-sm" title="Ver enlace">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button className="btn btn-icon btn-sm" onClick={() => startEdit(p)}>
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-sm"
                      style={{ color: 'var(--error)' }}
                      onClick={() => deletePlace(trip.id, p.id)}>
                      <Trash2 size={14} />
                    </button>

                    {addToDayMenu === p.id && (
                      <div
                        role="menu"
                        // Sin onMouseLeave: cerrar al mover el ratón rompe táctil
                        // y es accidental en escritorio. El click-outside del
                        // useEffect se encarga del cierre.
                        style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: 4,
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 20,
                          minWidth: 200, maxHeight: 260, overflowY: 'auto', padding: 4,
                        }}>
                        <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          AÑADIR AL DÍA
                        </div>
                        {itinerary.map(d => (
                          <button
                            key={d.id}
                            role="menuitem"
                            onClick={() => handleAddToDay(p, d.id)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '10px 10px', background: 'transparent', border: 'none',
                              cursor: 'pointer', borderRadius: 6, fontSize: '0.85rem',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <strong>Día {d.dayNumber}</strong> · {formatDateShort(d.date)}
                            <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: '0.78rem' }}>
                              ({d.activities?.length || 0} act.)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<MapPin size={36} />}
          title={activeFilter ? 'Sin lugares con esa etiqueta' : 'Sin lugares'}
          description={activeFilter ? 'Prueba otro filtro o añade nuevos lugares.' : 'Añade lugares que te gustaría visitar.'}
        />
      )}

      {showForm && (
        <Modal
          title={editing ? 'Editar lugar' : 'Nuevo lugar'}
          onClose={isSubmitting ? () => {} : resetForm}
          footer={
            <>
              <button className="btn btn-secondary" onClick={resetForm} disabled={isSubmitting}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSubmitting || !form.name.trim()}>
                {isSubmitting ? 'Guardando...' : (editing ? 'Guardar' : 'Añadir')}
              </button>
            </>
          }>
          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--error)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>
              {formError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Buscar lugar</label>
            <PlaceSearch onSelect={handlePlaceSelect} placeholder="Busca un lugar de interés..." />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Coliseo"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input
              className="form-input"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Etiquetas</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {PLACE_TAGS.map(tag => {
                const selected = form.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleFormTag(tag.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1.5px solid ${tag.color}`,
                      background: selected ? tag.color : tag.bg,
                      color: selected ? '#fff' : tag.color,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s',
                    }}>
                    {tag.icon} {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="¿Por qué quieres visitarlo?"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Enlace / Web</label>
            <input
              className="form-input"
              value={form.link}
              onChange={e => setForm({ ...form, link: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
