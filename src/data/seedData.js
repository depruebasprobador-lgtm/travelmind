import { generateId } from '../utils/helpers.js';

export function getSeedData() {
  const now = new Date().toISOString();

  return [
    {
      id: generateId(),
      destination: 'Roma',
      country: 'Italia',
      city: 'Roma',
      startDate: '2026-05-10',
      endDate: '2026-05-16',
      budget: 1800,
      imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
      notes: 'Viaje cultural por la ciudad eterna. Visitar el Coliseo, el Vaticano y probar la pasta auténtica.',
      status: 'planning',
      archived: false,
      createdAt: now,
      updatedAt: now,
      itinerary: [
        {
          id: generateId(), date: '2026-05-10', dayNumber: 1,
          activities: [
            { id: generateId(), name: 'Llegada al aeropuerto', place: 'Aeropuerto Fiumicino', time: '10:00', notes: 'Vuelo IB3210', lat: 41.7999, lng: 12.2462, order: 0 },
            { id: generateId(), name: 'Check-in hotel', place: 'Hotel Artemide', time: '13:00', notes: '', lat: 41.9028, lng: 12.4964, order: 1 },
            { id: generateId(), name: 'Paseo por el Centro', place: 'Fontana di Trevi', time: '16:00', notes: 'Lanzar moneda!', lat: 41.9009, lng: 12.4833, order: 2 },
          ]
        },
        {
          id: generateId(), date: '2026-05-11', dayNumber: 2,
          activities: [
            { id: generateId(), name: 'Coliseo Romano', place: 'Colosseo', time: '09:00', notes: 'Entrada reservada', lat: 41.8902, lng: 12.4922, order: 0 },
            { id: generateId(), name: 'Foro Romano', place: 'Foro Romano', time: '12:00', notes: '', lat: 41.8925, lng: 12.4853, order: 1 },
          ]
        },
      ],
      accommodations: [
        { id: generateId(), name: 'Hotel Artemide', address: 'Via Nazionale, 22, Roma', price: 150, bookingLink: 'https://booking.com', checkIn: '2026-05-10', checkOut: '2026-05-16', notes: 'Desayuno incluido', lat: 41.9028, lng: 12.4964 },
      ],
      transports: [
        { id: generateId(), type: 'flight', company: 'Iberia', dateTime: '2026-05-10T08:00', bookingNumber: 'IB3210', price: 185, notes: 'Equipaje facturado incluido' },
        { id: generateId(), type: 'flight', company: 'Iberia', dateTime: '2026-05-16T19:30', bookingNumber: 'IB3211', price: 195, notes: 'Vuelta' },
      ],
      places: [
        { id: generateId(), name: 'Coliseo', address: 'Piazza del Colosseo', type: 'monument', notes: 'Monumento más icónico', status: 'pending', lat: 41.8902, lng: 12.4922 },
        { id: generateId(), name: 'Trastevere', address: 'Trastevere, Roma', type: 'restaurant', notes: 'Zona de restaurantes auténticos', status: 'pending', lat: 41.8867, lng: 12.4692 },
        { id: generateId(), name: 'Vaticano', address: 'Città del Vaticano', type: 'monument', notes: 'Capilla Sixtina', status: 'pending', lat: 41.9022, lng: 12.4539 },
      ],
      expenses: [
        { id: generateId(), concept: 'Vuelo ida', category: 'transport', amount: 185, date: '2026-05-10' },
        { id: generateId(), concept: 'Vuelo vuelta', category: 'transport', amount: 195, date: '2026-05-16' },
        { id: generateId(), concept: 'Hotel (6 noches)', category: 'accommodation', amount: 900, date: '2026-05-10' },
      ],
      checklist: [
        { id: generateId(), text: 'Pasaporte / DNI', checked: true },
        { id: generateId(), text: 'Reserva de hotel', checked: true },
        { id: generateId(), text: 'Tarjetas de embarque', checked: false },
        { id: generateId(), text: 'Seguro de viaje', checked: false },
        { id: generateId(), text: 'Adaptador de enchufe', checked: false },
      ],
    },
    {
      id: generateId(),
      destination: 'Tokio',
      country: 'Japón',
      city: 'Tokio',
      startDate: '2026-09-01',
      endDate: '2026-09-12',
      budget: 3500,
      imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
      notes: 'Aventura en Japón: templos, tecnología y gastronomía.',
      status: 'idea',
      archived: false,
      createdAt: now,
      updatedAt: now,
      itinerary: [],
      accommodations: [],
      transports: [],
      places: [
        { id: generateId(), name: 'Shibuya Crossing', address: 'Shibuya, Tokio', type: 'viewpoint', notes: 'El cruce más famoso del mundo', status: 'pending', lat: 35.6595, lng: 139.7004 },
        { id: generateId(), name: 'Templo Senso-ji', address: 'Asakusa, Tokio', type: 'monument', notes: 'Templo budista más antiguo de Tokio', status: 'pending', lat: 35.7148, lng: 139.7967 },
      ],
      expenses: [],
      checklist: [],
    },
    {
      id: generateId(),
      destination: 'Barcelona',
      country: 'España',
      city: 'Barcelona',
      startDate: '2025-11-15',
      endDate: '2025-11-18',
      budget: 800,
      imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
      notes: 'Escapada a Barcelona. Gaudí, playa y tapas.',
      status: 'completed',
      archived: false,
      createdAt: now,
      updatedAt: now,
      itinerary: [
        {
          id: generateId(), date: '2025-11-15', dayNumber: 1,
          activities: [
            { id: generateId(), name: 'Sagrada Familia', place: 'Sagrada Familia', time: '10:00', notes: 'Entrada anticipada', lat: 41.4036, lng: 2.1744, order: 0 },
            { id: generateId(), name: 'Parque Güell', place: 'Parque Güell', time: '15:00', notes: '', lat: 41.4145, lng: 2.1527, order: 1 },
          ]
        },
      ],
      accommodations: [
        { id: generateId(), name: 'Hotel Casa Bonay', address: 'Gran Via de les Corts Catalanes, 700', price: 120, bookingLink: '', checkIn: '2025-11-15', checkOut: '2025-11-18', notes: '', lat: 41.3925, lng: 2.1700 },
      ],
      transports: [
        { id: generateId(), type: 'train', company: 'Renfe AVE', dateTime: '2025-11-15T07:00', bookingNumber: 'AVE2045', price: 65, notes: '' },
      ],
      places: [
        { id: generateId(), name: 'Sagrada Familia', address: 'Carrer de Mallorca, 401', type: 'monument', notes: '', status: 'visited', lat: 41.4036, lng: 2.1744 },
        { id: generateId(), name: 'La Barceloneta', address: 'Barceloneta, Barcelona', type: 'beach', notes: 'Playa urbana', status: 'visited', lat: 41.3796, lng: 2.1890 },
      ],
      expenses: [
        { id: generateId(), concept: 'AVE ida/vuelta', category: 'transport', amount: 130, date: '2025-11-15' },
        { id: generateId(), concept: 'Hotel 3 noches', category: 'accommodation', amount: 360, date: '2025-11-15' },
        { id: generateId(), concept: 'Comidas y tapas', category: 'food', amount: 180, date: '2025-11-16' },
        { id: generateId(), concept: 'Entradas museos', category: 'leisure', amount: 55, date: '2025-11-16' },
      ],
      checklist: [
        { id: generateId(), text: 'DNI', checked: true },
        { id: generateId(), text: 'Billetes de tren', checked: true },
        { id: generateId(), text: 'Reserva hotel', checked: true },
      ],
    },
  ];
}
