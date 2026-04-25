import { useEffect, useRef, useState } from 'react';
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
  const progressIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  const videoInfo = tutorialVideos[videoId];
  const tutorialTitleId = videoInfo?.title;

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handlePlay = () => {
    if (isPlaying || progress === 100) {
      return;
    }

    setIsPlaying(true);

    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (progressIntervalRef.current) {
            window.clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          onComplete?.();
          return 100;
        }
        return p + 1;
      });
    }, 100);
  };

  return (
    <div className="video-tutorial-overlay tutorial-overlay">
      <div className="video-tutorial-container tutorial-panel">
        <div className="video-header tutorial-panel-header">
          <div>
            <p className="score-label">Mars Compliance</p>
            <h3>
              {tutorialTitleId ? (
                <FormattedMessage id={tutorialTitleId} defaultMessage={title} />
              ) : (
                title
              )}
            </h3>
          </div>
          <button type="button" className="close-btn" aria-label="Chiudi tutorial" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tutorial-panel-body">
          <div className="video-player">
            <div className="video-placeholder">
              {!isPlaying ? (
                <button type="button" className="start-btn play-button" onClick={handlePlay}>
                  <span className="play-icon" aria-hidden="true">▶</span>
                  <span className="play-text">
                    <FormattedMessage id="video.play" defaultMessage="Riproduci video" />
                  </span>
                </button>
              ) : (
                <div className="video-content">
                  <div className="simulated-video">
                    <div className="video-animation">
                      📹 <FormattedMessage id="video.playing" defaultMessage="Video in riproduzione..." />
                    </div>
                    <div className="progress-bar" aria-hidden="true">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="video-info component-info-card">
            <h3>
              <FormattedMessage id="tutorial.menu.title" defaultMessage="Video tutorial" />
            </h3>
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
                  <FormattedMessage id="video.completed" defaultMessage="Completato" />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="video-actions tutorial-panel-footer">
          <button type="button" className="btn-secondary btn-skip" onClick={onClose}>
            <FormattedMessage id="video.skip" defaultMessage="Salta" />
          </button>
          {progress === 100 ? (
            <button type="button" className="start-btn btn-continue" onClick={onClose}>
              <FormattedMessage id="video.continue" defaultMessage="Continua" />
            </button>
          ) : (
            <button type="button" className="start-btn btn-watch" onClick={handlePlay} disabled={isPlaying}>
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
    { id: 'inspection', icon: '🔍' },
    { id: 'lifting', icon: '💪' },
    { id: 'assembly', icon: '🛠️' },
    { id: 'dpi', icon: '🦺' },
  ] as const;

  return (
    <div className="video-tutorial-overlay tutorial-overlay">
      <div className="tutorial-menu-container tutorial-panel">
        <div className="video-header tutorial-panel-header">
          <h3>
            <FormattedMessage id="tutorial.menu.title" defaultMessage="Video tutorial" />
          </h3>
          <button type="button" className="close-btn" aria-label="Chiudi menu tutorial" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tutorial-grid tutorial-panel-body">
          {tutorials.map((tutorial) => (
            <button
              key={tutorial.id}
              type="button"
              className="tutorial-card component-info-card"
              onClick={() => onSelect(tutorial.id)}
            >
              <span className="tutorial-icon" aria-hidden="true">
                {tutorial.icon}
              </span>
              <div className="tutorial-info">
                <h4>
                  <FormattedMessage id={`tutorial.${tutorial.id}.title`} defaultMessage={tutorial.id} />
                </h4>
                <p>
                  <FormattedMessage id={`tutorial.${tutorial.id}.desc`} defaultMessage="Procedura operativa" />
                </p>
              </div>
              <span className="play-btn-small" aria-hidden="true">▶</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
