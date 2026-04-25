import { useGameStore } from '../../stores/gameStore';
import { FormattedMessage } from 'react-intl';

export default function ScoreDisplay() {
  const { totalScore } = useGameStore();

  return (
    <div className="score-display" role="status" aria-live="polite">
      <span className="score-label">
        <FormattedMessage id="score.points" defaultMessage="Punteggio" />
      </span>
      <span className="score-value">{totalScore}</span>
    </div>
  );
}
