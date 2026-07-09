import { useState } from 'react';
import { Zap } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import { useToast } from '../Toast';
import { todayISO, formatCurrency } from '../../utils/helpers';

// Categorías alineadas con ExpensesTab.
const CATEGORIES = [
  { value: 'comida',      label: '🍽️ Comida' },
  { value: 'transporte',  label: '✈️ Transporte' },
  { value: 'alojamiento', label: '🏨 Alojamiento' },
  { value: 'actividades', label: '🎭 Actividades' },
  { value: 'compras',     label: '🛍️ Compras' },
  { value: 'otros',       label: '📌 Otros' },
];

/**
 * Gasto rápido: modal minimal pensado para usar DURANTE el viaje.
 * Reutiliza addExpense del store (contrato {ok}). Fecha por defecto: hoy.
 */
export default function QuickExpense({ trip, onClose, onSaved }) {
  const toast = useToast();
  const addExpense = useTripStore(s => s.addExpense);

  const participants = trip.participants || [];
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('otros');
  const [paidBy, setPaidBy] = useState(participants[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amt = Number(amount);
  const canSave = description.trim() && amount && !Number.isNaN(amt) && amt > 0;

  const handleSave = async () => {
    if (submitting) return;
    if (!description.trim()) { setError('Pon un concepto.'); return; }
    if (!amount || Number.isNaN(amt) || amt <= 0) { setError('El importe debe ser mayor que 0.'); return; }
    setError('');
    setSubmitting(true);

    const data = {
      description: description.trim(),
      amount: amt,
      category,
      date: date || todayISO(),
      currency: 'EUR',
      paidBy: paidBy || null,
      // Si hay participantes, por defecto se reparte entre todos; si no, vacío.
      splitBetween: participants.length > 0 ? participants.map(p => p.id) : [],
      splitMode: 'equal',
    };

    const r = await addExpense(trip.id, data);
    setSubmitting(false);
    if (!r?.ok) return; // el StoreErrorBridge emite el toast de error
    toast('Gasto añadido', 'success');
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      title="Añadir gasto rápido"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave || submitting}>
            <Zap size={15} /> Guardar gasto
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Concepto *</label>
        <input
          className="form-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ej: Cena, metro, entradas…"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Importe *</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {participants.length > 0 && (
          <div className="form-group">
            <label className="form-label">Pagado por</label>
            <select className="form-input" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              <option value="">— sin asignar —</option>
              {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {amount && amt > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Se registrará <strong>{formatCurrency(amt)}</strong>
          {participants.length > 1 && <> · {formatCurrency(amt / participants.length)} por persona</>}
        </p>
      )}

      {error && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}
    </Modal>
  );
}
