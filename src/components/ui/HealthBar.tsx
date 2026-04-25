import { FormattedMessage } from 'react-intl';

interface HealthBarProps {
  health: number;
}

export default function HealthBar({ health }: HealthBarProps) {
  const normalizedHealth = Math.max(0, Math.min(100, health));

  const getFillStyle = (value: number) => {
    if (value > 70) {
      return 'linear-gradient(90deg, #1a472a, #2d6a4f)';
    }
    if (value > 40) {
      return 'linear-gradient(90deg, #ffd700, #ff6600)';
    }
    return 'linear-gradient(90deg, #ef4444, #dc2626)';
  };

  return (
    <div className="health-bar-container">
      <div className="health-label">
        <FormattedMessage id="score.health" defaultMessage="Stato sicurezza" />
      </div>
      <div
        className="health-bar-wrapper"
        role="meter"
        aria-label="Stato di sicurezza"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedHealth}
      >
        <div 
          className="health-bar-fill"
          style={{ 
            width: `${normalizedHealth}%`,
            background: getFillStyle(normalizedHealth)
          }}
        />
      </div>
      <span className="health-value">{normalizedHealth}%</span>
    </div>
  );
}
