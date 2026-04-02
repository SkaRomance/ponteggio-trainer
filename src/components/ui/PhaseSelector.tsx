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
  const { currentPhase, unlockedPhases, setPhase } = useGameStore();

  return (
    <div className="phase-selector">
      {phases.map((phase, index) => {
        const isUnlocked = unlockedPhases.includes(phase.id);
        const isActive = currentPhase === phase.id;
        const isCompleted = false; // TODO: track completed phases

        return (
          <button
            key={phase.id}
            className={`phase-btn ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
            onClick={() => isUnlocked && setPhase(phase.id)}
            disabled={!isUnlocked}
          >
            <span className="phase-icon">{phase.icon}</span>
            <span className="phase-number">{index + 1}</span>
            <FormattedMessage id={phase.label} defaultMessage={phase.id} />
            {isCompleted && <span className="phase-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
