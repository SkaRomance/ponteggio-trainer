import { FormattedMessage } from 'react-intl';

export default function ControlsHelp() {
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
          <kbd>E</kbd>
          <span><FormattedMessage id="controls.e" defaultMessage="Interagisci" /></span>
        </li>
      </ul>
      <p className="controls-tip">
        <FormattedMessage
          id="controls.tip"
          defaultMessage="Avvicinati ai componenti e premi E per avviare l'ispezione."
        />
      </p>
    </div>
  );
}
