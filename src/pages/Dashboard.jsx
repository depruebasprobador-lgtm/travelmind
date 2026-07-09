import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Globe, MapPin, Wallet, Archive, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import useTripStore from '../data/store';
import TripCard from '../components/TripCard';
import SearchBar from '../components/SearchBar';
import DataActions from '../components/DataActions';
import EmptyState from '../components/EmptyState';
import TodayTripWidget from '../components/TodayTripWidget';
import { useToast } from '../components/Toast';
import { formatCurrency, compareISODates } from '../utils/helpers';
import { getTripsSnapshot, getSnapshotAgeLabel } from '../utils/localTripBackup';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'upcoming', label: 'Próximas fechas' },
  { value: 'name_asc', label: 'Nombre A → Z' },
  { value: 'name_desc', label: 'Nombre Z → A' },
];

function sortTrips(trips, sort) {
  const arr = [...trips];
  switch (sort) {
    case 'upcoming':
      return arr.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        // compareISODates es UTC-safe sobre strings 'YYYY-MM-DD'
        return compareISODates(a.startDate, b.startDate);
      });
    case 'name_asc':
      return arr.sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
    case 'name_desc':
      return arr.sort((a, b) => (b.destination || '').localeCompare(a.destination || ''));
    case 'recent':
    default:
      return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const loadTrips = useTripStore(s => s.loadTrips);
  const trips = useTripStore(s => s.trips);
  const getFilteredTrips = useTripStore(s => s.getFilteredTrips);
  const archiveTrip = useTripStore(s => s.archiveTrip);
  const openLocalSnapshot = useTripStore(s => s.openLocalSnapshot);
  const loadState = useTripStore(s => s.loadState);
  const usingSnapshot = useTripStore(s => s.usingSnapshot);
  const saveStatus = useTripStore(s => s.saveStatus);
  const isSaving = saveStatus === 'saving';

  const [sort, setSort] = useState('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [snapMeta, setSnapMeta] = useState(() => getTripsSnapshot());

  const handleRetry = async () => {
    const r = await loadTrips();
    if (r?.ok) { setSnapMeta(getTripsSnapshot()); toast('Viajes cargados', 'success'); }
  };

  const handleOpenSnapshot = () => {
    const r = openLocalSnapshot();
    if (r?.ok) toast('Mostrando la última copia guardada', 'info');
    else toast('No hay copia local disponible todavía', 'error');
  };

  useEffect(() => { loadTrips(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnarchive = async (e, tripId) => {
    e.stopPropagation();
    if (isSaving) return;
    const target = trips.find(t => t.id === tripId);
    const wasArchived = target?.archived;
    const r = await archiveTrip(tripId);
    if (!r?.ok) return;
    toast(wasArchived ? 'Viaje desarchivado' : 'Viaje archivado', 'success');
  };

  const filtered = getFilteredTrips();
  const activeTrips = sortTrips(filtered.filter(t => t.status !== 'idea'), sort);
  const ideas = sortTrips(filtered.filter(t => t.status === 'idea'), sort);
  const archived = trips.filter(t => t.archived);

  // Estados de carga inequívocos (evitan el empty state alegre si hay error).
  const showLoading = loadState === 'loading' && trips.length === 0;
  const showError = loadState === 'error' && activeTrips.length === 0 && ideas.length === 0;

  const allActive = trips.filter(t => !t.archived);
  const countries = [...new Set(allActive.map(t => t.country).filter(Boolean))];
  const totalSpent = allActive.reduce((s, t) =>
    s + (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0), 0
  );

  return (
    <div className="page-container">
      <div className="hero">
        <h1>¡Bienvenido a TravelMind! ✈️</h1>
        <p>Planifica, organiza y disfruta tus viajes</p>
      </div>

      {/* Widget destacado: viaje en curso o próximo (≤14 días). */}
      <TodayTripWidget />

      {usingSnapshot && (
        <div className="snapshot-banner">
          <Archive size={16} />
          <span>
            Mostrando la última copia guardada{snapMeta ? ` · ${getSnapshotAgeLabel(snapMeta.savedAt)}` : ''}.
            Puede que no esté 100% al día.
          </span>
          <button className="btn btn-sm snapshot-banner-btn" onClick={handleRetry}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.1)', color: '#4F46E5' }}>
            <Plane size={24} />
          </div>
          <div className="stat-info">
            <h3>{allActive.length}</h3>
            <p>Viajes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
            <Globe size={24} />
          </div>
          <div className="stat-info">
            <h3>{countries.length}</h3>
            <p>Países</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
            <MapPin size={24} />
          </div>
          <div className="stat-info">
            <h3>{allActive.reduce((s, t) => s + (t.places?.length || 0), 0)}</h3>
            <p>Lugares</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalSpent)}</h3>
            <p>Gastado</p>
          </div>
        </div>
      </div>

      {/* Toolbar: search + sort + export/import */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}><SearchBar /></div>

        {/* Sort selector */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="form-input"
            style={{ paddingRight: 32, cursor: 'pointer', minWidth: 160, fontSize: '0.85rem' }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
        </div>

        <DataActions />
      </div>

      {/* Estados: cargando / error / normal / vacío */}
      {showLoading ? (
        <div className="load-state load-state--loading">
          <div className="load-spinner" />
          <p>Cargando tus viajes…</p>
        </div>
      ) : showError ? (
        <div className="load-state load-state--error">
          <AlertTriangle size={34} className="load-state-icon" />
          <h3>No se pudieron cargar los viajes</h3>
          <p>Puede ser la conexión, Supabase pausado o un problema temporal. Tranquilo: tus viajes no se han borrado.</p>
          <div className="load-state-actions">
            <button className="btn btn-primary" onClick={handleRetry} disabled={loadState === 'loading'}>
              <RefreshCw size={16} /> Reintentar
            </button>
            {snapMeta && (
              <button className="btn btn-secondary" onClick={handleOpenSnapshot}>
                <Archive size={16} /> Abrir última copia guardada
              </button>
            )}
          </div>
          {snapMeta && (
            <p className="load-state-hint">Copia local disponible · {getSnapshotAgeLabel(snapMeta.savedAt)}</p>
          )}
        </div>
      ) : activeTrips.length > 0 ? (
        <>
          <div className="section-header">
            <h2>Mis Viajes</h2>
          </div>
          <div className="trips-grid">
            {activeTrips.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Plane size={36} />}
          title="Sin viajes todavía"
          description="Empieza a planificar tu próxima aventura añadiendo tu primer viaje."
          action={<button className="btn btn-primary" onClick={() => navigate('/trip/new')}><Plus size={18} /> Crear viaje</button>}
        />
      )}

      {/* Ideas section */}
      {ideas.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div className="section-header">
            <h2>💡 Ideas de viajes futuros</h2>
          </div>
          <div className="trips-grid">
            {ideas.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setShowArchived(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
          >
            <Archive size={16} />
            {showArchived ? 'Ocultar archivados' : `Ver archivados (${archived.length})`}
            <ChevronDown size={14} style={{ transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showArchived && (
            <div className="trips-grid" style={{ opacity: 0.7 }}>
              {archived.map(t => (
                <div key={t.id} style={{ position: 'relative' }}>
                  <TripCard trip={t} />
                  <button
                    className="btn btn-sm"
                    style={{ position: 'absolute', bottom: 60, right: 8, zIndex: 10, fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                    onClick={e => handleUnarchive(e, t.id)}
                    disabled={isSaving}
                    title="Desarchivar"
                  >
                    Desarchivar
                    Desarchivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="fab" onClick={() => navigate('/trip/new')} title="Nuevo viaje">
        <Plus size={24} />
      </button>
    </div>
  );
}
