import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Copy, Archive, FileDown, Trash2, ArrowLeft, FileText } from 'lucide-react';
import useTripStore from '../data/store';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatDate, formatCurrency, downloadFile } from '../utils/helpers';
import ItineraryTab from '../components/trip/ItineraryTab';
import AccommodationTab from '../components/trip/AccommodationTab';
import TransportTab from '../components/trip/TransportTab';
import PlacesTab from '../components/trip/PlacesTab';
import ExpensesTab from '../components/trip/ExpensesTab';
import MapTab from '../components/trip/MapTab';
import ChecklistTab from '../components/trip/ChecklistTab';

const TABS = [
  { id: 'itinerary', label: 'Itinerario' },
  { id: 'accommodation', label: 'Alojamiento' },
  { id: 'transport', label: 'Transporte' },
  { id: 'places', label: 'Lugares' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'map', label: 'Mapa' },
  { id: 'checklist', label: 'Checklist' },
];

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadTrips = useTripStore(s => s.loadTrips);
  const loadTrip = useTripStore(s => s.loadTrip);
  const trips = useTripStore(s => s.trips);
  const deleteTripAction = useTripStore(s => s.deleteTrip);
  const duplicateTrip = useTripStore(s => s.duplicateTrip);
  const archiveTrip = useTripStore(s => s.archiveTrip);
  const exportTripData = useTripStore(s => s.exportTripData);

  // Fix: ensure trips are loaded when navigating directly to this URL
  useEffect(() => {
    if (trips.length === 0) loadTrips();
    loadTrip(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const trip = trips.find(t => t.id === id);
  if (!trip) return <div className="page-container"><p>Viaje no encontrado</p></div>;

  const totalSpent = (trip.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  const handleDelete = () => {
    deleteTripAction(id);
    navigate('/');
    toast('Viaje eliminado', 'info');
  };

  const handleDuplicate = () => {
    duplicateTrip(id);
    toast('Viaje duplicado', 'success');
    navigate('/');
  };

  const handleArchive = () => {
    archiveTrip(id);
    toast(trip.archived ? 'Viaje desarchivado' : 'Viaje archivado', 'success');
  };

  const handleExportJSON = () => {
    const data = exportTripData(id);
    if (data) {
      downloadFile(data, `travelmind-${trip.destination.toLowerCase().replace(/\s+/g, '-')}.json`);
      toast('Viaje exportado', 'success');
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'itinerary': return <ItineraryTab trip={trip} />;
      case 'accommodation': return <AccommodationTab trip={trip} />;
      case 'transport': return <TransportTab trip={trip} />;
      case 'places': return <PlacesTab trip={trip} />;
      case 'expenses': return <ExpensesTab trip={trip} />;
      case 'map': return <MapTab trip={trip} />;
      case 'checklist': return <ChecklistTab trip={trip} />;
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={18} /> Dashboard
      </button>

      <div className="trip-header">
        <div className="trip-header-bg"
          style={{ backgroundImage: trip.imageUrl ? `url(${trip.imageUrl})` : 'var(--primary-gradient)' }}>
          <div className="trip-header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <StatusBadge status={trip.status} />
            </div>
            <h1>{trip.destination}</h1>
            <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>
              {trip.city}, {trip.country} · {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
              {trip.budget > 0 && ` · Presupuesto: ${formatCurrency(trip.budget)} (Gastado: ${formatCurrency(totalSpent)})`}
            </p>
            <div className="trip-header-actions">
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => navigate(`/trip/${id}/edit`)}><Edit3 size={14} /> Editar</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleDuplicate}><Copy size={14} /> Duplicar</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleArchive}><Archive size={14} /> {trip.archived ? 'Desarchivar' : 'Archivar'}</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleExportJSON}><FileText size={14} /> JSON</button>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.8)', color: 'white' }}
                onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <div className="animate-in">{renderTab()}</div>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar viaje"
          message={`¿Estás seguro de que quieres eliminar "${trip.destination}"? Esta acción no se puede deshacer.`}
          danger onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
      )}
    </div>
  );
}
