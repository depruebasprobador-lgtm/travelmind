export function generateId() {
  return crypto.randomUUID();
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short'
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR'
  }).format(amount || 0);
}

export function getDaysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export function generateDays(startDate, endDate) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let dayNumber = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      id: generateId(),
      date: d.toISOString().split('T')[0],
      dayNumber: dayNumber++,
      activities: [],
    });
  }
  return days;
}

/**
 * Sincroniza el itinerario con un rango [startDate, endDate]:
 *   - Conserva los días existentes que caen dentro del rango (con sus actividades).
 *   - Añade nuevos días vacíos para fechas que no estaban.
 *   - Reordena `dayNumber` cronológicamente.
 *   - Devuelve también los días eliminados que tenían actividades, para que
 *     la UI pueda pedir confirmación antes de aplicar el cambio.
 *
 * Uso típico:
 *   const { days, removedWithActivities } = syncDaysWithDates(trip.itinerary, trip.startDate, trip.endDate);
 *   if (removedWithActivities.length > 0) askConfirm(); else apply(days);
 */
export function syncDaysWithDates(itinerary = [], startDate, endDate) {
  if (!startDate || !endDate) return { days: itinerary, removedWithActivities: [] };

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) {
    return { days: itinerary, removedWithActivities: [] };
  }

  const validDates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    validDates.push(d.toISOString().split('T')[0]);
  }

  const validSet = new Set(validDates);
  const existingByDate = new Map((itinerary || []).map(d => [d.date, d]));

  const days = validDates.map((date, i) => {
    const existing = existingByDate.get(date);
    if (existing) return { ...existing, dayNumber: i + 1 };
    return {
      id: generateId(),
      date,
      dayNumber: i + 1,
      activities: [],
    };
  });

  const removedWithActivities = (itinerary || []).filter(
    d => !validSet.has(d.date) && (d.activities?.length || 0) > 0,
  );

  return { days, removedWithActivities };
}

/**
 * Parser para la "adición express":
 *   "20:00 Cena en Trastevere"     → { time: '20:00', name: 'Cena en Trastevere', type: 'dinner' }
 *   "9.30 Desayuno hotel"          → { time: '09:30', name: 'Desayuno hotel',      type: 'breakfast' }
 *   "Museo del Louvre"             → { time: '',      name: 'Museo del Louvre',    type: 'visit' }
 *
 * Reconoce hora opcional al principio (HH:MM o HH.MM) y deduce el tipo
 * por palabras clave en español.
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
