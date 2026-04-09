import { useState } from 'react';
import { Plus, Trash2, Edit3, Plane, TrainFront, Bus, Car } from 'lucide-react';
import useTripStore from '../../data/store';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import { TRANSPORT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';

const ICONS = { flight: Plane, train: TrainFront, bus: Bus, car_rental: Car };
const COLORS = { flight: '#3B82F6', train: '#10B981', bus: '#F97316', car_rental: '#8B5CF6' };

export default function TransportTab({ trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'flight', company: '', dateTime: '', bookingNumber: '', price: '', notes: '' });

  const { addTransport, updateTransport, deleteTransport } = useTripStore();

  const resetForm = () => { setForm({ type: 'flight', company: '', dateTime: '', bookingNumber: '', price: '', notes: '' }); setEditing(null); setShowForm(false); };

  const startEdit = (t) => { setEditing(t); setForm({ type: t.type, company: t.company || '', dateTime: t.dateTime || '', bookingNumber: t.bookingNumber || '', price: t.price || '', notes: t.notes || '' }); setShowForm(true); };

  const handleSave = () => { if (!form.company.trim()) return; const data = { ...form, price: Number(form.price) || 0 }; if (editing) updateTransport(trip.id, editing.id, data); else addTransport(trip.id, data); resetForm(); };

  const transports = trip.transports || [];

  return (
    <div>
      <div className="section-header">
        <h3>Transportes ({transports.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={14} /> Añadir</button>
      </div>

      {transports.length > 0 ? transports.map(t => {
        const Icon = ICONS[t.type] || Plane;
        return (
          <div key={t.id} className="transport-item">
            <div className="transport-icon" style={{ background: `${COLORS[t.type]}20`, color: COLORS[t.type] }}>
              <Icon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.company}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {TRANSPORT_TYPES[t.type]?.label} · {t.dateTime ? new Date(t.dateTime).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: '0.85rem' }}>
                    {t.bookingNumber && <span style={{ color: 'var(--text-tertiary)' }}>#{t.bookingNumber}</span>}
                    {t.price > 0 && <span style={{ fontWeight: 600 }}>{formatCurrency(t.price)}</span>}
                  </div>
                  {t.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{t.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-icon btn-sm" onClick={() => startEdit(t)}><Edit3 size={14} /></button>
                  <button className="btn btn-icon btn-sm" style={{ color: 'var(--error)' }} onClick={() => deleteTransport(trip.id, t.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        );
      }) : <EmptyState icon={<Plane size={36} />} title="Sin transportes" description="Añade vuelos, trenes o coches de alquiler." />}

      {showForm && (
        <Modal title={editing ? 'Editar transporte' : 'Nuevo transporte'} onClose={resetForm}
          footer={<><button className="btn btn-secondary" onClick={resetForm}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Guardar' : 'Añadir'}</button></>}>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TRANSPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Compañía</label>
            <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Ej: Iberia" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha y hora</label>
              <input className="form-input" type="datetime-local" value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº Reserva</label>
              <input className="form-input" value={form.bookingNumber} onChange={e => setForm({ ...form, bookingNumber: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Precio (€)</label>
            <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
