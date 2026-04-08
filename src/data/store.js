import { create } from 'zustand';
import * as storage from './storage.js';
import { generateId } from '../utils/helpers.js';

const useTripStore = create((set, get) => ({
  trips: [],
  currentTrip: null,
  filters: { search: '', status: '', country: '' },
  saveStatus: 'idle', // idle | saving | saved

  // ── Indicador de guardado ────────────────────────────────────────────────
  // Recibe una Promise del storage, gestiona el estado de guardado y
  // actualiza `trips` cuando resuelve.
  _persist: async (storagePromise) => {
    set({ saveStatus: 'saving' });
    try {
      const trips = await storagePromise;
      set({ trips, saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 2000);
      return trips;
    } catch (e) {
      console.error('Error al guardar:', e);
      set({ saveStatus: 'idle' });
      throw e;
    }
  },

  // ── Load ─────────────────────────────────────────────────────────────────
  loadTrips: async () => {
    const trips = await storage.getTrips();
    set({ trips });
  },

  loadTrip: async (id) => {
    const trip = await storage.getTrip(id);
    set({ currentTrip: trip });
    return trip;
  },

  // ── Trip CRUD ─────────────────────────────────────────────────────────────
  addTrip: async (tripData) => {
    const trip = {
      ...tripData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      itinerary: tripData.itinerary || [],
      accommodations: tripData.accommodations || [],
      transports: tripData.transports || [],
      places: tripData.places || [],
      expenses: tripData.expenses || [],
      checklist: tripData.checklist || [],
      budgetEstimation: tripData.budgetEstimation || null,
    };
    await get()._persist(storage.saveTrip(trip));
    return trip;
  },

  updateTrip: async (id, updates) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip) return;
    const updated = { ...trip, ...updates, updatedAt: new Date().toISOString() };
    await get()._persist(storage.saveTrip(updated));
    if (get().currentTrip?.id === id) set({ currentTrip: updated });
  },

  deleteTrip: async (id) => {
    const trips = await storage.deleteTrip(id);
    set({
      trips,
      currentTrip: get().currentTrip?.id === id ? null : get().currentTrip,
    });
  },

  duplicateTrip: async (id) => {
    const original = get().trips.find(t => t.id === id);
    if (!original) return;

    const remap = (arr) => (arr || []).map(item => ({
      ...item,
      id: generateId(),
      ...(item.activities
        ? { activities: item.activities.map(a => ({ ...a, id: generateId() })) }
        : {}),
    }));

    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      destination: `${original.destination} (copia)`,
      status: 'idea',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itinerary: remap(original.itinerary),
      accommodations: remap(original.accommodations),
      transports: remap(original.transports),
      places: remap(original.places),
      expenses: remap(original.expenses),
      checklist: remap(original.checklist),
    };

    await get()._persist(storage.saveTrip(copy));
  },

  archiveTrip: async (id) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip) return;
    const updated = { ...trip, archived: !trip.archived, updatedAt: new Date().toISOString() };
    await get()._persist(storage.saveTrip(updated));
  },

  // ── Itinerary ─────────────────────────────────────────────────────────────
  addActivity: async (tripId, dayId, activity) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const newActivity = { ...activity, id: generateId() };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: [...day.activities, { ...newActivity, order: day.activities.length }] }
        : day
    );
    await get().updateTrip(tripId, { itinerary });
  },

  updateActivity: async (tripId, dayId, activityId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.map(a => a.id === activityId ? { ...a, ...updates } : a) }
        : day
    );
    await get().updateTrip(tripId, { itinerary });
  },

  deleteActivity: async (tripId, dayId, activityId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.filter(a => a.id !== activityId) }
        : day
    );
    await get().updateTrip(tripId, { itinerary });
  },

  toggleActivityComplete: async (tripId, dayId, activityId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.map(a => a.id === activityId ? { ...a, completed: !a.completed } : a) }
        : day
    );
    await get().updateTrip(tripId, { itinerary });
  },

  reorderActivities: async (tripId, dayId, reorderedActivities) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: reorderedActivities.map((a, i) => ({ ...a, order: i })) }
        : day
    );
    await get().updateTrip(tripId, { itinerary });
  },

  setItinerary: async (tripId, itinerary) => {
    await get().updateTrip(tripId, { itinerary });
  },

  // ── Accommodations ────────────────────────────────────────────────────────
  addAccommodation: async (tripId, accom) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      accommodations: [...trip.accommodations, { ...accom, id: generateId() }],
    });
  },

  updateAccommodation: async (tripId, accomId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      accommodations: trip.accommodations.map(a => a.id === accomId ? { ...a, ...updates } : a),
    });
  },

  deleteAccommodation: async (tripId, accomId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      accommodations: trip.accommodations.filter(a => a.id !== accomId),
    });
  },

  // ── Transports ────────────────────────────────────────────────────────────
  addTransport: async (tripId, transport) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      transports: [...trip.transports, { ...transport, id: generateId() }],
    });
  },

  updateTransport: async (tripId, transportId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (! trip) return;
    await get().updateTrip(tripId, {
      transports: trip.transports.map(t => t.id === transportId ? { ...t, ...updates } : t),
    });
  },

  deleteTransport: async (tripId, transportId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      transports: trip.transports.filter(t => t.id !== transportId),
    });
  },

  // ── Places ────────────────────────────────────────────────────────────
  addPlace: async (tripId, place) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      places: [...trip.places, { ...place, id: generateId() }],
    });
  },

  updatePlace: async (tripId, placeId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      places: trip.places.map(p => p.id === placeId ? { ...p, ...updates } : p),
    });
  },

  deletePlace: async (tripId, placeId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      places: trip.places.filter(p => p.id !== placeId),
    });
  },

  // ── Expenses ────────────────────────────────────────────────────────────
  addExpense: async (tripId, expense) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      expenses: [...trip.expenses, { ...expense, id: generateId() }],
    });
  },

  updateExpense: async (tripId, expenseId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      expenses: trip.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e),
    });
  },

  deleteExpense: async (tripId, expenseId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      expenses: trip.expenses.filter(e => e.id !== expenseId),
    });
  },

  // ── Checklist ────────────────────────────────────────────────────────────
  addChecklistItem: async (tripId, text, category = 'otros') => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      checklist: [...trip.checklist, { id: generateId(), text, category, checked: false }],
    });
  },

  addChecklistItems: async (tripId, items) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    const newItems = items.map(item => ({ id: generateId(), checked: false, ...item }));
    await get().updateTrip(tripId, {
      checklist: [...trip.checklist, ...newItems],
    });
  },

  toggleChecklistItem: async (tripId, itemId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      checklist: trip.checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c),
    });
  },

  updateChecklistItem: async (tripId, itemId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      checklist: trip.checklist.map(c => c.id === itemId ? { ...c, ...updates } : c),
    });
  },

  deleteChecklistItem: async (tripId, itemId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      checklist: trip.checklist.filter(c => c.id !== itemId),
    });
  },

  deleteCompletedChecklistItems: async (tripId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    await get().updateTrip(tripId, {
      checklist: trip.checklist.filter(c => !c.checked),
    });
  },

  clearChecklist: async (tripId) => {
    await get().updateTrip(tripId, { checklist: [] });
  },

  // ── Budget Estimation ──────────────────────────────────────────────────────
  saveBudgetEstimation: async (tripId, estimation) => {
    await get().updateTrip(tripId, { budgetEstimation: estimation });
  },

  // ── Filters ──────────────────────────────────────────────────────────────
  setFilters: (filters) => set({ filters }),

  // ── Import / Export ───────────────────────────────────────────────────────
  // Export lee del estado en memoria — no hace falta ir a Supabase
  exportData: () => ({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'TravelMind',
    trips: get().trips,
  }),

  exportTripData: (tripId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return null;
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      app: 'TravelMind',
      trips: [trip],
    };
  },

  importData: async (jsonData) => {
    const trips = await storage.importData(jsonData);
    set({ trips });
    return trips;
  },

  // ── Computed ─────────────────────────────────────────────────────────────
  getFilteredTrips: () => {
    const { trips, filters } = get();
    return trips.filter(t => {
      if (t.archived) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.country && t.country !== filters.country) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          t.destination?.toLowerCase().includes(q) ||
          t.country?.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },
}));

export default useTripStore;
