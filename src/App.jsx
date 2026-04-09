import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TripForm from './pages/TripForm';
import TripDetail from './pages/TripDetail';
import WorldMap from './pages/WorldMap';
import Statistics from './pages/Statistics';
import { ToastProvider } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="trip/new" element={<TripForm />} />
            <Route path="trip/:id" element={<TripDetail />} />
            <Route path="trip/:id/edit" element={<TripForm />} />
            <Route path="map" element={<WorldMap />} />
            <Route path="stats" element={<Statistics />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
