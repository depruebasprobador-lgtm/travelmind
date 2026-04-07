import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Plane, Globe, MapPin, Wallet } from 'lucide-react';
import useTripStore from '../data/store';
import TripCard from '../components/TripCard';
import SearchBar from '../components/SearchBar';
import DataActions from '../components/DataActions';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const loadTrips = useTripStore(s => s.loadTrips);
  const trips = useTripStore(s => s.trips);
  const getFilteredTrips = useTripStore(s => s.getFilteredTrips);

  useEffect(() => { loadTrips(); }, []);

  const filtered = getFilteredTrips();
  const activeTrips = filtered.filter(t => t.status !== 'idea');
  const ideas = filtered.filter(t => t.status === 'idea');

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}><SearchBar /></div>
        <DataActions />
      </div>

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

      <button className="fab" onClick={() => navigate('/trip/new')} title="Nuevo viaje">
        <Plus size={24} />
      </button>
    </div>
  );
}
