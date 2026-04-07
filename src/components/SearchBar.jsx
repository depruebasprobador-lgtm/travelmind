import { Search, X } from 'lucide-react';
import useTripStore from '../data/store';
import { TRIP_STATUS } from '../utils/constants';

export default function SearchBar() {
  const filters = useTripStore(s => s.filters);
  const setFilters = useTripStore(s => s.setFilters);
  const trips = useTripStore(s => s.trips);

  const countries = [...new Set(trips.filter(t => !t.archived).map(t => t.country).filter(Boolean))];
  const hasFilters = filters.search || filters.status || filters.country;

  return (
    <div className="filters-bar">
      <div className="search-container" style={{ flex: 1, minWidth: 200 }}>
        <Search size={16} className="search-icon" />
        <input className="search-input" placeholder="Buscar viajes..."
          value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      </div>

      <select className="filter-select" value={filters.status}
        onChange={e => setFilters({ ...filters, status: e.target.value })}>
        <option value="">Todos los estados</option>
        {Object.entries(TRIP_STATUS).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      <select className="filter-select" value={filters.country}
        onChange={e => setFilters({ ...filters, country: e.target.value })}>
        <option value="">Todos los países</option>
        {countries.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {hasFilters && (
        <button className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ search: '', status: '', country: '' })}>
          <X size={14} /> Limpiar
        </button>
      )}
    </div>
  );
}
