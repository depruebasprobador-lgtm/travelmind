import { useState, useRef, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { searchPlaces } from '../services/geocoding';

export default function PlaceSearch({ onSelect, placeholder = 'Buscar lugar...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const data = await searchPlaces(query, abortRef.current.signal);
        setResults(data);
        setShowResults(true);
      } catch (e) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = (place) => {
    setQuery(place.displayName.split(',')[0]);
    setShowResults(false);
    onSelect(place);
  };

  return (
    <div className="place-search">
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="place-results">
          {results.map((r, i) => (
            <div key={i} className="place-result-item" onMouseDown={() => handleSelect(r)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={14} style={{ marginTop: 3, flexShrink: 0, color: 'var(--primary)' }} />
                <span>{r.displayName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Buscando...</div>
      )}
    </div>
  );
}
