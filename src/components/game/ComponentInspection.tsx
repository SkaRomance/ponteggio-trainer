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

  return (
    <div className="inspection-overlay">
      <div className="inspection-modal expanded">
        {/* Header */}
        <div className="inspection-header">
          <h3>
            <FormattedMessage id="inspection.title" defaultMessage="Ispezione Componente" />
          </h3>
          <span className="component-name">{component.name}</span>
        </div>

        <div className="inspection-content">
          {/* Vista 3D del componente */}
          <div className="inspection-left">
            <Component3DView component={component} />
          </div>

          {/* Dettagli e decisione */}
          <div className="inspection-right">
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

              {/* Descrizione visiva del danno */}
              {component.damageDescription && (
                <div className={`damage-description ${component.isDamaged ? 'has-damage' : 'no-damage'}`}>
                  <p>🔍 <strong>
                    <FormattedMessage id="inspection.observation" defaultMessage="Osservazione:" />
                  </strong></p>
                  <p>{component.damageDescription}</p>
                </div>
              )}

              {/* Indicatore danno */}
              {component.isDamaged && (
                <div className="damage-warning-box">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-text">
                    {component.damageType === 'corrosione' && 'Ruggine visibile'}
                    {component.damageType === 'deformazione' && 'Deformazione strutturale'}
                    {component.damageType === 'crepa' && 'Crepa presente'}
                    {component.damageType === 'usura' && 'Usura eccessiva'}
                    {component.damageType === 'cerniere_rotte' && 'Cerniere rotte'}
                    {component.damageType === 'filettatura_spanata' && 'Filettatura spanata'}
                    {component.damageType === 'saldatura_crepata' && 'Saldatura crepata'}
                    {component.damageType === 'marcescenza' && 'Marcescenza o usura legno'}
                    {component.damageType === 'schiacciamento' && 'Schiacciamento evidente'}
                    {component.damageType === 'piegatura' && 'Piegatura anomala'}
                    {component.damageType === 'mancanza_fermi' && 'Mancanza di fermi'}
                  </span>
                </div>
              )}
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
              <div className="decision-section">
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
                    <small>Carica sul mezzo</small>
                  </button>
                  <button 
                    className="btn-damaged"
                    onClick={() => handleDecision('damaged')}
                  >
                    <span className="btn-icon">✗</span>
                    <FormattedMessage id="inspection.damaged" defaultMessage="Danneggiato" />
                    <small>Scarta il pezzo</small>
                  </button>
                </div>
              </div>
            )}

            {/* Indicatore di caricamento */}
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
      </div>
    </div>
  );
}
