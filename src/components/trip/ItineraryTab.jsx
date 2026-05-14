import { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, Clock, MapPin, Trash2, Edit3, X, Check, ExternalLink,
  Search, AlertTriangle, ChevronDown, ChevronUp, Copy, Wallet, Link as LinkIcon,
  Coffee, Utensils, Wine, Landmark, Sparkles, Bus, ShoppingBag, Bed, Star, Zap,
} from 'lucide-react';
import useTripStore from '../../data/store';
import {
  generateDays, formatDate, syncDaysWithDates, parseQuickActivity, addMinutesToTime,
  formatCurrency,
} from '../../utils/helpers';
import { ACTIVITY_TYPES, MEAL_SLOTS } from '../../utils/constants';
import EmptyState from '../EmptyState';
import ConfirmDialog from '../ConfirmDialog';
import { searchPlaces } from '../../services/geocoding';
import { calcularMargenLogistico, TRANSPORT_TYPES } from '../../utils/connection';

// Mapa nombre-icono → componente Lucide para los tipos de actividad
const ICON_MAP = { Coffee, Utensils, Wine, Landmark, Sparkles, Bus, ShoppingBag, Bed, Star };
const TypeIcon = ({ type, size = 14 }) => {
  const t = ACTIVITY_TYPES[type] || ACTIVITY_TYPES.other;
  const Cmp = ICON_MAP[t.icon] || Star;
  return <Cmp size={size} />;
};

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

// ── Connection indicator ──────────────────────────────────────────────────────
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
            <input className="form-input form-input-sm" value={ti.from_terminal || ''}
              placeholder="Ej: T4S, Andén 3"
              onChange={e => onChange({ ...ti, from_terminal: e.target.value })} />
          </div>
          <div className="itin-transfer-row">
            <label>A terminal</label>
            <input className="form-input form-input-sm" value={ti.to_terminal || ''}
              placeholder="Ej: T1, Sala C"
              onChange={e => onChange({ ...ti, to_terminal: e.target.value })} />
          </div>
          <div className="itin-transfer-row">
            <label>Transporte</label>
            <select className="form-input form-input-sm" value={ti.transport_type || ''}
              onChange={e => onChange({ ...ti, transport_type: e.target.value || null })}>
              <option value="">— elegir —</option>
              {Object.entries(TRANSPORT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="itin-transfer-row">
            <label>Tiempo estimado (min)</label>
            <input type="number" min="0" step="5" className="form-input form-input-sm"
              value={ti.duration_estimate_minutes ?? ''}
              onChange={e => onChange({ ...ti, duration_estimate_minutes: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
          <div className="itin-transfer-row itin-transfer-row--full">
            <label>Notas</label>
            <textarea className="form-textarea form-input-sm" rows={2}
              value={ti.notes || ''}
              placeholder="Recogida en bay 5, llevar localizador, etc."
              onChange={e => onChange({ ...ti, notes: e.target.value })} />
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
function SortableActivity({ activity, onEdit, onDelete, onDuplicate, onAddExpense }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const typeKey = activity.type && ACTIVITY_TYPES[activity.type] ? activity.type : null;
  const t = typeKey ? ACTIVITY_TYPES[typeKey] : null;

  const mapsUrl = activity.lat && activity.lng
    ? `https://www.google.com/maps?q=${activity.lat},${activity.lng}`
    : activity.place
      ? `https://www.google.com/maps/search/${encodeURIComponent(activity.place)}`
      : null;

  return (
    <div ref={setNodeRef} style={{ ...style, borderLeft: t ? `3px solid ${t.color}` : undefined }}
         className="timeline-item sortable-item">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {t && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: t.bg, color: t.color, padding: '2px 8px',
                    borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    <TypeIcon type={typeKey} size={11} /> {t.label}
                  </span>
                )}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{activity.name}</h4>
              </div>
              {activity.place && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
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
              {(activity.cost > 0 || activity.reservationUrl || activity.reservationCode) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  {activity.cost > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: '0.78rem', color: 'var(--text-secondary)',
                      background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 8,
                    }}>
                      <Wallet size={11} /> {formatCurrency(activity.cost)}
                    </span>
                  )}
                  {activity.reservationUrl && (
                    <a href={activity.reservationUrl} target="_blank" rel="noopener noreferrer"
                       onClick={e => e.stopPropagation()}
                       style={{
                         display: 'inline-flex', alignItems: 'center', gap: 3,
                         fontSize: '0.78rem', color: 'var(--primary)',
                       }}>
                      <LinkIcon size={11} /> Reserva
                    </a>
                  )}
                  {activity.reservationCode && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      Cód: <code>{activity.reservationCode}</code>
                    </span>
                  )}
                </div>
              )}
              {activity.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{activity.notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {activity.cost > 0 && (
                <button className="btn btn-icon btn-sm" onClick={() => onAddExpense(activity)} title="Añadir como gasto">
                  <Wallet size={14} />
                </button>
              )}
              <button className="btn btn-icon btn-sm" onClick={() => onDuplicate(activity)} title="Duplicar">
                <Copy size={14} />
              </button>
              <button className="btn btn-icon btn-sm" onClick={() => onEdit(activity)} title="Editar">
                <Edit3 size={14} />
              </button>
              <button className="btn btn-icon btn-sm" onClick={() => onDelete(activity.id)}
                      title="Eliminar" style={{ color: 'var(--error)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick add bar (parser express) ────────────────────────────────────────────
function QuickAddBar({ onAdd }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    const parsed = parseQuickActivity(text);
    onAdd({ name: parsed.name, time: parsed.time, type: parsed.type || 'other' });
    setText('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Zap size={13} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--primary)', pointerEvents: 'none',
        }} />
        <input className="form-input" style={{ paddingLeft: 30, fontSize: '0.85rem' }}
          placeholder='Rápido: "20:00 Cena en Trastevere" — Enter para añadir'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
      </div>
      <button className="btn btn-primary btn-sm" onClick={submit} disabled={!text.trim()}>
        <Plus size={13} /> Añadir
      </button>
    </div>
  );
}

// ── Selector visual de tipo ───────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {Object.entries(ACTIVITY_TYPES).map(([key, t]) => {
        const selected = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 18,
              border: `1.5px solid ${t.color}`,
              background: selected ? t.color : t.bg,
              color: selected ? '#fff' : t.color,
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.12s',
            }}>
            <TypeIcon type={key} size={11} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Recordatorio comidas del día ──────────────────────────────────────────────
function MealReminder({ activities }) {
  const present = new Set((activities || []).map(a => ACTIVITY_TYPES[a.type]?.mealSlot).filter(Boolean));
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {MEAL_SLOTS.map(slot => {
        const ok = present.has(slot.id);
        return (
          <span key={slot.id} title={ok ? `${slot.label} planeado` : `Sin ${slot.label.toLowerCase()}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
              background: ok ? 'rgba(16,185,129,0.14)' : 'rgba(156,163,175,0.14)',
              color: ok ? '#047857' : '#6B7280',
              border: ok ? '1px solid rgba(16,185,129,0.3)' : '1px dashed rgba(156,163,175,0.4)',
            }}>
            {slot.icon} {slot.label} {ok ? '✓' : '·'}
          </span>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', place: '', time: '', endTime: '', notes: '',
  lat: null, lng: null, type: 'other',
  cost: '', reservationUrl: '', reservationCode: '',
};

export default function ItineraryTab({ trip }) {
  const [editingActivity, setEditingActivity] = useState(null);
  const [addingDay, setAddingDay] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicateMenuFor, setDuplicateMenuFor] = useState(null); // dayId

  // Conexiones expandidas + buffer de edición de transfer_instructions
  const [expandedConn, setExpandedConn] = useState(null);
  const [transferDraft, setTransferDraft] = useState(null);

  // Confirmación al recortar fechas con días que tenían actividades
  const [pendingSync, setPendingSync] = useState(null); // { days, removed }

  const {
    addActivity, updateActivity, deleteActivity, reorderActivities, setItinerary,
    duplicateActivity, duplicateDay, addExpense,
  } = useTripStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Sincronizar itinerario con startDate/endDate cada vez que cambien.
  useEffect(() => {
    if (!trip?.id || !trip.startDate || !trip.endDate) return;

    const current = trip.itinerary || [];
    // Caso 1: itinerario vacío → generar de cero, sin preguntar.
    if (current.length === 0) {
      setItinerary(trip.id, generateDays(trip.startDate, trip.endDate));
      return;
    }

    // Caso 2: ya hay días → sincronizar conservando lo existente.
    const { days, removedWithActivities } = syncDaysWithDates(current, trip.startDate, trip.endDate);

    // Si la lista resultante es idéntica (mismas fechas en el mismo orden), nada que hacer.
    const sameDates =
      days.length === current.length &&
      days.every((d, i) => d.date === current[i].date && d.dayNumber === current[i].dayNumber);
    if (sameDates) return;

    if (removedWithActivities.length > 0) {
      setPendingSync({ days, removed: removedWithActivities });
    } else {
      setItinerary(trip.id, days);
    }
  }, [trip?.id, trip?.startDate, trip?.endDate, trip?.itinerary?.length]); // eslint-disable-line

  // Itinerario "visible": si todavía no está persistido, mostramos el generado on-the-fly.
  const itinerary = useMemo(() => {
    if (trip.itinerary?.length > 0) return trip.itinerary;
    if (trip.startDate && trip.endDate) return generateDays(trip.startDate, trip.endDate);
    return [];
  }, [trip.itinerary, trip.startDate, trip.endDate]);

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
    setForm(EMPTY_FORM);
    setEditingActivity(null);
    setAddingDay(null);
    setShowAdvanced(false);
  };

  const buildPayload = (f) => {
    // Auto-calcular endTime si hay tipo + time pero no endTime
    let endTime = f.endTime;
    if (!endTime && f.time && f.type && ACTIVITY_TYPES[f.type]?.defaultDuration) {
      endTime = addMinutesToTime(f.time, ACTIVITY_TYPES[f.type].defaultDuration);
    }
    return {
      name: f.name.trim(),
      place: f.place || '',
      time: f.time || '',
      endTime: endTime || '',
      notes: f.notes || '',
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      type: f.type || 'other',
      cost: f.cost === '' || f.cost == null ? null : Number(f.cost),
      reservationUrl: f.reservationUrl || '',
      reservationCode: f.reservationCode || '',
    };
  };

  const handleSave = (dayId) => {
    if (!form.name.trim()) return;
    const payload = buildPayload(form);
    if (editingActivity) {
      updateActivity(trip.id, dayId, editingActivity.id, payload);
    } else {
      addActivity(trip.id, dayId, payload);
    }
    resetForm();
  };

  const startEdit = (activity) => {
    setEditingActivity(activity);
    setForm({
      name: activity.name || '',
      place: activity.place || '',
      time: activity.time || '',
      endTime: activity.endTime || '',
      notes: activity.notes || '',
      lat: activity.lat ?? null,
      lng: activity.lng ?? null,
      type: activity.type || 'other',
      cost: activity.cost ?? '',
      reservationUrl: activity.reservationUrl || '',
      reservationCode: activity.reservationCode || '',
    });
    setShowAdvanced(!!(activity.cost || activity.reservationUrl || activity.reservationCode));
  };

  const handleLocationSelect = (place) => {
    setForm(prev => ({
      ...prev,
      place: prev.place || place.displayName.split(',')[0],
      lat: place.lat,
      lng: place.lng,
    }));
  };

  // Adición express
  const handleQuickAdd = (dayId) => (data) => {
    addActivity(trip.id, dayId, buildPayload({ ...EMPTY_FORM, ...data }));
  };

  // Cambio de tipo desde el formulario inline → autocompleta type sin tocar nombre
  const handleTypeChange = (newType) => {
    setForm(prev => ({ ...prev, type: newType }));
  };

  // Convertir actividad en gasto
  const handleAddExpense = (activity) => {
    if (!activity.cost) return;
    const t = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.other;
    addExpense(trip.id, {
      title: activity.name,
      amount: Number(activity.cost),
      currency: 'EUR',
      category: t.expenseCategory || 'otros',
      date: itinerary.find(d => d.activities?.some(a => a.id === activity.id))?.date || trip.startDate,
      notes: `Desde itinerario · ${activity.place || ''}`.trim(),
      paidBy: null,
      splitBetween: [],
    });
  };

  // ── Conexiones ──
  const computeConnection = (dayDate, actA, actB) => {
    const evA = activityToEvent(actA, dayDate);
    const evB = activityToEvent(actB, dayDate);
    if (!evA || !evB) return null;
    try {
      const result = calcularMargenLogistico(evA, evB);
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
      {/* Confirmación al borrar días con actividades por recortar fechas */}
      {pendingSync && (
        <ConfirmDialog
          title={`Eliminar ${pendingSync.removed.length} día(s) con actividades`}
          message={`Has reducido las fechas del viaje. Estos días quedan fuera del nuevo rango y se borrarán junto a sus actividades:\n\n${pendingSync.removed.map(d => `• ${formatDate(d.date)} (${d.activities.length} act.)`).join('\n')}\n\n¿Confirmas?`}
          danger
          onCancel={() => setPendingSync(null)}
          onConfirm={() => {
            setItinerary(trip.id, pendingSync.days);
            setPendingSync(null);
          }}
        />
      )}

      {itinerary.map(day => {
        const sortedActs = (day.activities || []).slice().sort((a, b) => a.order - b.order);
        const dayCost = sortedActs.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
        const otherDays = itinerary.filter(d => d.id !== day.id);

        return (
          <div key={day.id} style={{ marginBottom: 32 }}>
            {/* Cabecera del día */}
            <div className="section-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>
                  Día {day.dayNumber} — {formatDate(day.date)}
                  {dayCost > 0 && (
                    <span style={{ marginLeft: 10, fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      · {formatCurrency(dayCost)}
                    </span>
                  )}
                </h3>
                {sortedActs.length > 0 && <MealReminder activities={sortedActs} />}
              </div>
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                {sortedActs.length > 0 && otherDays.length > 0 && (
                  <>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setDuplicateMenuFor(duplicateMenuFor === day.id ? null : day.id)}
                      title="Duplicar este día en otro">
                      <Copy size={14} /> Duplicar día
                    </button>
                    {duplicateMenuFor === day.id && (
                      <div onMouseLeave={() => setDuplicateMenuFor(null)}
                        style={{
                          position: 'absolute', top: '100%', right: 60, marginTop: 4,
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 30,
                          minWidth: 220, maxHeight: 260, overflowY: 'auto', padding: 4,
                        }}>
                        <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          COPIAR ACTIVIDADES A
                        </div>
                        {otherDays.map(d => (
                          <button key={d.id}
                            onClick={() => { duplicateDay(trip.id, day.id, d.date); setDuplicateMenuFor(null); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '8px 10px', background: 'transparent', border: 'none',
                              cursor: 'pointer', borderRadius: 6, fontSize: '0.85rem',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            Día {d.dayNumber} · {formatDate(d.date)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { resetForm(); setAddingDay(day.id); }}>
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>

            {/* Adición express SIEMPRE visible cuando no se está editando */}
            {addingDay !== day.id && (
              <QuickAddBar onAdd={handleQuickAdd(day.id)} />
            )}

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
                            onEdit={(a) => { startEdit(a); setAddingDay(day.id); }}
                            onDelete={(aId) => deleteActivity(trip.id, day.id, aId)}
                            onDuplicate={(a) => duplicateActivity(trip.id, day.id, a.id)}
                            onAddExpense={handleAddExpense}
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
                Sin actividades todavía. Usa la barra rápida o el botón "Añadir".
              </p>
            )}

            {addingDay === day.id && (
              <div className="card" style={{ marginTop: 12, padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Selector de tipo */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Tipo</label>
                    <TypeSelector value={form.type} onChange={handleTypeChange} />
                  </div>

                  {/* Row 1: name + start time + end time */}
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <input className="form-input" placeholder="Nombre de la actividad *"
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
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

                  {/* Toggle de campos avanzados */}
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setShowAdvanced(s => !s)}
                    style={{ alignSelf: 'flex-start', fontSize: '0.78rem' }}>
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showAdvanced ? ' Ocultar' : ' Más opciones'} (coste, reserva)
                  </button>

                  {showAdvanced && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Coste (€)</label>
                        <input className="form-input" type="number" min="0" step="0.5"
                          placeholder="0"
                          value={form.cost}
                          onChange={e => setForm({ ...form, cost: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>URL reserva</label>
                        <input className="form-input" placeholder="https://..."
                          value={form.reservationUrl}
                          onChange={e => setForm({ ...form, reservationUrl: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Nº confirmación</label>
                        <input className="form-input" placeholder="ABC123"
                          value={form.reservationCode}
                          onChange={e => setForm({ ...form, reservationCode: e.target.value })} />
                      </div>
                    </div>
                  )}

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
