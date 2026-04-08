import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Bed } from 'lucide-react';

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

// Maps each tag id → leaflet marker color
const TAG_MARKER_COLOR = {
  restaurante: 'orange',
  cafe:        'gold',
  mirador:     'blue',
  monumento:   'violet',
  actividad:   'green',
  foto:        'red',
};

// Full tag metadata for the legend
const TAG_META = [
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', markerColor: 'orange' },
  { id: 'cafe',        label: 'Café',        icon: '☕',  markerColor: 'gold'   },
  { id: 'mirador',     label: 'Mirador',     icon: '🏔️', markerColor: 'blue'   },
  { id: 'monumento',   label: 'Monumento',   icon: '🏛️', markerColor: 'violet' },
  { id: 'actividad',   label: 'Actividad',   icon: '🎯', markerColor: 'green'  },
  { id: 'foto',        label: 'Foto',        icon: '📸', markerColor: 'red'    },
];

const getPlaceMarkerColor = (place) => {
  const tags = place.tags || [];
  if (tags.length === 0) return 'grey';
  return TAG_MARKER_COLOR[tags[0]] || 'grey';
};

const MARKER_IMG = (color) =>
  `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`;

export default function MapTab({ trip }) {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const allMarkers = [];

    // Add accommodations (violet)
    if (trip.accommodations) {
      trip.accommodations.forEach(a => {
        if (a.lat && a.lng) {
          allMarkers.push({
            id: `accom-${a.id}`,
            lat: a.lat,
            lng: a.lng,
            title: a.name,
            type: 'accommodation',
            tags: [],
            icon: customIcon('violet')
          });
        }
      });
    }

    // Add places with tag-based color
    if (trip.places) {
      trip.places.forEach(p => {
        if (p.lat && p.lng) {
          const color = getPlaceMarkerColor(p);
          allMarkers.push({
            id: `place-${p.id}`,
            lat: p.lat,
            lng: p.lng,
            title: p.name,
            type: 'place',
            tags: p.tags || [],
            icon: customIcon(color)
          });
        }
      });
    }

    setMarkers(allMarkers);
  }, [trip]);

  const defaultCenter = [40.4168, -3.7038]; // Madrid
  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : defaultCenter;

  // Compute which legend items to show
  const usedTagIds = new Set(
    markers.filter(m => m.type === 'place').flatMap(m => m.tags)
  );
  const hasUntaggedPlaces = markers.some(m => m.type === 'place' && m.tags.length === 0);
  const hasAccommodations = markers.some(m => m.type === 'accommodation');
  const visibleTagMeta = TAG_META.filter(t => usedTagIds.has(t.id));

  return (
    <div style={{ height: 'calc(100vh - 250px)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <h3>Mapa del Viaje</h3>
      </div>

      {/* Dynamic legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
        {hasAccommodations && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
            <img src={MARKER_IMG('violet')} style={{ height: 18 }} alt="" />
            <span>🛏️ Alojamiento</span>
          </div>
        )}
        {visibleTagMeta.map(tag => (
          <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
            <img src={MARKER_IMG(tag.markerColor)} style={{ height: 18 }} alt="" />
            <span>{tag.icon} {tag.label}</span>
          </div>
        ))}
        {hasUntaggedPlaces && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
            <img src={MARKER_IMG('grey')} style={{ height: 18 }} alt="" />
            <span>📍 Sin categoría</span>
          </div>
        )}
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {marker.type === 'accommodation' ? <Bed size={16} /> : <MapPin size={16} />}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px' }}>{marker.title}</h4>
                      {marker.type === 'place' && marker.tags.length > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                          {marker.tags.map(t => {
                            const meta = TAG_META.find(tm => tm.id === t);
                            return meta ? `${meta.icon} ${meta.label}` : t;
                          }).join(' · ')}
                        </p>
                      )}
                    </div>
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
