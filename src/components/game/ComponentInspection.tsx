import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

export interface InspectionData {
  id: string;
  type: 'basetta' | 'telaio' | 'impalcato' | 'diagonale' | 'parapetto';
  name: string;
  isDamaged: boolean;
  damageType?: 'corrosione' | 'deformazione' | 'crepa' | 'usura';
  damageDescription?: string;
  integrity: number;
  image?: string;
}

interface ComponentInspectionProps {
  component: InspectionData;
  onDecision: (decision: 'usable' | 'damaged', correct: boolean) => void;
}

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
    }, 2500);
  };

  return (
    <div className="inspection-overlay">
      <div className="inspection-modal">
        {/* Header */}
        <div className="inspection-header">
          <h3>
            <FormattedMessage id="inspection.title" defaultMessage="Ispezione Componente" />
          </h3>
          <span className="component-name">{component.name}</span>
        </div>

        {/* Component View */}
        <div className="component-view">
          <div className={`component-visual ${component.type} ${component.isDamaged ? 'damaged' : ''}`}>
            {/* Icona componente */}
            <span className="component-icon">
              {component.type === 'basetta' && '🔩'}
              {component.type === 'telaio' && '⬜'}
              {component.type === 'impalcato' && '⬛'}
              {component.type === 'diagonale' && '⚡'}
              {component.type === 'parapetto' && '🛡️'}
            </span>
            
            {/* Indicatori danno visibili */}
            {component.isDamaged && (
              <div className="damage-indicators">
                {component.damageType === 'corrosione' && <span className="damage-badge rust">⚠️ Ruggine</span>}
                {component.damageType === 'deformazione' && <span className="damage-badge bent">⚠️ Deformato</span>}
                {component.damageType === 'crepa' && <span className="damage-badge crack">⚠️ Crepa</span>}
                {component.damageType === 'usura' && <span className="damage-badge worn">⚠️ Usurato</span>}
              </div>
            )}
          </div>

          {/* Dettagli ispezione */}
          <div className="inspection-details">
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

            {/* Descrizione visiva del danno (indizio per il giocatore) */}
            {component.damageDescription && (
              <div className="damage-description">
                <p>🔍 <strong>
                  <FormattedMessage id="inspection.observation" defaultMessage="Osservazione:" />
                </strong></p>
                <p>{component.damageDescription}</p>
              </div>
            )}
          </div>
        </div>

        {/* Risultato della decisione */}
        {showResult && (
          <div className={`decision-result ${playerChoice === (component.isDamaged ? 'damaged' : 'usable') ? 'correct' : 'wrong'}`}>
            {playerChoice === (component.isDamaged ? 'damaged' : 'usable') ? (
              <>
                <span className="result-icon">✓</span>
                <p>
                  <FormattedMessage id="inspection.correct" defaultMessage="Corretto! Hai identificato correttamente il componente." />
                </p>
                {component.isDamaged && (
                  <p className="educational-note">
                    <FormattedMessage 
                      id="inspection.whyDamaged" 
                      defaultMessage="Questo componente presenta {damage} e non è sicuro da utilizzare."
                      values={{ damage: component.damageType }}
                    />
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="result-icon">✗</span>
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

        {/* Pulsanti decisione */}
        {!showResult && (
          <div className="decision-buttons">
            <p className="decision-prompt">
              <FormattedMessage 
                id="inspection.decisionPrompt" 
                defaultMessage="Qual è la tua valutazione? Il componente è utilizzabile?" 
              />
            </p>
            <div className="buttons-row">
              <button 
                className="btn-usable"
                onClick={() => handleDecision('usable')}
              >
                <span className="btn-icon">✓</span>
                <FormattedMessage id="inspection.usable" defaultMessage="Utilizzabile" />
              </button>
              <button 
                className="btn-damaged"
                onClick={() => handleDecision('damaged')}
              >
                <span className="btn-icon">✗</span>
                <FormattedMessage id="inspection.damaged" defaultMessage="Danneggiato" />
              </button>
            </div>
          </div>
        )}

        {/* Indicatore di caricamento per chiusura automatica */}
        {showResult && (
          <div className="auto-close-indicator">
            <FormattedMessage id="inspection.continuing" defaultMessage="Continuamento..." />
            <div className="progress-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
