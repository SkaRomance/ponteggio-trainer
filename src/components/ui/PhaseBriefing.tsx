import { useMemo } from 'react';
import { phaseContent } from '../../config/phaseContent';
import { useGameStore } from '../../stores/gameStore';

export default function PhaseBriefing() {
  const { currentPhase, completedPhases, errors } = useGameStore();
  const content = phaseContent[currentPhase];

  const phaseErrors = useMemo(
    () => errors.filter((error) => error.phase === currentPhase).length,
    [currentPhase, errors],
  );

  if (!content || currentPhase === 'menu' || currentPhase === 'completed') {
    return null;
  }

  return (
    <aside className="phase-briefing" aria-label="Briefing di fase">
      <div className="phase-briefing-header">
        <span className="menu-badge">{content.eyebrow}</span>
        <span className={`phase-level phase-level-${content.level}`}>{content.level}</span>
      </div>

      <h3>{content.title}</h3>
      <p>{content.description}</p>

      <div className="phase-briefing-meta">
        <div>
          <span className="summary-label">Stato</span>
          <strong>{completedPhases.includes(currentPhase) ? 'Completata' : 'In corso'}</strong>
        </div>
        <div>
          <span className="summary-label">Infrazioni fase</span>
          <strong>{phaseErrors}</strong>
        </div>
      </div>

      <div className="phase-briefing-block">
        <span className="summary-label">Obiettivi</span>
        <ul>
          {content.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </div>

      <div className="phase-briefing-block">
        <span className="summary-label">Regole critiche</span>
        <ul>
          {content.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
