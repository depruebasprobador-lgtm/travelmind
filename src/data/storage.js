/**
 * storage.js — capa de persistencia con Supabase.
 *
 * Esquema de la tabla `trips`:
 *   id         text  PRIMARY KEY
 *   data       jsonb  (objeto completo del viaje)
 *   created_at timestamptz
 *
 * Todas las funciones son async; el store las llama con await.
 *
 * Política de seed:
 *   - En DESARROLLO (import.meta.env.DEV === true) y solo si nunca se sembró
 *     antes (flag en localStorage), si la tabla está vacía se inyectan los
 *     datos de ejemplo. Es para que el primer arranque no quede en blanco.
 *   - En PRODUCCIÓN nunca se siembra automáticamente. Si el usuario quiere
 *     datos de ejemplo, debe llamar a `seedDemoData()` explícitamente.
 *   - Una vez sembrado (o usado por el usuario), la flag impide reinjecciones
 *     accidentales. Si el usuario borra todos sus viajes, la lista queda
 *     vacía y NO se vuelve a sembrar.
 */

import { supabase } from '../lib/supabase.js';
import { getSeedData } from './seedData.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function tripToRow(trip) {
  return {
    id: trip.id,
    data: { ...trip, updatedAt: new Date().toISOString() },
  };
}

function rowToTrip(row) {
  return row.data;
}

const SEED_FLAG = 'travelmind:seeded';

function hasSeededBefore() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SEED_FLAG) === '1';
  } catch {
    return false;
  }
}

function markAsSeeded() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SEED_FLAG, '1');
  } catch { /* ignore */ }
}

function isDevEnv() {
  try {
    return Boolean(import.meta.env && import.meta.env.DEV);
  } catch {
    return false;
  }
}

// ── Consulta cruda (sin seed) ────────────────────────────────────────────────
// Lanza Error si la consulta falla. Nunca devuelve `[]` enmascarando un fallo.
async function fetchTripsRaw() {
  const { data, error } = await supabase
    .from('trips')
    .select('data')
    .order('created_at', { ascending: false });

  if (error) {
    // El llamador (store._persist o loadTrips) decide cómo reportarlo al usuario.
    throw new Error(`No se pudieron cargar los viajes: ${error.message}`);
  }
  return (data || []).map(rowToTrip);
}

async function saveTripRaw(trip) {
  const { error } = await supabase
    .from('trips')
    .upsert(tripToRow(trip));
  if (error) throw new Error(`Error al guardar viaje: ${error.message}`);
}

// ── Trips ────────────────────────────────────────────────────────────────────

export async function getTrips() {
  const trips = await fetchTripsRaw();

  // Seed automático sólo en desarrollo y sólo la PRIMERA vez.
  // Si la flag está marcada o estamos en producción, no sembramos: una BD
  // vacía es información válida ("el usuario no tiene viajes todavía"),
  // no debemos inyectar datos demo encima.
  if (trips.length === 0 && isDevEnv() && !hasSeededBefore()) {
    try {
      const seed = getSeedData();
      await Promise.all(seed.map(t => saveTripRaw(t)));
      markAsSeeded();
      return await fetchTripsRaw();
    } catch (e) {
      console.error('Seed automático de desarrollo falló:', e);
      // Si el seed falla, devolvemos la lista vacía real.
      return [];
    }
  }

  return trips;
}

export async function getTrip(id) {
  const { data, error } = await supabase
    .from('trips')
    .select('data')
    .eq('id', id)
    .single();

  if (error) return null;
  return data ? rowToTrip(data) : null;
}

export async function saveTrip(trip) {
  await saveTripRaw(trip);
  // Marcamos la flag para que ninguna ejecución posterior re-siembre,
  // incluso si el usuario borra todos sus viajes.
  markAsSeeded();
  return fetchTripsRaw();
}

export async function deleteTrip(id) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error al eliminar viaje: ${error.message}`);
  return fetchTripsRaw();
}

// ── Seed bajo demanda ────────────────────────────────────────────────────────
/**
 * Acción explícita: pobla la BD con viajes de ejemplo. Pensado para un
 * botón "Cargar viajes de ejemplo" cuando el usuario está en una BD vacía
 * y quiere ver la app con datos. Si ya hay viajes, NO sobreescribe.
 */
export async function seedDemoData() {
  const trips = await fetchTripsRaw();
  if (trips.length > 0) {
    throw new Error('Ya hay viajes guardados. No se siembra para evitar duplicados.');
  }
  const seed = getSeedData();
  await Promise.all(seed.map(t => saveTripRaw(t)));
  markAsSeeded();
  return fetchTripsRaw();
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function importData(jsonData) {
  if (!jsonData?.trips || !Array.isArray(jsonData.trips)) {
    throw new Error('Formato de datos inválido');
  }

  const existing = await fetchTripsRaw();
  const existingIds = new Set(existing.map(t => t.id));
  const newTrips = jsonData.trips.filter(t => !existingIds.has(t.id));

  if (newTrips.length > 0) {
    const { error } = await supabase
      .from('trips')
      .upsert(newTrips.map(tripToRow));

    if (error) throw new Error(`Error al importar viajes: ${error.message}`);
    markAsSeeded(); // si el usuario importa, también marcamos para no re-sembrar
  }

  return fetchTripsRaw();
}
