import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Check, Compass, Loader, RefreshCw } from 'lucide-react';
import useTripStore from '../../data/store';

const CATEGORIES = [
  { id: 'all',        label: 'Todos',        icon: '🗺️', tag: null,         color: null,      bg: null },
  { id: 'monument',   label: 'Monumentos',   icon: '🏛️', tag: 'monumento',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'restaurant', label: 'Restaurantes', icon: '🍽️', tag: 'restaurante', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'museum',     label: 'Museos',       icon: '🎨', tag: 'monumento',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'viewpoint',  label: 'Miradores',    icon: '🏔️', tag: 'mirador',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'activity',   label: 'Actividades',  icon: '🎯', tag: 'actividad',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'cafe',       label: 'Cafés',        icon: '☕', tag: 'cafe',       color: '#b45309', bg: 'rgba(180,83,9,0.12)' },
];

const classifyNode = (tags = {}) => {
  if (tags.tourism === 'museum')                                    return 'museum';
  if (tags.tourism === 'viewpoint')                                 return 'viewpoint';
  if (tags.tourism === 'monument' || tags.tourism === 'attraction') return 'monument';
  if (tags.historic)                                                return 'monument';
  if (tags.amenity === 'restaurant')                                return 'restaurant';
  if (tags.amenity === 'cafe' || tags.amenity === 'coffee_shop')    return 'cafe';
  if (tags.leisure === 'park')                                      return 'activity';
  return 'activity';
};

const buildAddress = (tags = {}) => {
  const parts = [];
  if (tags['addr:street']) {
    parts.push(tags['addr:street'] + (tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''));
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  return parts.join(', ') || null;
};

export default function RecommendationsTab({ trip }) {
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [pois, setPois]                   = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [addedPlaces, setAddedPlaces]     = useState(new Set());
  const [addedItinerary, setAddedItinerary] = useState(new Set());
  const [dayPickerPoi, setDayPickerPoi]   = useState(null);
  const [selectedDay, setSelectedDay]     = useState('');

  const { addPlace, addActivity } = useTripStore();

  const itinerary = trip.itinerary?.filter(d => d.activities !== undefined) || [];

  // ─── Fetch recommendations ────────────────────────────────────────────────
  const fetchRecommendations = useCallback(async () => {
    const query = trip.city
      ? `${trip.city}, ${trip.country}`
      : trip.destination;

    if (!query) return;
    setLoading(true);
    setError(null);
    setPois([]);

    try {
      // 1. Geocode
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'TravelMind/1.0' } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) throw new Error(`No se encontró la ubicación: ${query}`);

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      // 2. Overpass – two parallel requests with bbox (faster than around for dense cities)
      const d = 0.022; // ~2.4 km half-side
      const bbox = `${lat - d},${lon - d * 1.5},${lat + d},${lon + d * 1.5}`;

      const touristQuery = `
[out:json][timeout:22][bbox:${bbox}];
(
  node["tourism"="museum"]["name"];
  node["tourism"="viewpoint"]["name"];
  node["tourism"="monument"]["name"];
  node["historic"="castle"]["name"];
  node["historic"="memorial"]["name"];
  node["leisure"="park"]["name"];
);
out 80;`;

      const foodQuery = `
[out:json][timeout:20][bbox:${bbox}];
(
  node["amenity"="restaurant"]["name"];
  node["amenity"="cafe"]["name"];
);
out 80;`;

      // Try primary endpoint, fall back to mirror on 429/error
      const overpassFetch = async (query) => {
        const endpoints = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
        ];
        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `data=${encodeURIComponent(query)}`,
            });
            if (res.status === 429) continue; // rate limited, try next
            return res.text();
          } catch { /* network error, try next */ }
        }
        return ''; // all endpoints failed
      };

      const [touristText, foodText] = await Promise.all([
        overpassFetch(touristQuery),
        overpassFetch(foodQuery),
      ]);

      const parseOverpass = (text) => {
        if (text.trimStart().startsWith('<')) return [];
        const data = JSON.parse(text);
        if (data.remark && !data.elements?.length) return [];
        return data.elements || [];
      };

      const allElements = [...parseOverpass(touristText), ...parseOverpass(foodText)];

      const elements = allElements;
      if (!elements.length) {
        throw new Error('El servicio de mapas está ocupado. Espera unos segundos y pulsa Actualizar.');
      }

      // Deduplicate by name, classify, cap at 120
      const seen = new Set();
      const result = [];
      for (const el of elements) {
        const name = el.tags?.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        result.push({
          id: el.id,
          name,
          category: classifyNode(el.tags),
          lat: el.lat,
          lon: el.lon,
          address: buildAddress(el.tags),
          website: el.tags?.website || el.tags?.['contact:website'] || null,
          openingHours: el.tags?.opening_hours || null,
        });
        if (result.length >= 120) break;
      }

      setPois(result);
    } catch (err) {
      console.error('RecommendationsTab error:', err);
      setError(err.message || 'Error al cargar recomendaciones');
    } finally {
      setLoading(false);
    }
  }, [trip.city, trip.country, trip.destination]);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  // ─── Add to Places ────────────────────────────────────────────────────────
  const handleAddToPlaces = (poi) => {
    const cat = CATEGORIES.find(c => c.id === poi.category);
    addPlace(trip.id, {
      name: poi.name,
      address: poi.address || '',
      lat: poi.lat,
      lng: poi.lon,
      tags: cat?.tag ? [cat.tag] : [],
      link: poi.website || '',
      description: '',
    });
    setAddedPlaces(prev => new Set([...prev, poi.id]));
  };

  // ─── Add to Itinerary ─────────────────────────────────────────────────────
  const handleAddToItinerary = (poi) => {
    if (!itinerary.length) return;
    if (itinerary.length === 1) {
      addActivity(trip.id, itinerary[0].id, { name: poi.name, place: poi.address || poi.name });
      setAddedItinerary(prev => new Set([...prev, poi.id]));
    } else {
      setDayPickerPoi(poi);
      setSelectedDay(itinerary[0].id);
    }
  };

  const confirmItinerary = () => {
    if (!dayPickerPoi || !selectedDay) return;
    addActivity(trip.id, selectedDay, {
      name: dayPickerPoi.name,
      place: dayPickerPoi.address || dayPickerPoi.name,
    });
    setAddedItinerary(prev => new Set([...prev, dayPickerPoi.id]));
    setDayPickerPoi(null);
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const counts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all'
      ? pois.length
      : pois.filter(p => p.category === cat.id).length;
    return acc;
  }, {});

  const filtered = activeCategory === 'all'
    ? pois
    : pois.filter(p => p.category === activeCategory);

  const locationLabel = trip.city ? `${trip.city}, ${trip.country}` : trip.destination;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3 style={{ marginBottom: 2 }}>Descubrir en {locationLabel}</h3>
          {!loading && pois.length > 0 && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              {pois.length} lugares encontrados vía OpenStreetMap
            </p>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchRecommendations}
          disabled={loading}
          title="Actualizar resultados">
          {loading
            ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={14} />}
          Actualizar
        </button>
      </div>

      {/* Category filter pills */}
      {pois.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CATEGORIES.filter(cat => counts[cat.id] > 0).map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: cat.id === 'all'
                    ? '1.5px solid var(--border)'
                    : `1.5px solid ${cat.color}`,
                  background: isActive
                    ? (cat.id === 'all' ? 'var(--primary)' : cat.color)
                    : (cat.id === 'all' ? 'transparent' : cat.bg),
                  color: isActive
                    ? '#fff'
                    : (cat.id === 'all' ? 'var(--text-secondary)' : cat.color),
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}>
                {cat.icon} {cat.label} ({counts[cat.id]})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
          <Compass size={40} style={{ opacity: 0.3, marginBottom: 16, animation: 'spin 2s linear infinite' }} />
          <p style={{ fontWeight: 500 }}>Buscando lugares en {locationLabel}…</p>
          <p style={{ fontSize: '0.82rem', marginTop: 6, opacity: 0.7 }}>
            Consultando OpenStreetMap
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>😕</div>
          <p style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchRecommendations}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      {/* Empty category */}
      {!loading && !error && filtered.length === 0 && pois.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📍</div>
          <p>No hay resultados en esta categoría</p>
        </div>
      )}

      {/* No results at all */}
      {!loading && !error && pois.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
          <p>No se encontraron lugares para <strong>{locationLabel}</strong></p>
          <p style={{ fontSize: '0.82rem', marginTop: 6 }}>
            Comprueba que el destino sea una ciudad conocida.
          </p>
        </div>
      )}

      {/* POI Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
          {filtered.map(poi => {
            const cat       = CATEGORIES.find(c => c.id === poi.category);
            const inPlaces  = addedPlaces.has(poi.id);
            const inItinerary = addedItinerary.has(poi.id);

            return (
              <div key={poi.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
                {/* Badge */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    padding: '2px 9px',
                    borderRadius: 12,
                    background: cat?.bg,
                    color: cat?.color,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {cat?.icon} {cat?.label}
                  </span>
                </div>

                {/* Name */}
                <h4 style={{ fontWeight: 600, fontSize: '0.93rem', marginBottom: 4, lineHeight: 1.3 }}>
                  {poi.name}
                </h4>

                {/* Address */}
                {poi.address && (
                  <p style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 4,
                    marginBottom: 4,
                  }}>
                    <MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                    {poi.address}
                  </p>
                )}

                {/* Opening hours */}
                {poi.openingHours && (
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    🕐 {poi.openingHours}
                  </p>
                )}

                {/* Website */}
                {poi.website && (
                  <a
                    href={poi.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 6, display: 'inline-block' }}>
                    🔗 Sitio web
                  </a>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleAddToPlaces(poi)}
                    disabled={inPlaces}
                    style={{
                      flex: 1,
                      background: inPlaces ? 'var(--success)' : 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.77rem',
                      opacity: inPlaces ? 0.85 : 1,
                    }}>
                    {inPlaces
                      ? <><Check size={12} /> Guardado</>
                      : <><Plus size={12} /> Lugares</>}
                  </button>

                  {itinerary.length > 0 && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleAddToItinerary(poi)}
                      disabled={inItinerary}
                      style={{ flex: 1, fontSize: '0.77rem' }}>
                      {inItinerary
                        ? <><Check size={12} /> En plan</>
                        : <>📅 Itinerario</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day picker modal */}
      {dayPickerPoi && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={e => e.target === e.currentTarget && setDayPickerPoi(null)}>
          <div className="card" style={{ padding: 24, width: 360, maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: 8 }}>Añadir al itinerario</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              <strong>{dayPickerPoi.name}</strong> — ¿En qué día?
            </p>
            <select
              className="form-input"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              style={{ marginBottom: 16 }}>
              {itinerary.map(day => (
                <option key={day.id} value={day.id}>
                  Día {day.dayNumber}
                  {day.date
                    ? ' — ' + new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })
                    : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDayPickerPoi(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmItinerary}>
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
