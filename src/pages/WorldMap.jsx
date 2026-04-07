import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { Compass } from 'lucide-react';
import useTripStore from '../data/store';
import { useNavigate } from 'react-router-dom';

export default function WorldMap() {
  const trips = useTripStore(s => s.trips);
  const loadTrips = useTripStore(s => s.loadTrips);
  const navigate = useNavigate();

  // Fix: load trips on direct navigation to this page
  useEffect(() => { if (trips.length === 0) loadTrips(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markers = useMemo(() => {
    const list = [];
    trips.forEach(trip => {
      // Just showing accommodations and places for a global view
      if (!trip.archived) {
        (trip.accommodations || []).forEach(a => {
          if (a.lat && a.lng) {
            list.push({ id: `accom-${a.id}`, lat: a.lat, lng: a.lng, title: `${a.name} (${trip.destination})`, tripId: trip.id });
          }
        });
        (trip.places || []).forEach(p => {
          if (p.lat && p.lng) {
            list.push({ id: `place-${p.id}`, lat: p.lat, lng: p.lng, title: `${p.name} (${trip.destination})`, tripId: trip.id });
          }
        });
      }
    });
    return list;
  }, [trips]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <header className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title"><Compass size={28} /> Mi Mapa Mundial</h1>
          <p className="page-subtitle">Visualiza todos los lugares y alojamientos de tus viajes guardados.</p>
        </div>
      </header>

      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MarkerClusterGroup chunkedLoading>
            {markers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{marker.title}</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/trip/${marker.tripId}`)}>Ver Viaje</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
