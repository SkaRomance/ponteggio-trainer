import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

const AUTO_DISMISS_MS = 4200;

export default function NoticeCenter() {
  const { notices, dismissNotice } = useGameStore();

  useEffect(() => {
    const timers = notices
      .filter((notice) => !notice.persistent)
      .map((notice) =>
        window.setTimeout(() => {
          dismissNotice(notice.id);
        }, AUTO_DISMISS_MS),
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissNotice, notices]);

  if (notices.length === 0) {
    return null;
  }

  return (
    <aside className="notice-center" aria-live="polite" aria-label="Notifiche di gioco">
      {notices.map((notice) => (
        <div key={notice.id} className={`notice-card notice-${notice.severity}`}>
          <div className="notice-copy">
            {notice.title ? <strong>{notice.title}</strong> : null}
            <p>{notice.message}</p>
          </div>
          <button
            type="button"
            className="notice-dismiss"
            aria-label="Chiudi notifica"
            onClick={() => dismissNotice(notice.id)}
          >
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}
