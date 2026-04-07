import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDateShort, getCountryFlag } from '../utils/helpers';

export default function TripCard({ trip }) {
  const navigate = useNavigate();

  return (
    <div className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
      <div className="trip-card-image"
        style={{ backgroundImage: trip.imageUrl ? `url(${trip.imageUrl})` : 'var(--primary-gradient)' }}>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
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
      </div>
    </div>
  );
}
