import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin,
  CheckCircle2, Circle, Sun, Sunrise, Sunset, Moon,
  Navigation2, Bed, Bus, AlertCircle, Zap
} from 'lucide-react';
import useTripStore from '../../data/store';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../EmptyState';

// ── Leaflet marker fix ─────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;

const makeIcon = (color, number) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 10.7 14 26 16 26s16-15.3 16-26C32 7.2 24.8 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="9" fill="white" opacity="0.9"/>
      <text x="16" y="21" text-anchor="middle" font-size="11" font-weight="bold"
        font-family="Arial,sans-serif" fill="${color}">${number}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
};

// Ajusta el mapa a los bounds de los marcadores
function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [coords, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const HOUR_ICONS = {
  night: { icon: Moon, label: 'Noche', color: '#6366F1' },
  morning: { icon: Sunrise, label: 'Mañana', color: '#F59E0B' },
  afternoon: { icon: Sun, label: 'Tarde', color: '#EF4444' },
  evening: { icon: Sunset, label: 'Noche', color: '#8B5CF6' },
};

function getTimeSlot(timeStr) {
  if (!timeStr) return 'morning';
  const [h] = timeStr.split(':').map(Number);
  if (h < 6) return 'night';
  if (h < 13) return 'morning';
  if (h < 19) return 'afternoon';
  return 'evening';
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Colores para marcadores secuenciales
const MARKER_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6366F1',
];

// ── Componente principal ───────────────────────────────────────────────────
export default function DayPlanTab({ trip }) {
  const { toggleActivityComplete } = useTripStore();
  const itinerary = trip.itinerary || [];

  // Selecciona el día: hoy si está dentro del viaje, sino el primero
  const defaultDate = useMemo(() => {
    const today = todayISO();
    const inTrip = itinerary.find(d => d.date === today);
    return inTrip ? today : (itinerary[0]?.date || today);
  }, [itinerary]);

  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const currentDayIndex = itinerary.findIndex(d => d.date === selectedDate);
  const currentDay = itinerary[currentDayIndex];

  const prevDay = currentDayIndex > 0 ? itinerary[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < itinerary.length - 1 ? itinerary[currentDayIndex + 1] : null;

  const isToday = selectedDate === todayISO();

  if (itinerary.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Sin itinerario"
        description="Define las fechas del viaje para generar el plan del día."
      />
    );
  }

  // Actividades ordenadas por hora
  const activities = useMemo(() => {
    if (!currentDay) return [];
    return [...(currentDay.activities || [])].sort((a, b) => {
      if (!a.time && !b.time) return a.order - b.order;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [currentDay]);

  const completed = activities.filter(a => a.completed).length;
  const total = activities.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Transporte relevante para este día
  const dayTransport = useMemo(() => {
    if (!currentDay) return [];
    return (trip.transports || []).filter(t => {
      const dep = t.departureDate?.split('T')[0] || t.departureDate;
      const arr = t.arrivalDate?.split('T')[0] || t.arrivalDate;
      return dep === selectedDate || arr === selectedDate;
    });
  }, [trip.transports, currentDay, selectedDate]);

  // Alojamiento activo ese día
  const dayAccom = useMemo(() => {
    return (trip.accommodations || []).find(a => {
      const cin = a.checkIn?.split('T')[0] || a.checkIn;
      const cout = a.checkOut?.split('T')[0] || a.checkOut;
      return cin <= selectedDate && selectedDate <= cout;
    });
  }, [trip.accommodations, selectedDate]);

  // Mapa: asociar actividades con coordenadas de trip.places por nombre
  const mapPoints = useMemo(() => {
    const points = [];
    activities.forEach((act, idx) => {
      if (!act.place) return;
      // Busca en places por coincidencia de nombre
      const matched = (trip.places || []).find(p =>
        p.name?.toLowerCase().includes(act.place.toLowerCase()) ||
        act.place.toLowerCase().includes(p.name?.toLowerCase())
      );
      if (matched?.lat && matched?.lng) {
        points.push({
          lat: matched.lat,
          lng: matched.lng,
          label: act.place,
          activityName: act.name,
          index: idx + 1,
          completed: act.completed,
        });
      }
    });
    // Añade alojamiento si tiene coords
    if (dayAccom?.lat && dayAccom?.lng) {
      points.push({
        lat: dayAccom.lat,
        lng: dayAccom.lng,
        label: dayAccom.name,
        activityName: 'Alojamiento',
        index: '🏨',
        isAccom: true,
        completed: false,
      });
    }
    return points;
  }, [activities, trip.places, dayAccom]);

  const mapCenter = mapPoints.length > 0
    ? [mapPoints[0].lat, mapPoints[0].lng]
    : [40.4168, -3.7038];

  // Polyline que conecta los puntos en orden
  const routeCoords = mapPoints.filter(p => !p.isAccom).map(p => [p.lat, p.lng]);

  const handleToggle = (actId) => {
    if (!currentDay) return;
    toggleActivityComplete(trip.id, currentDay.id, actId);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* ── Header del día ─────────────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            className="btn btn-icon"
            onClick={() => prevDay && setSelectedDate(prevDay.date)}
            disabled={!prevDay}
            style={{ opacity: prevDay ? 1 : 0.3 }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ textAlign: 'center', flex: 1 }}>
            {isToday && (
              <span style={{
                display: 'inline-block', background: 'var(--primary)', color: 'white',
                borderRadius: 'var(--radius-full)', padding: '2px 10px',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: 4
              }}>
                <Zap size={10} style={{ display: 'inline', marginRight: 3 }} />HOY
              </span>
            )}
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {currentDay
                ? `Día ${currentDay.dayNumber} — ${formatDate(currentDay.date)}`
                : 'Sin día seleccionado'}
            </div>
            {/* Selector rápido de día */}
            <div style={{
              display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap'
            }}>
              {itinerary.map(d => {
                const isSelected = d.date === selectedDate;
                const isTodayDay = d.date === todayISO();
                const acts = d.activities || [];
                const done = acts.filter(a => a.completed).length;
                const allDone = acts.length > 0 && done === acts.length;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDate(d.date)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      background: isSelected ? 'var(--primary)' : allDone ? 'var(--success)' : isTodayDay ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: isSelected || allDone || isTodayDay ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                      outline: isSelected ? '2px solid var(--primary-light)' : 'none',
                      outlineOffset: 2,
                    }}
                    title={`Día ${d.dayNumber} — ${formatDate(d.date)}`}
                  >
                    {d.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-icon"
            onClick={() => nextDay && setSelectedDate(nextDay.date)}
            disabled={!nextDay}
            style={{ opacity: nextDay ? 1 : 0.3 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Barra de progreso ──────────────────────────────────────── */}
      {total > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Progreso del día
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: progressPct === 100 ? 'var(--success)' : 'var(--primary)' }}>
              {completed}/{total} actividades
            </span>
          </div>
          <div style={{
            height: 8, borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 'var(--radius-full)',
              background: progressPct === 100 ? 'var(--success)' : 'var(--primary-gradient)',
              width: `${progressPct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {progressPct === 100 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>
              ¡Día completado! 🎉
            </p>
          )}
        </div>
      )}

      {/* ── Info rápida: transporte y alojamiento ──────────────────── */}
      {(dayTransport.length > 0 || dayAccom) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {dayAccom && (
            <div className="card" style={{
              flex: 1, minWidth: 180, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <Bed size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Alojamiento</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dayAccom.name}</div>
              </div>
            </div>
          )}
          {dayTransport.map(t => (
            <div key={t.id} className="card" style={{
              flex: 1, minWidth: 180, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <Bus size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t.type || 'Transporte'}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.origin || t.from} → {t.destination || t.to}
                </div>
                {(t.departureTime || t.arrivalTime) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t.departureTime && `Salida ${t.departureTime}`}
                    {t.departureTime && t.arrivalTime && ' · '}
                    {t.arrivalTime && `Llegada ${t.arrivalTime}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lista de actividades ───────────────────────────────────── */}
      {activities.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="Sin actividades"
          description="No hay actividades planificadas para este día. Añádelas desde la pestaña Itinerario."
        />
      ) : (
        <div style={{ marginBottom: 20 }}>
          {activities.map((act, idx) => {
            const slot = getTimeSlot(act.time);
            const SlotIcon = HOUR_ICONS[slot].icon;
            const slotColor = HOUR_ICONS[slot].color;
            const markerColor = MARKER_COLORS[idx % MARKER_COLORS.length];

            return (
              <div
                key={act.id}
                onClick={() => handleToggle(act.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', marginBottom: 10,
                  background: act.completed ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  border: `1px solid ${act.completed ? 'var(--border-light)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: act.completed ? 0.65 : 1,
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: act.completed ? 'none' : 'var(--shadow-sm)',
                }}
              >
                {/* Número / check */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: act.completed ? 'var(--success)' : markerColor,
                  color: 'white',
                  fontSize: '0.85rem', fontWeight: 700,
                  transition: 'background 0.2s',
                }}>
                  {act.completed
                    ? <CheckCircle2 size={18} />
                    : <span>{idx + 1}</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{
                      fontWeight: 600, fontSize: '0.95rem',
                      textDecoration: act.completed ? 'line-through' : 'none',
                      color: act.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    }}>
                      {act.name}
                    </span>
                    {act.time && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.8rem', fontWeight: 700,
                        color: act.completed ? 'var(--text-tertiary)' : slotColor,
                        flexShrink: 0,
                      }}>
                        <SlotIcon size={13} />
                        {formatTime(act.time)}
                      </span>
                    )}
                  </div>

                  {act.place && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3,
                    }}>
                      <MapPin size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.place}
                      </span>
                    </div>
                  )}

                  {act.notes && !act.completed && (
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--text-tertiary)',
                      marginTop: 4, fontStyle: 'italic',
                    }}>
                      {act.notes}
                    </div>
                  )}
                </div>

                {/* Icono de estado (pulsable visualmente) */}
                <div style={{ flexShrink: 0, color: act.completed ? 'var(--success)' : 'var(--text-tertiary)' }}>
                  {act.completed
                    ? <CheckCircle2 size={20} />
                    : <Circle size={20} />
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Mapa del día ──────────────────────────────────────────── */}
      {mapPoints.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation2 size={16} style={{ color: 'var(--primary)' }} />
              Ruta del día
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              {mapPoints.filter(p => !p.isAccom).length} paradas
            </span>
          </div>

          <div style={{
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            border: '1px solid var(--border-color)', height: 320,
          }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds coords={mapPoints} />
              {routeCoords.length > 1 && (
                <Polyline
                  positions={routeCoords}
                  pathOptions={{ color: '#4F46E5', weight: 2.5, dashArray: '6, 6', opacity: 0.8 }}
                />
              )}
              {mapPoints.map((pt, i) => (
                <Marker
                  key={i}
                  position={[pt.lat, pt.lng]}
                  icon={pt.isAccom
                    ? makeIcon('#7C3AED', '🏨')
                    : makeIcon(
                        pt.completed ? '#10B981' : MARKER_COLORS[i % MARKER_COLORS.length],
                        pt.index
                      )
                  }
                >
                  <Popup>
                    <div style={{ fontSize: 13 }}>
                      <strong>{pt.activityName}</strong>
                      {pt.label !== pt.activityName && (
                        <div style={{ color: '#666', marginTop: 2 }}>{pt.label}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Leyenda de paradas */}
          <div style={{
            marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap'
          }}>
            {mapPoints.filter(p => !p.isAccom).map((pt, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 600,
                border: '1px solid var(--border-color)',
                opacity: pt.completed ? 0.5 : 1,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: pt.completed ? '#10B981' : MARKER_COLORS[i % MARKER_COLORS.length],
                  color: 'white', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
                }}>
                  {pt.index}
                </span>
                {pt.label}
                {pt.completed && ' ✓'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota si no hay coords para ninguna actividad */}
      {activities.length > 0 && mapPoints.filter(p => !p.isAccom).length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16,
          border: '1px dashed var(--border-color)',
        }}>
          <AlertCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Para ver el mapa del día, asocia los lugares de las actividades con lugares guardados en la pestaña "Lugares".
        </div>
      )}
    </div>
  );
}
