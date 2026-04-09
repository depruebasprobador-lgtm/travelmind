export function generateId() {
  return crypto.randomUUID();
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short'
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR'
  }).format(amount || 0);
}

export function getDaysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export function generateDays(startDate, endDate) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let dayNumber = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      id: generateId(),
      date: d.toISOString().split('T')[0],
      dayNumber: dayNumber++,
      activities: [],
    });
  }
  return days;
}

export function getCountryFlag(country) {
  const flags = {
    'España': '🇪🇸', 'Francia': '🇫🇷', 'Italia': '🇮🇹', 'Portugal': '🇵🇹',
    'Alemania': '🇩🇪', 'Reino Unido': '🇬🇧', 'Japón': '🇯🇵', 'México': '🇲🇽',
    'Estados Unidos': '🇺🇸', 'Grecia': '🇬🇷', 'Tailandia': '🇹🇭', 'Marruecos': '🇲🇦',
  };
  return flags[country] || '🌍';
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function downloadFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch {
        reject(new Error('El archivo no contiene JSON válido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}
