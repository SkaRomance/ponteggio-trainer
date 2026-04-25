import { useGameStore } from '../../stores/gameStore';
import { FormattedMessage } from 'react-intl';

export default function ControlsHelp() {
  const { currentPhase } = useGameStore();
  const primaryAction =
    currentPhase === 'warehouse'
      ? { key: 'E', label: "Ispeziona" }
      : { key: 'Mouse', label: 'Seleziona / Conferma' };

  const phaseTip =
    currentPhase === 'warehouse'
      ? "Avvicinati ai componenti e premi E per avviare l'ispezione."
      : currentPhase === 'transport'
        ? 'Seleziona un componente, clicca nel cassone e conferma il fissaggio prima della partenza.'
        : currentPhase === 'storage'
          ? 'Posiziona i ceppi a terra, evita la zona pericolo e scarica ogni pezzo sui supporti.'
          : currentPhase === 'assembly'
            ? 'Segui l’ordine Pi.M.U.S. e attiva imbracatura e cordino prima di lavorare in quota.'
            : currentPhase === 'use'
              ? 'Ispeziona le anomalie cliccando sui marker e mantieni l’ancoraggio quando operi in quota.'
              : currentPhase === 'disassembly'
                ? 'Smonta dall’alto verso il basso e mantieni il cordino ancorato durante la rimozione.'
                : 'Consulta il report finale e chiudi l’addestramento.';

  return (
    <div className="controls-help">
      <h4>
        <FormattedMessage id="controls.title" defaultMessage="Controlli" />
      </h4>
      <ul className="controls-grid" aria-label="Controlli di gioco">
        <li className="control-item">
          <kbd>W</kbd>
          <span><FormattedMessage id="controls.forward" defaultMessage="Avanti" /></span>
        </li>
        <li className="control-item">
          <kbd>S</kbd>
          <span><FormattedMessage id="controls.backward" defaultMessage="Indietro" /></span>
        </li>
        <li className="control-item">
          <kbd>A</kbd>
          <span><FormattedMessage id="controls.left" defaultMessage="Sinistra" /></span>
        </li>
        <li className="control-item">
          <kbd>D</kbd>
          <span><FormattedMessage id="controls.right" defaultMessage="Destra" /></span>
        </li>
        <li className="control-item">
          <kbd>{primaryAction.key}</kbd>
          <span>{primaryAction.label}</span>
        </li>
      </ul>
      <p className="controls-tip">
        {phaseTip}
      </p>
    </div>
  );
}
