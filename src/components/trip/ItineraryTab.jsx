import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Clock, MapPin, Trash2, Edit3, X, Check } from 'lucide-react';
import useTripStore from '../../data/store';
import { generateDays, formatDate } from '../../utils/helpers';
import EmptyState from '../EmptyState';

function SortableActivity({ activity, tripId, dayId, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

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

export default function ItineraryTab({ trip }) {
  const [editingActivity, setEditingActivity] = useState(null);
  const [addingDay, setAddingDay] = useState(null);
  const [form, setForm] = useState({ name: '', place: '', time: '', notes: '' });

  const { addActivity, updateActivity, deleteActivity, reorderActivities, setItinerary } = useTripStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const itinerary = trip.itinerary?.length > 0 ? trip.itinerary :
    (trip.startDate && trip.endDate ? generateDays(trip.startDate, trip.endDate) : []);

  // Fix: move side-effecting store call out of render into an effect
  useEffect(() => {
    if (trip.itinerary?.length === 0 && trip.startDate && trip.endDate) {
      const days = generateDays(trip.startDate, trip.endDate);
      setItinerary(trip.id, days);
    }
  }, [trip.id, trip.itinerary?.length, trip.startDate, trip.endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = (event, dayId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = itinerary.find(d => d.id === dayId);
    if (!day) return;
    const oldIndex = day.activities.findIndex(a => a.id === active.id);
    const newIndex = day.activities.findIndex(a => a.id === over.id);
    const reordered = arrayMove(day.activities, oldIndex, newIndex);
    reorderActivities(trip.id, dayId, reordered);
  };

  const resetForm = () => {
    setForm({ name: '', place: '', time: '', notes: '' });
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
    setForm({ name: activity.name, place: activity.place || '', time: activity.time || '', notes: activity.notes || '' });
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
              onClick={() => { setAddingDay(day.id); resetForm(); }}>
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
                <div className="form-row">
                  <div className="form-group">
                    <input className="form-input" placeholder="Nombre de la actividad"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <input className="form-input" placeholder="Lugar"
                      value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <input className="form-input" type="time" value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <input className="form-input" placeholder="Notas"
                      value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
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
