import { useGameStore } from '../../stores/gameStore';
import type { GamePhase } from '../../stores/gameStore';
import { FormattedMessage } from 'react-intl';

const phases: { id: GamePhase; label: string; icon: string }[] = [
  { id: 'warehouse', label: 'phase.warehouse', icon: '📦' },
  { id: 'transport', label: 'phase.transport', icon: '🚛' },
  { id: 'storage', label: 'phase.storage', icon: '🏗️' },
  { id: 'assembly', label: 'phase.assembly', icon: '🔧' },
  { id: 'use', label: 'phase.use', icon: '👷' },
  { id: 'disassembly', label: 'phase.disassembly', icon: '🔨' },
  { id: 'return', label: 'phase.return', icon: '🏭' },
];

export default function PhaseSelector() {
  const { currentPhase, unlockedPhases, completedPhases, isPlaying, setPhase, isPhaseLocked } = useGameStore();

  return (
    <div className="phase-selector" role="tablist" aria-label="Fasi del percorso">
      {phases.map((phase, index) => {
        const isUnlocked = unlockedPhases.includes(phase.id);
        const lockedByAccess = isPhaseLocked(phase.id);
        const isActive = currentPhase === phase.id;
        const isCompleted = completedPhases.includes(phase.id);
        const canNavigate = isUnlocked && !lockedByAccess && !isPlaying;

        return (
          <button
            type="button"
            key={phase.id}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'step' : undefined}
            className={`phase-btn ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
            onClick={() => canNavigate && setPhase(phase.id)}
            disabled={!canNavigate}
            title={isPlaying ? 'Navigazione bloccata durante la simulazione attiva' : undefined}
          >
            <span className="phase-number">{index + 1}</span>
            <span className="phase-icon" aria-hidden="true">{phase.icon}</span>
            <span className="phase-label">
              <FormattedMessage id={phase.label} defaultMessage={phase.id} />
            </span>
            {!isUnlocked && lockedByAccess && <span className="phase-status">Licenza</span>}
            {!isUnlocked && !lockedByAccess && <span className="phase-status">Progressione</span>}
            {isCompleted && <span className="phase-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
