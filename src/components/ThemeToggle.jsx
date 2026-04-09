import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('travelmind_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('travelmind_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button className="btn btn-icon" onClick={() => setDark(!dark)}
      title={dark ? 'Modo claro' : 'Modo oscuro'}>
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
