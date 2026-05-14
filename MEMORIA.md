# TravelMind — Memoria del proyecto

> Documento vivo. Sirve como contexto rápido para cualquier IA o colaborador que entre al repo. Actualizar cuando cambien stack, esquema, rutas o flujos clave.
>
> **Última actualización:** 2026-05-14

---

## 1. Qué es TravelMind

Aplicación personal de gestión de viajes (single-user, sin auth) en español. SPA instalable como PWA. Permite planificar, organizar y revivir viajes: itinerarios día a día, alojamientos, transportes, lugares, gastos compartidos, checklist, mapa global, estadísticas, destinos futuros (wishlist) y viajes recurrentes.

- **Working dir local:** `C:\Antigravity\Travelmind`
- **Repo:** https://github.com/depruebasprobador-lgtm/travelmind (rama `master`)
- **Idioma del producto:** español (todo el copy de UI).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite 8 (JSX, **sin TypeScript**) |
| Routing | React Router v7 |
| Estado global | Zustand |
| BBDD | Supabase (Postgres + JSONB) vía `@supabase/supabase-js` |
| Mapas | Leaflet + react-leaflet + react-leaflet-cluster |
| Gráficas | Recharts |
| Drag & drop | @dnd-kit/core + sortable |
| Iconos | lucide-react |
| Export PDF | react-to-pdf |
| PWA | vite-plugin-pwa (manifest español, `skipWaiting`, `clientsClaim`, CacheFirst para tiles OSM) |
| Deploy | Dockerfile + Easypanel |

**Vite quirk a recordar:** `vite.config.js` fuerza `legacy.buildUsesRollup: true` porque Rolldown (Vite 8) no resuelve `react-is` desde recharts. No tocar salvo que se actualice recharts.

**Code-splitting:** chunks manuales por vendor (`vendor-react`, `vendor-charts`, `vendor-map`, `vendor-dnd`) para evitar el bundle único de ~900 kB.

---

## 3. Variables de entorno

Plantilla en `.env.example`:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 4. Persistencia (Supabase)

Esquema en `supabase/schema.sql`:

```sql
create table if not exists public.trips (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz default now()
);

alter table public.trips disable row level security;
```

- Tabla **única**: todo el objeto Trip vive en `data jsonb`. No hay tablas normalizadas.
- **RLS off** porque es single-user. Si en el futuro se añade auth, activar RLS y filtrar por `user_id`.
- Si `getTrips()` devuelve vacío, `seedData.js` siembra automáticamente datos de ejemplo.

---

## 5. Modelo del objeto Trip

```js
{
  id, destination, country, city,
  status,         // idea | planning | booked | ongoing | completed
  archived,
  startDate, endDate, createdAt, updatedAt,

  itinerary: [
    { id, date, dayNumber, activities: [{
      id, name, place, lat, lng,
      time, endTime,                     // HH:MM
      type,                              // ACTIVITY_TYPES (breakfast, lunch, dinner, cafe, visit, activity, transport, shopping, rest, other)
      cost,                              // number | null  (suma para total del día; botón → addExpense)
      reservationUrl, reservationCode,   // entrada/booking
      notes, completed, order,
      transferFromPrev,                  // instrucciones de trasbordo desde la actividad previa
      fromPlaceId                        // id del Place de origen si vino de "Añadir al itinerario"
    }] }
  ],
  accommodations: [{ id, name, ... }],
  transports:     [{ id, type, ... }],   // flight | train | bus | car_rental
  places:         [{ id, name, type, ... }], // restaurant | monument | activity | beach | viewpoint | other
  expenses:       [{ id, amount, category, paidBy, splitBetween, splits, ... }],
  participants:   [{ id, name, color, createdAt }],
  checklist:      [{ id, text, category, checked }],
  budgetEstimation: { ... } | null
}
```

Constantes en `src/utils/constants.js`:

- `TRIP_STATUS`: idea, planning, booked, ongoing, completed (cada uno con color hex).
- `PLACE_TYPES`: restaurant, monument, activity, beach, viewpoint, other.
- `TRANSPORT_TYPES`: flight, train, bus, car_rental.
- `EXPENSE_CATEGORIES`: food, transport, accommodation, leisure.
- `ACTIVITY_TYPES`: breakfast, lunch, dinner, cafe, visit, activity, transport, shopping, rest, other (cada uno con `icon`, `color`, `bg`, `defaultDuration`, `mealSlot`, `expenseCategory`).
- `MEAL_SLOTS`: breakfast, lunch, dinner — usados por el recordatorio de comidas del día.
- `DEFAULT_CHECKLIST`: pasaporte, tarjetas embarque, reservas hotel, seguro, cargador, adaptador, ropa, botiquín, dinero/tarjeta.

---

## 6. Arquitectura `src/`

```
src/
├── pages/
│   ├── Dashboard.jsx
│   ├── TripForm.jsx          # /trip/new y /trip/:id/edit
│   ├── TripDetail.jsx        # /trip/:id (con pestañas)
│   ├── WorldMap.jsx          # /map
│   ├── Statistics.jsx        # /stats
│   ├── FutureDestinations.jsx# /ideas
│   └── RecurringTrips.jsx    # /recurring
│
├── components/
│   ├── Layout.jsx            # sidebar + topbar (SaveIndicator + ThemeToggle)
│   ├── Modal.jsx, ConfirmDialog.jsx, Toast.jsx (provider)
│   ├── TripCard.jsx, EmptyState.jsx, SearchBar.jsx, StatusBadge.jsx
│   ├── PlaceSearch.jsx       # geocoding
│   ├── DataActions.jsx       # import/export JSON
│   ├── SaveIndicator.jsx, ThemeToggle.jsx
│   └── trip/
│       ├── ItineraryTab.jsx, DayPlanTab.jsx
│       ├── AccommodationTab.jsx, TransportTab.jsx
│       ├── PlacesTab.jsx, MapTab.jsx
│       ├── ExpensesTab.jsx, ChecklistTab.jsx
│       ├── RecommendationsTab.jsx
│       └── BudgetCalculator.jsx
│
├── data/
│   ├── store.js              # Zustand principal (trips, currentTrip, filters, saveStatus)
│   ├── storage.js            # capa Supabase (getTrips, getTrip, saveTrip, deleteTrip, importData)
│   ├── futureStore.js + futureStorage.js     # destinos futuros / wishlist
│   ├── recurringStore.js + recurringStorage.js # viajes recurrentes
│   └── seedData.js           # datos iniciales si la BD está vacía
│
├── lib/supabase.js           # cliente Supabase
├── services/geocoding.js
└── utils/
    ├── constants.js
    ├── helpers.js            # generateId(), etc.
    ├── exportPDF.js          # con react-to-pdf
    ├── dataIO.js             # import/export JSON
    ├── settlement.js         # liquidación de gastos compartidos
    └── connection.js
```

---

## 7. Rutas y funcionalidades

### `/` Dashboard
Listado de viajes (TripCard) con filtros (search, status, country). Acciones: crear, editar, duplicar, archivar, eliminar. Import/export JSON versionado.

### `/trip/new` y `/trip/:id/edit` — TripForm
Alta y edición del viaje.

### `/trip/:id` — TripDetail (con pestañas)
- **Itinerary + DayPlan:** días con actividades, drag & drop (@dnd-kit), reordenar, margen logístico entre actividades.
  - **Sincronización automática** con `startDate`/`endDate`: al ampliar fechas se añaden días vacíos; al recortar, si los días sobrantes tienen actividades se pide confirmación (`ConfirmDialog`). Si no, se quitan en silencio. Lógica en `helpers.syncDaysWithDates`.
  - **Adición express** con un input por día (`QuickAddBar`) que parsea `"20:00 Cena en Trastevere"` → time + name + tipo deducido (`helpers.parseQuickActivity`).
  - **Selector visual de tipo** (`TypeSelector`) con icono y color por categoría. Al elegir tipo + hora inicio, autocompleta endTime usando `defaultDuration` del tipo.
  - **Campos extra:** `cost` (con total por día y botón "Convertir en gasto" → `addExpense` mapeando a categoría), `reservationUrl`, `reservationCode` (colapsables en "Más opciones").
  - **Recordatorio de comidas** (`MealReminder`) en cabecera de día: chips desayuno/comida/cena marcados según `mealSlot` de las actividades.
  - **Duplicar actividad** (icono Copy) y **Duplicar día** (botón con dropdown de días destino) → store `duplicateActivity` / `duplicateDay`.
- **Accommodation:** alojamientos con fechas, precio, notas.
- **Transport:** vuelos, trenes, buses, coches de alquiler.
- **Places:** lugares de interés con tipo + búsqueda con geocoding. Cada place tiene botón **"Añadir al itinerario"** (icono `CalendarPlus`) con dropdown de días: clona el lugar como actividad mapeando su tag al `type` correspondiente (restaurante→lunch, cafe→cafe, mirador/monumento→visit, etc.). Mapeo en `PLACE_TAG_TO_ACTIVITY_TYPE`.
- **Expenses:** gastos por categoría + gastos compartidos con `participants` (nombre y color) y liquidación (`utils/settlement.js`: `paidBy`, `splitBetween`, `splits`).
- **Checklist:** tareas por categorías, plantilla `DEFAULT_CHECKLIST`, marcar/limpiar completadas.
- **Map:** mapa Leaflet del viaje con marker clustering.
- **Recommendations:** recomendaciones.
- **BudgetCalculator:** estimación, se persiste en `trip.budgetEstimation`.
- Export del viaje a PDF y a JSON.

### `/map` WorldMap
Mapa global con todos los viajes/lugares + clustering.

### `/stats` Statistics
Gráficas Recharts: gastos por categoría, viajes por año/país, etc.

### `/ideas` FutureDestinations
Wishlist con panel lateral, presupuesto, fechas tentativas, checklist de tareas y countdown. UX móvil cuidada.

### `/recurring` RecurringTrips
Viajes que se repiten, con breakdown e historial.

---

## 8. Patrón del store (Zustand)

`src/data/store.js` expone `useTripStore`. Convención clave: cada mutación pasa por `_persist(storage.saveTrip(...))`, que mueve `saveStatus`:

```
'idle' → 'saving' → 'saved'  (vuelve a 'idle' tras 2s)
```

Mutar sub-entidades (activities, accommodations, transports, places, expenses, participants, checklist) siempre vía `updateTrip(tripId, {...})` para conservar el indicador y el `updatedAt`. Al borrar un participante se limpian sus referencias en `expenses` (`paidBy`, `splitBetween`, `splits`).

`getFilteredTrips()` excluye archivados y filtra por status / country / search (busca en destination, country, city).

Export/import JSON con cabecera:

```js
{ version: '1.0', exportedAt: <ISO>, app: 'TravelMind', trips: [...] }
```

---

## 9. UI transversal

- Layout con **sidebar colapsable** (móvil) y **topbar** con `SaveIndicator` (saving/saved/idle) y `ThemeToggle` (claro/oscuro).
- `Toast` provider global; `Modal` y `ConfirmDialog` reutilizables.
- Botón "Instalar App" cuando dispara `beforeinstallprompt` (PWA).
- Optimizado responsivo, especialmente para iPhone 13 (390px).

---

## 10. Despliegue y scripts

- `Dockerfile` + `.dockerignore` añadidos para Easypanel.
- Scripts en raíz para git/deploy (Windows):
  - `COMMIT_Y_PUSH.bat` — commit + push automatizado.
  - `PUSH_GITHUB.bat` / `PUSH_GITHUB.ps1` / `push.ps1` — push manual.
  - `push-recurring.ps1` — push recurrente.

Comandos npm:

```bash
npm run dev      # vite (desarrollo)
npm run build    # vite build (producción)
npm run preview  # vite preview
npm run lint     # eslint .
```

---

## 11. Convenciones para colaborar

- **No introducir TypeScript** ni cambiar de bundler salvo petición explícita.
- **No normalizar la BD**: añadir campos nuevos al objeto Trip y persistirlos en el JSONB. Sin migraciones SQL.
- IDs siempre con `generateId()` de `utils/helpers.js`.
- Mutaciones siempre vía store → `updateTrip` para mantener `saveStatus` + `updatedAt`.
- Copy de UI **en español**.
- Mantener responsive (iPhone 13 como referencia mínima).

---

## 12. Cómo actualizar este documento

Cuando cambie algo estructural, edita la sección afectada **y la fecha de "Última actualización"** del encabezado. Si añades una página, una pestaña, una entidad nueva en Trip o cambias el esquema Supabase, refleja el cambio aquí en el mismo PR. Si la app deja de ser single-user, este archivo es el primero que hay que reescribir (sección 4 y 11).
