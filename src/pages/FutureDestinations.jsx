import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Edit3, MapPin, Star, Zap, ChevronDown,
  ArrowRight, CheckCircle2, Lightbulb, X, Map,
  ExternalLink, Plane, Calendar, DollarSign, ChevronRight,
  TrendingUp, Clock, Save,
} from 'lucide-react';
import useFutureStore from '../data/futureStore';
import useTripStore from '../data/store';
import Modal from '../components/Modal';
import PlaceSearch from '../components/PlaceSearch';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIP_TYPES = [
  { id: 'citytrip',    label: 'City trip',   icon: '🏙️' },
  { id: 'naturaleza',  label: 'Naturaleza',  icon: '🌿' },
  { id: 'roadtrip',    label: 'Road trip',   icon: '🚗' },
  { id: 'playa',       label: 'Playa',       icon: '🏖️' },
  { id: 'montana',     label: 'Montaña',     icon: '⛰️' },
  { id: 'cultura',     label: 'Cultura',     icon: '🏛️' },
  { id: 'aventura',    label: 'Aventura',    icon: '🧗' },
  { id: 'gastronomia', label: 'Gastronomía', icon: '🍷' },
];

const PRIORITIES = [
  { id: 'alta',  label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
  { id: 'media', label: 'Media', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  { id: 'baja',  label: 'Baja',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
];

const STATUSES = [
  { id: 'idea',         label: 'Idea',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'investigando', label: 'Investigando', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'planificado',  label: 'Planificado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

const PLACE_TAGS = [
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'mirador',     label: 'Mirador',     icon: '🏔️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'monumento',   label: 'Monumento',   icon: '🏛️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'actividad',   label: 'Actividad',   icon: '🎯', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'foto',        label: 'Foto',        icon: '📸', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { id: 'alojamiento', label: 'Alojamiento', icon: '🏨', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

const BUDGET_CATS = [
  { key: 'vuelos',      label: 'Vuelos / transporte', icon: '✈️',  color: '#4F46E5' },
  { key: 'hotel',       label: 'Alojamiento',          icon: '🏨',  color: '#7C3AED' },
  { key: 'comida',      label: 'Comida y bebida',       icon: '🍽️', color: '#10B981' },
  { key: 'actividades', label: 'Actividades y ocio',    icon: '🎯',  color: '#F59E0B' },
  { key: 'otros',       label: 'Otros gastos',          icon: '💼',  color: '#6B7280' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getTripType = (id) => TRIP_TYPES.find(t => t.id === id) || { label: id, icon: '✈️' };
const getPriority = (id) => PRIORITIES.find(p => p.id === id) || PRIORITIES[1];
const getStatus   = (id) => STATUSES.find(s => s.id === id)   || STATUSES[0];

function sortByPriority(arr) {
  const order = { alta: 0, media: 1, baja: 2, rapida: 3 };
  return [...arr].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function budgetTotal(budget) {
  if (!budget) return 0;
  return BUDGET_CATS.reduce((s, c) => s + Number(budget[c.key] || 0), 0);
}

function daysBetween(from, to) {
  if (!from || !to) return null;
  const d = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  return d > 0 ? Math.round(d) : null;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_DEST = {
  name: '', country: '', tripType: 'citytrip',
  priority: 'media', status: 'idea', notes: '', imageUrl: '',
};
const EMPTY_PLACE = { name: '', address: '', description: '', lat: null, lng: null, tags: [] };

// ══════════════════════════════════════════════════════════════════════════════
// ── Side Panel ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function DestinationPanel({ dest, onClose, onEdit, onConvert, store }) {
  const { updateDestination, addPlace, updatePlace, deletePlace } = store;
  const toast = useToast();

  // Budget inline edit
  const [budget, setBudget]       = useState(() => dest.budget || {});
  const [budgetDirty, setBudgetDirty] = useState(false);

  // Dates inline edit
  const [dates, setDates]         = useState(() => dest.dates || { from: '', to: '' });
  const [datesDirty, setDatesDirty] = useState(false);

  // Places
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editingPlace, setEditingPlace]   = useState(null);
  const [placeForm, setPlaceForm]         = useState(EMPTY_PLACE);

  // Active section
  const [section, setSection] = useState('resumen'); // resumen | presupuesto | fechas | lugares

  // Keep in sync when dest changes externally
  useEffect(() => {
    setBudget(dest.budget || {});
    setDates(dest.dates || { from: '', to: '' });
    setBudgetDirty(false);
    setDatesDirty(false);
  }, [dest.id]);

  // ── Budget save ──
  async function saveBudget() {
    const clean = {};
    BUDGET_CATS.forEach(c => {
      const v = Number(budget[c.key] || 0);
      if (v > 0) clean[c.key] = v;
    });
    await updateDestination(dest.id, { budget: clean });
    setBudget(clean);
    setBudgetDirty(false);
    toast('Presupuesto guardado', 'success');
  }

  // ── Dates save ──
  async function saveDates() {
    await updateDestination(dest.id, { dates });
    setDatesDirty(false);
    toast('Fechas guardadas', 'success');
  }

  // ── Places ──
  function openNewPlace()  { setEditingPlace(null); setPlaceForm(EMPTY_PLACE); setShowPlaceForm(true); }
  function openEditPlace(p){ setEditingPlace(p); setPlaceForm({ name: p.name, address: p.address || '', description: p.description || '', lat: p.lat, lng: p.lng, tags: p.tags || [] }); setShowPlaceForm(true); }

  async function savePlace() {
    if (!placeForm.name.trim()) return;
    if (editingPlace) {
      await updatePlace(dest.id, editingPlace.id, placeForm);
    } else {
      await addPlace(dest.id, placeForm);
    }
    setShowPlaceForm(false);
    toast(editingPlace ? 'Lugar actualizado' : 'Lugar añadido', 'success');
  }

  function toggleTag(tagId) {
    setPlaceForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId],
    }));
  }

  const tt   = getTripType(dest.tripType);
  const pr   = getPriority(dest.priority);
  const st   = getStatus(dest.status);
  const days = daysBetween(dates.from, dates.to);
  const total = budgetTotal(budget);

  const SECTIONS = [
    { id: 'resumen',     label: 'Resumen',     icon: '📋' },
    { id: 'fechas',      label: 'Fechas',      icon: '📅' },
    { id: 'presupuesto', label: 'Presupuesto', icon: '💰' },
    { id: 'lugares',     label: 'Lugares',     icon: '📍' },
  ];

  return (
    <>
      {/* Backdrop (mobile) */}
      <div className="fd-panel-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="fd-panel">

        {/* Header */}
        <div className="fd-panel-header" style={{ borderLeft: `4px solid ${pr.color}` }}>
          <div className="fd-panel-header-main">
            <div>
              <h2 className="fd-panel-title">{dest.name}</h2>
              {dest.country && <p className="fd-panel-country">🌍 {dest.country}</p>}
            </div>
            <button className="fd-panel-close" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="fd-panel-badges">
            <span className="fd-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
              {tt.icon} {tt.label}
            </span>
            <span className="fd-badge" style={{ background: pr.bg, color: pr.color, fontSize: '0.72rem' }}>
              {pr.icon} {pr.label}
            </span>
            <span className="fd-badge" style={{ background: st.bg, color: st.color, fontSize: '0.72rem' }}>
              {st.label}
            </span>
          </div>

          {/* Quick stats row */}
          <div className="fd-panel-quickstats">
            {dates.from && (
              <span className="fd-panel-qs">
                <Calendar size={12} />
                {dates.from && dates.to ? `${formatDate(dates.from)} → ${formatDate(dates.to)}` : formatDate(dates.from)}
                {days && <strong> ({days}d)</strong>}
              </span>
            )}
            {total > 0 && (
              <span className="fd-panel-qs">
                <DollarSign size={12} />
                Presupuesto: <strong>{fmt(total)} €</strong>
              </span>
            )}
            {(dest.places || []).length > 0 && (
              <span className="fd-panel-qs">
                <MapPin size={12} />
                {dest.places.length} lugar{dest.places.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Section tabs */}
        <div className="fd-panel-tabs">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`fd-panel-tab ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="fd-panel-body">

          {/* ── RESUMEN ── */}
          {section === 'resumen' && (
            <div className="fd-panel-section">
              {dest.notes ? (
                <div className="fd-notes-box">
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{dest.notes}</p>
                </div>
              ) : (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Sin notas. Edita el destino para añadirlas.
                </p>
              )}

              {/* Summary cards */}
              <div className="fd-panel-summary-grid">
                <div className="fd-panel-summary-card" onClick={() => setSection('fechas')} style={{ cursor: 'pointer' }}>
                  <Calendar size={20} color="#4F46E5" />
                  <div>
                    <p className="fd-panel-summary-label">Fechas</p>
                    <p className="fd-panel-summary-val">
                      {dates.from ? (days ? `${days} días` : formatDate(dates.from)) : 'Sin fijar'}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                </div>
                <div className="fd-panel-summary-card" onClick={() => setSection('presupuesto')} style={{ cursor: 'pointer' }}>
                  <TrendingUp size={20} color="#10B981" />
                  <div>
                    <p className="fd-panel-summary-label">Presupuesto</p>
                    <p className="fd-panel-summary-val">{total > 0 ? `${fmt(total)} €` : 'Sin definir'}</p>
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                </div>
                <div className="fd-panel-summary-card" onClick={() => setSection('lugares')} style={{ cursor: 'pointer' }}>
                  <MapPin size={20} color="#F59E0B" />
                  <div>
                    <p className="fd-panel-summary-label">Lugares</p>
                    <p className="fd-panel-summary-val">{(dest.places || []).length} guardados</p>
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── FECHAS ── */}
          {section === 'fechas' && (
            <div className="fd-panel-section">
              <div className="fd-panel-section-title">
                <Calendar size={15} /> Fechas del viaje
              </div>

              <div className="fd-dates-grid">
                <div className="fd-field">
                  <label>Fecha de inicio</label>
                  <input
                    type="date"
                    value={dates.from}
                    onChange={e => { setDates(d => ({ ...d, from: e.target.value })); setDatesDirty(true); }}
                  />
                </div>
                <div className="fd-field">
                  <label>Fecha de vuelta</label>
                  <input
                    type="date"
                    value={dates.to}
                    min={dates.from || undefined}
                    onChange={e => { setDates(d => ({ ...d, to: e.target.value })); setDatesDirty(true); }}
                  />
                </div>
              </div>

              {dates.from && dates.to && days && (
                <div className="fd-dates-summary">
                  <Clock size={14} />
                  <span>{days} días · {Math.ceil(days / 7)} semana{days > 7 ? 's' : ''} aprox.</span>
                </div>
              )}
              {dates.from && !dates.to && (
                <div className="fd-dates-summary">
                  <Calendar size={14} />
                  <span>Salida: {formatDate(dates.from)}</span>
                </div>
              )}

              {datesDirty && (
                <button className="fd-save-btn" onClick={saveDates}>
                  <Save size={14} /> Guardar fechas
                </button>
              )}

              {!dates.from && !dates.to && (
                <div className="fd-empty-section">
                  <Calendar size={32} opacity={0.25} />
                  <p>Todavía no hay fechas fijadas para este viaje.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PRESUPUESTO ── */}
          {section === 'presupuesto' && (
            <div className="fd-panel-section">
              <div className="fd-panel-section-title">
                <DollarSign size={15} /> Presupuesto estimado
              </div>

              <div className="fd-budget-list">
                {BUDGET_CATS.map(cat => (
                  <div key={cat.key} className="fd-budget-row">
                    <span className="fd-budget-icon">{cat.icon}</span>
                    <span className="fd-budget-label">{cat.label}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={budget[cat.key] || ''}
                      onChange={e => {
                        setBudget(b => ({ ...b, [cat.key]: e.target.value }));
                        setBudgetDirty(true);
                      }}
                    />
                    <span className="fd-budget-eur">€</span>
                  </div>
                ))}
              </div>

              {/* Total bar */}
              {total > 0 && (
                <div className="fd-budget-total">
                  <span>Total estimado</span>
                  <strong>{fmt(total)} €</strong>
                </div>
              )}

              {/* Visual breakdown */}
              {total > 0 && (
                <>
                  <div className="fd-budget-bar">
                    {BUDGET_CATS.map(cat => {
                      const val = Number(budget[cat.key] || 0);
                      if (!val) return null;
                      const pct = ((val / total) * 100).toFixed(1);
                      return (
                        <div
                          key={cat.key}
                          style={{ width: pct + '%', background: cat.color, height: '100%' }}
                          title={`${cat.label}: ${fmt(val)} € (${pct}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="fd-budget-legend">
                    {BUDGET_CATS.map(cat => {
                      const val = Number(budget[cat.key] || 0);
                      if (!val) return null;
                      return (
                        <div key={cat.key} className="fd-budget-legend-item">
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                          <span style={{ fontWeight: 600 }}>{fmt(val)} €</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {budgetDirty && (
                <button className="fd-save-btn" onClick={saveBudget}>
                  <Save size={14} /> Guardar presupuesto
                </button>
              )}

              {!total && !budgetDirty && (
                <div className="fd-empty-section">
                  <DollarSign size={32} opacity={0.25} />
                  <p>Introduce los gastos estimados para ver el presupuesto total.</p>
                </div>
              )}
            </div>
          )}

          {/* ── LUGARES ── */}
          {section === 'lugares' && !showPlaceForm && (
            <div className="fd-panel-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="fd-panel-section-title" style={{ margin: 0 }}>
                  <MapPin size={15} /> Lugares de interés
                </div>
                <button className="btn btn-primary btn-sm" onClick={openNewPlace}>
                  <Plus size={13} /> Añadir
                </button>
              </div>

              {(dest.places || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dest.places.map(place => {
                    const tags = PLACE_TAGS.filter(t => (place.tags || []).includes(t.id));
                    return (
                      <div key={place.id} className="fd-place-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{place.name}</div>
                          {place.address && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={10} /> {place.address}
                            </div>
                          )}
                          {place.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{place.description}</div>
                          )}
                          {tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                              {tags.map(tag => (
                                <span key={tag.id} style={{
                                  padding: '2px 7px', borderRadius: 12,
                                  background: tag.bg, color: tag.color,
                                  fontSize: '0.7rem', fontWeight: 600,
                                }}>
                                  {tag.icon} {tag.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {place.lat && place.lng && (
                            <a href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
                              target="_blank" rel="noopener" className="btn btn-icon btn-sm" title="Ver en mapa">
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button className="btn btn-icon btn-sm" onClick={() => openEditPlace(place)}>
                            <Edit3 size={12} />
                          </button>
                          <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }}
                            onClick={() => { deletePlace(dest.id, place.id); toast('Lugar eliminado', 'info'); }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="fd-empty-section">
                  <Map size={32} opacity={0.25} />
                  <p>Sin lugares guardados. Añade restaurantes, monumentos, miradores...</p>
                </div>
              )}
            </div>
          )}

          {/* Place form inside panel */}
          {section === 'lugares' && showPlaceForm && (
            <div className="fd-panel-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-icon btn-sm" onClick={() => setShowPlaceForm(false)}>
                  <X size={14} />
                </button>
                <span style={{ fontWeight: 600 }}>{editingPlace ? 'Editar lugar' : 'Nuevo lugar'}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Buscar lugar</label>
                <PlaceSearch
                  onSelect={sel => setPlaceForm(prev => ({
                    ...prev,
                    name: prev.name || sel.displayName?.split(',')[0] || sel.name || '',
                    address: sel.displayName || '',
                    lat: sel.lat, lng: sel.lng,
                  }))}
                  placeholder="Busca en el mapa..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={placeForm.name}
                  onChange={e => setPlaceForm({ ...placeForm, name: e.target.value })}
                  placeholder="Ej: Templo Senso-ji" />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" value={placeForm.address}
                  onChange={e => setPlaceForm({ ...placeForm, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Etiquetas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {PLACE_TAGS.map(tag => {
                    const sel = placeForm.tags.includes(tag.id);
                    return (
                      <button key={tag.id} type="button" className="fd-pill-btn"
                        style={{ background: sel ? tag.color : tag.bg, color: sel ? '#fff' : tag.color, border: `1.5px solid ${tag.color}` }}
                        onClick={() => toggleTag(tag.id)}>
                        {tag.icon} {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nota</label>
                <textarea className="form-textarea" rows={2} value={placeForm.description}
                  onChange={e => setPlaceForm({ ...placeForm, description: e.target.value })}
                  placeholder="¿Por qué quieres visitarlo?" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowPlaceForm(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={savePlace} disabled={!placeForm.name.trim()}>
                  {editingPlace ? 'Guardar' : 'Añadir'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fd-panel-footer">
          <button className="btn btn-secondary" onClick={onEdit}>
            <Edit3 size={14} /> Editar
          </button>
          <button className="btn btn-primary"
            onClick={onConvert}
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Plane size={14} /> Convertir en viaje
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function FutureDestinations() {
  const navigate = useNavigate();
  const toast    = useToast();
  const store    = useFutureStore();
  const { destinations, loadDestinations, addDestination, updateDestination, deleteDestination, addQuickIdea } = store;
  const addTrip  = useTripStore(s => s.addTrip);

  const [showDestForm, setShowDestForm] = useState(false);
  const [editingDest, setEditingDest]   = useState(null);
  const [destForm, setDestForm]         = useState(EMPTY_DEST);

  const [panelDest, setPanelDest]       = useState(null);
  const [convertConfirm, setConvertConfirm] = useState(null);

  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortPri,      setSortPri]      = useState(true);
  const [quickInput,   setQuickInput]   = useState('');

  useEffect(() => { loadDestinations(); }, []);

  // Keep panel in sync
  useEffect(() => {
    if (panelDest) {
      const updated = destinations.find(d => d.id === panelDest.id);
      if (updated) setPanelDest(updated);
    }
  }, [destinations]);

  // ── Destination form ──
  const openNewDest = () => { setEditingDest(null); setDestForm(EMPTY_DEST); setShowDestForm(true); };
  const openEditDest = (dest) => {
    setEditingDest(dest);
    setDestForm({
      name: dest.name, country: dest.country || '',
      tripType: dest.tripType || 'citytrip', priority: dest.priority || 'media',
      status: dest.status || 'idea', notes: dest.notes || '', imageUrl: dest.imageUrl || '',
    });
    setPanelDest(null);
    setShowDestForm(true);
  };

  const saveDest = async () => {
    if (!destForm.name.trim()) return;
    if (editingDest) {
      await updateDestination(editingDest.id, destForm);
      toast('Destino actualizado', 'success');
    } else {
      await addDestination(destForm);
      toast('Destino añadido', 'success');
    }
    setShowDestForm(false);
  };

  // ── Convert ──
  const handleConvert = async (dest) => {
    const newTrip = await addTrip({
      destination: dest.name,
      country: dest.country,
      status: 'planificado',
      notes: dest.notes,
      places: (dest.places || []).map(p => ({ ...p })),
    });
    await updateDestination(dest.id, { converted: true, convertedTripId: newTrip?.id });
    toast('¡Convertido en viaje! Redirigiendo...', 'success');
    setConvertConfirm(null);
    setPanelDest(null);
    setTimeout(() => navigate(newTrip?.id ? `/trip/${newTrip.id}` : '/'), 800);
  };

  // ── Quick idea ──
  const submitQuickIdea = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    await addQuickIdea(quickInput.trim());
    setQuickInput('');
    toast('Idea guardada', 'success');
  };

  // ── Filtered list ──
  const regular    = destinations.filter(d => d.status !== 'rapida' && !d.converted);
  const quickIdeas = destinations.filter(d => d.status === 'rapida');
  const converted  = destinations.filter(d => d.converted);

  const filtered  = regular
    .filter(d => !filterType   || d.tripType === filterType)
    .filter(d => !filterStatus || d.status   === filterStatus);
  const displayed = sortPri ? sortByPriority(filtered) : filtered;

  return (
    <div className={`page-container ${panelDest ? 'fd-panel-open' : ''}`}>

      {/* Hero */}
      <div className="hero">
        <h1>Destinos Futuros 🌍</h1>
        <p>Guarda, organiza y convierte tus próximas aventuras</p>
      </div>

      {/* Stats */}
      <div className="fd-stats-row">
        {[
          { label: 'Ideas',         value: regular.length,                                          color: '#8b5cf6' },
          { label: 'Prioridad alta',value: regular.filter(d => d.priority === 'alta').length,       color: '#ef4444' },
          { label: 'Planificados',  value: regular.filter(d => d.status === 'planificado').length,  color: '#10b981' },
          { label: 'Convertidos',   value: converted.length,                                        color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="fd-stat-pill" style={{ borderColor: s.color + '33' }}>
            <span className="fd-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="fd-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="fd-toolbar">
        <div className="fd-filters">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select className="form-input fd-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todos los tipos</option>
              {TRIP_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select className="form-input fd-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
          </div>
          <button className={`btn btn-sm ${sortPri ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSortPri(v => !v)}>
            <Star size={14} /> Prioridad
          </button>
          {(filterType || filterStatus) && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setFilterType(''); setFilterStatus(''); }}>
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={openNewDest}>
          <Plus size={16} /> Nuevo destino
        </button>
      </div>

      {/* Cards */}
      {displayed.length > 0 ? (
        <div className="fd-grid">
          {displayed.map(dest => (
            <DestinationCard
              key={dest.id}
              dest={dest}
              active={panelDest?.id === dest.id}
              onOpen={() => setPanelDest(panelDest?.id === dest.id ? null : dest)}
              onEdit={(e) => { e.stopPropagation(); openEditDest(dest); }}
              onDelete={(e) => { e.stopPropagation(); deleteDestination(dest.id); toast('Destino eliminado', 'info'); if (panelDest?.id === dest.id) setPanelDest(null); }}
              onConvert={(e) => { e.stopPropagation(); setConvertConfirm(dest); }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MapPin size={36} />}
          title={filterType || filterStatus ? 'Sin destinos con esos filtros' : 'Sin destinos futuros'}
          description="Añade destinos que quieres visitar y organízalos por prioridad."
          action={<button className="btn btn-primary" onClick={openNewDest}><Plus size={16} /> Añadir destino</button>}
        />
      )}

      {/* Converted */}
      {converted.length > 0 && (
        <div className="fd-converted-section">
          <div className="section-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={18} style={{ color: '#10b981' }} /> Convertidos en viaje ({converted.length})
            </h3>
          </div>
          <div className="fd-converted-list">
            {converted.map(dest => (
              <div key={dest.id} className="fd-converted-item">
                <span style={{ fontWeight: 600 }}>{dest.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dest.country}</span>
                <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)', marginLeft: 'auto' }}
                  onClick={() => deleteDestination(dest.id)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Ideas */}
      <div className="fd-quick-section">
        <div className="fd-quick-header">
          <Lightbulb size={18} style={{ color: '#f59e0b' }} />
          <h3>Ideas rápidas</h3>
          <span className="fd-quick-count">{quickIdeas.length}</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Guarda destinos al vuelo sin rellenar todos los campos.
        </p>
        <form onSubmit={submitQuickIdea} className="fd-quick-form">
          <input className="form-input" value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder="Ej: Kioto, Islandia, Patagonia..." />
          <button type="submit" className="btn btn-primary" disabled={!quickInput.trim()}>
            <Zap size={15} /> Guardar
          </button>
        </form>
        {quickIdeas.length > 0 && (
          <div className="fd-quick-list">
            {quickIdeas.map(idea => (
              <div key={idea.id} className="fd-quick-item">
                <MapPin size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span>{idea.name}</span>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <button className="btn btn-icon btn-sm" title="Ampliar"
                    onClick={() => { setEditingDest(idea); setDestForm({ name: idea.name, country: '', tripType: 'citytrip', priority: 'media', status: 'idea', notes: '', imageUrl: '' }); setShowDestForm(true); }}>
                    <Edit3 size={13} />
                  </button>
                  <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }}
                    onClick={() => deleteDestination(idea.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={openNewDest} title="Nuevo destino"><Plus size={24} /></button>

      {/* ── Side Panel ── */}
      {panelDest && (
        <DestinationPanel
          dest={panelDest}
          onClose={() => setPanelDest(null)}
          onEdit={() => openEditDest(panelDest)}
          onConvert={() => setConvertConfirm(panelDest)}
          store={store}
        />
      )}

      {/* ── Modal: new/edit destination ── */}
      {showDestForm && (
        <Modal
          title={editingDest ? 'Editar destino' : 'Nuevo destino futuro'}
          onClose={() => setShowDestForm(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowDestForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveDest} disabled={!destForm.name.trim()}>
                {editingDest ? 'Guardar' : 'Añadir'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nombre del destino *</label>
            <input className="form-input" value={destForm.name}
              onChange={e => setDestForm({ ...destForm, name: e.target.value })}
              placeholder="Ej: Tokio, Islandia, Ruta 66..." autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">País</label>
            <input className="form-input" value={destForm.country}
              onChange={e => setDestForm({ ...destForm, country: e.target.value })}
              placeholder="Ej: Japón" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de viaje</label>
              <div style={{ position: 'relative' }}>
                <select className="form-input" value={destForm.tripType}
                  onChange={e => setDestForm({ ...destForm, tripType: e.target.value })}
                  style={{ paddingRight: 32 }}>
                  {TRIP_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRIORITIES.map(p => (
                  <button key={p.id} type="button" className="fd-pill-btn"
                    style={{ background: destForm.priority === p.id ? p.color : p.bg, color: destForm.priority === p.id ? '#fff' : p.color, border: `1.5px solid ${p.color}` }}
                    onClick={() => setDestForm({ ...destForm, priority: p.id })}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s.id} type="button" className="fd-pill-btn"
                  style={{ background: destForm.status === s.id ? s.color : s.bg, color: destForm.status === s.id ? '#fff' : s.color, border: `1.5px solid ${s.color}` }}
                  onClick={() => setDestForm({ ...destForm, status: s.id })}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">URL de imagen (opcional)</label>
            <input className="form-input" value={destForm.imageUrl}
              onChange={e => setDestForm({ ...destForm, imageUrl: e.target.value })}
              placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={3} value={destForm.notes}
              onChange={e => setDestForm({ ...destForm, notes: e.target.value })}
              placeholder="Ideas, inspiraciones, presupuesto estimado..." />
          </div>
        </Modal>
      )}

      {/* ── Modal: convert confirm ── */}
      {convertConfirm && (
        <Modal
          title="Convertir en viaje"
          onClose={() => setConvertConfirm(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConvertConfirm(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleConvert(convertConfirm)}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Plane size={15} /> Crear viaje
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>
              ¿Crear un viaje a <strong>{convertConfirm.name}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Se creará un nuevo viaje con los lugares guardados y las notas de este destino.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Destination Card ──────────────────────────────────────────────────────────

function DestinationCard({ dest, active, onOpen, onEdit, onDelete, onConvert }) {
  const tt    = getTripType(dest.tripType);
  const pr    = getPriority(dest.priority);
  const st    = getStatus(dest.status);
  const total = budgetTotal(dest.budget);
  const days  = daysBetween(dest.dates?.from, dest.dates?.to);

  return (
    <div className={`fd-card ${active ? 'fd-card--active' : ''}`} onClick={onOpen}>
      <div className="fd-card-header" style={{
        background: dest.imageUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url(${dest.imageUrl}) center/cover`
          : `linear-gradient(135deg, ${pr.color}22, ${pr.color}44)`,
      }}>
        <div className="fd-card-type-badge">
          <span style={{ fontSize: '1.1rem' }}>{tt.icon}</span>
          <span>{tt.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="fd-card-action-btn" onClick={onEdit} title="Editar"><Edit3 size={13} /></button>
          <button className="fd-card-action-btn fd-card-action-danger" onClick={onDelete} title="Eliminar"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="fd-card-body">
        <h3 className="fd-card-title">{dest.name}</h3>
        {dest.country && <p className="fd-card-country">🌍 {dest.country}</p>}
        <div className="fd-card-badges">
          <span className="fd-badge" style={{ background: pr.bg, color: pr.color, fontSize: '0.72rem' }}>{pr.icon} {pr.label}</span>
          <span className="fd-badge" style={{ background: st.bg, color: st.color, fontSize: '0.72rem' }}>{st.label}</span>
          {(dest.places || []).length > 0 && (
            <span className="fd-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
              <MapPin size={10} style={{ display: 'inline', marginRight: 2 }} />{dest.places.length} lugar{dest.places.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Dates + budget chips */}
        {(days || total > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {days && (
              <span className="fd-card-chip">
                <Calendar size={11} /> {days}d
                {dest.dates?.from && <span style={{ marginLeft: 3, opacity: 0.7 }}>{new Date(dest.dates.from + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}</span>}
              </span>
            )}
            {total > 0 && (
              <span className="fd-card-chip fd-card-chip--green">
                <DollarSign size={11} /> {fmt(total)} €
              </span>
            )}
          </div>
        )}

        {dest.notes && <p className="fd-card-notes">{dest.notes}</p>}
        <button className="btn btn-sm fd-convert-btn" onClick={onConvert} title="Convertir en viaje">
          <Plane size={13} /> Convertir en viaje <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
