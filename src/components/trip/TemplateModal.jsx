import { useMemo, useState } from 'react';
import { Sparkles, CheckCircle2, ListChecks, CalendarDays, Info } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import { useToast } from '../Toast';
import { TRIP_TEMPLATES, computeTemplateApplication } from '../../utils/templates';
import { normalizeItinerary, formatDateShort } from '../../utils/helpers';

/**
 * Modal para aplicar una plantilla a un viaje existente.
 * Fusión SEGURA y aditiva:
 *   - Checklist: sólo añade lo que falta (dedup por texto).
 *   - Itinerario: sólo añade actividades que no existan ese día (dedup por título).
 *   - Nunca sobreescribe datos existentes.
 *
 * Persistencia atómica: setItinerary + addChecklistItems, ambos con contrato {ok}.
 */
export default function TemplateModal({ trip, onClose, defaultTemplateId = 'concierto' }) {
  const toast = useToast();
  const setItinerary = useTripStore(s => s.setItinerary);
  const addChecklistItems = useTripStore(s => s.addChecklistItems);

  const [selectedId, setSelectedId] = useState(defaultTemplateId);
  const template = TRIP_TEMPLATES.find(t => t.id === selectedId) || TRIP_TEMPLATES[0];

  const days = useMemo(() => normalizeItinerary(trip.itinerary || []), [trip.itinerary]);

  // Día de evento por defecto: el segundo si existe, si no el primero.
  const [eventDayId, setEventDayId] = useState(
    () => (days.length > 1 ? days[1].id : days[0]?.id) || '',
  );

  const [submitting, setSubmitting] = useState(false);

  const plan = useMemo(
    () => computeTemplateApplication(trip, template, { eventDayId }),
    [trip, template, eventDayId],
  );

  const nothingToAdd = plan.checklistToAdd.length === 0 && plan.activitiesAdded === 0;

  const handleApply = async () => {
    if (submitting) return;
    if (nothingToAdd) {
      toast('La plantilla ya está aplicada, nada nuevo que añadir', 'info');
      onClose();
      return;
    }
    setSubmitting(true);

    // 1) Itinerario (si hay días y actividades nuevas)
    if (plan.itinerary && plan.activitiesAdded > 0) {
      const r = await setItinerary(trip.id, plan.itinerary);
      if (!r?.ok) { setSubmitting(false); return; } // el bridge ya emite el toast
    }
    // 2) Checklist
    if (plan.checklistToAdd.length > 0) {
      const r = await addChecklistItems(trip.id, plan.checklistToAdd);
      if (!r?.ok) { setSubmitting(false); return; }
    }

    setSubmitting(false);
    toast('Plantilla aplicada', 'success');
    onClose();
  };

  return (
    <Modal
      title="Aplicar plantilla"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleApply} disabled={submitting}>
            <Sparkles size={15} />
            {nothingToAdd ? 'Ya aplicada' : 'Aplicar plantilla'}
          </button>
        </>
      }
    >
      {/* Selector de plantilla */}
      <div className="tpl-grid">
        {TRIP_TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`tpl-card ${selectedId === t.id ? 'active' : ''}`}
            onClick={() => setSelectedId(t.id)}
            type="button"
          >
            <span className="tpl-card-emoji">{t.emoji}</span>
            <span className="tpl-card-name">{t.name}</span>
          </button>
        ))}
      </div>

      <p className="tpl-desc">{template.description}</p>

      {/* Selector de día del evento */}
      {template.hasEventDay && days.length > 0 && (
        <div className="form-group" style={{ marginTop: 4 }}>
          <label className="form-label">¿Qué día es el concierto / evento?</label>
          <select
            className="form-input"
            value={eventDayId}
            onChange={e => setEventDayId(e.target.value)}
          >
            {days.map(d => (
              <option key={d.id} value={d.id}>
                Día {d.dayNumber} — {formatDateShort(d.date)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Resumen de lo que se añadirá */}
      <div className="tpl-summary">
        <div className="tpl-summary-row">
          <ListChecks size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>
            {plan.checklistToAdd.length > 0
              ? <><strong>{plan.checklistToAdd.length}</strong> tareas nuevas al checklist</>
              : 'Checklist: nada nuevo que añadir'}
            {plan.checklistSkipped > 0 && (
              <span className="tpl-muted"> · {plan.checklistSkipped} ya estaban</span>
            )}
          </span>
        </div>

        <div className="tpl-summary-row">
          <CalendarDays size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          {!plan.hasDays ? (
            <span className="tpl-muted">
              Este viaje no tiene fechas: sólo se añadirá el checklist. Añade fechas para el plan por días.
            </span>
          ) : plan.activitiesAdded > 0 ? (
            <span><strong>{plan.activitiesAdded}</strong> actividades nuevas en el plan</span>
          ) : (
            <span className="tpl-muted">Plan por días: nada nuevo que añadir</span>
          )}
        </div>

        {plan.daySummary.length > 0 && (
          <ul className="tpl-day-list">
            {plan.daySummary.map(d => (
              <li key={d.date}>
                <span className="tpl-day-tag">Día {d.dayNumber}</span>
                {d.added.join(' · ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="tpl-safe-note">
        <Info size={13} /> No se sobreescribe nada: la plantilla solo suma lo que falta.
      </p>
    </Modal>
  );
}
