import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Component3DView from './Component3DView';

export interface InspectionData {
  id: string;
  type: 'basetta' | 'telaio' | 'impalcato' | 'diagonale' | 'parapetto' | 'mantovana' | 'fermapiede' | 'corrente' | 'traverso' | 'andatoia' | 'impalcato_botola' | 'scaletta' | 'messa_a_terra' | 'tavola_appoggio' | 'cancelletto' | 'palina_terra';
  name: string;
  isDamaged: boolean;
  damageType?: 'corrosione' | 'deformazione' | 'crepa' | 'usura' | 'cerniere_rotte' | 'filettatura_spanata' | 'saldatura_crepata' | 'marcescenza' | 'schiacciamento' | 'piegatura' | 'mancanza_fermi' | 'mancanza_sicura' | 'ossidazione_contatti';
  damageDescription?: string;
  integrity: number;
  image?: string;
}

interface ComponentInspectionProps {
  component: InspectionData;
  onDecision: (decision: 'usable' | 'damaged', correct: boolean) => void;
}

const damageLabels: Record<NonNullable<InspectionData['damageType']>, string> = {
  corrosione: 'corrosione visibile',
  deformazione: 'deformazione strutturale',
  crepa: 'crepa presente',
  usura: 'usura eccessiva',
  cerniere_rotte: 'cerniere rotte',
  filettatura_spanata: 'filettatura spanata',
  saldatura_crepata: 'saldatura crepata',
  marcescenza: 'marcescenza del legno',
  schiacciamento: 'schiacciamento evidente',
  piegatura: 'piegatura anomala',
  mancanza_fermi: 'mancanza di fermi',
  mancanza_sicura: 'mancanza della sicura',
  ossidazione_contatti: 'ossidazione dei contatti',
};

export default function ComponentInspection({ component, onDecision }: ComponentInspectionProps) {
  const [showResult, setShowResult] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<'usable' | 'damaged' | null>(null);
  const [hasDecided, setHasDecided] = useState(false);

  const handleDecision = (choice: 'usable' | 'damaged') => {
    if (hasDecided) return;
    
    setPlayerChoice(choice);
    setHasDecided(true);
    
    const isCorrect = (choice === 'usable' && !component.isDamaged) || 
                      (choice === 'damaged' && component.isDamaged);
    
    setShowResult(true);
    
    // Delay per mostrare il risultato prima di chiudere
    setTimeout(() => {
      onDecision(choice, isCorrect);
    }, 3000);
  };

  const damageLabel = component.damageType ? damageLabels[component.damageType] : null;
  const isCorrectDecision = playerChoice === (component.isDamaged ? 'damaged' : 'usable');

  return (
    <div className="inspection-overlay">
      <div className="inspection-modal expanded">
        <div className="inspection-header">
          <div>
            <h2>
              <FormattedMessage id="inspection.title" defaultMessage="Ispezione componente" />
            </h2>
            <span className="component-name">{component.name}</span>
          </div>
        </div>

        <div className="inspection-content">
          <div className="inspection-left">
            <Component3DView component={component} />
          </div>

          <div className="inspection-right">
            <div className="component-info-card inspection-details">
              <h3>{component.name}</h3>
              <div className="detail-row">
                <span className="detail-label">
                  <FormattedMessage id="inspection.type" defaultMessage="Tipo:" />
                </span>
                <span className="detail-value">{component.name}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">
                  <FormattedMessage id="inspection.integrity" defaultMessage="Integrità:" />
                </span>
                <div className="integrity-bar">
                  <div 
                    className={`integrity-fill ${component.integrity < 50 ? 'low' : component.integrity < 80 ? 'medium' : 'high'}`}
                    style={{ width: `${component.integrity}%` }}
                  />
                  <span className="integrity-text">{component.integrity}%</span>
                </div>
              </div>

              {component.damageDescription && (
                <div className={`damage-description ${component.isDamaged ? 'has-damage' : 'no-damage'}`}>
                  <p>
                    <strong>
                      <FormattedMessage id="inspection.observation" defaultMessage="Osservazione:" />
                    </strong>
                  </p>
                  <p>{component.damageDescription}</p>
                </div>
              )}

              {component.isDamaged && (
                <div className="damage-warning-box" role="note">
                  <span className="warning-icon" aria-hidden="true">⚠️</span>
                  <span className="warning-text">
                    {damageLabel}
                  </span>
                </div>
              )}
            </div>

            {showResult && (
              <div
                className={`component-info-card decision-result ${isCorrectDecision ? 'correct' : 'wrong'}`}
                role="alert"
                aria-live="assertive"
              >
                {isCorrectDecision ? (
                  <>
                    <span className="result-icon" aria-hidden="true">✓</span>
                    <p>
                      <FormattedMessage id="inspection.correct" defaultMessage="Corretto! Hai identificato correttamente il componente." />
                    </p>
                    {!component.isDamaged && (
                      <p className="load-confirmation">
                        <FormattedMessage id="inspection.loaded" defaultMessage="✓ Componente caricato sul mezzo" />
                      </p>
                    )}
                    {component.isDamaged && (
                      <p className="educational-note">
                        <FormattedMessage 
                          id="inspection.whyDamaged" 
                          defaultMessage="Questo componente presenta {damage} e non è sicuro da utilizzare."
                          values={{ damage: damageLabel ?? component.damageType }}
                        />
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="result-icon" aria-hidden="true">✗</span>
                    <p>
                      <FormattedMessage id="inspection.wrong" defaultMessage="Errore! La tua valutazione non è corretta." />
                    </p>
                    <p className="educational-note">
                      {component.isDamaged ? (
                        <FormattedMessage 
                          id="inspection.shouldReject" 
                          defaultMessage="Questo componente è danneggiato e dovrebbe essere scartato."
                        />
                      ) : (
                        <FormattedMessage 
                          id="inspection.shouldAccept" 
                          defaultMessage="Questo componente è integro e può essere utilizzato."
                        />
                      )}
                    </p>
                  </>
                )}
              </div>
            )}

            {!showResult && (
              <div className="component-info-card decision-section">
                <p className="decision-prompt">
                  <FormattedMessage 
                    id="inspection.decisionPrompt" 
                    defaultMessage="Qual è la tua valutazione? Il componente è utilizzabile?" 
                  />
                </p>
                <div className="buttons-row">
                  <button 
                    type="button"
                    className="btn-usable"
                    onClick={() => handleDecision('usable')}
                  >
                    <span className="btn-icon" aria-hidden="true">✓</span>
                    <FormattedMessage id="inspection.usable" defaultMessage="Utilizzabile" />
                    <small>Carica sul mezzo</small>
                  </button>
                  <button 
                    type="button"
                    className="btn-damaged"
                    onClick={() => handleDecision('damaged')}
                  >
                    <span className="btn-icon" aria-hidden="true">✗</span>
                    <FormattedMessage id="inspection.damaged" defaultMessage="Danneggiato" />
                    <small>Scarta il pezzo</small>
                  </button>
                </div>
              </div>
            )}

            {showResult && (
              <div className="auto-close-indicator" aria-live="polite">
                <FormattedMessage id="inspection.continuing" defaultMessage="Continuazione in corso..." />
                <div className="progress-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
