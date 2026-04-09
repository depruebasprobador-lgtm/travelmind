/**
 * storage.js — capa de persistencia con Supabase.
 *
 * Esquema de la tabla `trips`:
 *   id         text  PRIMARY KEY
 *   data       jsonb  (objeto completo del viaje)
 *   created_at timestamptz
 *
 * Todas las funciones son async; el store las llama con await.
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

// ── Trips ─────────────────────────────────────────────────────────────────────

export async function getTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('data')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar viajes:', error);
    return [];
  }

  // Primera vez — sembrar datos de ejemplo
  if (data.length === 0) {
    const seed = getSeedData();
    await Promise.all(seed.map(t => saveTrip(t)));
    return seed;
  }

  return data.map(rowToTrip);
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
  const { error } = await supabase
    .from('trips')
    .upsert(tripToRow(trip));

  if (error) throw new Error(`Error al guardar viaje: ${error.message}`);
  return getTrips();
}

export async function deleteTrip(id) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error al eliminar viaje: ${error.message}`);
  return getTrips();
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function importData(jsonData) {
  if (!jsonData?.trips || !Array.isArray(jsonData.trips)) {
    throw new Error('Formato de datos inválido');
  }

  const existing = await getTrips();
  const existingIds = new Set(existing.map(t => t.id));
  const newTrips = jsonData.trips.filter(t => !existingIds.has(t.id));

  if (newTrips.length > 0) {
    const { error } = await supabase
      .from('trips')
      .upsert(newTrips.map(tripToRow));

    if (error) throw new Error(`Error al importar viajes: ${error.message}`);
  }

  return getTrips();
}
