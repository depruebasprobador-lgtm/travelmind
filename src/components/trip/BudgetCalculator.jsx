import { useState, useMemo, useEffect } from 'react';
import {
  Calculator, X, Save, RefreshCw, TrendingUp, Hotel,
  Plane, UtensilsCrossed, Sparkles, CheckCircle2, Info,
  ChevronDown, ChevronUp, PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import useTripStore from '../../data/store';
import { formatCurrency, getDaysBetween } from '../../utils/helpers';
import { useToast } from '../Toast';

// ── Category palette ──────────────────────────────────────────────────────────
const SLICES = [
  { key: 'alojamiento', label: 'Alojamiento', emoji: '🏨', color: '#6366F1' },
  { key: 'transporte',  label: 'Transporte',  emoji: '✈️', color: '#3B82F6' },
  { key: 'comida',      label: 'Comida',      emoji: '🍽️', color: '#F59E0B' },
  { key: 'actividades', label: 'Actividades', emoji: '🎭', color: '#10B981' },
  { key: 'extras',      label: 'Extras',      emoji: '✨', color: '#EC4899' },
];

// ── Custom tooltip for Pie ────────────────────────────────────────────────────
function CalcTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="calc-tooltip">
      <span>{d.emoji} {d.label}</span>
      <strong>{formatCurrency(d.value)}</strong>
      <span style={{ color: 'var(--text-tertiary)' }}>({d.pct}%)</span>
    </div>
  );
}

// ── Number input field ────────────────────────────────────────────────────────
function CalcInput({ label, icon: Icon, value, onChange, min = 0, step = 1, unit = '€', helper }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label">
        <span className="calc-input-icon"><Icon size={15} /></span>
        {label}
        {helper && (
          <span className="calc-input-helper" title={helper}>
            <Info size={12} />
          </span>
        )}
      </label>
      <div className="calc-input-wrap">
        <input
          type="number"
          className="form-input calc-input"
          value={value}
          min={min}
          step={step}
          onChange={e => onChange(Number(e.target.value) || 0)}
        />
        {unit && <span className="calc-input-unit">{unit}</span>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BudgetCalculator({ trip, onClose }) {
  const toast = useToast();
  const { saveBudgetEstimation } = useTripStore();

  // Auto-fill from trip dates if available
  const tripDays = getDaysBetween(trip.startDate, trip.endDate);

  // Inputs — initialise from saved estimation if it exists
  const saved = trip.budgetEstimation;
  const [days, setDays]           = useState(saved?.days ?? tripDays ?? 7);
  const [accom, setAccom]         = useState(saved?.accommodationPerNight ?? 80);
  const [daily, setDaily]         = useState(saved?.dailySpend ?? 60);
  const [transport, setTransport] = useState(saved?.transport ?? 200);
  const [activities, setActivities] = useState(saved?.activities ?? 0);
  const [extras, setExtras]       = useState(saved?.extras ?? 0);
  const [savedState, setSavedState] = useState(!!saved);

  // Derived calculations
  const calc = useMemo(() => {
    const accommodationTotal = accom * days;
    const foodTotal          = daily * days;
    const activitiesTotal    = activities * days;

    const subtotals = {
      alojamiento: accommodationTotal,
      transporte:  transport,
      comida:      foodTotal,
      actividades: activitiesTotal,
      extras:      extras,
    };

    const total = Object.values(subtotals).reduce((s, v) => s + v, 0);
    const costPerDay = days > 0 ? total / days : 0;

    const slices = SLICES
      .map(s => ({
        ...s,
        value: subtotals[s.key] || 0,
        pct: total > 0 ? ((subtotals[s.key] || 0) / total * 100).toFixed(1) : '0.0',
      }))
      .filter(s => s.value > 0);

    return { total, costPerDay, subtotals, slices };
  }, [days, accom, daily, transport, activities, extras]);

  // Mark unsaved whenever any input changes after first save
  useEffect(() => { setSavedState(false); }, [days, accom, daily, transport, activities, extras]);

  const handleSave = () => {
    const estimation = {
      days,
      accommodationPerNight: accom,
      dailySpend: daily,
      transport,
      activities,
      extras,
      total: calc.total,
      costPerDay: calc.costPerDay,
      savedAt: new Date().toISOString(),
    };
    saveBudgetEstimation(trip.id, estimation);
    setSavedState(true);
    toast('Estimación guardada en el viaje', 'success');
  };

  const handleReset = () => {
    setDays(tripDays ?? 7);
    setAccom(80);
    setDaily(60);
    setTransport(200);
    setActivities(0);
    setExtras(0);
    setSavedState(false);
  };

  return (
    <div className="calc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="calc-panel">

        {/* ── Header ── */}
        <div className="calc-header">
          <div className="calc-header-left">
            <div className="calc-header-icon">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="calc-title">Calculadora de presupuesto</h2>
              <p className="calc-subtitle">Estimación para <strong>{trip.destination}</strong></p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="calc-body">
          {/* ── Left column: Inputs ── */}
          <div className="calc-inputs-col">
            <p className="calc-section-label">Parámetros del viaje</p>

            <CalcInput
              label="Número de días"
              icon={TrendingUp}
              value={days}
              onChange={setDays}
              min={1}
              unit="días"
              helper={tripDays ? `Tu viaje dura ${tripDays} días según las fechas` : null}
            />
            <CalcInput
              label="Alojamiento por noche"
              icon={Hotel}
              value={accom}
              onChange={setAccom}
              step={5}
              helper="Precio medio por noche (hotel, Airbnb…)"
            />
            <CalcInput
              label="Gasto diario estimado"
              icon={UtensilsCrossed}
              value={daily}
              onChange={setDaily}
              step={5}
              helper="Comida, transporte local, pequeños gastos"
            />
            <CalcInput
              label="Transporte principal"
              icon={Plane}
              value={transport}
              onChange={setTransport}
              step={10}
              helper="Vuelos, tren, ferry…"
            />
            <CalcInput
              label="Actividades por día"
              icon={Sparkles}
              value={activities}
              onChange={setActivities}
              step={5}
              helper="Museos, excursiones, tours…"
            />
            <CalcInput
              label="Extras / imprevistos"
              icon={Sparkles}
              value={extras}
              onChange={setExtras}
              step={25}
              helper="Colchón para imprevistos, compras…"
            />

            {/* Trip dates hint */}
            {trip.startDate && trip.endDate && (
              <p className="calc-dates-hint">
                📅 Viaje: {new Date(trip.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} —{' '}
                {new Date(trip.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}({tripDays} días)
              </p>
            )}
          </div>

          {/* ── Right column: Results ── */}
          <div className="calc-results-col">
            <p className="calc-section-label">Estimación</p>

            {/* KPIs */}
            <div className="calc-kpi-grid">
              <div className="calc-kpi calc-kpi-total">
                <div className="calc-kpi-label">Coste total estimado</div>
                <div className="calc-kpi-value">{formatCurrency(calc.total)}</div>
              </div>
              <div className="calc-kpi">
                <div className="calc-kpi-label">Coste por día</div>
                <div className="calc-kpi-value" style={{ fontSize: '1.3rem' }}>
                  {formatCurrency(calc.costPerDay)}
                </div>
              </div>
            </div>

            {/* Donut chart */}
            {calc.slices.length > 0 ? (
              <div className="calc-chart-wrap">
                <p className="calc-section-label" style={{ marginBottom: 8 }}>Distribución de gastos</p>
                <div className="calc-chart-layout">
                  <div style={{ height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={calc.slices}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {calc.slices.map((s, i) => (
                            <Cell key={i} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CalcTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend bars */}
                  <div className="calc-legend">
                    {calc.slices.map((s, i) => (
                      <div key={i} className="calc-legend-item">
                        <span className="calc-legend-dot" style={{ background: s.color }} />
                        <span className="calc-legend-label">{s.emoji} {s.label}</span>
                        <div className="calc-legend-bar-wrap">
                          <div
                            className="calc-legend-bar"
                            style={{ width: `${s.pct}%`, background: s.color }}
                          />
                        </div>
                        <span className="calc-legend-pct">{s.pct}%</span>
                        <span className="calc-legend-amount">{formatCurrency(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="calc-empty">
                <PieChartIcon size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                <p>Introduce valores para ver la distribución</p>
              </div>
            )}

            {/* Breakdown table */}
            {calc.total > 0 && (
              <div className="calc-breakdown">
                <p className="calc-section-label" style={{ marginBottom: 8 }}>Desglose detallado</p>
                <table className="calc-table">
                  <tbody>
                    {calc.slices.map((s, i) => (
                      <tr key={i} className="calc-table-row">
                        <td className="calc-table-cat">
                          <span className="calc-table-dot" style={{ background: s.color }} />
                          {s.emoji} {s.label}
                        </td>
                        <td className="calc-table-amount">{formatCurrency(s.value)}</td>
                        <td className="calc-table-pct">{s.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="calc-table-total">
                      <td>Total</td>
                      <td>{formatCurrency(calc.total)}</td>
                      <td>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Comparison with trip budget */}
            {trip.budget > 0 && calc.total > 0 && (
              <div className={`calc-compare ${calc.total > trip.budget ? 'over' : 'under'}`}>
                {calc.total > trip.budget ? (
                  <>
                    <span>⚠️</span>
                    <span>
                      La estimación supera el presupuesto del viaje en{' '}
                      <strong>{formatCurrency(calc.total - trip.budget)}</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>
                      La estimación está dentro del presupuesto. Margen:{' '}
                      <strong>{formatCurrency(trip.budget - calc.total)}</strong>.
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Saved confirmation */}
            {savedState && saved && (
              <div className="calc-saved-badge">
                <CheckCircle2 size={15} />
                Estimación guardada · {new Date(saved.savedAt).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="calc-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            <RefreshCw size={14} /> Reiniciar
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button
              className={`btn btn-primary calc-save-btn ${savedState ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={calc.total === 0}
            >
              {savedState
                ? <><CheckCircle2 size={15} /> Guardado</>
                : <><Save size={15} /> Guardar estimación</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
