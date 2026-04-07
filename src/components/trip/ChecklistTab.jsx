import { useState, useMemo } from 'react';
import {
  Plus, Trash2, CheckSquare, Wand2, ChevronDown, ChevronUp,
  FileCheck, Tag, Filter, RotateCcw, CheckCheck, Circle
} from 'lucide-react';
import useTripStore from '../../data/store';
import EmptyState from '../EmptyState';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'documentacion', label: 'Documentación', emoji: '📄', color: '#6366F1' },
  { id: 'equipaje',      label: 'Equipaje',      emoji: '🧳', color: '#F59E0B' },
  { id: 'reservas',      label: 'Reservas',      emoji: '🏨', color: '#3B82F6' },
  { id: 'salud',         label: 'Salud',          emoji: '💊', color: '#EF4444' },
  { id: 'tecnologia',    label: 'Tecnología',    emoji: '💻', color: '#10B981' },
  { id: 'otros',         label: 'Otros',          emoji: '📌', color: '#6B7280' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── Automatic template ────────────────────────────────────────────────────────
const TEMPLATE_ITEMS = [
  // Documentación
  { text: 'Pasaporte (vigente)',             category: 'documentacion' },
  { text: 'Visado (si se requiere)',         category: 'documentacion' },
  { text: 'Seguro de viaje',                category: 'documentacion' },
  { text: 'Billetes de avión / tren',       category: 'documentacion' },
  { text: 'Reserva del alojamiento',        category: 'documentacion' },
  { text: 'Carnet de conducir internacional', category: 'documentacion' },
  // Equipaje
  { text: 'Ropa adecuada al clima',         category: 'equipaje' },
  { text: 'Calzado cómodo',                 category: 'equipaje' },
  { text: 'Neceser e higiene personal',     category: 'equipaje' },
  { text: 'Ropa interior (5 días)',         category: 'equipaje' },
  { text: 'Paraguas o chubasquero',         category: 'equipaje' },
  { text: 'Adaptador de enchufe universal', category: 'equipaje' },
  // Reservas
  { text: 'Hotel confirmado',               category: 'reservas' },
  { text: 'Traslados al aeropuerto',        category: 'reservas' },
  { text: 'Actividades / excursiones',      category: 'reservas' },
  { text: 'Alquiler de coche',              category: 'reservas' },
  // Salud
  { text: 'Medicación habitual',            category: 'salud' },
  { text: 'Botiquín básico',                category: 'salud' },
  { text: 'Protector solar',                category: 'salud' },
  { text: 'Vacunas requeridas',             category: 'salud' },
  { text: 'Repelente de insectos',          category: 'salud' },
  // Tecnología
  { text: 'Teléfono móvil + cargador',      category: 'tecnologia' },
  { text: 'Powerbank',                      category: 'tecnologia' },
  { text: 'Auriculares',                    category: 'tecnologia' },
  { text: 'Cámara de fotos',                category: 'tecnologia' },
  { text: 'Descargar mapas offline',        category: 'tecnologia' },
  // Otros
  { text: 'Informar a familia / trabajo',   category: 'otros' },
  { text: 'Activar roaming / SIM local',    category: 'otros' },
  { text: 'Moneda local / efectivo',        category: 'otros' },
  { text: 'Guía o frasebook del destino',   category: 'otros' },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function getCategoryInfo(id) {
  return CATEGORY_MAP[id] || CATEGORY_MAP['otros'];
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ progress, completed, total }) {
  const color = progress === 100
    ? 'var(--success)'
    : progress > 60
    ? 'var(--primary)'
    : progress > 30
    ? 'var(--warning)'
    : 'var(--error)';

  return (
    <div className="checklist-progress-wrap">
      <div className="checklist-progress-header">
        <div className="checklist-progress-label">
          <CheckCheck size={16} style={{ color }} />
          <span>Progreso del checklist</span>
        </div>
        <div className="checklist-progress-stats">
          <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{Math.round(progress)}%</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {completed}/{total} completados
          </span>
        </div>
      </div>
      <div className="checklist-progress-track">
        <div
          className="checklist-progress-fill"
          style={{ width: `${progress}%`, background: color }}
        />
        {/* Milestone markers */}
        {[25, 50, 75].map(m => (
          <div key={m} className="checklist-milestone" style={{ left: `${m}%` }} />
        ))}
      </div>
      {progress === 100 && (
        <p className="checklist-complete-msg">🎉 ¡Todo listo para el viaje!</p>
      )}
    </div>
  );
}

function CategoryBadge({ categoryId, small }) {
  const cat = getCategoryInfo(categoryId);
  return (
    <span
      className="checklist-cat-badge"
      style={{
        '--cat-color': cat.color,
        fontSize: small ? '0.7rem' : '0.75rem',
        padding: small ? '2px 7px' : '3px 10px',
      }}
    >
      {cat.emoji} {cat.label}
    </span>
  );
}

function ChecklistItem({ item, tripId }) {
  const { toggleChecklistItem, deleteChecklistItem } = useTripStore();
  const cat = getCategoryInfo(item.category);

  return (
    <li
      className={`checklist-item ${item.checked ? 'checked' : ''}`}
      style={{ '--cat-color': cat.color }}
    >
      <button
        className="checklist-check-btn"
        onClick={() => toggleChecklistItem(tripId, item.id)}
        aria-label={item.checked ? 'Desmarcar' : 'Marcar como completado'}
      >
        {item.checked
          ? <CheckCheck size={18} style={{ color: 'var(--success)' }} />
          : <Circle size={18} style={{ color: 'var(--text-tertiary)' }} />
        }
      </button>

      <span className={`checklist-item-text ${item.checked ? 'done' : ''}`}>
        {item.text}
      </span>

      <CategoryBadge categoryId={item.category || 'otros'} small />

      <button
        className="btn btn-icon btn-sm checklist-delete-btn"
        onClick={() => deleteChecklistItem(tripId, item.id)}
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function CategoryGroup({ category, items, tripId }) {
  const [collapsed, setCollapsed] = useState(false);
  const completed = items.filter(i => i.checked).length;

  return (
    <div className="checklist-group">
      <button
        className="checklist-group-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ '--cat-color': category.color }}
      >
        <span className="checklist-group-title">
          <span className="checklist-group-emoji">{category.emoji}</span>
          {category.label}
          <span className="checklist-group-count">{completed}/{items.length}</span>
        </span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <ul className="checklist-group-items">
          {items.map(item => (
            <ChecklistItem key={item.id} item={item} tripId={tripId} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChecklistTab({ trip }) {
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('otros');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | categoryId | 'pending' | 'done'
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);

  const {
    addChecklistItem,
    addChecklistItems,
    deleteChecklistItem,
    deleteCompletedChecklistItems,
    clearChecklist,
  } = useTripStore();

  const checklist = trip.checklist || [];

  // Stats
  const completedCount = checklist.filter(c => c.checked).length;
  const progress = checklist.length === 0 ? 0 : (completedCount / checklist.length) * 100;

  // Filtered items
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return checklist;
    if (activeFilter === 'pending') return checklist.filter(i => !i.checked);
    if (activeFilter === 'done') return checklist.filter(i => i.checked);
    return checklist.filter(i => (i.category || 'otros') === activeFilter);
  }, [checklist, activeFilter]);

  // Grouped by category
  const grouped = useMemo(() => {
    return CATEGORIES.map(cat => ({
      category: cat,
      items: filtered.filter(i => (i.category || 'otros') === cat.id),
    })).filter(g => g.items.length > 0);
  }, [filtered]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    addChecklistItem(trip.id, newItemText.trim(), newItemCategory);
    setNewItemText('');
  };

  const handleTemplate = () => {
    // Only add items not already present (by text)
    const existingTexts = new Set(checklist.map(i => i.text.toLowerCase()));
    const toAdd = TEMPLATE_ITEMS.filter(t => !existingTexts.has(t.text.toLowerCase()));
    if (toAdd.length > 0) addChecklistItems(trip.id, toAdd);
    setShowTemplateConfirm(false);
  };

  // Filter pill data
  const filterPills = [
    { id: 'all',     label: `Todos (${checklist.length})` },
    { id: 'pending', label: `Pendientes (${checklist.filter(i => !i.checked).length})` },
    { id: 'done',    label: `Completados (${completedCount})` },
    ...CATEGORIES.map(c => ({
      id: c.id,
      label: `${c.emoji} ${c.label} (${checklist.filter(i => (i.category || 'otros') === c.id).length})`,
      color: c.color,
    })).filter(c => checklist.some(i => (i.category || 'otros') === c.id)),
  ];

  return (
    <div className="checklist-container">

      {/* ── Header ── */}
      <div className="checklist-header">
        <div>
          <h3 className="checklist-title">
            <FileCheck size={22} style={{ color: 'var(--primary)' }} />
            Checklist de viaje
          </h3>
          <p className="checklist-subtitle">
            Organiza todo lo que necesitas antes de partir
          </p>
        </div>

        <div className="checklist-header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setGroupByCategory(g => !g)}
            title={groupByCategory ? 'Vista plana' : 'Agrupar por categoría'}
          >
            <Tag size={14} />
            {groupByCategory ? 'Vista plana' : 'Por categoría'}
          </button>

          <button
            className="btn btn-primary btn-sm checklist-template-btn"
            onClick={() => setShowTemplateConfirm(true)}
          >
            <Wand2 size={14} />
            Plantilla automática
          </button>
        </div>
      </div>

      {/* ── Progress ── */}
      {checklist.length > 0 && (
        <ProgressBar progress={progress} completed={completedCount} total={checklist.length} />
      )}

      {/* ── Template confirm banner ── */}
      {showTemplateConfirm && (
        <div className="checklist-template-confirm">
          <div>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>
              ¿Generar plantilla automática?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Se añadirán {TEMPLATE_ITEMS.filter(t =>
                !checklist.some(i => i.text.toLowerCase() === t.text.toLowerCase())
              ).length} elementos predefinidos a tu lista.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplateConfirm(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleTemplate}>
              <Wand2 size={13} /> Generar
            </button>
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      <form onSubmit={handleAdd} className="checklist-add-form">
        <select
          className="form-select checklist-cat-select"
          value={newItemCategory}
          onChange={e => setNewItemCategory(e.target.value)}
        >
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <input
          type="text"
          className="form-input"
          placeholder="Añadir elemento a la lista…"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={!newItemText.trim()}>
          <Plus size={18} /> Añadir
        </button>
      </form>

      {/* ── Filter pills ── */}
      {checklist.length > 0 && (
        <div className="checklist-filters">
          <Filter size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          {filterPills.map(pill => (
            <button
              key={pill.id}
              className={`checklist-filter-pill ${activeFilter === pill.id ? 'active' : ''}`}
              style={pill.color ? { '--pill-color': pill.color } : {}}
              onClick={() => setActiveFilter(pill.id)}
            >
              {pill.label}
            </button>
          ))}
          {completedCount > 0 && (
            <button
              className="checklist-filter-pill danger"
              onClick={() => deleteCompletedChecklistItems(trip.id)}
              title="Eliminar todos los completados"
            >
              <RotateCcw size={12} /> Limpiar completados
            </button>
          )}
        </div>
      )}

      {/* ── List ── */}
      {checklist.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={36} />}
          title="Lista vacía"
          description='Añade elementos manualmente o usa la "Plantilla automática" para empezar rápido.'
        />
      ) : filtered.length === 0 ? (
        <div className="checklist-empty-filter">
          <Filter size={24} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
          <p>No hay elementos en este filtro</p>
        </div>
      ) : groupByCategory ? (
        <div className="checklist-groups">
          {grouped.map(({ category, items }) => (
            <CategoryGroup
              key={category.id}
              category={category}
              items={items}
              tripId={trip.id}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <ul>
            {filtered.map(item => (
              <ChecklistItem key={item.id} item={item} tripId={trip.id} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
