import { useEffect, useState } from 'react';
import {
  RefreshCw, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  MapPin, Calendar, TrendingUp, DollarSign, Clock, Check,
} from 'lucide-react';
import { useRecurringStore, FREQUENCIES, BREAKDOWN_CATS } from '../data/recurringStore';

/* ─── helpers ─────────────────────────────────────────────── */
function freq(value) {
  return FREQUENCIES.find((f) => f.value === value) || FREQUENCIES[2];
}
function fmt(n) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
function monthlyOf(trip) {
  return (trip.estimated_cost || 0) * freq(trip.frequency).perMonth;
}
function yearlyOf(trip) {
  return (trip.estimated_cost || 0) * freq(trip.frequency).perYear;
}
function breakdownSum(bd) {
  return Object.values(bd || {}).reduce((a, v) => a + Number(v || 0), 0);
}

const EMPTY_FORM = {
  name: '', destination: '', frequency: 'monthly', estimated_cost: '',
  color: '#4F46E5', notes: '',
  breakdown: { transport: '', accommodation: '', food: '', leisure: '', other: '' },
};

/* ─── StatsBar ─────────────────────────────────────────────── */
function StatsBar({ trips }) {
  const totalMonthly = trips.reduce((a, t) => a + monthlyOf(t), 0);
  const totalYearly  = trips.reduce((a, t) => a + yearlyOf(t), 0);
  const totalTrips   = trips.reduce((a, t) => a + freq(t.frequency).perYear, 0);
  const totalHistory = trips.reduce((a, t) => a + (t.history || []).length, 0);

  return (
    <div className="rt-stats-bar">
      <div className="rt-stat">
        <div className="rt-stat-icon" style={{ background: '#EEF2FF' }}>
          <DollarSign size={20} color="#4F46E5" />
        </div>
        <div>
          <p className="rt-stat-label">Gasto mensual</p>
          <p className="rt-stat-value">{fmt(totalMonthly)} €</p>
        </div>
      </div>
      <div className="rt-stat">
        <div className="rt-stat-icon" style={{ background: '#F3F0FF' }}>
          <TrendingUp size={20} color="#7C3AED" />
        </div>
        <div>
          <p className="rt-stat-label">Proyección anual</p>
          <p className="rt-stat-value">{fmt(totalYearly)} €</p>
        </div>
      </div>
      <div className="rt-stat">
        <div className="rt-stat-icon" style={{ background: '#ECFDF5' }}>
          <Calendar size={20} color="#10B981" />
        </div>
        <div>
          <p className="rt-stat-label">Viajes / año</p>
          <p className="rt-stat-value">{Math.round(totalTrips)}</p>
        </div>
      </div>
      <div className="rt-stat">
        <div className="rt-stat-icon" style={{ background: '#FFFBEB' }}>
          <Clock size={20} color="#F59E0B" />
        </div>
        <div>
          <p className="rt-stat-label">Viajes realizados</p>
          <p className="rt-stat-value">{totalHistory}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── BreakdownBar ─────────────────────────────────────────── */
function BreakdownBar({ breakdown }) {
  const total = breakdownSum(breakdown);
  if (!total) return <p className="rt-no-breakdown">Sin desglose registrado</p>;
  return (
    <div className="rt-breakdown-wrap">
      <div className="rt-breakdown-bar">
        {BREAKDOWN_CATS.map(({ key, color }) => {
          const pct = ((Number(breakdown[key] || 0) / total) * 100).toFixed(1);
          if (pct === '0.0') return null;
          return (
            <div
              key={key}
              className="rt-breakdown-seg"
              style={{ width: pct + '%', background: color }}
              title={`${pct}%`}
            />
          );
        })}
      </div>
      <div className="rt-breakdown-legend">
        {BREAKDOWN_CATS.map(({ key, label, color }) => {
          const val = Number(breakdown[key] || 0);
          if (!val) return null;
          return (
            <div key={key} className="rt-legend-item">
              <span className="rt-legend-dot" style={{ background: color }} />
              <span className="rt-legend-label">{label}</span>
              <span className="rt-legend-val">{fmt(val)} €</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── TripCard ─────────────────────────────────────────────── */
function TripCard({ trip, onEdit, onDelete, onSelect }) {
  const f = freq(trip.frequency);
  const monthly = monthlyOf(trip);
  const yearly  = yearlyOf(trip);
  const lastTrip = (trip.history || []).slice(-1)[0];

  return (
    <div className="rt-card" onClick={() => onSelect(trip)}>
      <div className="rt-card-header" style={{ borderColor: trip.color }}>
        <div className="rt-card-badge" style={{ background: trip.color }}>
          <RefreshCw size={14} color="#fff" />
        </div>
        <div className="rt-card-title-wrap">
          <h3 className="rt-card-name">{trip.name}</h3>
          <p className="rt-card-dest">
            <MapPin size={12} /> {trip.destination}
          </p>
        </div>
        <div className="rt-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="rt-icon-btn" onClick={() => onEdit(trip)} title="Editar">
            <Pencil size={15} />
          </button>
          <button className="rt-icon-btn rt-icon-btn--danger" onClick={() => onDelete(trip)} title="Eliminar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="rt-card-freq">
        <span className="rt-freq-badge">{f.label}</span>
        <span className="rt-cost-main">{fmt(trip.estimated_cost)} € / viaje</span>
      </div>

      <div className="rt-card-projections">
        <div className="rt-proj">
          <span className="rt-proj-label">Mensual</span>
          <span className="rt-proj-val">{fmt(monthly)} €</span>
        </div>
        <div className="rt-proj-divider" />
        <div className="rt-proj">
          <span className="rt-proj-label">Anual</span>
          <span className="rt-proj-val">{fmt(yearly)} €</span>
        </div>
        <div className="rt-proj-divider" />
        <div className="rt-proj">
          <span className="rt-proj-label">Viajes/año</span>
          <span className="rt-proj-val">{f.perYear}</span>
        </div>
      </div>

      {lastTrip && (
        <p className="rt-last-trip">
          Último viaje: {fmtDate(lastTrip.date)} — {fmt(lastTrip.cost)} €
        </p>
      )}
      {!lastTrip && <p className="rt-last-trip rt-last-trip--none">Sin viajes registrados aún</p>}

      <div className="rt-card-footer">
        <span className="rt-history-count">{(trip.history || []).length} viaje(s) en historial</span>
        <span className="rt-view-detail">Ver detalle →</span>
      </div>
    </div>
  );
}

/* ─── DetailModal ──────────────────────────────────────────── */
function DetailModal({ trip, onClose, onEdit, onAddHistory, onRemoveHistory }) {
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ date: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [histOpen, setHistOpen] = useState(true);
  const f = freq(trip.frequency);

  async function handleAddEntry(e) {
    e.preventDefault();
    if (!entryForm.date || !entryForm.cost) return;
    setSaving(true);
    await onAddHistory(trip.id, { date: entryForm.date, cost: Number(entryForm.cost), notes: entryForm.notes });
    setEntryForm({ date: '', cost: '', notes: '' });
    setShowAddEntry(false);
    setSaving(false);
  }

  const sortedHistory = [...(trip.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const avgCost = sortedHistory.length
    ? sortedHistory.reduce((a, e) => a + Number(e.cost), 0) / sortedHistory.length
    : null;

  return (
    <div className="rt-modal-overlay" onClick={onClose}>
      <div className="rt-modal rt-modal--detail" onClick={(e) => e.stopPropagation()}>
        <div className="rt-modal-header" style={{ borderColor: trip.color }}>
          <div>
            <h2 className="rt-modal-title">{trip.name}</h2>
            <p className="rt-modal-sub">
              <MapPin size={13} /> {trip.destination} · <span className="rt-freq-badge">{f.label}</span>
            </p>
          </div>
          <div className="rt-modal-header-actions">
            <button className="rt-icon-btn" onClick={() => onEdit(trip)}>
              <Pencil size={16} />
            </button>
            <button className="rt-icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rt-modal-body">
          {/* cost summary */}
          <div className="rt-detail-costs">
            <div className="rt-detail-cost-item">
              <span className="rt-detail-cost-label">Por viaje</span>
              <span className="rt-detail-cost-val">{fmt(trip.estimated_cost)} €</span>
            </div>
            <div className="rt-detail-cost-item">
              <span className="rt-detail-cost-label">Mensual</span>
              <span className="rt-detail-cost-val">{fmt(monthlyOf(trip))} €</span>
            </div>
            <div className="rt-detail-cost-item">
              <span className="rt-detail-cost-label">Anual</span>
              <span className="rt-detail-cost-val">{fmt(yearlyOf(trip))} €</span>
            </div>
            {avgCost !== null && (
              <div className="rt-detail-cost-item">
                <span className="rt-detail-cost-label">Coste real medio</span>
                <span className="rt-detail-cost-val rt-detail-cost-val--real">{fmt(avgCost)} €</span>
              </div>
            )}
          </div>

          {/* breakdown */}
          <div className="rt-section">
            <h4 className="rt-section-title">Desglose estimado</h4>
            <BreakdownBar breakdown={trip.breakdown || {}} />
          </div>

          {/* notes */}
          {trip.notes && (
            <div className="rt-section">
              <h4 className="rt-section-title">Notas</h4>
              <p className="rt-notes-text">{trip.notes}</p>
            </div>
          )}

          {/* history */}
          <div className="rt-section">
            <div className="rt-section-header" onClick={() => setHistOpen((v) => !v)}>
              <h4 className="rt-section-title">Historial de viajes ({sortedHistory.length})</h4>
              {histOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {histOpen && (
              <>
                {sortedHistory.length === 0 && (
                  <p className="rt-empty-hist">Aún no has registrado ningún viaje.</p>
                )}
                <div className="rt-history-list">
                  {sortedHistory.map((entry) => (
                    <div key={entry.id} className="rt-history-entry">
                      <div className="rt-history-entry-left">
                        <span className="rt-history-date">{fmtDate(entry.date)}</span>
                        {entry.notes && <span className="rt-history-notes">{entry.notes}</span>}
                      </div>
                      <div className="rt-history-entry-right">
                        <span className="rt-history-cost">{fmt(entry.cost)} €</span>
                        <button
                          className="rt-icon-btn rt-icon-btn--danger rt-icon-btn--sm"
                          onClick={() => onRemoveHistory(trip.id, entry.id)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {showAddEntry ? (
                  <form className="rt-entry-form" onSubmit={handleAddEntry}>
                    <div className="rt-entry-form-row">
                      <div className="rt-field">
                        <label>Fecha</label>
                        <input
                          type="date"
                          value={entryForm.date}
                          onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="rt-field">
                        <label>Coste real (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={entryForm.cost}
                          onChange={(e) => setEntryForm((f) => ({ ...f, cost: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="rt-field">
                      <label>Notas (opcional)</label>
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={entryForm.notes}
                        onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                    <div className="rt-entry-form-actions">
                      <button type="button" className="rt-btn rt-btn--ghost" onClick={() => setShowAddEntry(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="rt-btn rt-btn--primary" disabled={saving}>
                        {saving ? 'Guardando…' : <><Check size={14} /> Guardar</>}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="rt-btn rt-btn--outline rt-btn--full" onClick={() => setShowAddEntry(true)}>
                    <Plus size={14} /> Registrar viaje realizado
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── TripFormModal ────────────────────────────────────────── */
function TripFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          destination: initial.destination,
          frequency: initial.frequency,
          estimated_cost: initial.estimated_cost,
          color: initial.color || '#4F46E5',
          notes: initial.notes || '',
          breakdown: {
            transport:     (initial.breakdown || {}).transport     || '',
            accommodation: (initial.breakdown || {}).accommodation || '',
            food:          (initial.breakdown || {}).food          || '',
            leisure:       (initial.breakdown || {}).leisure       || '',
            other:         (initial.breakdown || {}).other         || '',
          },
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const bdSum = breakdownSum(form.breakdown);
  const costNum = Number(form.estimated_cost || 0);
  const bdDiff = Math.abs(bdSum - costNum);
  const bdWarning = costNum > 0 && bdSum > 0 && bdDiff > 0.5;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.destination.trim()) {
      setError('El nombre y el destino son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const breakdown = {};
      BREAKDOWN_CATS.forEach(({ key }) => {
        const v = Number(form.breakdown[key] || 0);
        if (v > 0) breakdown[key] = v;
      });
      await onSave({
        name: form.name.trim(),
        destination: form.destination.trim(),
        frequency: form.frequency,
        estimated_cost: Number(form.estimated_cost || 0),
        color: form.color,
        notes: form.notes,
        breakdown,
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setBd(k, v)    { setForm((f) => ({ ...f, breakdown: { ...f.breakdown, [k]: v } })); }

  return (
    <div className="rt-modal-overlay" onClick={onClose}>
      <div className="rt-modal rt-modal--form" onClick={(e) => e.stopPropagation()}>
        <div className="rt-modal-header">
          <h2 className="rt-modal-title">{initial ? 'Editar viaje recurrente' : 'Nuevo viaje recurrente'}</h2>
          <button className="rt-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="rt-modal-body rt-form" onSubmit={handleSubmit}>
          {error && <div className="rt-error">{error}</div>}

          <div className="rt-form-row">
            <div className="rt-field rt-field--grow">
              <label>Nombre del viaje *</label>
              <input
                type="text"
                placeholder="Viaje a Murcia"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
              />
            </div>
            <div className="rt-field rt-field--color">
              <label>Color</label>
              <input type="color" value={form.color} onChange={(e) => setField('color', e.target.value)} />
            </div>
          </div>

          <div className="rt-form-row">
            <div className="rt-field rt-field--grow">
              <label>Destino *</label>
              <input
                type="text"
                placeholder="Murcia"
                value={form.destination}
                onChange={(e) => setField('destination', e.target.value)}
                required
              />
            </div>
            <div className="rt-field">
              <label>Frecuencia</label>
              <select value={form.frequency} onChange={(e) => setField('frequency', e.target.value)}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rt-field">
            <label>Coste estimado por viaje (€) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.estimated_cost}
              onChange={(e) => setField('estimated_cost', e.target.value)}
              required
            />
          </div>

          {/* projections preview */}
          {costNum > 0 && (
            <div className="rt-form-projections">
              {(() => {
                const f = freq(form.frequency);
                return (
                  <>
                    <span>~{fmt(costNum * f.perMonth)} €/mes</span>
                    <span>·</span>
                    <span>~{fmt(costNum * f.perYear)} €/año</span>
                    <span>·</span>
                    <span>{f.perYear} viajes/año</span>
                  </>
                );
              })()}
            </div>
          )}

          {/* breakdown */}
          <div className="rt-field">
            <label>Desglose de gastos (opcional)</label>
            <div className="rt-breakdown-inputs">
              {BREAKDOWN_CATS.map(({ key, label, color }) => (
                <div key={key} className="rt-bd-input-row">
                  <span className="rt-bd-dot" style={{ background: color }} />
                  <span className="rt-bd-label">{label}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.breakdown[key]}
                    onChange={(e) => setBd(key, e.target.value)}
                  />
                  <span className="rt-bd-eur">€</span>
                </div>
              ))}
            </div>
            {bdWarning && (
              <p className="rt-bd-warning">
                La suma del desglose ({fmt(bdSum)} €) difiere del coste estimado ({fmt(costNum)} €).
              </p>
            )}
          </div>

          <div className="rt-field">
            <label>Notas</label>
            <textarea
              placeholder="Observaciones, consejos, etc."
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="rt-form-actions">
            <button type="button" className="rt-btn rt-btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="rt-btn rt-btn--primary" disabled={saving}>
              {saving ? 'Guardando…' : <><Check size={14} /> {initial ? 'Guardar cambios' : 'Crear viaje'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── DeleteConfirm ────────────────────────────────────────── */
function DeleteConfirm({ trip, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    await onConfirm(trip.id);
    onClose();
  }
  return (
    <div className="rt-modal-overlay" onClick={onClose}>
      <div className="rt-modal rt-modal--confirm" onClick={(e) => e.stopPropagation()}>
        <div className="rt-modal-header">
          <h2 className="rt-modal-title">Eliminar viaje</h2>
          <button className="rt-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="rt-modal-body">
          <p className="rt-confirm-text">
            ¿Seguro que quieres eliminar <strong>{trip.name}</strong>? Se borrarán también todos los datos del historial.
          </p>
          <div className="rt-form-actions">
            <button className="rt-btn rt-btn--ghost" onClick={onClose}>Cancelar</button>
            <button className="rt-btn rt-btn--danger" onClick={handle} disabled={loading}>
              {loading ? 'Eliminando…' : <><Trash2 size={14} /> Eliminar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */
export default function RecurringTrips() {
  const { trips, loading, error, load, addTrip, editTrip, removeTrip, addHistoryEntry, removeHistoryEntry } =
    useRecurringStore();

  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'detail' | 'delete'
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, [load]);

  function openAdd()        { setSelected(null); setModal('add'); }
  function openEdit(t)      { setSelected(t);    setModal('edit'); }
  function openDetail(t)    { setSelected(t);    setModal('detail'); }
  function openDelete(t)    { setSelected(t);    setModal('delete'); }
  function closeModal()     { setModal(null); setSelected(null); }

  // keep selected in sync with store after edits
  const liveSelected = selected ? trips.find((t) => t.id === selected.id) || selected : null;

  return (
    <div className="rt-page">
      {/* header */}
      <div className="rt-page-header">
        <div className="rt-page-title-wrap">
          <div className="rt-page-icon">
            <RefreshCw size={24} color="#4F46E5" />
          </div>
          <div>
            <h1 className="rt-page-title">Viajes Recurrentes</h1>
            <p className="rt-page-sub">Gestiona tus rutas habituales y controla cuánto gastas</p>
          </div>
        </div>
        <button className="rt-btn rt-btn--primary" onClick={openAdd}>
          <Plus size={16} /> Nuevo viaje
        </button>
      </div>

      {/* stats */}
      {trips.length > 0 && <StatsBar trips={trips} />}

      {/* content */}
      {loading && <div className="rt-loading">Cargando viajes…</div>}
      {error   && <div className="rt-error">Error: {error}</div>}

      {!loading && trips.length === 0 && (
        <div className="rt-empty">
          <RefreshCw size={48} color="#C7D2FE" />
          <h3>Sin viajes recurrentes</h3>
          <p>Añade tus rutas habituales para llevar el control de gastos.</p>
          <button className="rt-btn rt-btn--primary" onClick={openAdd}>
            <Plus size={16} /> Añadir primer viaje
          </button>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="rt-cards-grid">
          {trips.map((t) => (
            <TripCard
              key={t.id}
              trip={t}
              onEdit={openEdit}
              onDelete={openDelete}
              onSelect={openDetail}
            />
          ))}
        </div>
      )}

      {/* modals */}
      {modal === 'add' && (
        <TripFormModal
          initial={null}
          onSave={addTrip}
          onClose={closeModal}
        />
      )}
      {modal === 'edit' && liveSelected && (
        <TripFormModal
          initial={liveSelected}
          onSave={(data) => editTrip(liveSelected.id, data)}
          onClose={closeModal}
        />
      )}
      {modal === 'detail' && liveSelected && (
        <DetailModal
          trip={liveSelected}
          onClose={closeModal}
          onEdit={(t) => { closeModal(); setTimeout(() => openEdit(t), 50); }}
          onAddHistory={addHistoryEntry}
          onRemoveHistory={removeHistoryEntry}
        />
      )}
      {modal === 'delete' && liveSelected && (
        <DeleteConfirm
          trip={liveSelected}
          onConfirm={removeTrip}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
