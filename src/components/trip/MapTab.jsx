import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Bed, Calendar, MapPinOff } from 'lucide-react';
import EmptyState from '../EmptyState';

// Mapa interno de coords aproximadas para centrar cuando no hay markers.
// Es deliberadamente pequeño y conservador: si la app no encuentra el país
// o la ciudad, prefiere mostrar un empty state antes que un centro falso.
// Las coords corresponden al centroide del país (no a la capital).
const COUNTRY_COORDS = {
  'españa': [40.4168, -3.7038], 'spain': [40.4168, -3.7038],
  'francia': [46.6034, 2.2137], 'france': [46.6034, 2.2137],
  'italia': [41.8719, 12.5674], 'italy': [41.8719, 12.5674],
  'portugal': [39.3999, -8.2245],
  'alemania': [51.1657, 10.4515], 'germany': [51.1657, 10.4515],
  'reino unido': [55.3781, -3.4360], 'uk': [55.3781, -3.4360], 'inglaterra': [52.3555, -1.1743],
  'irlanda': [53.4129, -8.2439], 'ireland': [53.4129, -8.2439],
  'países bajos': [52.1326, 5.2913], 'holanda': [52.1326, 5.2913], 'netherlands': [52.1326, 5.2913],
  'bélgica': [50.5039, 4.4699], 'belgica': [50.5039, 4.4699],
  'suiza': [46.8182, 8.2275], 'austria': [47.5162, 14.5501],
  'grecia': [39.0742, 21.8243], 'greece': [39.0742, 21.8243],
  'turquía': [38.9637, 35.2433], 'turquia': [38.9637, 35.2433],
  'marruecos': [31.7917, -7.0926], 'morocco': [31.7917, -7.0926],
  'egipto': [26.8206, 30.8025],
  'estados unidos': [37.0902, -95.7129], 'usa': [37.0902, -95.7129], 'us': [37.0902, -95.7129],
  'méxico': [23.6345, -102.5528], 'mexico': [23.6345, -102.5528],
  'canadá': [56.1304, -106.3468], 'canada': [56.1304, -106.3468],
  'argentina': [-38.4161, -63.6167],
  'chile': [-35.6751, -71.5430],
  'perú': [-9.1900, -75.0152], 'peru': [-9.1900, -75.0152],
  'colombia': [4.5709, -74.2973], 'brasil': [-14.2350, -51.9253], 'brazil': [-14.2350, -51.9253],
  'japón': [36.2048, 138.2529], 'japon': [36.2048, 138.2529], 'japan': [36.2048, 138.2529],
  'china': [35.8617, 104.1954], 'corea del sur': [35.9078, 127.7669],
  'tailandia': [15.8700, 100.9925], 'thailand': [15.8700, 100.9925],
  'vietnam': [14.0583, 108.2772], 'indonesia': [-0.7893, 113.9213],
  'india': [20.5937, 78.9629], 'filipinas': [12.8797, 121.7740],
  'australia': [-25.2744, 133.7751], 'nueva zelanda': [-40.9006, 174.8860],
  'sudáfrica': [-30.5595, 22.9375], 'kenia': [-0.0236, 37.9062],
  'islandia': [64.9631, -19.0208], 'iceland': [64.9631, -19.0208],
  'noruega': [60.4720, 8.4689], 'suecia': [60.1282, 18.6435], 'finlandia': [61.9241, 25.7482],
  'dinamarca': [56.2639, 9.5018], 'rusia': [61.5240, 105.3188],
  'polonia': [51.9194, 19.1451], 'hungría': [47.1625, 19.5033], 'república checa': [49.8175, 15.4730],
  'croacia': [45.1000, 15.2000], 'cuba': [21.5218, -77.7812],
};

const CITY_COORDS = {
  'madrid': [40.4168, -3.7038], 'barcelona': [41.3851, 2.1734], 'valencia': [39.4699, -0.3763],
  'sevilla': [37.3891, -5.9845], 'bilbao': [43.2630, -2.9350], 'málaga': [36.7213, -4.4214],
  'paris': [48.8566, 2.3522], 'parís': [48.8566, 2.3522],
  'roma': [41.9028, 12.4964], 'rome': [41.9028, 12.4964],
  'milan': [45.4642, 9.1900], 'milán': [45.4642, 9.1900],
  'venecia': [45.4408, 12.3155], 'florencia': [43.7696, 11.2558], 'nápoles': [40.8518, 14.2681],
  'lisboa': [38.7223, -9.1393], 'oporto': [41.1579, -8.6291], 'porto': [41.1579, -8.6291],
  'berlín': [52.5200, 13.4050], 'berlin': [52.5200, 13.4050],
  'múnich': [48.1351, 11.5820], 'munich': [48.1351, 11.5820],
  'londres': [51.5074, -0.1278], 'london': [51.5074, -0.1278],
  'edimburgo': [55.9533, -3.1883], 'dublín': [53.3498, -6.2603],
  'amsterdam': [52.3676, 4.9041], 'ámsterdam': [52.3676, 4.9041],
  'bruselas': [50.8503, 4.3517], 'brujas': [51.2093, 3.2247],
  'viena': [48.2082, 16.3738], 'praga': [50.0755, 14.4378],
  'atenas': [37.9838, 23.7275], 'estambul': [41.0082, 28.9784],
  'marrakech': [31.6295, -7.9811],
  'el cairo': [30.0444, 31.2357],
  'nueva york': [40.7128, -74.0060], 'new york': [40.7128, -74.0060],
  'los angeles': [34.0522, -118.2437], 'san francisco': [37.7749, -122.4194],
  'miami': [25.7617, -80.1918], 'chicago': [41.8781, -87.6298],
  'ciudad de méxico': [19.4326, -99.1332], 'cdmx': [19.4326, -99.1332],
  'buenos aires': [-34.6037, -58.3816],
  'santiago de chile': [-33.4489, -70.6693], 'santiago': [-33.4489, -70.6693],
  'lima': [-12.0464, -77.0428], 'bogotá': [4.7110, -74.0721],
  'río de janeiro': [-22.9068, -43.1729], 'rio de janeiro': [-22.9068, -43.1729],
  'são paulo': [-23.5505, -46.6333], 'sao paulo': [-23.5505, -46.6333],
  'tokio': [35.6762, 139.6503], 'tokyo': [35.6762, 139.6503],
  'kioto': [35.0116, 135.7681], 'osaka': [34.6937, 135.5023],
  'pekín': [39.9042, 116.4074], 'shanghái': [31.2304, 121.4737],
  'seúl': [37.5665, 126.9780], 'bangkok': [13.7563, 100.5018],
  'hanoi': [21.0285, 105.8542], 'ho chi minh': [10.8231, 106.6297],
  'bali': [-8.3405, 115.0920], 'yakarta': [-6.2088, 106.8456],
  'sídney': [-33.8688, 151.2093], 'sydney': [-33.8688, 151.2093],
  'melbourne': [-37.8136, 144.9631], 'auckland': [-36.8485, 174.7633],
  'ciudad del cabo': [-33.9249, 18.4241], 'reikiavik': [64.1466, -21.9426],
  'reykjavik': [64.1466, -21.9426],
};

// Devuelve coords + zoom para un trip sin markers. Estrategia:
//   1) Coincide ciudad → zoom 11 (más cerca).
//   2) Coincide país → zoom 5 (vista regional).
//   3) Nada → null (caller muestra empty state).
function guessTripCenter(trip) {
  const norm = (s) => (s || '').toString().toLowerCase().trim();
  const city = norm(trip.city);
  const dest = norm(trip.destination);
  const country = norm(trip.country);

  if (city && CITY_COORDS[city]) return { coords: CITY_COORDS[city], zoom: 11 };
  if (dest && CITY_COORDS[dest]) return { coords: CITY_COORDS[dest], zoom: 11 };
  if (country && COUNTRY_COORDS[country]) return { coords: COUNTRY_COORDS[country], zoom: 5 };
  if (dest && COUNTRY_COORDS[dest]) return { coords: COUNTRY_COORDS[dest], zoom: 5 };
  return null;
}

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

    // Add itinerary activities with location
    if (trip.itinerary) {
      trip.itinerary.forEach(day => {
        (day.activities || []).forEach(activity => {
          if (activity.lat && activity.lng) {
            allMarkers.push({
              id: `activity-${activity.id}`,
              lat: activity.lat,
              lng: activity.lng,
              title: activity.name,
              subtitle: activity.place || null,
              dayNumber: day.dayNumber,
              time: activity.time || null,
              type: 'activity',
              tags: [],
              icon: customIcon('green')
            });
          }
        });
      });
    }

    setMarkers(allMarkers);
  }, [trip]);


  // Sin markers: intentamos centrar por ciudad/país del viaje. Si no hay
  // forma fiable, dejamos `fallbackCenter = null` y mostramos un empty state.
  const fallback = markers.length === 0 ? guessTripCenter(trip) : null;
  const center = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : (fallback ? fallback.coords : null);
  const initialZoom = markers.length > 0 ? 12 : (fallback ? fallback.zoom : 3);

  // Compute which legend items to show
  const usedTagIds = new Set(
    markers.filter(m => m.type === 'place').flatMap(m => m.tags)
  );
  const hasUntaggedPlaces = markers.some(m => m.type === 'place' && m.tags.length === 0);
  const hasAccommodations = markers.some(m => m.type === 'accommodation');
  const hasActivities = markers.some(m => m.type === 'activity');
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
        {hasActivities && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
            <img src={MARKER_IMG('green')} style={{ height: 18 }} alt="" />
            <span>📅 Actividad</span>
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

      {!center ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <EmptyState
            icon={<MapPinOff size={36} />}
            title="Sin ubicaciones que mostrar"
            description={
              trip.destination
                ? `No tenemos coordenadas para "${trip.destination}". Añade alojamientos, lugares o actividades con dirección para verlos en el mapa.`
                : 'Añade alojamientos, lugares o actividades con dirección para verlos en el mapa.'
            }
          />
        </div>
      ) : (
        <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <MapContainer center={center} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup chunkedLoading>
              {markers.map(marker => (
                <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={marker.icon}>
                  <Popup>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      {marker.type === 'accommodation' ? <Bed size={16} /> : marker.type === 'activity' ? <Calendar size={16} /> : <MapPin size={16} />}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>{marker.title}</h4>
                        {marker.type === 'activity' && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                            📅 Día {marker.dayNumber}{marker.time ? ` · ${marker.time}` : ''}
                            {marker.subtitle && <><br /><span>📍 {marker.subtitle}</span></>}
                          </p>
                        )}
                        {marker.type === 'place' && marker.tags.length > 0 && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                            {marker.tags.map(t => {
                              const meta = TAG_META.find(tm => tm.id === t);
                              return meta ? `${meta.icon} ${meta.label}` : t;
                            }).join(' · ')}
                          </p>
                        )}
                        <a href={`https://www.google.com/maps?q=${marker.lat},${marker.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: 4, fontSize: '11px', color: '#4F46E5' }}>
                          Ver en Google Maps ↗
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      )}
    </div>
  );
}
