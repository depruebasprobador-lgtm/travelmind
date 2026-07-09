import { useMemo, useState } from 'react';
import {
  Rocket, CheckCircle2, AlertTriangle, ListChecks, Bed, Bus,
  Wallet, CalendarDays, Zap, Sparkles, ArrowRight,
} from 'lucide-react';
import { getTripPhase, getTripDayProgress } from '../../utils/tripStatus';
import { todayISO, diffDaysISO, formatCurrency } from '../../utils/helpers';
import QuickExpense from './QuickExpense';
import TemplateModal from './TemplateModal';

/**
 * "Centro de mando" del viaje: bloque compacto y práctico que aparece en el
 * detalle del viaje cuando está próximo (≤14 días) o en curso.
 *
 * 100% lectura sobre el trip + acciones rápidas (gasto, plantilla) y navegación
 * a pestañas (via onNavigateTab). No hardcodea ningún destino.
 */
export default function TripPrepPanel({ trip, onNavigateTab }) {
  const [showExpense, setShowExpense] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const today = todayISO();
  const phase = getTripPhase(trip, today);

  const daysAway = trip.startDate ? diffDaysISO(today, trip.startDate) : null;
  const ongoing = phase === 'ongoing';
  const upcomingSoon = phase === 'upcoming' && daysAway !== null && daysAway <= 14;

  // Estado de preparación (siempre calculado; barato)
  const prep = useMemo(() => {
    const checklist = trip.checklist || [];
    const pendingChecklist = checklist.filter(c => !c.checked);
    const hasAccom = (trip.accommodations || []).length > 0;
    const hasTransport = (trip.transports || []).length > 0;

    const budget = trip.budget || 0;
    const spent = (trip.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const remaining = budget - spent;
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

    // "Pendientes" de cara a salir: checklist sin marcar + faltas de info clave.
    const missing = pendingChecklist.length + (hasAccom ? 0 : 1) + (hasTransport ? 0 : 1);
    const ready = missing === 0 && checklist.length > 0;

    return {
      checklistTotal: checklist.length,
      pendingChecklist,
      hasAccom, hasTransport,
      budget, spent, remaining, pct,
      ready,
    };
  }, [trip]);

  // Sólo mostramos el panel si aporta: viaje en curso o próximo (≤14 días).
  if (!ongoing && !upcomingSoon) return null;

  const dayProgress = ongoing ? getTripDayProgress(trip, today) : null;

  const statusText = prep.ready
    ? 'Todo listo para salir'
    : ongoing ? 'A tope con el viaje' : 'Te falta rematar esto';

  const countdownLabel = ongoing
    ? (dayProgress ? `Día ${dayProgress.dayNumber} de ${dayProgress.totalDays}` : 'En curso')
    : daysAway === 0 ? 'Empieza hoy'
    : daysAway === 1 ? 'Empieza mañana'
    : `Faltan ${daysAway} días`;

  return (
    <section className={`prep-panel ${ongoing ? 'prep-panel--ongoing' : 'prep-panel--upcoming'}`}>
      <div className="prep-panel-top">
        <div className="prep-panel-badge">
          {ongoing ? <Zap size={13} /> : <Rocket size={13} />}
          {ongoing ? 'EN CURSO' : 'PREPARACIÓN'}
        </div>
        <span className="prep-panel-countdown">
          <CalendarDays size={13} /> {countdownLabel}
        </span>
      </div>

      <div className="prep-panel-status">
        {prep.ready
          ? <CheckCircle2 size={20} className="prep-status-icon ok" />
          : <AlertTriangle size={20} className="prep-status-icon warn" />}
        <h3 className="prep-panel-title">{statusText}</h3>
      </div>

      {/* Chips de estado */}
      <div className="prep-chips">
        <button
          className="prep-chip"
          onClick={() => onNavigateTab?.('checklist')}
          title="Abrir checklist"
        >
          <ListChecks size={14} />
          {prep.checklistTotal === 0
            ? 'Sin checklist'
            : prep.pendingChecklist.length === 0
              ? 'Checklist al día'
              : `${prep.pendingChecklist.length} pendiente${prep.pendingChecklist.length !== 1 ? 's' : ''}`}
        </button>

        <span className={`prep-chip ${prep.hasAccom ? 'ok' : 'warn'}`}>
          <Bed size={14} />
          {prep.hasAccom ? 'Alojamiento' : 'Falta alojamiento'}
        </span>

        <span className={`prep-chip ${prep.hasTransport ? 'ok' : 'warn'}`}>
          <Bus size={14} />
          {prep.hasTransport ? 'Transporte' : 'Falta transporte'}
        </span>

        {prep.budget > 0 && (
          <span className={`prep-chip ${prep.remaining < 0 ? 'warn' : 'ok'}`}>
            <Wallet size={14} />
            {prep.remaining >= 0
              ? `${formatCurrency(prep.remaining)} restante`
              : `${formatCurrency(Math.abs(prep.remaining))} de más`}
          </span>
        )}
      </div>

      {/* Checklist esencial pendiente (primeras 3) */}
      {prep.pendingChecklist.length > 0 && (
        <ul className="prep-pending-list">
          {prep.pendingChecklist.slice(0, 3).map(item => (
            <li key={item.id}>
              <span className="prep-pending-dot" /> {item.text}
            </li>
          ))}
          {prep.pendingChecklist.length > 3 && (
            <li className="prep-pending-more">
              +{prep.pendingChecklist.length - 3} más en el checklist
            </li>
          )}
        </ul>
      )}

      {/* Resumen presupuesto */}
      {prep.budget > 0 && (
        <div className="prep-budget">
          <div className="prep-budget-track">
            <div
              className="prep-budget-fill"
              style={{
                width: `${prep.pct}%`,
                background: prep.remaining < 0 ? 'var(--error)' : prep.pct >= 80 ? '#F97316' : 'var(--success)',
              }}
            />
          </div>
          <div className="prep-budget-labels">
            <span>Gastado {formatCurrency(prep.spent)}</span>
            <span>Presupuesto {formatCurrency(prep.budget)}</span>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="prep-actions">
        <button className="btn btn-primary prep-action-main" onClick={() => onNavigateTab?.('dayplan')}>
          {ongoing ? 'Plan de hoy' : 'Ver día de llegada'} <ArrowRight size={14} />
        </button>
        <button className="btn btn-secondary prep-action" onClick={() => setShowExpense(true)}>
          <Zap size={14} /> Gasto rápido
        </button>
        <button className="btn btn-secondary prep-action" onClick={() => onNavigateTab?.('checklist')}>
          <ListChecks size={14} /> Checklist
        </button>
        <button className="btn btn-ghost prep-action" onClick={() => setShowTemplate(true)}>
          <Sparkles size={14} /> Plantilla
        </button>
      </div>

      {showExpense && <QuickExpense trip={trip} onClose={() => setShowExpense(false)} />}
      {showTemplate && <TemplateModal trip={trip} onClose={() => setShowTemplate(false)} />}
    </section>
  );
}
