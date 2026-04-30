import { useState } from 'react';
import {
  Plus, Trash2, Edit3, Plane, TrainFront, Bus, Car,
  ArrowRight, Clock, MapPin, AlertTriangle, X,
} from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import { TRANSPORT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';
import { calcularMargenLogistico } from '../../utils/connection';

const ICONS = { flight: Plane, train: TrainFront, bus: Bus, car_rental: Car };
const COLORS = { flight: '#3B82F6', train: '#10B981', bus: '#F97316', car_rental: '#8B5CF6' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const fmtTime     = (iso) => iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtMinutes  = (m) => {
  if (m == null) return '';
  if (m < 0) return `solapa ${Math.abs(m)} min`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

const newStopover = () => ({
  id: 'stop_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
  location: '',
  arrivalDateTime: '',
  departureDateTime: '',
  terminal: '',
  segmentCode: '',
  notes: '',
});

const EMPTY_FORM = {
  type: 'flight',
  company: '',
  from: '',
  to: '',
  departureDateTime: '',
  arrivalDateTime: '',
  bookingNumber: '',
  price: '',
  notes: '',
  stopovers: [],
};

/**
 * Construye la lista de tramos del transporte.
 * Si no tiene escalas → 1 tramo directo.
 * Si tiene N escalas → N+1 tramos.
 * Cada tramo: { from, to, departure, arrival, code? }
 * Cada escala: { layoverMinutes, isRisk, location, terminal }
 */
function buildLegs(transport) {
  const stops = transport.stopovers || [];
  const departure = transport.departureDateTime || transport.dateTime || '';
  const arrival   = transport.arrivalDateTime || '';
  const legs = [];
  const layovers = [];

  if (stops.length === 0) {
    legs.push({
      from: transport.from || '',
      to: transport.to || '',
      departure,
      arrival,
      code: transport.flightCode || '',
    });
    return { legs, layovers };
  }

  // Primer tramo: origen → primera escala
  legs.push({
    from: transport.from || '',
    to: stops[0].location || '',
    departure,
    arrival: stops[0].arrivalDateTime || '',
    code: transport.flightCode || '',
  });

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const next = stops[i + 1];
    // Layover en este stop
    let layoverInfo = { layoverMinutes: null, isRisk: false, location: stop.location, terminal: stop.terminal };
    if (stop.arrivalDateTime && stop.departureDateTime) {
      try {
        const conn = calcularMargenLogistico(
          { id: 'a', end: stop.arrivalDateTime },
          { id: 'b', start: stop.departureDateTime },
        );
        layoverInfo = {
          ...layoverInfo,
          layoverMinutes: conn.margin_minutes,
          isRisk: conn.is_risk_connection,
          severity: conn.severity,
        };
      } catch { /* ignore */ }
    }
    layovers.push(layoverInfo);

    // Tramo siguiente: stop → (siguiente stop | destino final)
    legs.push({
      from: stop.location || '',
      to: next ? next.location || '' : (transport.to || ''),
      departure: stop.departureDateTime || '',
      arrival: next ? next.arrivalDateTime || '' : arrival,
      code: stop.segmentCode || '',
    });
  }

  return { legs, layovers };
}

// ── Stopover row inside the form ──────────────────────────────────────────────
function StopoverRow({ stopover, onChange, onRemove, index, total }) {
  const upd = (k, v) => onChange({ ...stopover, [k]: v });
  // Margen del layover en vivo
  let preview = null;
  if (stopover.arrivalDateTime && stopover.departureDateTime) {
    try {
      const r = calcularMargenLogistico(
        { id: 'a', end: stopover.arrivalDateTime },
        { id: 'b', start: stopover.departureDateTime },
      );
      preview = { mins: r.margin_minutes, risk: r.is_risk_connection };
    } catch { /* ignore */ }
  }

  return (
    <div className="tt-stop-row">
      <div className="tt-stop-row-head">
        <span className="tt-stop-num">Escala {index + 1} de {total}</span>
        <button type="button" className="btn btn-icon btn-sm tt-stop-remove" onClick={onRemove} title="Eliminar escala">
          <X size={13} />
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Ciudad / aeropuerto</label>
          <input className="form-input" value={stopover.location} onChange={e => upd('location', e.target.value)} placeholder="Ej: París CDG" />
        </div>
        <div className="form-group">
          <label className="form-label">Terminal</label>
          <input className="form-input" value={stopover.terminal} onChange={e => upd('terminal', e.target.value)} placeholder="Ej: T2E" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Llegada</label>
          <input className="form-input" type="datetime-local" value={stopover.arrivalDateTime} onChange={e => upd('arrivalDateTime', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Salida siguiente segmento</label>
          <input className="form-input" type="datetime-local" value={stopover.departureDateTime} onChange={e => upd('departureDateTime', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Código siguiente segmento</label>
          <input className="form-input" value={stopover.segmentCode} onChange={e => upd('segmentCode', e.target.value)} placeholder="Ej: AF274" />
        </div>
        <div className="form-group">
          <label className="form-label">Notas</label>
          <input className="form-input" value={stopover.notes} onChange={e => upd('notes', e.target.value)} placeholder="Ej: bus entre terminales" />
        </div>
      </div>

      {/* Preview del margen en tiempo real */}
      {preview && (
        <div className={`tt-stop-preview ${preview.risk ? 'risk' : 'ok'}`}>
          {preview.risk ? <AlertTriangle size={13} /> : <Clock size={13} />}
          <span>Tiempo de escala: <strong>{fmtMinutes(preview.mins)}</strong></span>
          {preview.risk && <span className="tt-stop-preview-tag">conexión de riesgo (&lt; 120 min)</span>}
        </div>
      )}
    </div>
  );
}

// ── Transport card on the list ────────────────────────────────────────────────
function TransportCard({ transport, onEdit, onDelete }) {
  const Icon = ICONS[transport.type] || Plane;
  const color = COLORS[transport.type] || '#6366F1';
  const { legs, layovers } = buildLegs(transport);
  const totalLegs = legs.length;

  const hasRisk = layovers.some(l => l.isRisk);

  return (
    <div className={`transport-item tt-card ${hasRisk ? 'tt-card--risk' : ''}`}>
      <div className="transport-icon" style={{ background: `${color}20`, color }}>
        <Icon size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              {transport.company || '—'}
              {totalLegs > 1 && (
                <span className="tt-stop-badge">
                  {totalLegs - 1} {totalLegs - 1 === 1 ? 'escala' : 'escalas'}
                </span>
              )}
              {hasRisk && (
                <span className="tt-risk-badge" title="Hay una conexión de riesgo">
                  <AlertTriangle size={11} /> riesgo
                </span>
              )}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {TRANSPORT_TYPES[transport.type]?.label}
              {(transport.from || transport.to) && (
                <> · <strong>{transport.from || '?'}</strong> → <strong>{transport.to || '?'}</strong></>
              )}
            </p>

            {/* Timeline de tramos + escalas */}
            {(legs.length > 0 && (legs[0].departure || legs[0].arrival || layovers.length)) && (
              <div className="tt-timeline">
                {legs.map((leg, i) => (
                  <div key={`leg-${i}`}>
                    <div className="tt-leg">
                      <div className="tt-leg-dot" style={{ background: color }} />
                      <div className="tt-leg-line">
                        <div className="tt-leg-row">
                          <MapPin size={11} />
                          <span><strong>{leg.from || '?'}</strong> {fmtTime(leg.departure)}</span>
                          <ArrowRight size={11} />
                          <span><strong>{leg.to || '?'}</strong> {fmtTime(leg.arrival)}</span>
                          {leg.code && <span className="tt-leg-code">{leg.code}</span>}
                        </div>
                      </div>
                    </div>
                    {layovers[i] && (
                      <div className={`tt-layover ${layovers[i].isRisk ? 'risk' : ''}`}>
                        {layovers[i].isRisk ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        <span>
                          Escala en <strong>{layovers[i].location || '—'}</strong>
                          {layovers[i].terminal && <> ({layovers[i].terminal})</>}
                          {layovers[i].layoverMinutes != null && <> · <strong>{fmtMinutes(layovers[i].layoverMinutes)}</strong></>}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.85rem', flexWrap: 'wrap' }}>
              {transport.bookingNumber && <span style={{ color: 'var(--text-tertiary)' }}>#{transport.bookingNumber}</span>}
              {transport.price > 0 && <span style={{ fontWeight: 600 }}>{formatCurrency(transport.price)}</span>}
            </div>
            {transport.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{transport.notes}</p>}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="btn btn-icon btn-sm" onClick={onEdit} title="Editar"><Edit3 size={14} /></button>
            <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }} onClick={onDelete} title="Eliminar"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TransportTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { addTransport, updateTransport, deleteTransport } = useTripStore();

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(false); };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      type: t.type || 'flight',
      company: t.company || '',
      from: t.from || '',
      to: t.to || '',
      // Migración suave: si solo había `dateTime`, úsalo como `departureDateTime`
      departureDateTime: t.departureDateTime || t.dateTime || '',
      arrivalDateTime: t.arrivalDateTime || '',
      bookingNumber: t.bookingNumber || '',
      price: t.price || '',
      notes: t.notes || '',
      stopovers: (t.stopovers || []).map(s => ({ ...s })),
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.company.trim()) return;
    const data = {
      ...form,
      price: Number(form.price) || 0,
      // Mantener `dateTime` por compatibilidad con código antiguo que aún lo lea
      dateTime: form.departureDateTime || form.dateTime || '',
      stopovers: form.stopovers || [],
    };
    if (editing) updateTransport(trip.id, editing.id, data);
    else addTransport(trip.id, data);
    resetForm();
  };

  const updateStop = (idx, next) => {
    setForm(f => {
      const copy = [...f.stopovers];
      copy[idx] = next;
      return { ...f, stopovers: copy };
    });
  };
  const removeStop = (idx) => {
    setForm(f => ({ ...f, stopovers: f.stopovers.filter((_, i) => i !== idx) }));
  };
  const addStop = () => {
    setForm(f => ({ ...f, stopovers: [...(f.stopovers || []), newStopover()] }));
  };

  const transports = trip.transports || [];

  return (
    <div>
      <div className="section-header">
        <h3>Transportes ({transports.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> Añadir
        </button>
      </div>

      {transports.length > 0 ? (
        transports.map(t => (
          <TransportCard
            key={t.id}
            transport={t}
            onEdit={() => startEdit(t)}
            onDelete={() => deleteTransport(trip.id, t.id)}
          />
        ))
      ) : (
        <EmptyState icon={<Plane size={36} />} title="Sin transportes" description="Añade vuelos, trenes o coches de alquiler." />
      )}

      {showForm && (
        <Modal
          title={editing ? 'Editar transporte' : 'Nuevo transporte'}
          onClose={resetForm}
          footer={
            <>
              <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.company.trim()}>
                {editing ? 'Guardar' : 'Añadir'}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TRANSPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Compañía *</label>
              <input className="form-input" value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                placeholder="Ej: Iberia" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origen</label>
              <input className="form-input" value={form.from}
                onChange={e => setForm({ ...form, from: e.target.value })}
                placeholder="Ej: Madrid (MAD)" />
            </div>
            <div className="form-group">
              <label className="form-label">Destino final</label>
              <input className="form-input" value={form.to}
                onChange={e => setForm({ ...form, to: e.target.value })}
                placeholder="Ej: Tokio (HND)" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Salida</label>
              <input className="form-input" type="datetime-local" value={form.departureDateTime}
                onChange={e => setForm({ ...form, departureDateTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Llegada</label>
              <input className="form-input" type="datetime-local" value={form.arrivalDateTime}
                onChange={e => setForm({ ...form, arrivalDateTime: e.target.value })} />
            </div>
          </div>

          {/* ── Escalas ── */}
          <div className="tt-stops-section">
            <div className="tt-stops-head">
              <span className="form-label" style={{ margin: 0 }}>
                Escalas {form.stopovers.length > 0 && <span className="tt-stop-badge">{form.stopovers.length}</span>}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addStop}>
                <Plus size={13} /> Añadir escala
              </button>
            </div>
            {form.stopovers.length === 0 ? (
              <p className="tt-stops-empty">
                Sin escalas — vuelo / trayecto directo. Añade una si tu trayecto tiene paradas intermedias.
              </p>
            ) : (
              <div className="tt-stops-list">
                {form.stopovers.map((s, i) => (
                  <StopoverRow
                    key={s.id}
                    index={i}
                    total={form.stopovers.length}
                    stopover={s}
                    onChange={(n) => updateStop(i, n)}
                    onRemove={() => removeStop(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nº Reserva / Localizador</label>
              <input className="form-input" value={form.bookingNumber}
                onChange={e => setForm({ ...form, bookingNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio (€)</label>
              <input className="form-input" type="number" step="0.01" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
