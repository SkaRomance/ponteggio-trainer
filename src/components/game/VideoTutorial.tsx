import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

interface VideoTutorialProps {
  videoId: string;
  title: string;
  onClose: () => void;
  onComplete?: () => void;
}

const tutorialVideos: Record<string, { title: string; description: string; duration: string }> = {
  'inspection': {
    title: 'tutorial.inspection.title',
    description: 'tutorial.inspection.desc',
    duration: '2:30'
  },
  'lifting': {
    title: 'tutorial.lifting.title',
    description: 'tutorial.lifting.desc',
    duration: '1:45'
  },
  'assembly': {
    title: 'tutorial.assembly.title',
    description: 'tutorial.assembly.desc',
    duration: '3:15'
  },
  'dpi': {
    title: 'tutorial.dpi.title',
    description: 'tutorial.dpi.desc',
    duration: '1:30'
  }
};

export default function VideoTutorial({ videoId, title, onClose, onComplete }: VideoTutorialProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // Video ref for real video element (future implementation)

  const videoInfo = tutorialVideos[videoId];

  const handlePlay = () => {
    setIsPlaying(true);
    // Simula progresso video (in produzione usare evento timeupdate)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          onComplete?.();
          return 100;
        }
        return p + 1;
      });
    }, 100);
  };

  return (
    <div className="video-tutorial-overlay">
      <div className="video-tutorial-container">
        <div className="video-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="video-player">
          {/* Placeholder per video reale - in produzione sostituire con <video> tag */}
          <div className="video-placeholder">
            {!isPlaying ? (
              <div className="play-button" onClick={handlePlay}>
                <span className="play-icon">▶</span>
                <span className="play-text">
                  <FormattedMessage id="video.play" defaultMessage="Riproduci Video" />
                </span>
              </div>
            ) : (
              <div className="video-content">
                <div className="simulated-video">
                  <div className="video-animation">
                    📹 <FormattedMessage id="video.playing" defaultMessage="Video in riproduzione..." />
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="progress-text">{progress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="video-info">
          <p className="video-description">
            <FormattedMessage 
              id={videoInfo?.description || 'video.generic.desc'} 
              defaultMessage="Tutorial video per apprendere le procedure corrette." 
            />
          </p>
          <div className="video-meta">
            <span className="duration">⏱ {videoInfo?.duration || '2:00'}</span>
            {progress === 100 && (
              <span className="completed-badge">
                <FormattedMessage id="video.completed" defaultMessage="✓ Completato" />
              </span>
            )}
          </div>
        </div>

        <div className="video-actions">
          <button className="btn-skip" onClick={onClose}>
            <FormattedMessage id="video.skip" defaultMessage="Salta" />
          </button>
          {progress === 100 ? (
            <button className="btn-continue" onClick={onClose}>
              <FormattedMessage id="video.continue" defaultMessage="Continua" />
            </button>
          ) : (
            <button className="btn-watch" onClick={handlePlay} disabled={isPlaying}>
              <FormattedMessage id="video.watch" defaultMessage="Guarda" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Tutorial Menu Component
export function TutorialMenu({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) {
  const tutorials = [
    { id: 'inspection', icon: '🔍', color: '#4CAF50' },
    { id: 'lifting', icon: '💪', color: '#FF9800' },
    { id: 'assembly', icon: '🔧', color: '#2196F3' },
    { id: 'dpi', icon: '🦺', color: '#9C27B0' },
  ];

  return (
    <div className="video-tutorial-overlay">
      <div className="tutorial-menu-container">
        <div className="video-header">
          <h3>
            <FormattedMessage id="tutorial.menu.title" defaultMessage="Video Tutorial" />
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="tutorial-grid">
          {tutorials.map(tutorial => (
            <div 
              key={tutorial.id}
              className="tutorial-card"
              style={{ borderColor: tutorial.color }}
              onClick={() => onSelect(tutorial.id)}
            >
              <span className="tutorial-icon" style={{ background: tutorial.color }}>
                {tutorial.icon}
              </span>
              <div className="tutorial-info">
                <h4>
                  <FormattedMessage id={`tutorial.${tutorial.id}.title`} defaultMessage={tutorial.id} />
                </h4>
                <p>
                  <FormattedMessage id={`tutorial.${tutorial.id}.desc`} defaultMessage="Tutorial" />
                </p>
              </div>
              <span className="play-btn-small">▶</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
