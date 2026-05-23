export function generateId() {
  return crypto.randomUUID();
}

// ── Date helpers UTC-safe ────────────────────────────────────────────────────
// Política: las fechas "sin hora" se manejan SIEMPRE como strings 'YYYY-MM-DD'.
// No se construyen Date() locales para iterar días — toda la aritmética usa
// UTC explícito para que el offset de la zona horaria del usuario y los
// cambios DST no produzcan off-by-one.

/** Parsea 'YYYY-MM-DD' (o un ISO completo) → { year, month, day } o null. */
export function parseISODate(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: +m[1], month: +m[2], day: +m[3] };
}

/** Devuelve 'YYYY-MM-DD' a partir de year/month/day numéricos. */
export function isoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Suma `n` días (puede ser negativo) a una fecha 'YYYY-MM-DD'. UTC-safe. */
export function addDaysISO(date, n) {
  const p = parseISODate(date);
  if (!p) return date;
  const dt = new Date(Date.UTC(p.year, p.month - 1, p.day));
  dt.setUTCDate(dt.getUTCDate() + Number(n || 0));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Comparador lexicográfico — válido porque 'YYYY-MM-DD' ordena cronológicamente. */
export function compareISODates(a, b) {
  const aa = (a || '').slice(0, 10);
  const bb = (b || '').slice(0, 10);
  if (aa === bb) return 0;
  if (!aa) return -1;
  if (!bb) return 1;
  return aa < bb ? -1 : 1;
}

/** Diferencia en días enteros entre dos 'YYYY-MM-DD' (b - a). */
export function diffDaysISO(a, b) {
  const pa = parseISODate(a), pb = parseISODate(b);
  if (!pa || !pb) return 0;
  const da = Date.UTC(pa.year, pa.month - 1, pa.day);
  const db = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((db - da) / 86400000);
}

/** Fecha de hoy en formato 'YYYY-MM-DD' (zona horaria local del usuario). */
export function todayISO() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// ── Formatters ───────────────────────────────────────────────────────────────
// Formatean en español sin reinterpretar la fecha como Date local — usan
// timeZone: 'UTC' para evitar el clásico off-by-one.

export function formatDate(dateStr) {
  const p = parseISODate(dateStr);
  if (!p) return '';
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  return d.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export function formatDateShort(dateStr) {
  const p = parseISODate(dateStr);
  if (!p) return '';
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  return d.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

/**
 * Formato libre UTC-safe a partir de 'YYYY-MM-DD'. Acepta options de
 * Intl.DateTimeFormat. Útil cuando los formatos estándar (formatDate,
 * formatDateShort) no encajan, p.ej. weekday + day o month/year corto.
 * Siempre fuerza `timeZone: 'UTC'` para evitar el off-by-one clásico.
 */
export function formatISODateCustom(dateStr, options = {}) {
  const p = parseISODate(dateStr);
  if (!p) return '';
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  return d.toLocaleDateString('es-ES', { ...options, timeZone: 'UTC' });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
  }).format(amount || 0);
}

// ── Días del viaje ───────────────────────────────────────────────────────────

/** Número de días (inclusivo) entre dos fechas 'YYYY-MM-DD'. */
export function getDaysBetween(start, end) {
  if (!start || !end) return 0;
  const diff = diffDaysISO(start, end);
  return Math.max(1, diff + 1);
}

/**
 * Genera un array de días vacíos entre `startDate` y `endDate` (inclusivos).
 * Todas las fechas son strings 'YYYY-MM-DD'. Si los datos son inválidos
 * o el rango está invertido, devuelve [].
 */
export function generateDays(startDate, endDate) {
  if (!startDate || !endDate) return [];
  if (compareISODates(startDate, endDate) > 0) return [];
  const days = [];
  let cursor = (startDate || '').slice(0, 10);
  const last = (endDate || '').slice(0, 10);
  let dayNumber = 1;
  // Salvaguarda contra bucles infinitos por datos corruptos
  for (let safety = 0; safety < 3650 && compareISODates(cursor, last) <= 0; safety++) {
    days.push({
      id: generateId(),
      date: cursor,
      dayNumber: dayNumber++,
      activities: [],
    });
    cursor = addDaysISO(cursor, 1);
  }
  return days;
}

/**
 * Sincroniza el itinerario con un rango [startDate, endDate]:
 *   - Conserva los días existentes que caen dentro del rango (con sus actividades).
 *   - Añade nuevos días vacíos para fechas que no estaban.
 *   - Reordena cronológicamente y renumera `dayNumber`.
 *   - Devuelve también los días que quedan fuera y tenían actividades, para
 *     que la UI pueda pedir confirmación antes de aplicar el cambio.
 *
 *   const { days, removedWithActivities } = syncDaysWithDates(trip.itinerary, trip.startDate, trip.endDate);
 *   if (removedWithActivities.length > 0) askConfirm(); else apply(days);
 */
export function syncDaysWithDates(itinerary = [], startDate, endDate) {
  if (!startDate || !endDate || compareISODates(endDate, startDate) < 0) {
    return { days: itinerary || [], removedWithActivities: [] };
  }

  const validDates = [];
  let cursor = (startDate || '').slice(0, 10);
  const last = (endDate || '').slice(0, 10);
  for (let safety = 0; safety < 3650 && compareISODates(cursor, last) <= 0; safety++) {
    validDates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }

  const validSet = new Set(validDates);
  // Normalizamos las claves de fecha existentes a 'YYYY-MM-DD' por si
  // algún registro antiguo viene con sufijo de hora.
  const existingByDate = new Map();
  (itinerary || []).forEach(d => {
    if (!d?.date) return;
    const key = String(d.date).slice(0, 10);
    if (!existingByDate.has(key)) existingByDate.set(key, { ...d, date: key });
  });

  const days = validDates.map((date, i) => {
    const existing = existingByDate.get(date);
    if (existing) return { ...existing, date, dayNumber: i + 1 };
    return {
      id: generateId(),
      date,
      dayNumber: i + 1,
      activities: [],
    };
  });

  const removedWithActivities = (itinerary || [])
    .filter(d => d?.date && !validSet.has(String(d.date).slice(0, 10)) && (d.activities?.length || 0) > 0)
    .map(d => ({ ...d, date: String(d.date).slice(0, 10) }));

  return { days, removedWithActivities };
}

/**
 * Devuelve { start, end } a partir del propio itinerario, útil para
 * inferir fechas cuando el array es la fuente más fiable.
 */
export function getItineraryBounds(itinerary = []) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return { start: null, end: null };
  const dates = itinerary
    .map(d => (d?.date ? String(d.date).slice(0, 10) : null))
    .filter(Boolean)
    .sort();
  return { start: dates[0] || null, end: dates[dates.length - 1] || null };
}

/**
 * Ordena un itinerario cronológicamente y renumera `dayNumber`.
 * Inmutable. Útil al renderizar y al persistir.
 */
export function normalizeItinerary(itinerary = []) {
  if (!Array.isArray(itinerary)) return [];
  return [...itinerary]
    .filter(d => d && d.date)
    .map(d => ({ ...d, date: String(d.date).slice(0, 10) }))
    .sort((a, b) => compareISODates(a.date, b.date))
    .map((d, i) => ({ ...d, dayNumber: i + 1 }));
}

// ── Parser quick-add ─────────────────────────────────────────────────────────

/**
 *   "20:00 Cena en Trastevere"     → { time: '20:00', name: 'Cena en Trastevere', type: 'dinner' }
 *   "9.30 Desayuno hotel"          → { time: '09:30', name: 'Desayuno hotel',      type: 'breakfast' }
 *   "Museo del Louvre"             → { time: '',      name: 'Museo del Louvre',    type: 'visit' }
 */
export function parseQuickActivity(text) {
  const out = { time: '', name: (text || '').trim(), type: null };
  if (!out.name) return out;

  const m = out.name.match(/^(\d{1,2})[:\.h](\d{2})\s+(.+)$/);
  if (m) {
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
    out.time = `${hh}:${mm}`;
    out.name = m[3].trim();
  }

  const lower = out.name.toLowerCase();
  const rules = [
    { type: 'breakfast', kw: ['desayun', 'brunch'] },
    { type: 'lunch',     kw: ['comida ', 'almuerz', 'comer ', ' comida', 'menú', 'menu del día'] },
    { type: 'dinner',    kw: ['cena', 'cenar'] },
    { type: 'cafe',      kw: ['café', 'cafe ', 'merienda', 'helado', 'snack'] },
    { type: 'visit',     kw: ['museo', 'iglesia', 'catedral', 'palacio', 'castillo', 'monumento', 'tour', 'visita'] },
    { type: 'transport', kw: ['vuelo', 'tren', 'bus', 'coche', 'taxi', 'traslado', 'metro'] },
    { type: 'shopping',  kw: ['compras', 'tienda', 'mercado'] },
    { type: 'rest',      kw: ['hotel', 'descans', 'siesta', 'check-in', 'check in'] },
    { type: 'activity',  kw: ['playa', 'mirador', 'paseo', 'ruta', 'concierto', 'show', 'espectáculo'] },
  ];
  for (const r of rules) {
    if (r.kw.some(k => lower.includes(k))) { out.type = r.type; break; }
  }

  return out;
}

/** Suma `min` minutos a una hora "HH:MM" y devuelve "HH:MM" (sin pasar de 23:59). */
export function addMinutesToTime(time, min) {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return '';
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + Number(min || 0));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getCountryFlag(country) {
  const flags = {
    'España': '🇪🇸', 'Francia': '🇫🇷', 'Italia': '🇮🇹', 'Portugal': '🇵🇹',
    'Alemania': '🇩🇪', 'Reino Unido': '🇬🇧', 'Japón': '🇯🇵', 'México': '🇲🇽',
    'Estados Unidos': '🇺🇸', 'Grecia': '🇬🇷', 'Tailandia': '🇹🇭', 'Marruecos': '🇲🇦',
  };
  return flags[country] || '🌍';
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function downloadFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch {
        reject(new Error('El archivo no contiene JSON válido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}
