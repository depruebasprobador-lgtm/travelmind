import { supabase } from './supabaseClient';

const TABLE = 'recurring_trips';

export async function fetchRecurringTrips() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createRecurringTrip(trip) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ ...trip, user_id: 'default' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringTrip(id, updates) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecurringTrip(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
