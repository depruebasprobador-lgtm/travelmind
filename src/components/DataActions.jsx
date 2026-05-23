import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import useTripStore from '../data/store';
import { useToast } from './Toast';
import { downloadFile, readFileAsJSON } from '../utils/helpers';

export default function DataActions() {
  const fileRef = useRef(null);
  const exportData = useTripStore(s => s.exportData);
  const importData = useTripStore(s => s.importData);
  const toast = useToast();

  const handleExport = () => {
    const data = exportData();
    downloadFile(data, `travelmind-backup-${new Date().toISOString().split('T')[0]}.json`);
    toast('Datos exportados correctamente', 'success');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readFileAsJSON(file);
      const result = await importData(data);
      if (!result) {
        // el bridge ya emite el toast con mensaje user-friendly
        return;
      }
      toast(`Importados ${data.trips?.length || 0} viajes correctamente`, 'success');
    } catch (err) {
      // Error al parsear el JSON (no es un fallo de persistencia)
      toast(err.message || 'No se pudo leer el archivo.', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="data-actions">
      <button className="btn btn-secondary btn-sm" onClick={handleExport}>
        <Download size={16} /> Exportar
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
        <Upload size={16} /> Importar
      </button>
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport}
        style={{ display: 'none' }} />
    </div>
  );
}
