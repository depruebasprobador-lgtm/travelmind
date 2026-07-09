import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Calendar, Clock, MapPin, ListChecks, ArrowRight, Zap } from 'lucide-react';
import useTripStore from '../data/store';
import QuickExpense from './trip/QuickExpense';
import KeyInfoAccess from './trip/KeyInfoAccess';
import { todayISO, formatDate, formatDateShort } from '../utils/helpers';
import {
  findOngoingTrip,
  findUpcomingTrip,
  getTripDayProgress,
  getTodayActivitiesInfo,
  getChecklistPending,
  nowHHMM,
} from '../utils/tripStatus';

/**
 * Widget destacado en Dashboard:
 *   - Si hay viaje en curso → tarjeta "EN CURSO" con día X de Y y próxima
 *     actividad de hoy.
 *   - Si no hay en curso pero hay próximo en ≤14 días → tarjeta "PRÓXIMO
 *     VIAJE" con cuenta atrás y checklist pendiente.
 *   - Si no hay nada → renderiza null (no ensucia el Dashboard).
 *
 * Es 100% lectura salvo el gasto rápido que dispara el propio usuario.
 */
export default function TodayTripWidget() {
  const trips = useTripStore(s => s.trips);
  const navigate = useNavigate();
  const [showExpense, setShowExpense] = useState(false);
  const today = todayISO();
  const now = nowHHMM();

  const ongoing = useMemo(() => findOngoingTrip(trips, today), [trips, today]);
  const upcoming = useMemo(
    () => (ongoing ? null : findUpcomingTrip(trips, today, 14)),
    [trips, today, ongoing],
  );

  if (!ongoing && !upcoming) return null;

  // ── Viaje en curso ──
  if (ongoing) {
    const progress = getTripDayProgress(ongoing, today);
    const todayInfo = getTodayActivitiesInfo(ongoing, today, now);

    return (
      <section
        className="today-widget today-widget--ongoing"
        aria-label="Viaje en curso"
      >
        <div className="today-widget-badge">
          <Plane size={13} /> EN CURSO
        </div>

        <div className="today-widget-header">
          <h2 className="today-widget-title">{ongoing.destination}</h2>
          <span className="today-widget-progress">
            Día {progress.dayNumber} de {progress.totalDays}
          </span>
        </div>

        <p className="today-widget-meta">
          <Calendar size={12} aria-hidden />
          <span>{formatDateShort(ongoing.startDate)} — {formatDateShort(ongoing.endDate)}</span>
        </p>

        {todayInfo.nextActivity ? (
          <div className="today-widget-next">
            <Clock size={14} aria-hidden />
            <div className="today-widget-next-text">
              <strong>
                {todayInfo.nextActivity.time || 'A continuación'}
              </strong>
              <span className="today-widget-next-name">{todayInfo.nextActivity.name}</span>
            </div>
          </div>
        ) : (
          <div className="today-widget-next today-widget-next--empty">
            <Clock size={14} aria-hidden />
            <span>Sin actividades pendientes hoy.</span>
          </div>
        )}

        {todayInfo.pending.length > 0 && (
          <p className="today-widget-pending">
            <ListChecks size={12} aria-hidden />
            <span>
              {todayInfo.pending.length === 1
                ? '1 actividad pendiente hoy'
                : `${todayInfo.pending.length} actividades pendientes hoy`}
            </span>
          </p>
        )}

        <div className="today-widget-actions">
          <button
            className="btn btn-primary today-widget-cta"
            onClick={() => navigate(`/trip/${ongoing.id}`)}
          >
            Abrir plan de hoy <ArrowRight size={14} />
          </button>
          <button
            className="btn btn-secondary today-widget-cta-secondary"
            onClick={() => setShowExpense(true)}
          >
            <Zap size={14} /> Gasto rápido
          </button>
        </div>

        <div className="today-widget-keyinfo">
          <KeyInfoAccess trip={ongoing} />
        </div>

        {showExpense && (
          <QuickExpense trip={ongoing} onClose={() => setShowExpense(false)} />
        )}
      </section>
    );
  }

  // ── Próximo viaje en ≤14 días ──
  const { trip, daysAway } = upcoming;
  const checklistPending = getChecklistPending(trip);
  const daysLabel =
    daysAway === 0 ? 'hoy mismo' :
    daysAway === 1 ? 'mañana' :
    `en ${daysAway} días`;

  return (
    <section
      className="today-widget today-widget--upcoming"
      aria-label="Próximo viaje"
    >
      <div className="today-widget-badge today-widget-badge--upcoming">
        <Calendar size={13} /> PRÓXIMO VIAJE
      </div>

      <div className="today-widget-header">
        <h2 className="today-widget-title">{trip.destination}</h2>
        <span className="today-widget-progress">
          Empieza {daysLabel}
        </span>
      </div>

      <p className="today-widget-meta">
        <MapPin size={12} aria-hidden />
        <span>
          {trip.city ? `${trip.city}, ${trip.country || ''}`.replace(/,\s*$/, '') : (trip.country || trip.destination)}
        </span>
        <span className="today-widget-meta-sep">·</span>
        <span>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
      </p>

      {checklistPending > 0 ? (
        <p className="today-widget-pending">
          <ListChecks size={12} aria-hidden />
          <span>
            {checklistPending === 1
              ? '1 tarea de checklist pendiente'
              : `${checklistPending} tareas de checklist pendientes`}
          </span>
        </p>
      ) : (
        <p className="today-widget-pending today-widget-pending--done">
          <ListChecks size={12} aria-hidden />
          <span>Checklist al día</span>
        </p>
      )}

      <div className="today-widget-actions">
        <button
          className="btn btn-primary today-widget-cta"
          onClick={() => navigate(`/trip/${trip.id}`)}
        >
          Preparar viaje <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
