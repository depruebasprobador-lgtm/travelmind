import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Globe, MapPin, Wallet, Archive, ChevronDown } from 'lucide-react';
import useTripStore from '../data/store';
import TripCard from '../components/TripCard';
import SearchBar from '../components/SearchBar';
import DataActions from '../components/DataActions';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/helpers';

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
        return new Date(a.startDate) - new Date(b.startDate);
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
  const loadTrips = useTripStore(s => s.loadTrips);
  const trips = useTripStore(s => s.trips);
  const getFilteredTrips = useTripStore(s => s.getFilteredTrips);
  const archiveTrip = useTripStore(s => s.archiveTrip);

  const [sort, setSort] = useState('recent');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { loadTrips(); }, []);

  const filtered = getFilteredTrips();
  const activeTrips = sortTrips(filtered.filter(t => t.status !== 'idea'), sort);
  const ideas = sortTrips(filtered.filter(t => t.status === 'idea'), sort);
  const archived = trips.filter(t => t.archived);

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

      {/* Active trips */}
      {activeTrips.length > 0 ? (
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
                    onClick={e => { e.stopPropagation(); archiveTrip(t.id); }}
                    title="Desarchivar"
                  >
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
