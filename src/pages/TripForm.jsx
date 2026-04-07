import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';
import useTripStore from '../data/store';
import PlaceSearch from '../components/PlaceSearch';
import { TRIP_STATUS } from '../utils/constants';

export default function TripForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addTrip = useTripStore(s => s.addTrip);
  const updateTrip = useTripStore(s => s.updateTrip);
  const loadTrip = useTripStore(s => s.loadTrip);

  const [form, setForm] = useState({
    destination: '', country: '', city: '', startDate: '', endDate: '',
    budget: '', imageUrl: '', notes: '', status: 'idea',
  });
  const [dateError, setDateError] = useState('');

  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      const trip = loadTrip(id);
      if (trip) setForm({
        destination: trip.destination || '', country: trip.country || '', city: trip.city || '',
        startDate: trip.startDate || '', endDate: trip.endDate || '', budget: trip.budget || '',
        imageUrl: trip.imageUrl || '', notes: trip.notes || '', status: trip.status || 'idea',
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    // Fix: validate that endDate is not before startDate
    if (updated.startDate && updated.endDate && updated.endDate < updated.startDate) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.destination) return;
    if (dateError) return;

    if (isEdit) {
      updateTrip(id, { ...form, budget: Number(form.budget) || 0 });
    } else {
      addTrip({ ...form, budget: Number(form.budget) || 0 });
    }
    navigate('/');
  };

  return (
    <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
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
              <input
                className="form-input"
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate || undefined}
              />
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
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> {isEdit ? 'Guardar cambios' : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
