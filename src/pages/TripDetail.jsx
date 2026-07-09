import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Copy, Archive, Trash2, ArrowLeft, FileText, Sparkles, KeyRound, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import useTripStore from '../data/store';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatDate, formatCurrency, downloadFile, todayISO } from '../utils/helpers';
import ItineraryTab from '../components/trip/ItineraryTab';
import AccommodationTab from '../components/trip/AccommodationTab';
import TransportTab from '../components/trip/TransportTab';
import PlacesTab from '../components/trip/PlacesTab';
import ExpensesTab from '../components/trip/ExpensesTab';
import MapTab from '../components/trip/MapTab';
import ChecklistTab from '../components/trip/ChecklistTab';
import DayPlanTab from '../components/trip/DayPlanTab';
import RecommendationsTab from '../components/trip/RecommendationsTab';
import TripPrepPanel from '../components/trip/TripPrepPanel';
import TemplateModal from '../components/trip/TemplateModal';
import KeyInfoModal from '../components/trip/KeyInfoModal';
import { getTripSnapshot, getSnapshotAgeLabel } from '../utils/localTripBackup';

const TABS = [
  { id: 'dayplan',         label: '📅 Plan del día' },
  { id: 'itinerary',       label: 'Itinerario' },
  { id: 'accommodation',   label: 'Alojamiento' },
  { id: 'transport',       label: 'Transporte' },
  { id: 'places',          label: 'Lugares' },
  { id: 'recommendations', label: '🔍 Descubrir' },
  { id: 'expenses',        label: 'Gastos' },
  { id: 'map',             label: 'Mapa' },
  { id: 'checklist',       label: 'Checklist' },
];

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tabInitialized, setTabInitialized] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const [triedSnapshot, setTriedSnapshot] = useState(false);

  const loadTrips = useTripStore(s => s.loadTrips);
  const loadTrip = useTripStore(s => s.loadTrip);
  const trips = useTripStore(s => s.trips);
  const deleteTripAction = useTripStore(s => s.deleteTrip);
  const duplicateTrip = useTripStore(s => s.duplicateTrip);
  const archiveTrip = useTripStore(s => s.archiveTrip);
  const exportTripData = useTripStore(s => s.exportTripData);
  const openLocalTripSnapshot = useTripStore(s => s.openLocalTripSnapshot);
  const loadState = useTripStore(s => s.loadState);

  // Fix: ensure trips are loaded when navigating directly to this URL
  useEffect(() => {
    if (trips.length === 0) loadTrips();
    loadTrip(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const trip = trips.find(t => t.id === id);

  // Auto-select "Plan del día" if the trip is happening today
  useEffect(() => {
    if (!trip || tabInitialized) return;
    const today = new Date().toISOString().split('T')[0];
    if (trip.startDate && trip.endDate && today >= trip.startDate && today <= trip.endDate) {
      setActiveTab('dayplan');
    }
    setTabInitialized(true);
  }, [trip, tabInitialized]);

  // Si la carga remota falla y no tenemos el viaje, probamos la copia local.
  useEffect(() => {
    if (!trip && loadState === 'error' && !triedSnapshot) {
      setTriedSnapshot(true);
      openLocalTripSnapshot(id);
    }
  }, [trip, loadState, triedSnapshot, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) {
    if (loadState === 'loading') {
      return (
        <div className="page-container">
          <div className="load-state load-state--loading">
            <div className="load-spinner" />
            <p>Cargando el viaje…</p>
          </div>
        </div>
      );
    }
    if (loadState === 'error') {
      const snap = getTripSnapshot(id);
      return (
        <div className="page-container">
          <div className="load-state load-state--error">
            <AlertTriangle size={34} className="load-state-icon" />
            <h3>No se pudo cargar el viaje</h3>
            <p>Puede ser la conexión o que Supabase esté pausado. Tranquilo: no se ha borrado nada.</p>
            <div className="load-state-actions">
              <button className="btn btn-primary" onClick={() => { loadTrips(); loadTrip(id); }}>
                <RefreshCw size={16} /> Reintentar
              </button>
              {snap && (
                <button className="btn btn-secondary" onClick={() => openLocalTripSnapshot(id)}>
                  <Archive size={16} /> Abrir última copia guardada
                </button>
              )}
            </div>
            {snap && <p className="load-state-hint">Copia local · {getSnapshotAgeLabel(snap.savedAt)}</p>}
          </div>
        </div>
      );
    }
    return <div className="page-container"><p>Viaje no encontrado</p></div>;
  }

  const totalSpent = (trip.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  const handleDelete = async () => {
    const r = await deleteTripAction(id);
    if (r?.ok === false) return; // el StoreErrorBridge ya emite el toast de error
    navigate('/');
    toast('Viaje eliminado', 'info');
  };

  const handleDuplicate = async () => {
    const r = await duplicateTrip(id);
    if (r?.ok === false) return;
    toast('Viaje duplicado', 'success');
    navigate('/');
  };

  const handleArchive = async () => {
    const wasArchived = trip.archived;
    const r = await archiveTrip(id);
    if (r?.ok === false) return;
    toast(wasArchived ? 'Viaje desarchivado' : 'Viaje archivado', 'success');
  };

  const slugify = (str) =>
    (str || 'viaje')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'viaje';

  const handleExportJSON = () => {
    try {
      const raw = exportTripData(id);
      if (!raw || !Array.isArray(raw.trips) || raw.trips.length === 0) {
        toast('No se pudo exportar la copia', 'error');
        return;
      }
      // Limpiamos banderas internas (p.ej. __isLocalSnapshot) del export.
      const clean = {
        ...raw,
        trips: raw.trips.map(t => {
          const o = {};
          for (const k of Object.keys(t)) if (!k.startsWith('__')) o[k] = t[k];
          return o;
        }),
      };
      const slug = slugify(trip.destination || trip.city);
      const datePart = trip.startDate || todayISO();
      downloadFile(clean, `travelmind-${slug}-${datePart}.json`);
      toast('Copia del viaje exportada', 'success');
    } catch (e) {
      console.error('[TravelMind] export copia falló:', e);
      toast('No se pudo exportar la copia', 'error');
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dayplan': return <DayPlanTab trip={trip} onNavigateTab={setActiveTab} />;
      case 'itinerary': return <ItineraryTab trip={trip} />;
      case 'accommodation': return <AccommodationTab trip={trip} />;
      case 'transport': return <TransportTab trip={trip} />;
      case 'places': return <PlacesTab trip={trip} />;
      case 'recommendations': return <RecommendationsTab trip={trip} />;
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

      {trip.__isLocalSnapshot && (
        <div className="emergency-banner">
          <ShieldAlert size={18} />
          <div className="emergency-banner-text">
            <strong>Modo emergencia</strong>
            <span>
              Estás viendo la última copia guardada{trip.__snapshotSavedAt ? ` · ${getSnapshotAgeLabel(trip.__snapshotSavedAt)}` : ''}.
              Puede que algunos cambios no se guarden hasta recuperar conexión.
            </span>
          </div>
          <button className="btn btn-sm emergency-banner-btn" onClick={() => { loadTrips(); loadTrip(id); }}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

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
                onClick={() => setShowTemplate(true)}><Sparkles size={14} /> Plantilla</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleDuplicate}><Copy size={14} /> Duplicar</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleArchive}><Archive size={14} /> {trip.archived ? 'Desarchivar' : 'Archivar'}</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => setShowKeyInfo(true)}><KeyRound size={14} /> Datos clave</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={handleExportJSON}><FileText size={14} /> Exportar copia</button>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.8)', color: 'white' }}
                onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <TripPrepPanel trip={trip} onNavigateTab={setActiveTab} />

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

      {showTemplate && (
        <TemplateModal trip={trip} onClose={() => setShowTemplate(false)} />
      )}

      {showKeyInfo && (
        <KeyInfoModal trip={trip} onClose={() => setShowKeyInfo(false)} />
      )}
    </div>
  );
}
