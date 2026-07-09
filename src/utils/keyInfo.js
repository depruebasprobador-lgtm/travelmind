/**
 * keyInfo.js — "Datos clave" del viaje. Helpers puros, sin store ni red.
 *
 * Se guarda dentro del payload JSONB existente del trip (`trip.keyInfo`),
 * sin tabla nueva. Pensado como referencia rápida y útil en el viaje:
 * alojamiento, transportes, recinto/evento, contactos y enlaces de mapas.
 */

export const EMPTY_KEY_INFO = {
  accommodationName: '',
  accommodationAddress: '',
  checkIn: '',      // YYYY-MM-DD
  checkOut: '',     // YYYY-MM-DD
  transportOut: '',
  transportBack: '',
  venue: '',
  doorsTime: '',    // HH:MM
  eventTime: '',    // HH:MM
  mapAccommodation: '',
  mapVenue: '',
  emergencyContact: '',
  notes: '',
};

/** Devuelve el keyInfo del trip con todos los campos garantizados. */
export function getKeyInfo(trip) {
  return { ...EMPTY_KEY_INFO, ...(trip?.keyInfo || {}) };
}

function normalizeUrl(u) {
  const s = (u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

/** URL de Google Maps para el alojamiento (link explícito o búsqueda por texto). */
export function accommodationMapsUrl(keyInfo) {
  const k = keyInfo || EMPTY_KEY_INFO;
  if (k.mapAccommodation) return normalizeUrl(k.mapAccommodation);
  const q = k.accommodationAddress || k.accommodationName;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

/** URL de Google Maps para el recinto/evento. */
export function venueMapsUrl(keyInfo) {
  const k = keyInfo || EMPTY_KEY_INFO;
  if (k.mapVenue) return normalizeUrl(k.mapVenue);
  const q = k.venue;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

/** ¿El trip tiene algún dato clave rellenado? */
export function hasAnyKeyInfo(trip) {
  const k = getKeyInfo(trip);
  return Object.values(k).some(v => String(v || '').trim() !== '');
}

/**
 * ¿Faltan datos clave importantes para salir de viaje?
 * Consideramos esenciales: cómo volver al alojamiento y el transporte de vuelta.
 */
export function keyInfoMissingEssentials(trip) {
  const k = getKeyInfo(trip);
  const hasAccom = !!(k.accommodationName || k.accommodationAddress || k.mapAccommodation);
  const hasBack = !!k.transportBack;
  return !hasAccom || !hasBack;
}
