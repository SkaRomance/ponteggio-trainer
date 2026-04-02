import { useGameStore } from '../../stores/gameStore';
import { FormattedMessage } from 'react-intl';

export default function ScoreDisplay() {
  const { totalScore } = useGameStore();

  return (
    <div className="score-display">
      <span className="score-label">
        <FormattedMessage id="score.points" defaultMessage="Punti" />
      </span>
      <span className="score-value">{totalScore}</span>
    </div>
  );
}
