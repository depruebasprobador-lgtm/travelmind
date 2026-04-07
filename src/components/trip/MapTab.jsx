import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map, MapPin, Bed, Navigation } from 'lucide-react';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;

const customIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapTab({ trip }) {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const allMarkers = [];
    
    // Add accommodations
    if (trip.accommodations) {
      trip.accommodations.forEach(a => {
        if (a.lat && a.lng) {
          allMarkers.push({
            id: `accom-${a.id}`,
            lat: a.lat,
            lng: a.lng,
            title: a.name,
            type: 'accommodation',
            icon: customIcon('violet')
          });
        }
      });
    }

    // Add places
    if (trip.places) {
      trip.places.forEach(p => {
        if (p.lat && p.lng) {
          allMarkers.push({
            id: `place-${p.id}`,
            lat: p.lat,
            lng: p.lng,
            title: p.name,
            type: 'place',
            icon: customIcon('red')
          });
        }
      });
    }

    setMarkers(allMarkers);
  }, [trip]);

  // Use a default center if no markers, else calculate bounds or center
  const defaultCenter = [40.4168, -3.7038]; // Madrid
  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : defaultCenter;

  return (
    <div style={{ height: 'calc(100vh - 250px)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <h3>Mapa del Viaje</h3>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png" style={{ height: 20 }} alt="Accom" />
          Alojamientos
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" style={{ height: 20 }} alt="Place" />
          Lugares
        </div>
      </div>

      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer center={center} zoom={markers.length > 0 ? 12 : 3} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup chunkedLoading>
            {markers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={marker.icon}>
                <Popup>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {marker.type === 'accommodation' ? <Bed size={16} /> : <MapPin size={16} />}
                    <h4 style={{ margin: 0, fontSize: '14px' }}>{marker.title}</h4>
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
