import { FormattedMessage } from 'react-intl';

interface HealthBarProps {
  health: number;
}

export default function HealthBar({ health }: HealthBarProps) {
  const getColor = (value: number) => {
    if (value > 70) return '#00C851';
    if (value > 40) return '#ffcc00';
    return '#ff3333';
  };

  return (
    <div className="health-bar-container">
      <div className="health-label">
        <FormattedMessage id="score.health" defaultMessage="Integrità" />
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
