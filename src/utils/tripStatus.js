/**
 * tripStatus.js — Helpers puros para calcular la "fase" de un viaje
 * respecto a hoy, sin tocar el store ni la persistencia.
 *
 * Todas las fechas son strings 'YYYY-MM-DD'. Las comparaciones se hacen
 * con los helpers UTC-safe de utils/helpers.js — nunca con `new Date()`
 * directo sobre fechas-solo.
 *
 * Reglas de fase:
 *   - 'ongoing'  → today está entre startDate y endDate (inclusive)
 *   - 'upcoming' → startDate está en el futuro
 *   - 'past'     → endDate está en el pasado
 *   - 'idea'     → trip sin fechas
 */

import {
  todayISO,
  diffDaysISO,
  compareISODates,
} from './helpers.js';

/**
 * Devuelve la fase del viaje respecto a `today`.
 */
export function getTripPhase(trip, today = todayISO()) {
  if (!trip?.startDate || !trip?.endDate) return 'idea';
  const cmpStart = compareISODates(today, trip.startDate);
  const cmpEnd = compareISODates(today, trip.endDate);
  if (cmpStart >= 0 && cmpEnd <= 0) return 'ongoing';
  if (cmpStart < 0) return 'upcoming';
  return 'past';
}

/**
 * Para un viaje en curso, devuelve { dayNumber, totalDays }.
 * Si `today` cae fuera del rango por algún motivo (race con el cambio de
 * día), clampamos al rango [1, totalDays] para evitar valores absurdos.
 */
export function getTripDayProgress(trip, today = todayISO()) {
  if (!trip?.startDate || !trip?.endDate) return null;
  const totalDays = Math.max(1, diffDaysISO(trip.startDate, trip.endDate) + 1);
  const raw = diffDaysISO(trip.startDate, today) + 1;
  const dayNumber = Math.max(1, Math.min(totalDays, raw));
  return { dayNumber, totalDays };
}

/**
 * Hora actual local del navegador como string 'HH:MM'. Sólo se usa para
 * comparar lexicográficamente con `activity.time` que también es 'HH:MM'.
 * No tiene riesgo de TZ porque ambos lados están en la misma referencia
 * (la hora del navegador).
 */
export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Devuelve info útil de las actividades de hoy:
 *   - day              → el día (objeto del itinerary) o null
 *   - activities       → todas las actividades del día
 *   - pending          → actividades no completadas
 *   - nextActivity     → próxima actividad relevante (ver lógica abajo)
 *
 * Lógica de "próxima actividad":
 *   1) Entre las actividades NO completadas con `time`, la primera con
 *      `time >= now`.
 *   2) Si ninguna tiene hora futura hoy, la primera SIN `time` (las que
 *      el usuario dejó "a continuación").
 *   3) Si tampoco, null → la UI muestra "sin actividades pendientes hoy".
 */
export function getTodayActivitiesInfo(trip, today = todayISO(), now = nowHHMM()) {
  const empty = { day: null, activities: [], pending: [], nextActivity: null };
  if (!Array.isArray(trip?.itinerary)) return empty;
  const day = trip.itinerary.find(d => (d?.date || '').slice(0, 10) === today);
  if (!day) return empty;
  const activities = day.activities || [];
  const pending = activities.filter(a => !a.completed);

  const withTime = pending.filter(a => a.time);
  const withoutTime = pending.filter(a => !a.time);

  // Ordenar las que tienen hora ascendentemente (lexicográfico HH:MM funciona).
  withTime.sort((a, b) => a.time.localeCompare(b.time));
  // Las sin hora se preservan en su orden original (a.order).
  withoutTime.sort((a, b) => (a.order || 0) - (b.order || 0));

  let nextActivity = withTime.find(a => a.time >= now) || null;
  if (!nextActivity && withoutTime.length > 0) {
    nextActivity = withoutTime[0];
  }
  return { day, activities, pending, nextActivity };
}

/**
 * Cuenta items del checklist no marcados.
 */
export function getChecklistPending(trip) {
  return (trip?.checklist || []).filter(c => !c.checked).length;
}

/**
 * Selecciona el trip "en curso" hoy. Si hay varios solapados (raro pero
 * posible), elegimos el que empezó antes.
 *   - Excluye archivados.
 *   - No considera viajes sin fechas (status 'idea').
 */
export function findOngoingTrip(trips, today = todayISO()) {
  const candidates = (trips || [])
    .filter(t => !t.archived)
    .filter(t => getTripPhase(t, today) === 'ongoing');
  if (candidates.length === 0) return null;
  return candidates
    .slice()
    .sort((a, b) => compareISODates(a.startDate, b.startDate))[0];
}

/**
 * Selecciona el próximo trip que empieza dentro de `withinDays`.
 * Devuelve `{ trip, daysAway }` o null.
 *   - Excluye archivados.
 *   - Excluye viajes sin fechas.
 *   - Si dos empiezan el mismo día, elegimos el primero por orden de
 *     creación (stable).
 */
export function findUpcomingTrip(trips, today = todayISO(), withinDays = 7) {
  const active = (trips || []).filter(t => !t.archived && t.startDate && t.endDate);
  const upcoming = active
    .map(t => ({ trip: t, daysAway: diffDaysISO(today, t.startDate) }))
    .filter(x => x.daysAway >= 0 && x.daysAway <= withinDays)
    .filter(x => getTripPhase(x.trip, today) === 'upcoming');
  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.daysAway - b.daysAway);
  return upcoming[0];
}
