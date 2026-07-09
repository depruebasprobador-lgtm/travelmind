import { create } from 'zustand';
import * as storage from './storage.js';
import * as backup from '../utils/localTripBackup.js';
import {
  generateId,
  syncDaysWithDates,
  generateDays,
  normalizeItinerary,
  getItineraryBounds,
  addDaysISO,
  compareISODates,
} from '../utils/helpers.js';

// Mensajes user-friendly por operación. La clave es el código que cada
// acción pasa a `_persist`; si no se reconoce, se usa `default`.
const ERROR_MESSAGES = {
  default:           'No se pudo guardar el cambio. Inténtalo de nuevo.',
  addTrip:           'No se pudo crear el viaje. Inténtalo de nuevo.',
  updateTrip:        'No se pudo guardar el cambio del viaje.',
  deleteTrip:        'No se pudo eliminar el viaje.',
  duplicateTrip:     'No se pudo duplicar el viaje.',
  archiveTrip:       'No se pudo archivar el viaje.',
  itinerary:         'No se pudo actualizar el itinerario.',
  activity:          'No se pudo guardar la actividad.',
  day:               'No se pudo actualizar el día.',
  removeDay:         'No se pudo eliminar el día.',
  addDayBefore:      'No se pudo añadir el día anterior.',
  addDayAfter:       'No se pudo añadir el día posterior.',
  accommodation:     'No se pudo guardar el alojamiento.',
  transport:         'No se pudo guardar el transporte.',
  place:             'No se pudo guardar el lugar.',
  expense:           'No se pudo guardar el gasto.',
  participant:       'No se pudo guardar el participante.',
  checklist:         'No se pudo guardar la checklist.',
  budgetEstimation:  'No se pudo guardar la estimación de presupuesto.',
  keyInfo:           'No se pudieron guardar los datos clave.',
  importData:        'No se pudo importar los datos.',
  loadTrips:         'No se pudieron cargar los viajes. Revisa tu conexión e inténtalo de nuevo.',
};

const useTripStore = create((set, get) => ({
  trips: [],
  currentTrip: null,
  filters: { search: '', status: '', country: '' },
  saveStatus: 'idle', // idle | saving | saved | error
  saveError: null,    // { id, message, operation } cuando falla la persistencia
  loadState: 'idle',  // idle | loading | loaded | error | snapshot
  usingSnapshot: false, // true cuando se muestra la última copia local (modo emergencia)

  /**
   * Pisa el toast de error actual (o lo ignora si ya no aplica). El
   * StoreErrorBridge llama a esto tras emitir el toast para que no se
   * vuelva a emitir si el componente se desmonta y remonta. Programa
   * además el retorno a `idle` del indicador tras 4s, salvo que se
   * haya iniciado otro save mientras tanto.
   */
  ackSaveError: () => {
    if (get().saveError) set({ saveError: null });
    setTimeout(() => {
      if (get().saveStatus === 'error') set({ saveStatus: 'idle' });
    }, 4000);
  },

  // ── Indicador de guardado ────────────────────────────────────────────────
  // Recibe una Promise del storage, gestiona el estado de guardado y
  // actualiza `trips` cuando resuelve.
  //
  // En vez de re-lanzar el error (que provocaba "unhandled promise rejection"
  // en callers que no lo esperan), capturamos el fallo en estado: setea
  // `saveStatus: 'error'` + `saveError`. El bridge React lo escucha y
  // emite el toast. La acción que llamó recibe `{ ok: false }` y puede
  // decidir si abortar el resto del flujo.
  _persist: async (storagePromise, options = {}) => {
    const operation = options.operation || 'default';
    set({ saveStatus: 'saving' });
    try {
      const trips = await storagePromise;
      set({ trips, saveStatus: 'saved', saveError: null });
      setTimeout(() => {
        // Sólo bajamos a idle si nadie ha empezado otro save mientras tanto
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 2000);
      return { ok: true, trips };
    } catch (e) {
      console.error(`[TravelMind] Persistencia fallida (${operation}):`, e);
      const errorObj = {
        id: Date.now() + Math.random(),
        message: ERROR_MESSAGES[operation] || ERROR_MESSAGES.default,
        operation,
      };
      set({ saveStatus: 'error', saveError: errorObj });
      // No volvemos a 'idle' automáticamente: el bridge lo limpia al emitir.
      return { ok: false, error: e };
    }
  },

  // ── Load ─────────────────────────────────────────────────────────────────
  // Si la consulta a Supabase falla, exponemos el fallo vía `saveError` para
  // que el StoreErrorBridge emita un toast user-friendly. No re-lanzamos.
  // Si todo va bien, actualizamos `trips`. Si la BD está vacía, dejamos
  // `trips: []` (estado legítimo, no es un error).
  loadTrips: async () => {
    set({ loadState: 'loading' });
    try {
      const trips = await storage.getTrips();
      set({ trips, loadState: 'loaded', usingSnapshot: false });
      // Copia local buena: sólo tras carga remota OK.
      backup.saveTripsSnapshot(trips);
      return { ok: true, trips };
    } catch (e) {
      console.error('[TravelMind] loadTrips falló:', e);
      const errorObj = {
        id: Date.now() + Math.random(),
        message: ERROR_MESSAGES.loadTrips,
        operation: 'loadTrips',
      };
      // No tocamos `trips`: lo que hubiera en memoria se conserva.
      set({ saveError: errorObj, loadState: 'error' });
      return { ok: false, error: e };
    }
  },

  // ── Snapshot local (modo emergencia read-only) ───────────────────────────
  // Carga la última copia buena de localStorage cuando la carga remota falla.
  // Marca cada viaje con banderas internas NO persistentes.
  openLocalSnapshot: () => {
    const snap = backup.getTripsSnapshot();
    if (!snap || !Array.isArray(snap.data) || snap.data.length === 0) {
      return { ok: false };
    }
    const marked = snap.data.map(t => ({
      ...t, __isLocalSnapshot: true, __snapshotSavedAt: snap.savedAt,
    }));
    set({ trips: marked, loadState: 'snapshot', usingSnapshot: true });
    return { ok: true, count: marked.length, savedAt: snap.savedAt };
  },

  // Asegura que el viaje `id` esté disponible desde copia local (individual o
  // desde la lista). Para entrar directo a /trip/:id con Supabase caído.
  openLocalTripSnapshot: (id) => {
    let data = null, savedAt = null;
    const indiv = backup.getTripSnapshot(id);
    if (indiv) { data = indiv.data; savedAt = indiv.savedAt; }
    else {
      const list = backup.getTripsSnapshot();
      const found = list?.data?.find(t => t.id === id);
      if (found) { data = found; savedAt = list.savedAt; }
    }
    if (!data) return { ok: false };
    const marked = { ...data, __isLocalSnapshot: true, __snapshotSavedAt: savedAt };
    const others = get().trips.filter(t => t.id !== id);
    set({
      trips: [marked, ...others],
      currentTrip: marked,
      loadState: 'snapshot',
      usingSnapshot: true,
    });
    return { ok: true, savedAt };
  },

  loadTrip: async (id) => {
    try {
      const trip = await storage.getTrip(id);
      set({ currentTrip: trip });
      // Copia local del viaje individual: sólo tras carga remota OK.
      if (trip) backup.saveTripSnapshot(trip);
      return trip;
    } catch (e) {
      console.error('[TravelMind] loadTrip falló:', e);
      const errorObj = {
        id: Date.now() + Math.random(),
        message: ERROR_MESSAGES.loadTrips,
        operation: 'loadTrips',
      };
      set({ saveError: errorObj });
      return null;
    }
  },

  // ── Trip CRUD ─────────────────────────────────────────────────────────────
  addTrip: async (tripData) => {
    // Si vienen fechas y NO viene un itinerary explícito, lo generamos
    // ya sincronizado para no depender de hidratación lazy en el detalle.
    const baseItinerary = Array.isArray(tripData.itinerary) ? tripData.itinerary : [];
    const itinerary = (tripData.startDate && tripData.endDate && baseItinerary.length === 0)
      ? generateDays(tripData.startDate, tripData.endDate)
      : normalizeItinerary(baseItinerary);

    const trip = {
      ...tripData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      itinerary,
      accommodations: tripData.accommodations || [],
      transports: tripData.transports || [],
      places: tripData.places || [],
      expenses: tripData.expenses || [],
      participants: tripData.participants || [],
      checklist: tripData.checklist || [],
      budgetEstimation: tripData.budgetEstimation || null,
    };
    const r = await get()._persist(storage.saveTrip(trip), { operation: 'addTrip' });
    if (!r.ok) return null;
    return trip;
  },

  /**
   * Setter genérico. Si los `updates` modifican `startDate` o `endDate`
   * y NO se pasa un `itinerary` explícito, el array de días se sincroniza
   * atómicamente para que la fuente de verdad (fechas) y el derivado
   * (itinerary) nunca queden desincronizados.
   *
   * Si la sincronización dejaría fuera días con actividades:
   *   - sin opciones.force → aborta y devuelve { ok: false, removed }
   *   - opciones.force === true → aplica el cambio descartando esos días
   *
   * Devuelve siempre { ok, removed? } para que el caller pueda actuar
   * sobre la confirmación si la necesita.
   */
  updateTrip: async (id, updates, options = {}) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip) return { ok: false };

    const finalUpdates = { ...updates };
    const datesChanged = (
      (updates.startDate !== undefined && updates.startDate !== trip.startDate) ||
      (updates.endDate !== undefined && updates.endDate !== trip.endDate)
    );

    // Sólo sincronizamos si el caller NO pasó un itinerary explícito.
    if (datesChanged && updates.itinerary === undefined) {
      const start = updates.startDate ?? trip.startDate;
      const end = updates.endDate ?? trip.endDate;
      if (start && end && compareISODates(end, start) >= 0) {
        const { days, removedWithActivities } = syncDaysWithDates(
          trip.itinerary || [], start, end,
        );
        if (removedWithActivities.length > 0 && !options.force) {
          return { ok: false, removed: removedWithActivities, pendingDays: days };
        }
        finalUpdates.itinerary = days;
      } else if (!start || !end) {
        // Sin rango completo no podemos sincronizar — dejamos el array como está.
      }
    } else if (updates.itinerary !== undefined) {
      // Si pasan itinerary explícito, lo normalizamos siempre.
      finalUpdates.itinerary = normalizeItinerary(updates.itinerary);
    }

    const merged = { ...trip, ...finalUpdates, updatedAt: new Date().toISOString() };
    // Nunca persistimos banderas internas (p.ej. __isLocalSnapshot) en el JSONB.
    const updated = {};
    for (const k of Object.keys(merged)) {
      if (!k.startsWith('__')) updated[k] = merged[k];
    }
    const r = await get()._persist(
      storage.saveTrip(updated),
      { operation: options.operation || 'updateTrip' },
    );
    if (!r.ok) return { ok: false, error: true };
    if (get().currentTrip?.id === id) set({ currentTrip: updated });
    return { ok: true };
  },

  /**
   * Previsualiza el resultado de cambiar las fechas SIN persistir nada.
   * Útil para que TripForm pueda mostrar un diálogo de confirmación
   * antes de borrar días con actividades.
   */
  previewDateChange: (id, startDate, endDate) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip) return { days: [], removed: [] };
    const { days, removedWithActivities } = syncDaysWithDates(
      trip.itinerary || [], startDate, endDate,
    );
    return { days, removed: removedWithActivities };
  },

  deleteTrip: async (id) => {
    const r = await get()._persist(storage.deleteTrip(id), { operation: 'deleteTrip' });
    if (!r.ok) return { ok: false };
    set({
      currentTrip: get().currentTrip?.id === id ? null : get().currentTrip,
    });
    return { ok: true };
  },

  duplicateTrip: async (id) => {
    const original = get().trips.find(t => t.id === id);
    if (!original) return { ok: false };

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

    const r = await get()._persist(storage.saveTrip(copy), { operation: 'duplicateTrip' });
    return r.ok ? { ok: true } : { ok: false };
  },

  archiveTrip: async (id) => {
    const trip = get().trips.find(t => t.id === id);
    if (!trip) return { ok: false };
    const updated = { ...trip, archived: !trip.archived, updatedAt: new Date().toISOString() };
    const r = await get()._persist(storage.saveTrip(updated), { operation: 'archiveTrip' });
    return r.ok ? { ok: true } : { ok: false };
  },

  // ── Itinerary ─────────────────────────────────────────────────────────────
  addActivity: async (tripId, dayId, activity) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const newActivity = { ...activity, id: generateId() };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: [...day.activities, { ...newActivity, order: day.activities.length }] }
        : day
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  updateActivity: async (tripId, dayId, activityId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.map(a => a.id === activityId ? { ...a, ...updates } : a) }
        : day
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  deleteActivity: async (tripId, dayId, activityId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.filter(a => a.id !== activityId) }
        : day
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  toggleActivityComplete: async (tripId, dayId, activityId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.map(a => a.id === activityId ? { ...a, completed: !a.completed } : a) }
        : day
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  duplicateActivity: async (tripId, dayId, activityId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const day = trip.itinerary.find(d => d.id === dayId);
    if (!day) return { ok: false };
    const original = day.activities.find(a => a.id === activityId);
    if (!original) return { ok: false };
    const clone = {
      ...original,
      id: generateId(),
      completed: false,
      order: day.activities.length,
    };
    const itinerary = trip.itinerary.map(d =>
      d.id === dayId ? { ...d, activities: [...d.activities, clone] } : d
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  duplicateDay: async (tripId, dayId, targetDate) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const source = trip.itinerary.find(d => d.id === dayId);
    if (!source) return { ok: false };
    const targetDay = trip.itinerary.find(d => d.date === targetDate);
    if (!targetDay) return { ok: false };
    const cloned = (source.activities || []).map((a, i) => ({
      ...a,
      id: generateId(),
      completed: false,
      order: (targetDay.activities?.length || 0) + i,
    }));
    const itinerary = trip.itinerary.map(d =>
      d.id === targetDay.id ? { ...d, activities: [...(d.activities || []), ...cloned] } : d
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'day' });
  },

  reorderActivities: async (tripId, dayId, reorderedActivities) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const itinerary = trip.itinerary.map(day =>
      day.id === dayId
        ? { ...day, activities: reorderedActivities.map((a, i) => ({ ...a, order: i })) }
        : day
    );
    return get().updateTrip(tripId, { itinerary }, { operation: 'activity' });
  },

  setItinerary: async (tripId, itinerary) => {
    return get().updateTrip(tripId, { itinerary }, { operation: 'itinerary' });
  },

  /**
   * Añade un día ANTES del primer día del viaje. Extiende `startDate` -1.
   * Atómico: actualiza startDate, mete el nuevo día y renumera.
   */
  addDayBefore: async (tripId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const bounds = getItineraryBounds(trip.itinerary);
    const startRef = bounds.start || trip.startDate;
    if (!startRef) return { ok: false };
    const newStart = addDaysISO(startRef, -1);
    const end = trip.endDate || bounds.end || newStart;
    // Forzamos la sincronización pasando itinerary explícito (no perdemos nada)
    const { days } = syncDaysWithDates(trip.itinerary || [], newStart, end);
    return get().updateTrip(
      tripId,
      { startDate: newStart, endDate: end, itinerary: days },
      { operation: 'addDayBefore' },
    );
  },

  /**
   * Añade un día DESPUÉS del último día del viaje. Extiende `endDate` +1.
   */
  addDayAfter: async (tripId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const bounds = getItineraryBounds(trip.itinerary);
    const endRef = bounds.end || trip.endDate;
    if (!endRef) return { ok: false };
    const newEnd = addDaysISO(endRef, 1);
    const start = trip.startDate || bounds.start || newEnd;
    const { days } = syncDaysWithDates(trip.itinerary || [], start, newEnd);
    return get().updateTrip(
      tripId,
      { startDate: start, endDate: newEnd, itinerary: days },
      { operation: 'addDayAfter' },
    );
  },

  /**
   * Elimina un día del itinerario. Si era el primero o el último, ajusta
   * startDate/endDate al nuevo extremo. Si era intermedio, deja un "hueco":
   * el itinerario se reconstruye desde el rango actual para que no falten
   * fechas, pero el día concreto pierde sus actividades (por eso pedimos
   * confirmación en la UI antes de llegar aquí).
   */
  removeDay: async (tripId, dayId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const itin = trip.itinerary || [];
    const target = itin.find(d => d.id === dayId);
    if (!target) return { ok: false };

    const remaining = itin.filter(d => d.id !== dayId);
    if (remaining.length === 0) {
      return get().updateTrip(
        tripId,
        { itinerary: [], startDate: '', endDate: '' },
        { operation: 'removeDay' },
      );
    }

    const bounds = getItineraryBounds(remaining);
    const isExtreme = target.date === bounds.start || target.date === bounds.end ||
                      target.date < bounds.start || target.date > bounds.end;

    if (isExtreme) {
      // Recortar el rango al nuevo extremo
      return get().updateTrip(
        tripId,
        {
          itinerary: normalizeItinerary(remaining),
          startDate: bounds.start,
          endDate: bounds.end,
        },
        { operation: 'removeDay' },
      );
    } else {
      // Día intermedio: re-sincronizamos para que el rango actual del viaje
      // siga teniendo todos sus días (creando uno vacío en el hueco).
      const { days } = syncDaysWithDates(remaining, trip.startDate, trip.endDate);
      return get().updateTrip(tripId, { itinerary: days }, { operation: 'removeDay' });
    }
  },

  // ── Accommodations ────────────────────────────────────────────────────────
  addAccommodation: async (tripId, accom) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      accommodations: [...trip.accommodations, { ...accom, id: generateId() }],
    }, { operation: 'accommodation' });
  },

  updateAccommodation: async (tripId, accomId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      accommodations: trip.accommodations.map(a => a.id === accomId ? { ...a, ...updates } : a),
    }, { operation: 'accommodation' });
  },

  deleteAccommodation: async (tripId, accomId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      accommodations: trip.accommodations.filter(a => a.id !== accomId),
    }, { operation: 'accommodation' });
  },

  // ── Transports ────────────────────────────────────────────────────────────
  addTransport: async (tripId, transport) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      transports: [...trip.transports, { ...transport, id: generateId() }],
    }, { operation: 'transport' });
  },

  updateTransport: async (tripId, transportId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      transports: trip.transports.map(t => t.id === transportId ? { ...t, ...updates } : t),
    }, { operation: 'transport' });
  },

  deleteTransport: async (tripId, transportId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      transports: trip.transports.filter(t => t.id !== transportId),
    }, { operation: 'transport' });
  },

  // ── Places ────────────────────────────────────────────────────────────────
  addPlace: async (tripId, place) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      places: [...trip.places, { ...place, id: generateId() }],
    }, { operation: 'place' });
  },

  updatePlace: async (tripId, placeId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      places: trip.places.map(p => p.id === placeId ? { ...p, ...updates } : p),
    }, { operation: 'place' });
  },

  deletePlace: async (tripId, placeId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      places: trip.places.filter(p => p.id !== placeId),
    }, { operation: 'place' });
  },

  // ── Participants (gastos compartidos) ────────────────────────────────────
  // Single-user app: los participantes son nombres que el dueño del viaje
  // define manualmente. Persistidos como trip.participants en el JSONB.
  addParticipant: async (tripId, name, color) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const participants = trip.participants || [];
    const newP = {
      id: generateId(),
      name: (name || '').trim() || 'Sin nombre',
      color: color || '#6366F1',
      createdAt: new Date().toISOString(),
    };
    const r = await get().updateTrip(
      tripId,
      { participants: [...participants, newP] },
      { operation: 'participant' },
    );
    if (!r?.ok) return { ok: false };
    return { ok: true, participant: newP };
  },

  updateParticipant: async (tripId, participantId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      participants: (trip.participants || []).map(p =>
        p.id === participantId ? { ...p, ...updates } : p,
      ),
    }, { operation: 'participant' });
  },

  deleteParticipant: async (tripId, participantId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    // Quitarlo de participants y limpiar referencias en expenses
    const participants = (trip.participants || []).filter(p => p.id !== participantId);
    const expenses = (trip.expenses || []).map(e => {
      if (e.paidBy !== participantId && !(e.splitBetween || []).includes(participantId)) return e;
      const next = { ...e };
      if (next.paidBy === participantId) next.paidBy = null;
      if (Array.isArray(next.splitBetween)) {
        next.splitBetween = next.splitBetween.filter(id => id !== participantId);
      }
      if (next.splits && participantId in next.splits) {
        const { [participantId]: _omit, ...rest } = next.splits;
        next.splits = rest;
      }
      return next;
    });
    return get().updateTrip(tripId, { participants, expenses }, { operation: 'participant' });
  },

  // ── Expenses ─────────────────────────────────────────────────────────────
  addExpense: async (tripId, expense) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      expenses: [...trip.expenses, { ...expense, id: generateId() }],
    }, { operation: 'expense' });
  },

  updateExpense: async (tripId, expenseId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      expenses: trip.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e),
    }, { operation: 'expense' });
  },

  deleteExpense: async (tripId, expenseId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      expenses: trip.expenses.filter(e => e.id !== expenseId),
    }, { operation: 'expense' });
  },

  // ── Checklist ────────────────────────────────────────────────────────────
  addChecklistItem: async (tripId, text, category = 'otros') => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      checklist: [...trip.checklist, { id: generateId(), text, category, checked: false }],
    }, { operation: 'checklist' });
  },

  addChecklistItems: async (tripId, items) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    const newItems = items.map(item => ({ id: generateId(), checked: false, ...item }));
    return get().updateTrip(tripId, {
      checklist: [...trip.checklist, ...newItems],
    }, { operation: 'checklist' });
  },

  toggleChecklistItem: async (tripId, itemId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      checklist: trip.checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c),
    }, { operation: 'checklist' });
  },

  updateChecklistItem: async (tripId, itemId, updates) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      checklist: trip.checklist.map(c => c.id === itemId ? { ...c, ...updates } : c),
    }, { operation: 'checklist' });
  },

  deleteChecklistItem: async (tripId, itemId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      checklist: trip.checklist.filter(c => c.id !== itemId),
    }, { operation: 'checklist' });
  },

  deleteCompletedChecklistItems: async (tripId) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return { ok: false };
    return get().updateTrip(tripId, {
      checklist: trip.checklist.filter(c => !c.checked),
    }, { operation: 'checklist' });
  },

  clearChecklist: async (tripId) => {
    return get().updateTrip(tripId, { checklist: [] }, { operation: 'checklist' });
  },

  // ── Budget Estimation ─────────────────────────────────────────────────────
  saveBudgetEstimation: async (tripId, estimation) => {
    return get().updateTrip(tripId, { budgetEstimation: estimation }, { operation: 'budgetEstimation' });
  },

  // ── Datos clave del viaje (payload JSONB existente, sin tabla nueva) ──────
  saveKeyInfo: async (tripId, keyInfo) => {
    return get().updateTrip(tripId, { keyInfo }, { operation: 'keyInfo' });
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
      app: 'TravelMind',
      trips: [trip],
    };
  },

  importData: async (jsonData) => {
    const r = await get()._persist(storage.importData(jsonData), { operation: 'importData' });
    return r.ok ? r.trips : null;
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
