import { useEffect, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
};

const toggleDocumentFullscreen = async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await document.documentElement.requestFullscreen();
};

export default function TrainingRuntimeControls() {
  const { isPaused, pauseGame, resumeGame, resetGame, pushNotice } = useGameStore();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [xrSupported, setXrSupported] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr;
    if (!xr) return;

    xr.isSessionSupported('immersive-vr')
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() !== 'f') return;

      event.preventDefault();
      void toggleDocumentFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startVrSession = async () => {
    if (!window.mars_start_vr_session) {
      pushNotice({
        severity: 'warning',
        title: 'VR non disponibile',
        message: 'Il browser non espone una sessione WebXR utilizzabile. Usa fullscreen o collega un visore compatibile.',
      });
      return;
    }

    try {
      const message = await window.mars_start_vr_session();
      pushNotice({
        severity: message.includes('avviata') ? 'success' : 'warning',
        title: 'Modalita VR',
        message,
      });
    } catch {
      pushNotice({
        severity: 'error',
        title: 'Errore VR',
        message: 'Avvio WebXR interrotto o non consentito dal browser.',
      });
    }
  };

  return (
    <div className="runtime-controls" aria-label="Controlli aula e VR">
      <button type="button" className="runtime-btn" onClick={toggleDocumentFullscreen}>
        <Maximize2 size={16} aria-hidden="true" />
        {isFullscreen ? 'Esci fullscreen' : 'Fullscreen (F)'}
      </button>
      <button type="button" className="runtime-btn" onClick={isPaused ? resumeGame : pauseGame}>
        {isPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        {isPaused ? 'Riprendi' : 'Pausa'}
      </button>
      <button type="button" className="runtime-btn" onClick={startVrSession} disabled={!xrSupported}>
        VR WebXR
      </button>
      <button type="button" className="runtime-btn danger" onClick={resetGame}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
