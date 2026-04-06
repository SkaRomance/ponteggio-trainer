import { FormattedMessage } from 'react-intl';

interface HealthBarProps {
  health: number;
}

export default function HealthBar({ health }: HealthBarProps) {
  const getColor = (value: number) => {
    if (value > 70) return '#ffcc00'; // Safety Yellow
    if (value > 40) return '#ff8800'; // Warning Orange
    return '#ff3333'; // Danger Red
  };

  return (
    <div className="health-bar-container">
      <div className="health-label">
        <FormattedMessage id="score.health" defaultMessage="STATUS" />
      </div>
      <div className="health-bar-wrapper">
        <div 
          className="health-bar-fill"
          style={{ 
            width: `${health}%`,
            backgroundColor: getColor(health)
          }}
        />
        <span className="health-value">{health}%</span>
      </div>
    </div>
  );
}
