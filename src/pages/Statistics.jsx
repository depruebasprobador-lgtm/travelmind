import { useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon, Map, DollarSign, Calendar } from 'lucide-react';
import useTripStore from '../data/store';
import { formatCurrency } from '../utils/helpers';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6'];

export default function Statistics() {
  const trips = useTripStore(s => s.trips);
  const loadTrips = useTripStore(s => s.loadTrips);

  // Fix: load trips on direct navigation to this page
  useEffect(() => { if (trips.length === 0) loadTrips(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const validTrips = trips.filter(t => !t.archived);
    const completed = validTrips.filter(t => t.status === 'completed');
    const countries = [...new Set(validTrips.map(t => t.country).filter(Boolean))];
    const cities = [...new Set(validTrips.map(t => t.city).filter(Boolean))];

    const totalSpent = validTrips.reduce((sum, t) => sum + (t.expenses || []).reduce((s, e) => s + (e.amount || 0), 0), 0);
    const totalBudget = validTrips.reduce((sum, t) => sum + (t.budget || 0), 0);

    const spendingByTrip = validTrips.map(t => ({
      name: t.destination,
      gastado: (t.expenses || []).reduce((s, e) => s + (e.amount || 0), 0),
      presupuesto: t.budget || 0,
    })).sort((a, b) => b.gastado - a.gastado).slice(0, 10);

    const statusMap = {};
    validTrips.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    // Fix: 'traveling' is not a valid status key — correct keys from constants are
    // idea | planning | booked | ongoing | completed
    const statusData = [
      { name: 'Completados', value: statusMap['completed'] || 0, color: '#10b981' },
      { name: 'En curso',    value: statusMap['ongoing']   || 0, color: '#3b82f6' },
      { name: 'Reservado',   value: statusMap['booked']    || 0, color: '#6366f1' },
      { name: 'Planificando',value: statusMap['planning']  || 0, color: '#f59e0b' },
      { name: 'Idea',        value: statusMap['idea']      || 0, color: '#9ca3af' },
    ].filter(d => d.value > 0);

    return {
      totalTrips: validTrips.length,
      completedTrips: completed.length,
      countriesCount: countries.length,
      citiesCount: cities.length,
      totalSpent,
      totalBudget,
      spendingByTrip,
      statusData
    };
  }, [trips]);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title"><PieChartIcon size={28} /> Estadísticas</h1>
          <p className="page-subtitle">Analiza tus viajes, presupuestos y destinos.</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Map size={24} color="var(--primary)" /></div>
          <div>
            <div className="stat-value">{stats.totalTrips}</div>
            <div className="stat-label">Viajes Totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Map size={24} color="#10b981" /></div>
          <div>
            <div className="stat-value">{stats.countriesCount}</div>
            <div className="stat-label">Países Visitados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={24} color="#f59e0b" /></div>
          <div>
            <div className="stat-value">{formatCurrency(stats.totalSpent)}</div>
            <div className="stat-label">Gasto Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} color="#3b82f6" /></div>
          <div>
            <div className="stat-value">{stats.completedTrips}</div>
            <div className="stat-label">Viajes Completados</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', gap: '24px', marginTop: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px' }}>Top Gastos por Viaje</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.spendingByTrip} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} />
                <Tooltip cursor={{ fill: 'var(--bg-active)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="gastado" name="Gastado" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="presupuesto" name="Presupuesto" fill="var(--border)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px' }}>Estado de tus Viajes</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
