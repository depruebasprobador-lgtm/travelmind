/**
 * templates.js — Plantillas de viaje 100% frontend (sin tabla nueva en Supabase).
 *
 * Una plantilla sugiere:
 *   - checklist: items {text, category} con las categorías EXISTENTES del
 *     ChecklistTab (documentacion, equipaje, reservas, salud, tecnologia, otros).
 *   - dayPlan: actividades sugeridas agrupadas por "rol" de día:
 *       · arrival   → primer día del viaje
 *       · event     → día señalado (p.ej. el concierto); seleccionable
 *       · departure → último día del viaje
 *
 * Filosofía: sugerir una BASE flexible, NO llenar el viaje de actividades
 * rígidas. Por eso las actividades no llevan hora fija (el usuario la pone) y
 * la fusión es SIEMPRE aditiva y con deduplicación por título/día.
 *
 * `computeTemplateApplication` es PURA: no toca el store ni persiste. Devuelve
 * exactamente lo que habría que añadir para que el componente decida.
 */

import { generateId, normalizeItinerary } from './helpers.js';

// ── Definición de plantillas ────────────────────────────────────────────────
// Cada actividad: { name, type }. El `type` mapea a ACTIVITY_TYPES (constants).
// No fijamos `time` para mantener el plan flexible.

export const TRIP_TEMPLATES = [
  {
    id: 'concierto',
    name: 'Concierto / evento',
    emoji: '🎵',
    description: 'Escapada corta para un concierto o evento con puertas, recinto y margen de vuelta.',
    // Este template pide elegir qué día es el evento.
    hasEventDay: true,
    checklist: [
      { text: 'Entradas confirmadas',                 category: 'reservas' },
      { text: 'Transporte de ida',                    category: 'reservas' },
      { text: 'Transporte de vuelta',                 category: 'reservas' },
      { text: 'Alojamiento confirmado',               category: 'reservas' },
      { text: 'Horario de apertura de puertas',       category: 'otros' },
      { text: 'Cómo llegar al recinto',               category: 'otros' },
      { text: 'Cena antes o después del concierto',   category: 'otros' },
      { text: 'Documentación (DNI / pasaporte)',      category: 'documentacion' },
      { text: 'Tarjeta sanitaria / seguro si aplica', category: 'salud' },
      { text: 'Margen de vuelta al alojamiento',      category: 'otros' },
    ],
    dayPlan: {
      arrival: [
        { name: 'Llegada',            type: 'transport' },
        { name: 'Check-in',           type: 'rest' },
        { name: 'Paseo libre / cena', type: 'activity' },
      ],
      event: [
        { name: 'Mañana libre',            type: 'activity' },
        { name: 'Comida cerca',            type: 'lunch' },
        { name: 'Ir al recinto con margen', type: 'transport' },
        { name: 'Concierto',              type: 'activity' },
        { name: 'Vuelta al alojamiento',  type: 'transport' },
      ],
      departure: [
        { name: 'Check-out',     type: 'rest' },
        { name: 'Último paseo',  type: 'activity' },
        { name: 'Vuelta',        type: 'transport' },
      ],
    },
  },

  {
    id: 'finde',
    name: 'Escapada de fin de semana',
    emoji: '🧳',
    description: 'Base ligera para dos o tres días fuera sin complicarte.',
    hasEventDay: false,
    checklist: [
      { text: 'Documentación (DNI / pasaporte)', category: 'documentacion' },
      { text: 'Alojamiento confirmado',          category: 'reservas' },
      { text: 'Ropa para 2-3 días',              category: 'equipaje' },
      { text: 'Neceser e higiene',               category: 'equipaje' },
      { text: 'Cargador de móvil',               category: 'tecnologia' },
      { text: 'Efectivo / tarjeta',              category: 'otros' },
    ],
    dayPlan: {
      arrival: [
        { name: 'Llegada',  type: 'transport' },
        { name: 'Check-in', type: 'rest' },
      ],
      departure: [
        { name: 'Check-out', type: 'rest' },
        { name: 'Vuelta',    type: 'transport' },
      ],
    },
  },

  {
    id: 'pareja',
    name: 'Viaje en pareja',
    emoji: '💗',
    description: 'Escapada a dos con un detalle y una cena especial.',
    hasEventDay: false,
    checklist: [
      { text: 'Documentación (DNI / pasaporte)', category: 'documentacion' },
      { text: 'Alojamiento confirmado',          category: 'reservas' },
      { text: 'Cena especial reservada',         category: 'reservas' },
      { text: 'Detalle sorpresa',                category: 'otros' },
      { text: 'Cargador de móvil',               category: 'tecnologia' },
    ],
    dayPlan: {
      arrival: [
        { name: 'Llegada',         type: 'transport' },
        { name: 'Check-in',        type: 'rest' },
        { name: 'Cena romántica',  type: 'dinner' },
      ],
      departure: [
        { name: 'Check-out', type: 'rest' },
        { name: 'Vuelta',    type: 'transport' },
      ],
    },
  },

  {
    id: 'murcia',
    name: 'Murcia recurrente',
    emoji: '🏠',
    description: 'Ida y vuelta de siempre, sin liarte con la maleta.',
    hasEventDay: false,
    checklist: [
      { text: 'DNI',                category: 'documentacion' },
      { text: 'Cargador de móvil',  category: 'tecnologia' },
      { text: 'Efectivo',           category: 'otros' },
    ],
    dayPlan: {
      arrival: [
        { name: 'Llegada',        type: 'transport' },
        { name: 'Ver a la familia', type: 'activity' },
      ],
      departure: [
        { name: 'Vuelta', type: 'transport' },
      ],
    },
  },

  {
    id: 'vacaciones',
    name: 'Vacaciones largas',
    emoji: '🌴',
    description: 'Base más completa para viajes de varios días.',
    hasEventDay: false,
    checklist: [
      { text: 'Documentación (DNI / pasaporte)', category: 'documentacion' },
      { text: 'Seguro de viaje',                 category: 'documentacion' },
      { text: 'Alojamiento confirmado',          category: 'reservas' },
      { text: 'Transporte confirmado',           category: 'reservas' },
      { text: 'Ropa variada según clima',        category: 'equipaje' },
      { text: 'Neceser e higiene',               category: 'equipaje' },
      { text: 'Botiquín básico',                 category: 'salud' },
      { text: 'Medicación habitual',             category: 'salud' },
      { text: 'Cargador + powerbank',            category: 'tecnologia' },
      { text: 'Efectivo / tarjeta',              category: 'otros' },
    ],
    dayPlan: {
      arrival: [
        { name: 'Llegada',  type: 'transport' },
        { name: 'Check-in', type: 'rest' },
      ],
      departure: [
        { name: 'Check-out', type: 'rest' },
        { name: 'Vuelta',    type: 'transport' },
      ],
    },
  },
];

export function getTemplateById(id) {
  return TRIP_TEMPLATES.find(t => t.id === id) || null;
}

// ── Fusión segura ───────────────────────────────────────────────────────────

const norm = (s) => (s || '').trim().toLowerCase();

/**
 * Construye una nueva actividad lista para el itinerario.
 * Campos alineados con lo que produce el store (addActivity).
 */
function makeActivity(tpl, order) {
  return {
    id: generateId(),
    name: tpl.name,
    type: tpl.type || 'other',
    time: '',
    place: '',
    notes: '',
    completed: false,
    order,
  };
}

/**
 * Calcula qué añadiría la plantilla SIN persistir nada.
 *
 * @param {object} trip
 * @param {object} template
 * @param {object} options
 *    - eventDayId: id del día que hace de "evento" (para plantillas con hasEventDay)
 *
 * @returns {{
 *   checklistToAdd: Array<{text, category}>,
 *   checklistSkipped: number,
 *   itinerary: Array|null,      // itinerario fusionado (o null si el viaje no tiene días)
 *   daySummary: Array<{ dayNumber, date, added: string[] }>,
 *   activitiesAdded: number,
 *   hasDays: boolean,
 * }}
 */
export function computeTemplateApplication(trip, template, options = {}) {
  if (!template) {
    return {
      checklistToAdd: [], checklistSkipped: 0, itinerary: null,
      daySummary: [], activitiesAdded: 0, hasDays: false,
    };
  }

  // ── Checklist (dedup por texto, case-insensitive) ──
  const existingChecklist = new Set((trip.checklist || []).map(i => norm(i.text)));
  const checklistToAdd = [];
  let checklistSkipped = 0;
  (template.checklist || []).forEach(item => {
    if (existingChecklist.has(norm(item.text))) { checklistSkipped++; return; }
    // Evita duplicados dentro de la propia plantilla también
    if (checklistToAdd.some(x => norm(x.text) === norm(item.text))) return;
    checklistToAdd.push({ text: item.text, category: item.category || 'otros' });
  });

  // ── Day plan ──
  const days = normalizeItinerary(trip.itinerary || []);
  const hasDays = days.length > 0;

  if (!hasDays) {
    return {
      checklistToAdd, checklistSkipped, itinerary: null,
      daySummary: [], activitiesAdded: 0, hasDays: false,
    };
  }

  const first = days[0];
  const last = days[days.length - 1];

  // Día "evento": el indicado, si no el segundo, si no el primero.
  let eventDay = null;
  if (template.dayPlan?.event) {
    eventDay = (options.eventDayId && days.find(d => d.id === options.eventDayId))
      || (days.length > 1 ? days[1] : days[0]);
  }

  // Acumula, por id de día, la lista ordenada de plantillas de actividad a añadir.
  // Orden de roles: arrival → event → departure (por si un día concentra varios).
  const rolePlan = [
    ['arrival', first],
    ['event', eventDay],
    ['departure', days.length > 1 ? last : null],
  ];

  const byDay = new Map(); // dayId -> [{name,type}...]
  rolePlan.forEach(([role, day]) => {
    if (!day) return;
    const acts = template.dayPlan?.[role];
    if (!acts?.length) return;
    const arr = byDay.get(day.id) || [];
    acts.forEach(a => arr.push(a));
    byDay.set(day.id, arr);
  });

  const daySummary = [];
  let activitiesAdded = 0;

  const itinerary = days.map(day => {
    const planned = byDay.get(day.id);
    if (!planned?.length) return day;

    const existingNames = new Set((day.activities || []).map(a => norm(a.name)));
    const added = [];
    let order = day.activities?.length || 0;
    const newActs = [];

    planned.forEach(tpl => {
      const key = norm(tpl.name);
      if (existingNames.has(key)) return;   // dedup contra lo ya existente
      existingNames.add(key);               // y dentro del propio lote
      newActs.push(makeActivity(tpl, order++));
      added.push(tpl.name);
    });

    if (added.length === 0) return day;
    activitiesAdded += added.length;
    daySummary.push({ dayNumber: day.dayNumber, date: day.date, added });

    return { ...day, activities: [...(day.activities || []), ...newActs] };
  });

  return {
    checklistToAdd, checklistSkipped, itinerary,
    daySummary, activitiesAdded, hasDays: true,
  };
}
