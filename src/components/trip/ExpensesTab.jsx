import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Target, Calendar, BarChart2, PieChart as PieChartIcon,
  ChevronDown, ChevronUp, Wallet
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import { formatCurrency, formatDate, getDaysBetween } from '../../utils/helpers';

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'alojamiento', label: 'Alojamiento', emoji: '🏨', color: '#6366F1' },
  { value: 'transporte',  label: 'Transporte',  emoji: '✈️', color: '#3B82F6' },
  { value: 'comida',      label: 'Comida',      emoji: '🍽️', color: '#F59E0B' },
  { value: 'actividades', label: 'Actividades', emoji: '🎭', color: '#10B981' },
  { value: 'compras',     label: 'Compras',     emoji: '🛍️', color: '#EC4899' },
  { value: 'otros',       label: 'Otros',       emoji: '📌', color: '#9CA3AF' },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="expense-chart-tooltip">
      {label && <p className="expense-tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, emoji } = payload[0].payload;
  return (
    <div className="expense-chart-tooltip">
      <p>{emoji} {name}: <strong>{formatCurrency(value)}</strong></p>
    </div>
  );
}

// ── Budget Panel ──────────────────────────────────────────────────────────────
function BudgetPanel({ trip, totalExpenses }) {
  const budget = trip.budget || 0;
  const remaining = budget - totalExpenses;
  const pct = budget > 0 ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const overBudget = remaining < 0;

  // Trip duration stats
  const tripDays = getDaysBetween(trip.startDate, trip.endDate);
  const avgDailySpend = tripDays > 0 ? totalExpenses / tripDays : 0;
  const projectedTotal = budget > 0 ? avgDailySpend * tripDays : 0;
  const daysElapsed = (() => {
    if (!trip.startDate) return 0;
    const start = new Date(trip.startDate);
    const today = new Date();
    return Math.max(0, Math.min(tripDays, Math.ceil((today - start) / (1000 * 60 * 60 * 24))));
  })();
  const daysRemaining = Math.max(0, tripDays - daysElapsed);
  const projectedFinal = avgDailySpend * tripDays;

  const progressColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F97316' : '#10B981';

  return (
    <div className={`expense-budget-panel ${overBudget ? 'over-budget' : ''}`}>
      {/* Over-budget alert */}
      {overBudget && (
        <div className="expense-budget-alert">
          <AlertTriangle size={18} />
          <span>
            ¡Has superado el presupuesto en <strong>{formatCurrency(Math.abs(remaining))}</strong>!
          </span>
        </div>
      )}

      {/* Main KPI row */}
      <div className="expense-kpi-grid">
        <div className="expense-kpi">
          <div className="expense-kpi-icon" style={{ background: 'rgba(79,70,229,0.12)' }}>
            <Target size={20} color="#6366F1" />
          </div>
          <div>
            <div className="expense-kpi-value">{formatCurrency(budget)}</div>
            <div className="expense-kpi-label">Presupuesto total</div>
          </div>
        </div>

        <div className="expense-kpi">
          <div className="expense-kpi-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <DollarSign size={20} color="#EF4444" />
          </div>
          <div>
            <div className="expense-kpi-value" style={{ color: 'var(--error)' }}>
              {formatCurrency(totalExpenses)}
            </div>
            <div className="expense-kpi-label">Total gastado</div>
          </div>
        </div>

        <div className="expense-kpi">
          <div className="expense-kpi-icon" style={{ background: `rgba(${overBudget ? '239,68,68' : '16,185,129'},0.12)` }}>
            <Wallet size={20} color={overBudget ? '#EF4444' : '#10B981'} />
          </div>
          <div>
            <div className="expense-kpi-value" style={{ color: overBudget ? 'var(--error)' : 'var(--success)' }}>
              {formatCurrency(Math.abs(remaining))}
            </div>
            <div className="expense-kpi-label">{overBudget ? 'Excedido' : 'Restante'}</div>
          </div>
        </div>

        <div className="expense-kpi">
          <div className="expense-kpi-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Calendar size={20} color="#F59E0B" />
          </div>
          <div>
            <div className="expense-kpi-value">{formatCurrency(avgDailySpend)}</div>
            <div className="expense-kpi-label">Gasto medio/día</div>
          </div>
        </div>
      </div>

      {/* Budget progress bar */}
      {budget > 0 && (
        <div className="expense-progress-section">
          <div className="expense-progress-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Uso del presupuesto
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: progressColor }}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="expense-progress-track">
            <div
              className="expense-progress-fill"
              style={{ width: `${pct}%`, background: progressColor }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            <span>€0</span>
            <span>{formatCurrency(budget)}</span>
          </div>
        </div>
      )}

      {/* Projection row */}
      {tripDays > 0 && totalExpenses > 0 && (
        <div className="expense-projection-row">
          <div className="expense-projection-item">
            <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>
              <strong>{tripDays}</strong> días de viaje
              {daysElapsed > 0 && <> · <strong>{daysElapsed}</strong> transcurridos · <strong>{daysRemaining}</strong> restantes</>}
            </span>
          </div>
          {budget > 0 && (
            <div className={`expense-projection-item ${projectedFinal > budget ? 'danger' : 'safe'}`}>
              {projectedFinal > budget ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span>
                Proyección al final del viaje: <strong>{formatCurrency(projectedFinal)}</strong>
                {projectedFinal > budget && (
                  <span style={{ color: 'var(--error)', marginLeft: 6 }}>
                    ({formatCurrency(projectedFinal - budget)} sobre presupuesto)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Charts section ─────────────────────────────────────────────────────────────
function ChartsSection({ expenses, trip }) {
  const [activeChart, setActiveChart] = useState('category'); // 'category' | 'daily'

  // By category
  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const key = e.category || 'otros';
      map[key] = (map[key] || 0) + (e.amount || 0);
    });
    return Object.entries(map)
      .map(([key, value]) => ({
        ...CAT_MAP[key] || CAT_MAP['otros'],
        name: (CAT_MAP[key] || CAT_MAP['otros']).label,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // By day
  const dailyData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (!e.date) {
        map['Sin fecha'] = (map['Sin fecha'] || 0) + (e.amount || 0);
      } else {
        const label = new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        map[label] = (map[label] || 0) + (e.amount || 0);
      }
    });

    // Build ordered array from trip date range
    const result = [];
    if (trip.startDate && trip.endDate) {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        result.push({ name: label, gastado: map[label] || 0 });
      }
    }
    // Append any un-dated expense
    if (map['Sin fecha']) result.push({ name: 'Sin fecha', gastado: map['Sin fecha'] });
    return result.length > 0 ? result : Object.entries(map).map(([name, gastado]) => ({ name, gastado }));
  }, [expenses, trip]);

  const budget = trip.budget || 0;
  const tripDays = getDaysBetween(trip.startDate, trip.endDate);
  const dailyBudget = (budget > 0 && tripDays > 0) ? budget / tripDays : 0;

  return (
    <div className="expense-charts-card card">
      {/* Chart toggle */}
      <div className="expense-charts-header">
        <h4 className="expense-charts-title">
          <BarChart2 size={18} color="var(--primary)" /> Análisis de gastos
        </h4>
        <div className="expense-chart-tabs">
          <button
            className={`expense-chart-tab ${activeChart === 'category' ? 'active' : ''}`}
            onClick={() => setActiveChart('category')}
          >
            <PieChartIcon size={13} /> Por categoría
          </button>
          <button
            className={`expense-chart-tab ${activeChart === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveChart('daily')}
          >
            <BarChart2 size={13} /> Por día
          </button>
        </div>
      </div>

      {activeChart === 'category' ? (
        <div className="expense-chart-body">
          {categoryData.length === 0 ? (
            <div className="expense-chart-empty">No hay datos</div>
          ) : (
            <div className="expense-cat-layout">
              {/* Pie */}
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list */}
              <div className="expense-cat-legend">
                {categoryData.map((cat, i) => {
                  const total = categoryData.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="expense-cat-legend-item">
                      <div className="expense-cat-dot" style={{ background: cat.color }} />
                      <span className="expense-cat-legend-name">{cat.emoji} {cat.name}</span>
                      <div className="expense-cat-legend-bar-wrap">
                        <div className="expense-cat-legend-bar" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                      <span className="expense-cat-legend-pct">{pct}%</span>
                      <span className="expense-cat-legend-amount">{formatCurrency(cat.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="expense-chart-body">
          {dailyData.length === 0 ? (
            <div className="expense-chart-empty">Añade fechas a tus gastos para ver este gráfico</div>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `€${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  {dailyBudget > 0 && (
                    <ReferenceLine
                      y={dailyBudget}
                      stroke="#F97316"
                      strokeDasharray="6 3"
                      label={{ value: `Límite diario ${formatCurrency(dailyBudget)}`, position: 'insideTopRight', fontSize: 11, fill: '#F97316' }}
                    />
                  )}
                  <Bar dataKey="gastado" name="Gastado" fill="#6366F1" radius={[5, 5, 0, 0]}>
                    {dailyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={dailyBudget > 0 && entry.gastado > dailyBudget ? '#EF4444' : '#6366F1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ExpensesTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ description: '', amount: '', category: 'otros', date: '' });
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc' | 'amount-desc' | 'category'

  const { addExpense, updateExpense, deleteExpense } = useTripStore();

  const resetForm = () => {
    setForm({ description: '', amount: '', category: 'otros', date: '' });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (expense) => {
    setEditing(expense);
    setForm({
      description: expense.description,
      amount: expense.amount || '',
      category: expense.category || 'otros',
      date: expense.date || '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.description.trim() || !form.amount) return;
    const data = { ...form, amount: Number(form.amount) };
    if (editing) updateExpense(trip.id, editing.id, data);
    else addExpense(trip.id, data);
    resetForm();
  };

  const expenses = trip.expenses || [];
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    const copy = [...expenses];
    if (sortBy === 'date-desc') return copy.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (sortBy === 'amount-desc') return copy.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    if (sortBy === 'category') return copy.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    return copy;
  }, [expenses, sortBy]);

  return (
    <div className="expenses-container">

      {/* ── Budget Panel ── */}
      <BudgetPanel trip={trip} totalExpenses={totalExpenses} />

      {/* ── Charts ── */}
      {expenses.length > 0 && (
        <ChartsSection expenses={expenses} trip={trip} />
      )}

      {/* ── Expenses list header ── */}
      <div className="expense-list-header">
        <h4 className="expense-list-title">
          <DollarSign size={18} color="var(--primary)" />
          Registro de gastos
          <span className="expense-list-count">{expenses.length}</span>
        </h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="expense-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date-desc">Más recientes</option>
            <option value="amount-desc">Mayor importe</option>
            <option value="category">Por categoría</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Añadir gasto
          </button>
        </div>
      </div>

      {/* ── Expenses table / empty ── */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={36} />}
          title="Sin gastos registrados"
          description="Añade tus gastos para llevar el control del presupuesto y ver análisis."
        />
      ) : (
        <div className="card expense-table-card">
          <div className="expense-table-scroll">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Importe</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((e) => {
                const cat = CAT_MAP[e.category] || CAT_MAP['otros'];
                return (
                  <tr key={e.id} className="expense-row">
                    <td className="expense-td expense-date">
                      {e.date ? formatDate(e.date) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="expense-td expense-desc">{e.description}</td>
                    <td className="expense-td">
                      <span className="expense-cat-pill" style={{ '--cat-color': cat.color }}>
                        {cat.emoji} {cat.label}
                      </span>
                    </td>
                    <td className="expense-td expense-amount">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="expense-td">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-icon btn-sm" onClick={() => startEdit(e)} title="Editar">
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ color: 'var(--error)' }}
                          onClick={() => deleteExpense(trip.id, e.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="expense-total-row">
                <td colSpan={3} style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.9rem' }}>
                  Total
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                  {formatCurrency(totalExpenses)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <Modal
          title={editing ? 'Editar gasto' : 'Nuevo gasto'}
          onClose={resetForm}
          footer={
            <>
              <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.description.trim() || !form.amount}>
                {editing ? 'Guardar cambios' : 'Añadir gasto'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <input
              className="form-input"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Cena en pizzería"
              autoFocus
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Importe (€) *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha (opcional)</label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
