import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Edit3, Copy, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDateShort, getCountryFlag } from '../utils/helpers';
import useTripStore from '../data/store';
import { useToast } from './Toast';

export default function TripCard({ trip }) {
  const navigate = useNavigate();
  const toast = useToast();
  const duplicateTrip = useTripStore(s => s.duplicateTrip);
  const deleteTrip = useTripStore(s => s.deleteTrip);

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/trip/${trip.id}/edit`);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    duplicateTrip(trip.id);
    toast('Viaje duplicado', 'success');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`¿Eliminar "${trip.destination}"? Esta acción no se puede deshacer.`)) {
      deleteTrip(trip.id);
      toast('Viaje eliminado', 'info');
    }
  };

  // Checklist progress
  const checklist = trip.checklist || [];
  const checked = checklist.filter(c => c.checked).length;
  const progress = checklist.length > 0 ? Math.round((checked / checklist.length) * 100) : null;

  return (
    <div className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
      <div className="trip-card-image"
        style={{ backgroundImage: trip.imageUrl ? `url(${trip.imageUrl})` : 'var(--primary-gradient)' }}>
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          <StatusBadge status={trip.status} />
        </div>
      </div>

      <div className="trip-card-body">
        <h3>{getCountryFlag(trip.country)} {trip.destination}</h3>
        <div className="trip-card-meta">
          <span><MapPin size={14} /> {trip.city}, {trip.country}</span>
          {trip.startDate && (
            <span>
              <Calendar size={14} />
              {formatDateShort(trip.startDate)} — {formatDateShort(trip.endDate)}
            </span>
          )}
        </div>

        {progress !== null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              <span>Checklist</span>
              <span>{checked}/{checklist.length}</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: progress === 100 ? 'var(--success)' : 'var(--primary)',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Quick action row — visible on card hover */}
        <div className="trip-card-quick-actions">
          <button className="trip-card-action-btn" onClick={handleEdit} title="Editar">
            <Edit3 size={14} /> Editar
          </button>
          <button className="trip-card-action-btn" onClick={handleDuplicate} title="Duplicar">
            <Copy size={14} /> Duplicar
          </button>
          <button className="trip-card-action-btn danger" onClick={handleDelete} title="Eliminar">
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
