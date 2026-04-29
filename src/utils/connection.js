// ──────────────────────────────────────────────────────────────────────────────
// connection.js
// Calcula el margen logístico entre dos eventos consecutivos del itinerario.
// Devuelve la diferencia exacta en minutos, marca conexiones de riesgo
// (< 120 min por defecto) y rellena una plantilla de `transfer_instructions`
// para que el usuario documente el trasbordo (terminales, transporte, notas).
// ──────────────────────────────────────────────────────────────────────────────

/** Umbral por defecto para marcar una conexión como "de riesgo". */
export const RISK_THRESHOLD_MINUTES = 120;

/** Tipos de transporte admitidos en transfer_instructions.transport_type. */
export const TRANSPORT_TYPES = {
  walk:    { label: 'A pie',         icon: '🚶' },
  taxi:    { label: 'Taxi / VTC',    icon: '🚕' },
  bus:     { label: 'Autobús',       icon: '🚌' },
  shuttle: { label: 'Shuttle',       icon: '🚐' },
  train:   { label: 'Tren',          icon: '🚆' },
  metro:   { label: 'Metro / S-Bahn', icon: '🚇' },
  ferry:   { label: 'Ferry / barco', icon: '⛴️' },
  car:     { label: 'Coche propio',  icon: '🚗' },
  other:   { label: 'Otro',          icon: '🔁' },
};

// ──────────────────────────────────────────────────────────────────────────────
// Normalización de zonas horarias
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convierte un valor de fecha a un instante UTC (ms desde epoch). Soporta:
 *  · ISO con offset o "Z"     → "2026-05-01T14:30:00+02:00", "...Z"
 *  · ISO sin offset + IANA tz → ("2026-05-01T14:30:00", "Europe/Madrid")
 *  · Date / number            → tal cual
 *
 * Si no se proporciona timezone y la cadena no trae offset, se asume UTC para
 * evitar resultados que dependan del runtime del navegador/servidor.
 */
function toUtcInstant(value, timezone) {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;

  const hasOffset = /(?:Z|[+\-]\d{2}:?\d{2})$/.test(value.trim());
  if (hasOffset) return Date.parse(value);

  if (timezone) {
    // Truco estándar: comparar la misma marca temporal interpretada como UTC vs.
    // como hora local de la zona dada, y derivar el offset exacto en ese momento
    // (cubre cambios de horario de verano correctamente).
    const asUtcMs = Date.parse(value + 'Z');
    if (Number.isNaN(asUtcMs)) return NaN;

    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date(asUtcMs)).reduce((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
    const tzView = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    const tzOffsetMs = Date.parse(tzView + 'Z') - asUtcMs;
    return asUtcMs - tzOffsetMs;
  }

  // Sin offset ni timezone explícita → asumimos UTC.
  return Date.parse(value + 'Z');
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper privado: extraer el end / start de un evento aceptando varios alias
// ──────────────────────────────────────────────────────────────────────────────

const pick = (obj, keys) => {
  for (const k of keys) if (obj[k] != null) return obj[k];
  return null;
};

// ──────────────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el margen logístico entre dos eventos consecutivos del itinerario.
 *
 * Forma esperada de cada evento (los nombres entre paréntesis son aliases
 * aceptados, por compatibilidad con stores existentes):
 *
 *   {
 *     id?:        string,
 *     start:      ISOString,         // (alias: startTime, inicio)
 *     end:        ISOString,         // (alias: endTime, fin)
 *     timezone?:  string,            // IANA, p.ej. 'Europe/Madrid'
 *     location?:  string,            // ciudad / aeropuerto / dirección
 *     terminal?:  string,            // T1, Hall B, Andén 4, etc.
 *     type?:      string,            // 'flight' | 'train' | 'hotel' | …
 *     code?:      string,            // IB3450, AVE 5072, …
 *   }
 *
 * @param {object} eventoA  Evento que termina antes
 * @param {object} eventoB  Evento que comienza después
 * @param {object} [opts]
 * @param {number} [opts.thresholdMinutes=120]   Umbral para is_risk_connection
 * @returns {{
 *   from_event_id: string|null,
 *   to_event_id:   string|null,
 *   margin_minutes: number,
 *   is_risk_connection: boolean,
 *   severity: 'overlap'|'critical'|'tight'|'short'|'ok',
 *   threshold_minutes: number,
 *   transfer_instructions: {
 *     from_location: string|null,
 *     from_terminal: string|null,
 *     to_location:   string|null,
 *     to_terminal:   string|null,
 *     transport_type: string|null,
 *     duration_estimate_minutes: number|null,
 *     cost_estimate: number|null,
 *     notes: string,
 *     reservation_ref: string|null,
 *   }
 * }}
 */
export function calcularMargenLogistico(eventoA, eventoB, opts = {}) {
  if (!eventoA || !eventoB) {
    throw new TypeError('calcularMargenLogistico: faltan eventoA o eventoB');
  }

  const threshold = Number.isFinite(opts.thresholdMinutes)
    ? opts.thresholdMinutes
    : RISK_THRESHOLD_MINUTES;

  const endRaw   = pick(eventoA, ['end', 'endTime', 'fin']);
  const startRaw = pick(eventoB, ['start', 'startTime', 'inicio']);

  if (endRaw == null || startRaw == null) {
    throw new Error(
      'Cada evento debe declarar inicio y fin (start/end, startTime/endTime o inicio/fin)',
    );
  }

  const aEndMs   = toUtcInstant(endRaw,   eventoA.timezone);
  const bStartMs = toUtcInstant(startRaw, eventoB.timezone);

  if (Number.isNaN(aEndMs) || Number.isNaN(bStartMs)) {
    throw new RangeError('Fechas inválidas en uno de los eventos');
  }

  // Diferencia exacta en minutos (entero, redondeado al minuto más cercano).
  const margin_minutes = Math.round((bStartMs - aEndMs) / 60000);

  let severity = 'ok';
  if      (margin_minutes < 0)         severity = 'overlap';   // se solapan
  else if (margin_minutes < 30)        severity = 'critical';  // imposible
  else if (margin_minutes < 60)        severity = 'tight';     // muy justo
  else if (margin_minutes < threshold) severity = 'short';     // bajo umbral

  return {
    from_event_id: eventoA.id ?? null,
    to_event_id:   eventoB.id ?? null,
    margin_minutes,
    is_risk_connection: margin_minutes < threshold,
    severity,
    threshold_minutes: threshold,
    transfer_instructions: {
      from_location: eventoA.location ?? null,
      from_terminal: eventoA.terminal ?? null,
      to_location:   eventoB.location ?? null,
      to_terminal:   eventoB.terminal ?? null,
      transport_type: null,                 // clave de TRANSPORT_TYPES
      duration_estimate_minutes: null,
      cost_estimate: null,                  // en la moneda del viaje
      notes: '',
      reservation_ref: null,                // localizador / billete del transfer
    },
  };
}

/**
 * Atajo: aplica calcularMargenLogistico() a una secuencia ordenada de eventos
 * y devuelve un array de conexiones (longitud = events.length - 1).
 */
export function calcularMargenesItinerario(events, opts) {
  const arr = Array.isArray(events) ? events : [];
  const out = [];
  for (let i = 0; i < arr.length - 1; i++) {
    out.push(calcularMargenLogistico(arr[i], arr[i + 1], opts));
  }
  return out;
}
