export const TRIP_STATUS = {
  idea: { label: 'Idea', color: '#6366F1' },
  planning: { label: 'Planificando', color: '#F97316' },
  booked: { label: 'Reservado', color: '#3B82F6' },
  ongoing: { label: 'En curso', color: '#10B981' },
  completed: { label: 'Completado', color: '#6B7280' },
};

export const PLACE_TYPES = {
  restaurant: { label: 'Restaurante', icon: 'UtensilsCrossed' },
  monument: { label: 'Monumento', icon: 'Landmark' },
  activity: { label: 'Actividad', icon: 'Zap' },
  beach: { label: 'Playa', icon: 'Waves' },
  viewpoint: { label: 'Mirador', icon: 'Eye' },
  other: { label: 'Otro', icon: 'MapPin' },
};

export const TRANSPORT_TYPES = {
  flight: { label: 'Vuelo', icon: 'Plane' },
  train: { label: 'Tren', icon: 'TrainFront' },
  bus: { label: 'Autobús', icon: 'Bus' },
  car_rental: { label: 'Coche alquiler', icon: 'Car' },
};

export const EXPENSE_CATEGORIES = {
  food: { label: 'Comida', color: '#F97316', icon: 'UtensilsCrossed' },
  transport: { label: 'Transporte', color: '#3B82F6', icon: 'Plane' },
  accommodation: { label: 'Alojamiento', color: '#8B5CF6', icon: 'Bed' },
  leisure: { label: 'Ocio', color: '#10B981', icon: 'Sparkles' },
};

// Tipos de actividad para el itinerario.
// `mealSlot` indica si cuenta como comida del día (para el recordatorio).
// `expenseCategory` mapea al tipo de gasto al "Convertir en gasto".
// `defaultDuration` en minutos.
export const ACTIVITY_TYPES = {
  breakfast: { label: 'Desayuno',  icon: 'Coffee',           color: '#FBBF24', bg: 'rgba(251,191,36,0.14)', defaultDuration: 45,  mealSlot: 'breakfast', expenseCategory: 'comida' },
  lunch:     { label: 'Comida',    icon: 'Utensils',         color: '#F97316', bg: 'rgba(249,115,22,0.14)', defaultDuration: 75,  mealSlot: 'lunch',     expenseCategory: 'comida' },
  dinner:    { label: 'Cena',      icon: 'Wine',             color: '#A855F7', bg: 'rgba(168,85,247,0.14)', defaultDuration: 90,  mealSlot: 'dinner',    expenseCategory: 'comida' },
  cafe:      { label: 'Café/Snack',icon: 'Coffee',           color: '#B45309', bg: 'rgba(180,83,9,0.14)',   defaultDuration: 30,  mealSlot: null,        expenseCategory: 'comida' },
  visit:     { label: 'Visita',    icon: 'Landmark',         color: '#3B82F6', bg: 'rgba(59,130,246,0.14)', defaultDuration: 90,  mealSlot: null,        expenseCategory: 'actividades' },
  activity:  { label: 'Ocio',      icon: 'Sparkles',         color: '#10B981', bg: 'rgba(16,185,129,0.14)', defaultDuration: 120, mealSlot: null,        expenseCategory: 'actividades' },
  transport: { label: 'Traslado',  icon: 'Bus',              color: '#6366F1', bg: 'rgba(99,102,241,0.14)', defaultDuration: 60,  mealSlot: null,        expenseCategory: 'transporte' },
  shopping:  { label: 'Compras',   icon: 'ShoppingBag',      color: '#EC4899', bg: 'rgba(236,72,153,0.14)', defaultDuration: 60,  mealSlot: null,        expenseCategory: 'compras' },
  rest:      { label: 'Descanso',  icon: 'Bed',              color: '#9CA3AF', bg: 'rgba(156,163,175,0.14)',defaultDuration: 60,  mealSlot: null,        expenseCategory: 'otros' },
  other:     { label: 'Otro',      icon: 'Star',             color: '#6B7280', bg: 'rgba(107,114,128,0.14)',defaultDuration: 60,  mealSlot: null,        expenseCategory: 'otros' },
};

// Slots de comida que pinta el recordatorio del día.
export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Desayuno', icon: '☕' },
  { id: 'lunch',     label: 'Comida',   icon: '🍽️' },
  { id: 'dinner',    label: 'Cena',     icon: '🍷' },
];

export const DEFAULT_CHECKLIST = [
  'Pasaporte / DNI',
  'Tarjetas de embarque',
  'Reservas de hotel',
  'Seguro de viaje',
  'Cargador de móvil',
  'Adaptador de enchufe',
  'Ropa para el clima',
  'Botiquín básico',
  'Dinero en efectivo / Tarjeta',
];
