import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, Clock, MapPin, Trash2, Edit3, X, Check, ExternalLink,
  Search, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import useTripStore from '../../data/store';
import { generateDays, formatDate } from '../../utils/helpers';
import EmptyState from '../EmptyState';
import { searchPlaces } from '../../services/geocoding';
import { calcularMargenLogistico, TRANSPORT_TYPES } from '../../utils/connection';

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

// ── Helpers de conexión ───────────────────────────────────────────────────────

const DEFAULT_ACTIVITY_DURATION_MIN = 60;

/**
 * Convierte una actividad (con `date` del día y `time`/`endTime` HH:MM) en un
 * evento aceptado por calcularMargenLogistico ({ id, start, end, location, ... }).
 * Si la actividad no tiene `endTime`, se asume DEFAULT_ACTIVITY_DURATION_MIN.
 */
function activityToEvent(activity, dayDate) {
  if (!activity?.time || !dayDate) return null;
  const start = `${dayDate}T${activity.time}:00`;
  const endTime = activity.endTime
    || (() => {
      const [h, m] = activity.time.split(':').map(Number);
      const d = new Date(0);
      d.setUTCHours(h, m + DEFAULT_ACTIVITY_DURATION_MIN, 0, 0);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    })();
  return {
    id: activity.id,
    start,
    end: `${dayDate}T${endTime}:00`,
    location: activity.place || null,
    terminal: activity.terminal || null,
  };
}

/** Formatea minutos como "Xh Ym" o "Ym" */
function fmtMinutes(min) {
  if (min == null) return '';
  if (min < 0) return `Solapa ${Math.abs(min)} min`;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const SEVERITY_STYLE = {
  overlap:  { bg: 'rgba(239,68,68,0.18)',  fg: '#B91C1C', icon: '⚠️',  label: 'Solape' },
  critical: { bg: 'rgba(239,68,68,0.14)',  fg: '#B91C1C', icon: '🚨',  label: 'Crítico' },
  tight:    { bg: 'rgba(245,158,11,0.16)', fg: '#B45309', icon: '⏱️', label: 'Muy justo' },
  short:    { bg: 'rgba(245,158,11,0.10)', fg: '#92400E', icon: '🟡',  label: 'Margen corto' },
  ok:       { bg: 'rgba(16,185,129,0.10)', fg: '#047857', icon: '✓',   label: 'Margen OK' },
};

// ── Connection indicator (entre dos actividades) ──────────────────────────────

function ConnectionIndicator({ result, onChange, onSave, expanded, onToggle }) {
  const sty = SEVERITY_STYLE[result.severity] || SEVERITY_STYLE.ok;
  const ti = result.transfer_instructions;

  return (
    <div className={`itin-connection itin-connection--${result.severity}`} style={{ background: sty.bg }}>
      <button type="button" className="itin-connection-summary" onClick={onToggle}>
        <span className="itin-connection-icon" aria-hidden>{sty.icon}</span>
        <span className="itin-connection-text" style={{ color: sty.fg }}>
          <strong>{fmtMinutes(result.margin_minutes)}</strong>
          {result.is_risk_connection && (
            <span className="itin-connection-risk">
              <AlertTriangle size={11} /> {sty.label}
            </span>
          )}
        </span>
        <span className="itin-connection-toggle">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="itin-transfer-editor">
          <div className="itin-transfer-row">
            <label>Desde terminal</label>
            <input
              className="form-input form-input-sm"
              value={ti.from_terminal || ''}
              placeholder="Ej: T4S, Andén 3"
              onChange={e => onChange({ ...ti, from_terminal: e.target.value })}
            />
          </div>
          <div className="itin-transfer-row">
            <label>A terminal</label>
            <input
              className="form-input form-input-sm"
              value={ti.to_terminal || ''}
              placeholder="Ej: T1, Sala C"
              onChange={e => onChange({ ...ti, to_terminal: e.target.value })}
            />
          </div>
          <div className="itin-transfer-row">
            <label>Transporte</label>
            <select
              className="form-input form-input-sm"
              value={ti.transport_type || ''}
              onChange={e => onChange({ ...ti, transport_type: e.target.value || null })}
            >
              <option value="">— elegir —</option>
              {Object.entries(TRANSPORT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="itin-transfer-row">
            <label>Tiempo estimado (min)</label>
            <input
              type="number" min="0" step="5"
              className="form-input form-input-sm"
              value={ti.duration_estimate_minutes ?? ''}
              onChange={e => onChange({ ...ti, duration_estimate_minutes: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <div className="itin-transfer-row itin-transfer-row--full">
            <label>Notas</label>
            <textarea
              className="form-textarea form-input-sm"
              rows={2}
              value={ti.notes || ''}
              placeholder="Recogida en bay 5, llevar localizador, etc."
              onChange={e => onChange({ ...ti, notes: e.target.value })}
            />
          </div>
          <div className="itin-transfer-actions">
            <button className="btn btn-primary btn-sm" onClick={onSave}>
              <Check size={13} /> Guardar trasbordo
            </button>
          </div>
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
              {(activity.time || activity.endTime) && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={12} />
                  {activity.time || '—'}
                  {activity.endTime && ` → ${activity.endTime}`}
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
  const [form, setForm] = useState({ name: '', place: '', time: '', endTime: '', notes: '', lat: null, lng: null });

  // Conexiones expandidas + buffer de edición de transfer_instructions
  // Clave: `${dayId}:${fromActivityId}->${toActivityId}`
  const [expandedConn, setExpandedConn] = useState(null);
  const [transferDraft, setTransferDraft] = useState(null);

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
    setForm({ name: '', place: '', time: '', endTime: '', notes: '', lat: null, lng: null });
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
      endTime: activity.endTime || '',
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

  // ── Conexiones ──
  const computeConnection = (dayDate, actA, actB) => {
    const evA = activityToEvent(actA, dayDate);
    const evB = activityToEvent(actB, dayDate);
    if (!evA || !evB) return null;
    try {
      const result = calcularMargenLogistico(evA, evB);
      // Hidratar transfer_instructions con lo previamente guardado en actB.transferFromPrev
      const persisted = actB.transferFromPrev || {};
      result.transfer_instructions = { ...result.transfer_instructions, ...persisted };
      return result;
    } catch {
      return null;
    }
  };

  const expandConn = (dayId, actA, actB, currentTransfer) => {
    const key = `${dayId}:${actA.id}->${actB.id}`;
    if (expandedConn === key) {
      setExpandedConn(null);
      setTransferDraft(null);
    } else {
      setExpandedConn(key);
      setTransferDraft(currentTransfer);
    }
  };

  const saveTransfer = (dayId, actB) => {
    if (!transferDraft) return;
    updateActivity(trip.id, dayId, actB.id, { transferFromPrev: transferDraft });
    setExpandedConn(null);
    setTransferDraft(null);
  };

  if (itinerary.length === 0) {
    return <EmptyState icon={<Clock size={36} />} title="Sin itinerario"
      description="Define las fechas del viaje para generar los días del itinerario." />;
  }

  return (
    <div>
      {itinerary.map(day => {
        const sortedActs = (day.activities || []).slice().sort((a, b) => a.order - b.order);

        return (
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

            {sortedActs.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, day.id)}>
                <SortableContext items={sortedActs.map(a => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="timeline">
                    {sortedActs.map((activity, idx) => {
                      const next = sortedActs[idx + 1];
                      const conn = next ? computeConnection(day.date, activity, next) : null;
                      const connKey = next ? `${day.id}:${activity.id}->${next.id}` : null;
                      const expanded = connKey === expandedConn;
                      return (
                        <div key={activity.id}>
                          <SortableActivity
                            activity={activity}
                            tripId={trip.id} dayId={day.id}
                            onEdit={(a) => { startEdit(a); setAddingDay(day.id); }}
                            onDelete={(aId) => deleteActivity(trip.id, day.id, aId)}
                          />
                          {conn && (
                            <ConnectionIndicator
                              result={conn}
                              expanded={expanded}
                              onToggle={() => expandConn(day.id, activity, next, conn.transfer_instructions)}
                              onChange={(ti) => setTransferDraft(ti)}
                              onSave={() => saveTransfer(day.id, next)}
                            />
                          )}
                        </div>
                      );
                    })}
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
                  {/* Row 1: name + start time + end time */}
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <input className="form-input" placeholder="Nombre de la actividad *"
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <input className="form-input" type="time" placeholder="Inicio"
                        value={form.time}
                        onChange={e => setForm({ ...form, time: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <input className="form-input" type="time" placeholder="Fin"
                        value={form.endTime}
                        onChange={e => setForm({ ...form, endTime: e.target.value })} />
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
        );
      })}
    </div>
  );
}
