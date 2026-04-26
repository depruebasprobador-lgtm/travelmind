import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, BarChart3, PlusCircle, Menu, X, Download, Compass, RefreshCw } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SaveIndicator from './SaveIndicator';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/ideas', icon: <Compass size={20} />, label: 'Destinos Futuros' },
    { to: '/recurring', icon: <RefreshCw size={20} />, label: 'Viajes Recurrentes' },
    { to: '/map', icon: <Map size={20} />, label: 'Mapa Mundial' },
    { to: '/stats', icon: <BarChart3 size={20} />, label: 'Estadísticas' },
    { to: '/trip/new', icon: <PlusCircle size={20} />, label: 'Nuevo Viaje' },
  ];

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Map size={20} />
          </div>
          <h1>TravelMind</h1>
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {installPrompt && (
          <div className="sidebar-footer">
            <button className="btn btn-primary btn-sm" onClick={handleInstall} style={{ width: '100%' }}>
              <Download size={16} /> Instalar App
            </button>
          </div>
        )}
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <SaveIndicator />
          </div>
          <div className="topbar-right">
            <ThemeToggle />
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
