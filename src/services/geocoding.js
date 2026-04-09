const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

let lastRequestTime = 0;

// Fix: accept an optional AbortSignal so both search and reverse-geocode go
// through a single rate-limited helper — no more duplicated throttle logic.
async function rateLimitedFetch(url, signal) {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestTime));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'es', 'User-Agent': 'TravelMind/1.0' },
  });
  if (!res.ok) throw new Error('Error en geocodificación');
  return res.json();
}

export async function searchPlaces(query, signal) {
  if (!query || query.length < 3) return [];
  const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

  // Fix: use the shared rateLimitedFetch (with signal) — no more duplicated throttle logic
  const data = await rateLimitedFetch(url, signal);

  return data.map(item => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
    country: item.address?.country || '',
    city: item.address?.city || item.address?.town || item.address?.village || '',
  }));
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const data = await rateLimitedFetch(url);

  return {
    displayName: data.display_name || '',
    country: data.address?.country || '',
    city: data.address?.city || data.address?.town || data.address?.village || '',
    road: data.address?.road || '',
  };
}
