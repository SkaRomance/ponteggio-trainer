import { Download, Printer } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { downloadTrainingSessionReport } from '../../utils/sessionReport';

export default function SessionReportActions() {
  const exportReport = (format: 'json' | 'csv') => {
    downloadTrainingSessionReport(useGameStore.getState(), format);
  };

  return (
    <div className="session-report-actions" aria-label="Azioni report sessione">
      <button type="button" className="btn-secondary" onClick={() => exportReport('json')}>
        <Download size={18} aria-hidden="true" />
        Esporta JSON
      </button>
      <button type="button" className="btn-secondary" onClick={() => exportReport('csv')}>
        <Download size={18} aria-hidden="true" />
        Esporta CSV
      </button>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        <Printer size={18} aria-hidden="true" />
        Stampa
      </button>
    </div>
  );
}
