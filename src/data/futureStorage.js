/**
 * futureStorage.js — capa de persistencia para "Destinos Futuros"
 * Tabla: future_destinations  { id text PK, data jsonb, created_at timestamptz }
 */

import { supabase } from '../lib/supabase.js';

function toRow(dest) {
  return { id: dest.id, data: { ...dest, updatedAt: new Date().toISOString() } };
}
function fromRow(row) { return row.data; }

export async function getDestinations() {
  const { data, error } = await supabase
    .from('future_destinations')
    .select('data')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error al cargar destinos futuros:', error); return []; }
  return (data || []).map(fromRow);
}

export async function saveDestination(dest) {
  const { error } = await supabase
    .from('future_destinations')
    .upsert(toRow(dest));
  if (error) throw new Error(`Error al guardar destino: ${error.message}`);
  return getDestinations();
}

export async function deleteDestination(id) {
  const { error } = await supabase
    .from('future_destinations')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Error al eliminar destino: ${error.message}`);
  return getDestinations();
}
