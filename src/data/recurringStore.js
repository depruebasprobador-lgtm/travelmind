import { create } from 'zustand';
import {
  fetchRecurringTrips,
  createRecurringTrip,
  updateRecurringTrip,
  deleteRecurringTrip,
} from './recurringStorage';

export const FREQUENCIES = [
  { value: 'weekly',    label: 'Semanal',    perYear: 52,       perMonth: 52 / 12 },
  { value: 'biweekly',  label: 'Quincenal',  perYear: 26,       perMonth: 26 / 12 },
  { value: 'monthly',   label: 'Mensual',    perYear: 12,       perMonth: 1 },
  { value: 'bimonthly', label: 'Bimestral',  perYear: 6,        perMonth: 0.5 },
  { value: 'quarterly', label: 'Trimestral', perYear: 4,        perMonth: 4 / 12 },
  { value: 'biannual',  label: 'Semestral',  perYear: 2,        perMonth: 2 / 12 },
  { value: 'yearly',    label: 'Anual',      perYear: 1,        perMonth: 1 / 12 },
];

export const BREAKDOWN_CATS = [
  { key: 'transport',      label: 'Transporte',    color: '#4F46E5' },
  { key: 'accommodation',  label: 'Alojamiento',   color: '#7C3AED' },
  { key: 'food',           label: 'Comida',        color: '#10B981' },
  { key: 'leisure',        label: 'Ocio',          color: '#F59E0B' },
  { key: 'other',          label: 'Otros',         color: '#6B7280' },
];

export const useRecurringStore = create((set, get) => ({
  trips: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const trips = await fetchRecurringTrips();
      set({ trips, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  addTrip: async (trip) => {
    const saved = await createRecurringTrip(trip);
    set((s) => ({ trips: [...s.trips, saved] }));
    return saved;
  },

  editTrip: async (id, updates) => {
    const saved = await updateRecurringTrip(id, updates);
    set((s) => ({ trips: s.trips.map((t) => (t.id === id ? saved : t)) }));
    return saved;
  },

  removeTrip: async (id) => {
    await deleteRecurringTrip(id);
    set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }));
  },

  addHistoryEntry: async (id, entry) => {
    const trip = get().trips.find((t) => t.id === id);
    if (!trip) return;
    const history = Array.isArray(trip.history) ? trip.history : [];
    const newHistory = [
      ...history,
      { id: crypto.randomUUID(), date: entry.date, cost: entry.cost, notes: entry.notes || '' },
    ];
    return get().editTrip(id, { history: newHistory });
  },

  removeHistoryEntry: async (tripId, entryId) => {
    const trip = get().trips.find((t) => t.id === tripId);
    if (!trip) return;
    const newHistory = (trip.history || []).filter((e) => e.id !== entryId);
    return get().editTrip(tripId, { history: newHistory });
  },
}));
