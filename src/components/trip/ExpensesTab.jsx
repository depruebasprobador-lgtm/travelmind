import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Target, Calendar, BarChart2, PieChart as PieChartIcon,
  ChevronDown, ChevronUp, Wallet, Users, ArrowRight, Check, X, Calculator,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import BudgetCalculator from './BudgetCalculator';
import EmptyState from '../EmptyState';
import { formatCurrency, formatDate, getDaysBetween, formatDateShort, addDaysISO, compareISODates } from '../../utils/helpers';
import { computeBalances, simplifyByCurrency, computeShares } from '../../utils/settlement';

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

// Paleta para los avatares de participantes
const PARTICIPANT_PALETTE = [
  '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#A855F7',
];
const pickColor = (n) => PARTICIPANT_PALETTE[n % PARTICIPANT_PALETTE.length];

const CURRENCIES = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CHF', symbol: 'Fr' },
];

const fmtAmount = (amount, currency = 'EUR') => {
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '€';
  return `${Number(amount || 0).toFixed(2)} ${sym}`;
};

// ── Custom Tooltips ───────────────────────────────────────────────────────────
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

// ── Budget Panel (sin cambios) ────────────────────────────────────────────────
function BudgetPanel({ trip, totalExpenses, onOpenCalc }) {
  const budget = trip.budget || 0;
  const remaining = budget - totalExpenses;
  const pct = budget > 0 ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const overBudget = remaining < 0;

  const tripDays = getDaysBetween(trip.startDate, trip.endDate);
  const avgDailySpend = tripDays > 0 ? totalExpenses / tripDays : 0;
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
      <div className="expense-budget-head">
        <h4 className="expense-budget-title">
          <Wallet size={17} color="var(--primary)" /> Presupuesto vs gasto real
        </h4>
        <button className="btn btn-secondary btn-sm" onClick={onOpenCalc}>
          <Calculator size={14} /> Estimar
        </button>
      </div>
      {overBudget && (
        <div className="expense-budget-alert">
          <AlertTriangle size={18} />
          <span>¡Has superado el presupuesto en <strong>{formatCurrency(Math.abs(remaining))}</strong>!</span>
        </div>
      )}
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
            <div className="expense-kpi-value" style={{ color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</div>
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
      {budget > 0 && (
        <div className="expense-progress-section">
          <div className="expense-progress-header">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Uso del presupuesto</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: progressColor }}>{pct.toFixed(1)}%</span>
          </div>
          <div className="expense-progress-track">
            <div className="expense-progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            <span>€0</span>
            <span>{formatCurrency(budget)}</span>
          </div>
        </div>
      )}
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

// ── Charts section (sin cambios) ──────────────────────────────────────────────
function ChartsSection({ expenses, trip }) {
  const [activeChart, setActiveChart] = useState('category');

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

  const dailyData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (!e.date) {
        map['Sin fecha'] = (map['Sin fecha'] || 0) + (e.amount || 0);
      } else {
        const label = formatDateShort(e.date);
        map[label] = (map[label] || 0) + (e.amount || 0);
      }
    });
    const result = [];
    if (trip.startDate && trip.endDate) {
      let cursor = String(trip.startDate).slice(0, 10);
      const last = String(trip.endDate).slice(0, 10);
      for (let safety = 0; safety < 3650 && compareISODates(cursor, last) <= 0; safety++) {
        const label = formatDateShort(cursor);
        result.push({ name: label, gastado: map[label] || 0 });
        cursor = addDaysISO(cursor, 1);
      }
    }
    if (map['Sin fecha']) result.push({ name: 'Sin fecha', gastado: map['Sin fecha'] });
    return result.length > 0 ? result : Object.entries(map).map(([name, gastado]) => ({ name, gastado }));
  }, [expenses, trip]);

  const budget = trip.budget || 0;
  const tripDays = getDaysBetween(trip.startDate, trip.endDate);
  const dailyBudget = (budget > 0 && tripDays > 0) ? budget / tripDays : 0;

  return (
    <div className="expense-charts-card card">
      <div className="expense-charts-header">
        <h4 className="expense-charts-title">
          <BarChart2 size={18} color="var(--primary)" /> Análisis de gastos
        </h4>
        <div className="expense-chart-tabs">
          <button className={`expense-chart-tab ${activeChart === 'category' ? 'active' : ''}`} onClick={() => setActiveChart('category')}>
            <PieChartIcon size={13} /> Por categoría
          </button>
          <button className={`expense-chart-tab ${activeChart === 'daily' ? 'active' : ''}`} onClick={() => setActiveChart('daily')}>
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
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                      {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  {dailyBudget > 0 && (
                    <ReferenceLine y={dailyBudget} stroke="#F97316" strokeDasharray="6 3"
                      label={{ value: `Límite diario ${formatCurrency(dailyBudget)}`, position: 'insideTopRight', fontSize: 11, fill: '#F97316' }} />
                  )}
                  <Bar dataKey="gastado" name="Gastado" fill="#6366F1" radius={[5, 5, 0, 0]}>
                    {dailyData.map((entry, i) => (
                      <Cell key={i} fill={dailyBudget > 0 && entry.gastado > dailyBudget ? '#EF4444' : '#6366F1'} />
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

// ── Participants section ──────────────────────────────────────────────────────
function ParticipantsSection({ trip }) {
  const { addParticipant, updateParticipant, deleteParticipant } = useTripStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const participants = trip.participants || [];

  const handleAdd = (e) => {
    e?.preventDefault?.();
    if (!newName.trim()) return;
    addParticipant(trip.id, newName.trim(), pickColor(participants.length));
    setNewName('');
  };

  const startEdit = (p) => { setEditingId(p.id); setEditName(p.name); };
  const saveEdit = () => {
    if (!editName.trim()) return;
    updateParticipant(trip.id, editingId, { name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="card sh-participants-card">
      <div className="sh-section-header">
        <h4 className="sh-section-title">
          <Users size={18} color="var(--primary)" />
          Participantes
          <span className="expense-list-count">{participants.length}</span>
        </h4>
      </div>

      <form className="sh-participant-form" onSubmit={handleAdd}>
        <input
          className="form-input"
          placeholder="Nombre (ej: Diego, Celia, Esnupi...)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!newName.trim()}>
          <Plus size={14} /> Añadir
        </button>
      </form>

      {participants.length > 0 ? (
        <div className="sh-participant-list">
          {participants.map(p => (
            <div key={p.id} className="sh-participant-chip" style={{ borderColor: p.color }}>
              <span className="sh-participant-avatar" style={{ background: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              {editingId === p.id ? (
                <>
                  <input
                    className="form-input form-input-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <button className="btn btn-icon btn-sm" onClick={saveEdit}><Check size={13} /></button>
                  <button className="btn btn-icon btn-sm" onClick={() => setEditingId(null)}><X size={13} /></button>
                </>
              ) : (
                <>
                  <span className="sh-participant-name">{p.name}</span>
                  <button className="btn btn-icon btn-sm" onClick={() => startEdit(p)} title="Editar">
                    <Edit3 size={12} />
                  </button>
                  <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }}
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${p.name}? Sus referencias en gastos se limpiarán.`)) {
                        deleteParticipant(trip.id, p.id);
                      }
                    }}
                    title="Eliminar">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="sh-participants-empty">
          Añade primero los nombres de las personas que comparten gastos en este viaje.
        </p>
      )}
    </div>
  );
}

// ── Settlement section (balances + transfers) ────────────────────────────────
function SettlementSection({ trip }) {
  const expenses = trip.expenses || [];
  const participants = trip.participants || [];

  const { balances, totalsByCurrency, warnings } = useMemo(
    () => computeBalances(expenses, participants),
    [expenses, participants],
  );
  const transfersByCurrency = useMemo(() => simplifyByCurrency(balances), [balances]);

  const partMap = useMemo(
    () => Object.fromEntries(participants.map(p => [p.id, p])),
    [participants],
  );

  if (participants.length < 2) return null;

  // ¿Hay algún expense con datos suficientes?
  const hasShared = expenses.some(e => e.paidBy && (e.splitBetween || []).length > 0);
  if (!hasShared) {
    return (
      <div className="card sh-settle-card">
        <h4 className="sh-section-title" style={{ marginBottom: 8 }}>
          <Wallet size={18} color="var(--primary)" /> Saldar cuentas
        </h4>
        <p className="sh-settle-empty">
          Asigna pagador y partícipes a tus gastos para que aparezca aquí la liquidación.
        </p>
      </div>
    );
  }

  return (
    <div className="card sh-settle-card">
      <h4 className="sh-section-title" style={{ marginBottom: 12 }}>
        <Wallet size={18} color="var(--primary)" /> Saldar cuentas
      </h4>

      {warnings.length > 0 && (
        <div className="sh-warnings">
          {warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="sh-warning"><AlertTriangle size={12} /> {w}</div>
          ))}
        </div>
      )}

      {Object.keys(balances).map(currency => {
        const bals = balances[currency];
        const transfers = transfersByCurrency[currency] || [];
        const total = totalsByCurrency[currency] || 0;

        return (
          <div key={currency} className="sh-currency-block">
            <div className="sh-currency-header">
              <span className="sh-currency-tag">{currency}</span>
              <span className="sh-currency-total">Total compartido: <strong>{fmtAmount(total, currency)}</strong></span>
            </div>

            {/* Balances */}
            <div className="sh-balances">
              {participants.map(p => {
                const v = bals[p.id] || 0;
                const positive = v > 0.005;
                const negative = v < -0.005;
                return (
                  <div key={p.id} className={`sh-balance-row ${positive ? 'positive' : negative ? 'negative' : 'neutral'}`}>
                    <span className="sh-participant-avatar sh-balance-avatar" style={{ background: p.color }}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="sh-balance-name">{p.name}</span>
                    <span className="sh-balance-amount">
                      {positive && <>recibe <strong>{fmtAmount(v, currency)}</strong></>}
                      {negative && <>debe <strong>{fmtAmount(-v, currency)}</strong></>}
                      {!positive && !negative && <span style={{ opacity: 0.6 }}>al día</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Transfers */}
            {transfers.length === 0 ? (
              <div className="sh-transfers-empty">
                <Check size={16} /> Cuentas saldadas, no hace falta ninguna transferencia.
              </div>
            ) : (
              <>
                <p className="sh-transfers-help">
                  {transfers.length} transferencia{transfers.length !== 1 ? 's' : ''} para saldar todas las cuentas:
                </p>
                <div className="sh-transfers-list">
                  {transfers.map((t, i) => (
                    <div key={i} className="sh-transfer-row">
                      <span className="sh-participant-avatar" style={{ background: partMap[t.from]?.color }}>
                        {partMap[t.from]?.name?.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="sh-transfer-name">{partMap[t.from]?.name || '—'}</span>
                      <ArrowRight size={14} className="sh-transfer-arrow" />
                      <span className="sh-participant-avatar" style={{ background: partMap[t.to]?.color }}>
                        {partMap[t.to]?.name?.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="sh-transfer-name">{partMap[t.to]?.name || '—'}</span>
                      <span className="sh-transfer-amount">{fmtAmount(t.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ExpensesTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    description: '', amount: '', category: 'otros', date: '',
    currency: 'EUR', paidBy: '', splitBetween: [],
  });
  const [sortBy, setSortBy] = useState('date-desc');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  const { addExpense, updateExpense, deleteExpense } = useTripStore();
  const saveStatus = useTripStore(s => s.saveStatus);
  const isSaving = saveStatus === 'saving';

  const participants = trip.participants || [];
  const partMap = useMemo(
    () => Object.fromEntries(participants.map(p => [p.id, p])),
    [participants],
  );

  const resetForm = () => {
    setForm({
      description: '', amount: '', category: 'otros', date: '',
      currency: 'EUR', paidBy: '', splitBetween: [],
    });
    setEditing(null);
    setShowForm(false);
    setFormError('');
  };

  const startEdit = (expense) => {
    setEditing(expense);
    setForm({
      description: expense.description,
      amount: expense.amount || '',
      category: expense.category || 'otros',
      date: expense.date || '',
      currency: expense.currency || 'EUR',
      paidBy: expense.paidBy || '',
      splitBetween: expense.splitBetween || (participants.length > 0 ? participants.map(p => p.id) : []),
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    resetForm();
    setForm(f => ({
      ...f,
      paidBy: participants[0]?.id || '',
      splitBetween: participants.map(p => p.id),
    }));
    setShowForm(true);
  };

  const validate = () => {
    if (!form.description.trim()) return 'La descripción es obligatoria.';
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      return 'El importe debe ser mayor que 0.';
    }
    // Si hay participantes y el gasto es compartido, splitBetween no puede estar vacío
    if (participants.length > 0 && form.splitBetween.length === 0) {
      return 'Selecciona al menos un participante con quien dividir el gasto.';
    }
    return '';
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    const v = validate();
    if (v) { setFormError(v); return; }
    setFormError('');
    setIsSubmitting(true);
    const data = {
      ...form,
      amount: Number(form.amount),
      paidBy: form.paidBy || null,
      splitBetween: form.splitBetween,
      splitMode: 'equal',
    };
    const r = editing
      ? await updateExpense(trip.id, editing.id, data)
      : await addExpense(trip.id, data);
    setIsSubmitting(false);
    if (!r?.ok) return;
    resetForm();
  };

  const toggleSplit = (id) => {
    setForm(f => ({
      ...f,
      splitBetween: f.splitBetween.includes(id)
        ? f.splitBetween.filter(x => x !== id)
        : [...f.splitBetween, id],
    }));
  };

  const expenses = trip.expenses || [];
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const sortedExpenses = useMemo(() => {
    const copy = [...expenses];
    if (sortBy === 'date-desc') return copy.sort((a, b) => compareISODates(b.date, a.date));
    if (sortBy === 'amount-desc') return copy.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    if (sortBy === 'category') return copy.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    return copy;
  }, [expenses, sortBy]);

  const hasParticipants = participants.length > 0;

  return (
    <div className="expenses-container">
      <BudgetPanel trip={trip} totalExpenses={totalExpenses} onOpenCalc={() => setShowCalc(true)} />
      {expenses.length > 0 && <ChartsSection expenses={expenses} trip={trip} />}

      {/* Participantes — si hay 2+, también mostramos liquidación */}
      <ParticipantsSection trip={trip} />
      <SettlementSection trip={trip} />

      {/* Lista de gastos */}
      <div className="expense-list-header">
        <h4 className="expense-list-title">
          <DollarSign size={18} color="var(--primary)" />
          Registro de gastos
          <span className="expense-list-count">{expenses.length}</span>
        </h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="expense-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date-desc">Más recientes</option>
            <option value="amount-desc">Mayor importe</option>
            <option value="category">Por categoría</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={openNewForm}>
            <Plus size={14} /> Añadir gasto
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={<DollarSign size={36} />} title="Sin gastos registrados"
          description="Añade tus gastos para llevar el control del presupuesto y ver análisis." />
      ) : (
        <div className="card expense-table-card">
          <div className="expense-table-scroll">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Pagador</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((e) => {
                  const cat = CAT_MAP[e.category] || CAT_MAP['otros'];
                  const payer = e.paidBy ? partMap[e.paidBy] : null;
                  const splitCount = (e.splitBetween || []).length;
                  return (
                    <tr key={e.id} className="expense-row">
                      <td className="expense-td expense-date">
                        {e.date ? formatDate(e.date) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td className="expense-td expense-desc">
                        {e.description}
                        {splitCount > 0 && (
                          <span className="sh-split-tag" title={`Dividido entre ${splitCount}`}>
                            ÷ {splitCount}
                          </span>
                        )}
                      </td>
                      <td className="expense-td">
                        <span className="expense-cat-pill" style={{ '--cat-color': cat.color }}>
                          {cat.emoji} {cat.label}
                        </span>
                      </td>
                      <td className="expense-td">
                        {payer ? (
                          <span className="sh-payer-chip">
                            <span className="sh-participant-avatar sh-mini-avatar" style={{ background: payer.color }}>
                              {payer.name.slice(0, 1).toUpperCase()}
                            </span>
                            {payer.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td className="expense-td expense-amount">
                        {fmtAmount(e.amount, e.currency || 'EUR')}
                      </td>
                      <td className="expense-td">
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-icon btn-sm" onClick={() => startEdit(e)} title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }}
                            onClick={() => deleteExpense(trip.id, e.id)} title="Eliminar">
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
                  <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.9rem' }}>Total</td>
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
              <button className="btn btn-primary" onClick={handleSave}
                disabled={!form.description.trim() || !form.amount}>
                {editing ? 'Guardar cambios' : 'Añadir gasto'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <input className="form-input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Cena en pizzería" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Importe *</label>
              <input className="form-input" type="number" step="0.01" min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Divisa</label>
              <select className="form-input" value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-input" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha (opcional)</label>
            <input className="form-input" type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Compartido */}
          {hasParticipants ? (
            <>
              <div className="form-group">
                <label className="form-label">Pagado por</label>
                <select className="form-input" value={form.paidBy}
                  onChange={e => setForm({ ...form, paidBy: e.target.value })}>
                  <option value="">— sin asignar —</option>
                  {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Dividir entre
                  {form.splitBetween.length > 0 && form.amount > 0 && (
                    <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      ({fmtAmount(Number(form.amount) / form.splitBetween.length, form.currency)} por persona)
                    </span>
                  )}
                </label>
                <div className="sh-split-grid">
                  {participants.map(p => {
                    const checked = form.splitBetween.includes(p.id);
                    return (
                      <label key={p.id} className={`sh-split-chip ${checked ? 'checked' : ''}`}
                        style={{ borderColor: checked ? p.color : 'var(--color-border)' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSplit(p.id)} />
                        <span className="sh-participant-avatar sh-mini-avatar" style={{ background: p.color }}>
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: '0.78rem' }}>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setForm(f => ({ ...f, splitBetween: participants.map(p => p.id) }))}>
                    Todos
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setForm(f => ({ ...f, splitBetween: [] }))}>
                    Ninguno
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 6 }}>
              Añade participantes en la sección de arriba para repartir este gasto.
            </p>
          )}
        </Modal>
      )}

      {showCalc && <BudgetCalculator trip={trip} onClose={() => setShowCalc(false)} />}
    </div>
  );
}
