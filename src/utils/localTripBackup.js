/**
 * localTripBackup.js — "Last Good Snapshot" local (airbag, NO offline sync).
 *
 * Guarda en localStorage la última copia buena de la lista de viajes y de
 * viajes individuales, para que si Supabase falla o está pausado la app pueda
 * mostrar la última copia guardada en modo emergencia read-only.
 *
 * Reglas:
 *   - Sólo se debe llamar a las funciones de guardado cuando la carga remota
 *     haya ido BIEN (el store se encarga de eso).
 *   - No sobreescribimos un snapshot bueno (con datos) con un array vacío:
 *     evita que un fallo raro deje al usuario sin copia.
 *   - Todo va envuelto en try/catch: si localStorage falla (modo privado,
 *     cuota, etc.) se hace console.warn y la app SIGUE. Nunca se lanza.
 *   - No guardamos secretos: sólo el objeto Trip (que ya vive en el cliente).
 *   - Se eliminan los campos internos no persistentes (prefijo `__`).
 */

const LIST_KEY = 'travelmind:snapshot:trips';
const TRIP_PREFIX = 'travelmind:snapshot:trip:';
const SNAPSHOT_VERSION = 1;

// ── util interna ─────────────────────────────────────────────────────────────
function hasLS() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Quita campos internos no persistentes (p.ej. __isLocalSnapshot). */
function stripInternal(trip) {
  if (!trip || typeof trip !== 'object') return trip;
  const out = {};
  for (const k of Object.keys(trip)) {
    if (k.startsWith('__')) continue;
    out[k] = trip[k];
  }
  return out;
}

function readJSON(key) {
  if (!hasLS()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[TravelMind] snapshot corrupto o ilegible:', key, e);
    return null;
  }
}

function writeJSON(key, value) {
  if (!hasLS()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Cuota llena, modo privado, etc. No rompemos la app.
    console.warn('[TravelMind] no se pudo escribir snapshot local:', key, e);
    return false;
  }
}

// ── Lista de viajes ──────────────────────────────────────────────────────────

/**
 * Guarda la lista completa de viajes. Sólo llamar tras una carga remota OK.
 * Guarda defensivamente: si `trips` es vacío pero ya existe un snapshot con
 * datos, NO lo pisamos (protege contra sustos por respuestas raras).
 */
export function saveTripsSnapshot(trips) {
  if (!Array.isArray(trips)) return false;
  if (trips.length === 0) {
    const existing = getTripsSnapshot();
    if (existing && Array.isArray(existing.data) && existing.data.length > 0) {
      // No pisamos una copia buena con una vacía.
      return false;
    }
  }
  return writeJSON(LIST_KEY, {
    v: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    data: trips.map(stripInternal),
  });
}

/** Devuelve { v, savedAt, data } o null. */
export function getTripsSnapshot() {
  const snap = readJSON(LIST_KEY);
  if (!snap || !Array.isArray(snap.data)) return null;
  return snap;
}

// ── Viaje individual ─────────────────────────────────────────────────────────

/** Guarda un viaje concreto. Sólo llamar tras cargar/guardar remoto OK. */
export function saveTripSnapshot(trip) {
  if (!trip || !trip.id) return false;
  return writeJSON(TRIP_PREFIX + trip.id, {
    v: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    data: stripInternal(trip),
  });
}

/** Devuelve { v, savedAt, data } del viaje o null. */
export function getTripSnapshot(tripId) {
  if (!tripId) return null;
  const snap = readJSON(TRIP_PREFIX + tripId);
  if (!snap || !snap.data) return null;
  return snap;
}

/**
 * Devuelve el snapshot de viaje individual más reciente { v, savedAt, data }
 * o null. Útil como último recurso.
 */
export function getLatestTripSnapshot() {
  if (!hasLS()) return null;
  let best = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(TRIP_PREFIX)) continue;
      const snap = readJSON(key);
      if (snap && snap.data && (!best || (snap.savedAt || 0) > (best.savedAt || 0))) {
        best = snap;
      }
    }
  } catch (e) {
    console.warn('[TravelMind] error escaneando snapshots:', e);
  }
  return best;
}

/** Borra todos los snapshots (lista + individuales). */
export function clearTripSnapshots() {
  if (!hasLS()) return false;
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === LIST_KEY || (key && key.startsWith(TRIP_PREFIX))) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    return true;
  } catch (e) {
    console.warn('[TravelMind] no se pudieron borrar snapshots:', e);
    return false;
  }
}

/** ¿Hay alguna copia local (lista o individual)? */
export function hasAnySnapshot() {
  return !!getTripsSnapshot() || !!getLatestTripSnapshot();
}

/**
 * Etiqueta legible de antigüedad a partir de un timestamp en ms.
 *   "hace un momento" · "hace 5 min" · "hace 3 h" · "hace 2 días" · fecha corta
 */
export function getSnapshotAgeLabel(timestamp) {
  if (!timestamp || typeof timestamp !== 'number') return '';
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'hace un momento';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days !== 1 ? 's' : ''}`;
  try {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}
