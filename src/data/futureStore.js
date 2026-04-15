import { create } from 'zustand';
import * as storage from './futureStorage.js';
import { generateId } from '../utils/helpers.js';

const useFutureStore = create((set, get) => ({
  destinations: [],
  saveStatus: 'idle',

  _persist: async (promise) => {
    set({ saveStatus: 'saving' });
    try {
      const destinations = await promise;
      set({ destinations, saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 2000);
      return destinations;
    } catch (e) {
      console.error(e);
      set({ saveStatus: 'idle' });
      throw e;
    }
  },

  // ── Load ──────────────────────────────────────────────────────────────────
  loadDestinations: async () => {
    const destinations = await storage.getDestinations();
    set({ destinations });
  },

  // ── CRUD ──────────────────────────────────────────────────────────────────
  addDestination: async (data) => {
    const dest = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: '',
      country: '',
      tripType: 'citytrip',
      priority: 'media',
      status: 'idea',
      notes: '',
      imageUrl: '',
      places: [],
      converted: false,
      ...data,
    };
    await get()._persist(storage.saveDestination(dest));
    return dest;
  },

  updateDestination: async (id, updates) => {
    const dest = get().destinations.find(d => d.id === id);
    if (!dest) return;
    const updated = { ...dest, ...updates, updatedAt: new Date().toISOString() };
    await get()._persist(storage.saveDestination(updated));
  },

  deleteDestination: async (id) => {
    await get()._persist(storage.deleteDestination(id));
  },

  // ── Places inside a destination ──────────────────────────────────────────
  addPlace: async (destId, place) => {
    const dest = get().destinations.find(d => d.id === destId);
    if (!dest) return;
    const newPlace = { ...place, id: generateId() };
    await get().updateDestination(destId, {
      places: [...(dest.places || []), newPlace],
    });
  },

  updatePlace: async (destId, placeId, updates) => {
    const dest = get().destinations.find(d => d.id === destId);
    if (!dest) return;
    await get().updateDestination(destId, {
      places: dest.places.map(p => p.id === placeId ? { ...p, ...updates } : p),
    });
  },

  deletePlace: async (destId, placeId) => {
    const dest = get().destinations.find(d => d.id === destId);
    if (!dest) return;
    await get().updateDestination(destId, {
      places: dest.places.filter(p => p.id !== placeId),
    });
  },

  // ── Quick Ideas (stored as destinations with status='rapida') ────────────
  addQuickIdea: async (name) => {
    return get().addDestination({ name, status: 'rapida', tripType: '', priority: 'media' });
  },
}));

export default useFutureStore;
