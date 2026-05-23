import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';
import useTripStore from '../data/store';
import PlaceSearch from '../components/PlaceSearch';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { TRIP_STATUS } from '../utils/constants';
import { formatDate, compareISODates } from '../utils/helpers';

export default function TripForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const addTrip = useTripStore(s => s.addTrip);
  const updateTrip = useTripStore(s => s.updateTrip);
  const previewDateChange = useTripStore(s => s.previewDateChange);
  const loadTrips = useTripStore(s => s.loadTrips);
  const trips = useTripStore(s => s.trips);

  const [form, setForm] = useState({
    destination: '', country: '', city: '', startDate: '', endDate: '',
    budget: '', imageUrl: '', notes: '', status: 'idea',
  });
  const [dateError, setDateError] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [confirmDateLoss, setConfirmDateLoss] = useState(null); // { removed }

  const isEdit = !!id;

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      setLoading(true);
      // Look up in already-loaded trips first; fall back to fetching from Supabase
      let trip = trips.find(t => t.id === id);
      if (!trip) {
        await loadTrips();
        trip = useTripStore.getState().trips.find(t => t.id === id);
      }
      if (trip) {
        setForm({
          destination: trip.destination || '',
          country: trip.country || '',
          city: trip.city || '',
          startDate: trip.startDate || '',
          endDate: trip.endDate || '',
          budget: trip.budget || '',
          imageUrl: trip.imageUrl || '',
          notes: trip.notes || '',
          status: trip.status || 'idea',
        });
      }
      setLoading(false);
    };

    init();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    if (updated.startDate && updated.endDate && compareISODates(updated.endDate, updated.startDate) < 0) {
      setDateError('La fecha de fin no puede ser anterior a la de inicio.');
    } else {
      setDateError('');
    }
    setForm(updated);
  };

  const handlePlaceSelect = (place) => {
    setForm(prev => ({
      ...prev,
      destination: place.city || place.displayName.split(',')[0],
      country: place.country,
      city: place.city || place.displayName.split(',')[0],
    }));
  };

  const persistAndExit = async (force = false) => {
    const payload = { ...form, budget: Number(form.budget) || 0 };
    if (isEdit) {
      const result = await updateTrip(id, payload, { force });
      if (!result?.ok && result?.removed?.length) {
        setConfirmDateLoss({ removed: result.removed });
        return false;
      }
      if (!result?.ok) return false; // el bridge ya emitió el toast de error
      toast('Viaje actualizado', 'success');
    } else {
      const created = await addTrip(payload);
      if (!created) return false; // fallo de persistencia → toast vía bridge
      toast('Viaje creado', 'success');
    }
    navigate('/');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination) return;
    if (dateError) return;

    // En edición, si las fechas cambian y eso dejaría días con actividades
    // fuera del rango, mostramos confirmación SIN persistir todavía.
    if (isEdit && form.startDate && form.endDate) {
      const { removed } = previewDateChange(id, form.startDate, form.endDate);
      if (removed.length > 0) {
        setConfirmDateLoss({ removed });
        return;
      }
    }
    await persistAndExit(false);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-tertiary)' }}>
          Cargando viaje...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
      {confirmDateLoss && (
        <ConfirmDialog
          title={`Vas a perder ${confirmDateLoss.removed.length} día(s) con actividades`}
          message={
            `Las nuevas fechas dejan fuera estos días y se borrarán junto a sus actividades:\n\n` +
            confirmDateLoss.removed.map(d => `• ${formatDate(d.date)} (${d.activities?.length || 0} act.)`).join('\n') +
            `\n\n¿Confirmas el cambio?`
          }
          danger
          onCancel={() => setConfirmDateLoss(null)}
          onConfirm={async () => {
            setConfirmDateLoss(null);
            await persistAndExit(true);
          }}
        />
      )}

      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ marginBottom: 24 }}>{isEdit ? 'Editar viaje' : 'Nuevo viaje'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Buscar destino</label>
            <PlaceSearch onSelect={handlePlaceSelect} placeholder="Buscar ciudad o destino..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Destino</label>
              <input className="form-input" name="destination" value={form.destination}
                onChange={handleChange} placeholder="Ej: Roma" required />
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <input className="form-input" name="country" value={form.country}
                onChange={handleChange} placeholder="Ej: Italia" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ciudad</label>
            <input className="form-input" name="city" value={form.city}
              onChange={handleChange} placeholder="Ej: Roma" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha inicio</label>
              <input className="form-input" type="date" name="startDate"
                value={form.startDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha fin</label>
              <input className="form-input" type="date" name="endDate"
                value={form.endDate} onChange={handleChange}
                min={form.startDate || undefined} />
            </div>
          </div>
          {dateError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)', fontSize: '0.85rem' }}>
              <AlertCircle size={14} /> {dateError}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Presupuesto (€)</label>
              <input className="form-input" type="number" name="budget"
                value={form.budget} onChange={handleChange} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(TRIP_STATUS).map(([key, val]) => (
                  <button key={key} type="button"
                    className={`badge badge-${key}`}
                    style={{
                      cursor: 'pointer', padding: '6px 14px',
                      outline: form.status === key ? '2px solid var(--primary)' : 'none',
                      outlineOffset: 2,
                    }}
                    onClick={() => setForm({ ...form, status: key })}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">URL de imagen</label>
            <input className="form-input" name="imageUrl" value={form.imageUrl}
              onChange={handleChange} placeholder="https://..." />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="Preview" onError={e => e.target.style.display = 'none'}
                style={{ height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginTop: 8 }} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" name="notes" value={form.notes}
              onChange={handleChange} placeholder="Notas sobre el viaje..." />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> {isEdit ? 'Guardar cambios' : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
