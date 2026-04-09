import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Clock, MapPin, Trash2, Edit3, X, Check, ExternalLink, Search } from 'lucide-react';
import useTripStore from '../../data/store';
import { generateDays, formatDate } from '../../utils/helpers';
import EmptyState from '../EmptyState';
import { searchPlaces } from '../../services/geocoding';

// ── Inline place search ───────────────────────────────────────────────────────
function ActivityPlaceSearch({ onSelect, placeholder }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const timerRef = useState(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); setShow(false); return; }
    clearTimeout(timerRef[0]);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPlaces(query);
        setResults(data);
        setShow(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 500);
    timerRef[0] = t;
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line

  const handleSelect = (place) => {
    setQuery(place.displayName.split(',')[0]);
    setShow(false);
    onSelect(place);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 30 }}
          placeholder={placeholder || 'Buscar en mapa...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 150)}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>...</span>
        )}
      </div>
      {show && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={i} onMouseDown={() => handleSelect(r)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--primary)' }} />
              <span>{r.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sortable activity card ────────────────────────────────────────────────────
function SortableActivity({ activity, tripId, dayId, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const mapsUrl = activity.lat && activity.lng
    ? `https://www.google.com/maps?q=${activity.lat},${activity.lng}`
    : activity.place
      ? `https://www.google.com/maps/search/${encodeURIComponent(activity.place)}`
      : null;

  return (
    <div ref={setNodeRef} style={style} className="timeline-item sortable-item">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{activity.name}</h4>
              {activity.place && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={12} /> {activity.place}
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      title="Ver en Google Maps"
                      style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary)', marginLeft: 4 }}
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </p>
              )}
              {activity.time && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={12} /> {activity.time}
                </p>
              )}
              {activity.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{activity.notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-icon btn-sm" onClick={() => onEdit(activity)}><Edit3 size={14} /></button>
              <button className="btn btn-icon btn-sm" onClick={() => onDelete(activity.id)} style={{ color: 'var(--error)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ItineraryTab({ trip }) {
  const [editingActivity, setEditingActivity] = useState(null);
  const [addingDay, setAddingDay] = useState(null);
  const [form, setForm] = useState({ name: '', place: '', time: '', notes: '', lat: null, lng: null });

  const { addActivity, updateActivity, deleteActivity, reorderActivities, setItinerary } = useTripStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const itinerary = trip.itinerary?.length > 0 ? trip.itinerary :
    (trip.startDate && trip.endDate ? generateDays(trip.startDate, trip.endDate) : []);

  useEffect(() => {
    if (trip.itinerary?.length === 0 && trip.startDate && trip.endDate) {
      const days = generateDays(trip.startDate, trip.endDate);
      setItinerary(trip.id, days);
    }
  }, [trip.id, trip.itinerary?.length, trip.startDate, trip.endDate]); // eslint-disable-line

  const handleDragEnd = (event, dayId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = itinerary.find(d => d.id === dayId);
    if (!day) return;
    const oldIndex = day.activities.findIndex(a => a.id === active.id);
    const newIndex = day.activities.findIndex(a => a.id === over.id);
    reorderActivities(trip.id, dayId, arrayMove(day.activities, oldIndex, newIndex));
  };

  const resetForm = () => {
    setForm({ name: '', place: '', time: '', notes: '', lat: null, lng: null });
    setEditingActivity(null);
    setAddingDay(null);
  };

  const handleSave = (dayId) => {
    if (!form.name.trim()) return;
    if (editingActivity) {
      updateActivity(trip.id, dayId, editingActivity.id, form);
    } else {
      addActivity(trip.id, dayId, form);
    }
    resetForm();
  };

  const startEdit = (activity) => {
    setEditingActivity(activity);
    setForm({
      name: activity.name,
      place: activity.place || '',
      time: activity.time || '',
      notes: activity.notes || '',
      lat: activity.lat || null,
      lng: activity.lng || null,
    });
  };

  const handleLocationSelect = (place) => {
    setForm(prev => ({
      ...prev,
      place: prev.place || place.displayName.split(',')[0],
      lat: place.lat,
      lng: place.lng,
    }));
  };

  if (itinerary.length === 0) {
    return <EmptyState icon={<Clock size={36} />} title="Sin itinerario"
      description="Define las fechas del viaje para generar los días del itinerario." />;
  }

  return (
    <div>
      {itinerary.map(day => (
        <div key={day.id} style={{ marginBottom: 28 }}>
          <div className="section-header">
            <h3 style={{ fontSize: '1rem' }}>
              Día {day.dayNumber} — {formatDate(day.date)}
            </h3>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { resetForm(); setAddingDay(day.id); }}>
              <Plus size={14} /> Añadir
            </button>
          </div>

          {day.activities?.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, day.id)}>
              <SortableContext items={day.activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                <div className="timeline">
                  {day.activities.slice().sort((a, b) => a.order - b.order).map(activity => (
                    <SortableActivity key={activity.id} activity={activity}
                      tripId={trip.id} dayId={day.id}
                      onEdit={(a) => { startEdit(a); setAddingDay(day.id); }}
                      onDelete={(aId) => deleteActivity(trip.id, day.id, aId)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', padding: '8px 0' }}>
              Sin actividades todavía
            </p>
          )}

          {addingDay === day.id && (
            <div className="card" style={{ marginTop: 12, padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Row 1: name + time */}
                <div className="form-row">
                  <div className="form-group">
                    <input className="form-input" placeholder="Nombre de la actividad *"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <input className="form-input" type="time" value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>

                {/* Row 2: place text + location search */}
                <div className="form-row">
                  <div className="form-group">
                    <input className="form-input" placeholder="Nombre del lugar"
                      value={form.place}
                      onChange={e => setForm({ ...form, place: e.target.value, lat: null, lng: null })} />
                  </div>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <ActivityPlaceSearch
                      key={addingDay}
                      onSelect={handleLocationSelect}
                      placeholder="Buscar ubicación en mapa..." />
                  </div>
                </div>

                {/* Location feedback */}
                {form.lat && form.lng && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--success)' }}>
                    <MapPin size={12} />
                    <span>Ubicación guardada · </span>
                    <a href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      Ver en Google Maps <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Row 3: notes */}
                <div className="form-group">
                  <input className="form-input" placeholder="Notas"
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={resetForm}><X size={14} /> Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSave(day.id)}>
                    <Check size={14} /> {editingActivity ? 'Guardar' : 'Añadir'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
