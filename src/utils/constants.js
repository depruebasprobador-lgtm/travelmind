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
