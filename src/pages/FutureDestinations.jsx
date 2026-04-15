import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Edit3, MapPin, Star, Zap, ChevronDown,
  ArrowRight, CheckCircle2, Lightbulb, Filter, X, Map,
  ExternalLink, Plane
} from 'lucide-react';
import useFutureStore from '../data/futureStore';
import useTripStore from '../data/store';
import Modal from '../components/Modal';
import PlaceSearch from '../components/PlaceSearch';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

// ── Constants ────────────────────────────────────────────────────────────────

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
  { id: 'idea',        label: 'Idea',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'investigando',label: 'Investigando',color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'planificado', label: 'Planificado', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

const PLACE_TAGS = [
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'mirador',     label: 'Mirador',     icon: '🏔️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'monumento',   label: 'Monumento',   icon: '🏛️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'actividad',   label: 'Actividad',   icon: '🎯', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'foto',        label: 'Foto',        icon: '📸', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { id: 'alojamiento', label: 'Alojamiento', icon: '🏨', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTripType(id) { return TRIP_TYPES.find(t => t.id === id) || { label: id, icon: '✈️' }; }
function getPriority(id) { return PRIORITIES.find(p => p.id === id) || PRIORITIES[1]; }
function getStatus(id)   { return STATUSES.find(s => s.id === id)   || STATUSES[0]; }

function sortByPriority(arr) {
  const order = { alta: 0, media: 1, baja: 2, rapida: 3 };
  return [...arr].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_DEST = {
  name: '', country: '', tripType: 'citytrip',
  priority: 'media', status: 'idea', notes: '', imageUrl: '',
};

const EMPTY_PLACE = { name: '', address: '', description: '', lat: null, lng: null, tags: [] };

// ── Component ─────────────────────────────────────────────────────────────────

export default function FutureDestinations() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    destinations, loadDestinations, addDestination, updateDestination,
    deleteDestination, addPlace, updatePlace, deletePlace, addQuickIdea,
  } = useFutureStore();

  const addTrip = useTripStore(s => s.addTrip);

  // modals
  const [showDestForm, setShowDestForm]   = useState(false);
  const [editingDest, setEditingDest]     = useState(null);
  const [destForm, setDestForm]           = useState(EMPTY_DEST);

  const [detailDest, setDetailDest]       = useState(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editingPlace, setEditingPlace]   = useState(null);
  const [placeForm, setPlaceForm]         = useState(EMPTY_PLACE);

  const [convertConfirm, setConvertConfirm] = useState(null);

  // filters
  const [filterType,     setFilterType]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [sortPriority,   setSortPriority]   = useState(true);

  // quick idea
  const [quickInput, setQuickInput] = useState('');

  useEffect(() => { loadDestinations(); }, []);

  // keep detailDest in sync with store
  useEffect(() => {
    if (detailDest) {
      const updated = destinations.find(d => d.id === detailDest.id);
      if (updated) setDetailDest(updated);
    }
  }, [destinations]);

  // ── Destination form ────────────────────────────────────────────────────────

  const openNewDest = () => {
    setEditingDest(null);
    setDestForm(EMPTY_DEST);
    setShowDestForm(true);
  };

  const openEditDest = (dest, e) => {
    e.stopPropagation();
    setEditingDest(dest);
    setDestForm({
      name: dest.name, country: dest.country || '',
      tripType: dest.tripType || 'citytrip', priority: dest.priority || 'media',
      status: dest.status || 'idea', notes: dest.notes || '', imageUrl: dest.imageUrl || '',
    });
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

  // ── Place form ──────────────────────────────────────────────────────────────

  const openNewPlace = () => {
    setEditingPlace(null);
    setPlaceForm(EMPTY_PLACE);
    setShowPlaceForm(true);
  };

  const openEditPlace = (place) => {
    setEditingPlace(place);
    setPlaceForm({
      name: place.name, address: place.address || '',
      description: place.description || '',
      lat: place.lat, lng: place.lng,
      tags: place.tags || [],
    });
    setShowPlaceForm(true);
  };

  const savePlace = async () => {
    if (!placeForm.name.trim() || !detailDest) return;
    if (editingPlace) {
      await updatePlace(detailDest.id, editingPlace.id, placeForm);
    } else {
      await addPlace(detailDest.id, placeForm);
    }
    setShowPlaceForm(false);
  };

  const togglePlaceTag = (tagId) => {
    setPlaceForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  // ── Convert to trip ─────────────────────────────────────────────────────────

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
    setDetailDest(null);
    setTimeout(() => navigate(newTrip?.id ? `/trip/${newTrip.id}` : '/'), 800);
  };

  // ── Quick idea ──────────────────────────────────────────────────────────────

  const submitQuickIdea = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    await addQuickIdea(quickInput.trim());
    setQuickInput('');
    toast('Idea guardada', 'success');
  };

  // ── Filtered / sorted list ───────────────────────────────────────────────────

  const regular = destinations.filter(d => d.status !== 'rapida' && !d.converted);
  const quickIdeas = destinations.filter(d => d.status === 'rapida');
  const converted = destinations.filter(d => d.converted);

  const filtered = regular
    .filter(d => !filterType   || d.tripType === filterType)
    .filter(d => !filterStatus || d.status   === filterStatus);

  const displayed = sortPriority ? sortByPriority(filtered) : filtered;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* Hero */}
      <div className="hero">
        <h1>Destinos Futuros 🌍</h1>
        <p>Guarda, organiza y convierte tus próximas aventuras</p>
      </div>

      {/* Stats row */}
      <div className="fd-stats-row">
        {[
          { label: 'Ideas', value: regular.length, color: '#8b5cf6' },
          { label: 'Prioridad alta', value: regular.filter(d => d.priority === 'alta').length, color: '#ef4444' },
          { label: 'Planificados', value: regular.filter(d => d.status === 'planificado').length, color: '#10b981' },
          { label: 'Convertidos', value: converted.length, color: '#3b82f6' },
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
          {/* Type filter */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              className="form-input fd-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {TRIP_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              className="form-input fd-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
          </div>

          {/* Sort toggle */}
          <button
            className={`btn btn-sm ${sortPriority ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSortPriority(v => !v)}
            title="Ordenar por prioridad"
          >
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

      {/* Cards grid */}
      {displayed.length > 0 ? (
        <div className="fd-grid">
          {displayed.map(dest => (
            <DestinationCard
              key={dest.id}
              dest={dest}
              onOpen={() => setDetailDest(dest)}
              onEdit={(e) => openEditDest(dest, e)}
              onDelete={(e) => { e.stopPropagation(); deleteDestination(dest.id); toast('Destino eliminado', 'info'); }}
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

      {/* Converted section */}
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
                <button
                  className="btn btn-icon btn-sm"
                  style={{ color: 'var(--error)', marginLeft: 'auto' }}
                  onClick={() => deleteDestination(dest.id)}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Ideas ──────────────────────────────────────────────────────── */}
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
          <input
            className="form-input"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder="Ej: Kioto, Islandia, Patagonia..."
          />
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
                  <button
                    className="btn btn-icon btn-sm"
                    title="Ampliar a destino completo"
                    onClick={() => {
                      setEditingDest(idea);
                      setDestForm({
                        name: idea.name, country: '', tripType: 'citytrip',
                        priority: 'media', status: 'idea', notes: '', imageUrl: '',
                      });
                      setShowDestForm(true);
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    className="btn btn-icon btn-sm"
                    style={{ color: 'var(--error)' }}
                    onClick={() => deleteDestination(idea.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={openNewDest} title="Nuevo destino">
        <Plus size={24} />
      </button>

      {/* ── Modal: new / edit destination ──────────────────────────────────── */}
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
            <input
              className="form-input"
              value={destForm.name}
              onChange={e => setDestForm({ ...destForm, name: e.target.value })}
              placeholder="Ej: Tokio, Islandia, Ruta 66..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">País</label>
            <input
              className="form-input"
              value={destForm.country}
              onChange={e => setDestForm({ ...destForm, country: e.target.value })}
              placeholder="Ej: Japón"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de viaje</label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={destForm.tripType}
                  onChange={e => setDestForm({ ...destForm, tripType: e.target.value })}
                  style={{ paddingRight: 32 }}
                >
                  {TRIP_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="fd-pill-btn"
                    style={{
                      background: destForm.priority === p.id ? p.color : p.bg,
                      color: destForm.priority === p.id ? '#fff' : p.color,
                      border: `1.5px solid ${p.color}`,
                    }}
                    onClick={() => setDestForm({ ...destForm, priority: p.id })}
                  >
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
                <button
                  key={s.id}
                  type="button"
                  className="fd-pill-btn"
                  style={{
                    background: destForm.status === s.id ? s.color : s.bg,
                    color: destForm.status === s.id ? '#fff' : s.color,
                    border: `1.5px solid ${s.color}`,
                  }}
                  onClick={() => setDestForm({ ...destForm, status: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">URL de imagen (opcional)</label>
            <input
              className="form-input"
              value={destForm.imageUrl}
              onChange={e => setDestForm({ ...destForm, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea
              className="form-textarea"
              value={destForm.notes}
              onChange={e => setDestForm({ ...destForm, notes: e.target.value })}
              placeholder="Ideas, inspiraciones, presupuesto estimado..."
              rows={3}
            />
          </div>
        </Modal>
      )}

      {/* ── Modal: destination detail ───────────────────────────────────────── */}
      {detailDest && !showPlaceForm && (
        <Modal
          title={detailDest.name}
          onClose={() => setDetailDest(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={(e) => openEditDest(detailDest, e)}
              >
                <Edit3 size={14} /> Editar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setConvertConfirm(detailDest)}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
              >
                <Plane size={15} /> Convertir en viaje
              </button>
            </div>
          }
        >
          {/* Badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {(() => {
              const tt = getTripType(detailDest.tripType);
              const pr = getPriority(detailDest.priority);
              const st = getStatus(detailDest.status);
              return (
                <>
                  <span className="fd-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {tt.icon} {tt.label}
                  </span>
                  <span className="fd-badge" style={{ background: pr.bg, color: pr.color }}>
                    {pr.icon} {pr.label}
                  </span>
                  <span className="fd-badge" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  {detailDest.country && (
                    <span className="fd-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      🌍 {detailDest.country}
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Notes */}
          {detailDest.notes && (
            <div className="fd-notes-box">
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detailDest.notes}</p>
            </div>
          )}

          {/* Places */}
          <div style={{ marginTop: 20 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                <MapPin size={15} style={{ display: 'inline', marginRight: 5, color: 'var(--primary)' }} />
                Lugares de interés ({(detailDest.places || []).length})
              </h4>
              <button className="btn btn-primary btn-sm" onClick={openNewPlace}>
                <Plus size={13} /> Añadir
              </button>
            </div>

            {(detailDest.places || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detailDest.places.map(place => {
                  const placeTags = PLACE_TAGS.filter(t => (place.tags || []).includes(t.id));
                  return (
                    <div key={place.id} className="fd-place-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{place.name}</div>
                        {place.address && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} /> {place.address}
                          </div>
                        )}
                        {place.description && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{place.description}</div>
                        )}
                        {placeTags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {placeTags.map(tag => (
                              <span key={tag.id} style={{
                                padding: '2px 7px', borderRadius: 12,
                                background: tag.bg, color: tag.color,
                                fontSize: '0.72rem', fontWeight: 600,
                              }}>
                                {tag.icon} {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {place.lat && place.lng && (
                          <a
                            href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
                            target="_blank" rel="noopener"
                            className="btn btn-icon btn-sm"
                            title="Ver en mapa"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button className="btn btn-icon btn-sm" onClick={() => openEditPlace(place)}>
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ color: 'var(--error)' }}
                          onClick={() => deletePlace(detailDest.id, place.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                <Map size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                Sin lugares guardados todavía
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: place form ─────────────────────────────────────────────────── */}
      {detailDest && showPlaceForm && (
        <Modal
          title={editingPlace ? 'Editar lugar' : 'Nuevo lugar de interés'}
          onClose={() => setShowPlaceForm(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowPlaceForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={savePlace} disabled={!placeForm.name.trim()}>
                {editingPlace ? 'Guardar' : 'Añadir'}
              </button>
            </>
          }
        >
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
            <input
              className="form-input"
              value={placeForm.name}
              onChange={e => setPlaceForm({ ...placeForm, name: e.target.value })}
              placeholder="Ej: Templo Senso-ji"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input
              className="form-input"
              value={placeForm.address}
              onChange={e => setPlaceForm({ ...placeForm, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Etiquetas</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {PLACE_TAGS.map(tag => {
                const sel = placeForm.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id} type="button"
                    className="fd-pill-btn"
                    style={{
                      background: sel ? tag.color : tag.bg,
                      color: sel ? '#fff' : tag.color,
                      border: `1.5px solid ${tag.color}`,
                    }}
                    onClick={() => togglePlaceTag(tag.id)}
                  >
                    {tag.icon} {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nota</label>
            <textarea
              className="form-textarea"
              value={placeForm.description}
              onChange={e => setPlaceForm({ ...placeForm, description: e.target.value })}
              placeholder="¿Por qué quieres visitarlo?"
              rows={2}
            />
          </div>
        </Modal>
      )}

      {/* ── Modal: convert confirm ───────────────────────────────────────────── */}
      {convertConfirm && (
        <Modal
          title="Convertir en viaje"
          onClose={() => setConvertConfirm(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConvertConfirm(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => handleConvert(convertConfirm)}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
              >
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

function DestinationCard({ dest, onOpen, onEdit, onDelete, onConvert }) {
  const tt = getTripType(dest.tripType);
  const pr = getPriority(dest.priority);
  const st = getStatus(dest.status);

  return (
    <div className="fd-card" onClick={onOpen}>
      {/* Image / gradient header */}
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
          <button className="fd-card-action-btn" onClick={onEdit} title="Editar">
            <Edit3 size={13} />
          </button>
          <button className="fd-card-action-btn fd-card-action-danger" onClick={onDelete} title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="fd-card-body">
        <h3 className="fd-card-title">{dest.name}</h3>
        {dest.country && (
          <p className="fd-card-country">🌍 {dest.country}</p>
        )}

        {/* Badges */}
        <div className="fd-card-badges">
          <span className="fd-badge" style={{ background: pr.bg, color: pr.color, fontSize: '0.72rem' }}>
            {pr.icon} {pr.label}
          </span>
          <span className="fd-badge" style={{ background: st.bg, color: st.color, fontSize: '0.72rem' }}>
            {st.label}
          </span>
          {(dest.places || []).length > 0 && (
            <span className="fd-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
              <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
              {dest.places.length} lugar{dest.places.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Notes preview */}
        {dest.notes && (
          <p className="fd-card-notes">{dest.notes}</p>
        )}

        {/* Convert button */}
        <button
          className="btn btn-sm fd-convert-btn"
          onClick={onConvert}
          title="Convertir en viaje"
        >
          <Plane size={13} /> Convertir en viaje
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
