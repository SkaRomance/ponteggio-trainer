import { useCallback, useEffect, useRef, useState } from 'react';
import { phaseContent } from '../../config/phaseContent';
import { trainingAudio, type TrainingAudioCue } from '../../audio/trainingAudio';
import { useGameStore, type TrainingEvent } from '../../stores/gameStore';

const AUDIO_ENABLED_KEY = 'mars.ponteggio.audio.enabled';
const SPEECH_ENABLED_KEY = 'mars.ponteggio.audio.speech';

const readPreference = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
};

const writePreference = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
};

const hasBlockingOverlay = () =>
  Boolean(
    document.querySelector(
      '[role="dialog"], .inspection-overlay, .video-tutorial-overlay, .tutorial-overlay, .safety-quiz-overlay',
    ),
  );

const getProcedureCue = (event: TrainingEvent): TrainingAudioCue => {
  const action = String(event.payload.action ?? '');
  if (action.includes('snap') || action.includes('remove')) return 'place';
  if (action.includes('identify')) return 'inspect';
  if (action.includes('signage')) return 'success';
  if (action.includes('load')) return 'load';
  if (action.includes('store') || action.includes('block')) return 'place';
  if (action.includes('strap')) return 'strap';
  return 'step';
};

export default function GameAudioController() {
  const currentPhase = useGameStore((state) => state.currentPhase);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const isPaused = useGameStore((state) => state.isPaused);
  const notices = useGameStore((state) => state.notices);
  const eventLog = useGameStore((state) => state.eventLog);
  const [audioEnabled, setAudioEnabled] = useState(() => readPreference(AUDIO_ENABLED_KEY, true));
  const [speechEnabled, setSpeechEnabled] = useState(() => readPreference(SPEECH_ENABLED_KEY, true));
  const [unlocked, setUnlocked] = useState(false);
  const previousPhaseRef = useRef(currentPhase);
  const previousNoticeIdRef = useRef<string | null>(null);
  const previousEventIdRef = useRef<string | null>(null);
  const pressedMovementKeysRef = useRef(new Set<string>());
  const lastStepAtRef = useRef(0);

  const unlockAudio = useCallback(async (force = false) => {
    if (!force && !audioEnabled) return;
    const ok = await trainingAudio.resume();
    setUnlocked(ok);
  }, [audioEnabled]);

  useEffect(() => {
    trainingAudio.configure({ muted: !audioEnabled, speechEnabled });
    writePreference(AUDIO_ENABLED_KEY, audioEnabled);
    writePreference(SPEECH_ENABLED_KEY, speechEnabled);

    if (!audioEnabled) {
      trainingAudio.stopMusic();
    }
  }, [audioEnabled, speechEnabled]);

  useEffect(() => {
    if (!audioEnabled || unlocked) return;

    const handleUnlock = () => {
      void unlockAudio();
    };

    window.addEventListener('pointerdown', handleUnlock, { once: true, capture: true });
    window.addEventListener('keydown', handleUnlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock, { capture: true });
      window.removeEventListener('keydown', handleUnlock, { capture: true });
    };
  }, [audioEnabled, unlockAudio, unlocked]);

  useEffect(() => {
    if (!audioEnabled || !unlocked || !isPlaying || isPaused) {
      trainingAudio.stopMusic();
      return;
    }

    trainingAudio.startMusic(currentPhase);
  }, [audioEnabled, currentPhase, isPaused, isPlaying, unlocked]);

  useEffect(() => {
    if (!audioEnabled || !unlocked || previousPhaseRef.current === currentPhase) {
      previousPhaseRef.current = currentPhase;
      return;
    }

    previousPhaseRef.current = currentPhase;
    if (currentPhase === 'menu' || currentPhase === 'completed') return;

    const content = phaseContent[currentPhase];
    trainingAudio.playCue('phase');
    trainingAudio.speak(
      content
        ? `Capocantiere. ${content.eyebrow}. ${content.title}. ${content.description}`
        : `Capocantiere. Nuova fase: ${currentPhase}.`,
      'capocantiere',
    );
  }, [audioEnabled, currentPhase, unlocked]);

  useEffect(() => {
    if (!audioEnabled || !unlocked) return;
    const latestNotice = notices.at(-1);
    if (!latestNotice || latestNotice.id === previousNoticeIdRef.current) return;

    previousNoticeIdRef.current = latestNotice.id;
    trainingAudio.playNoticeCue(latestNotice.severity);
    trainingAudio.speak(`${latestNotice.title ? `${latestNotice.title}. ` : ''}${latestNotice.message}`, 'operatore');
  }, [audioEnabled, notices, unlocked]);

  useEffect(() => {
    if (!audioEnabled || !unlocked) return;
    const latestEvent = eventLog.at(-1);
    if (!latestEvent || latestEvent.id === previousEventIdRef.current) return;

    previousEventIdRef.current = latestEvent.id;

    if (latestEvent.type === 'session_started') {
      trainingAudio.playCue('phase');
      trainingAudio.speak('Sessione avviata. Ispeziona ogni componente senza affidarti a etichette preventive.', 'capocantiere');
    } else if (latestEvent.type === 'component_decision') {
      trainingAudio.playCue(latestEvent.payload.correct ? 'inspect' : 'warning');
    } else if (latestEvent.type === 'procedure_action') {
      trainingAudio.playCue(getProcedureCue(latestEvent));
    } else if (latestEvent.type === 'phase_completed') {
      trainingAudio.playCue('success');
    } else if (latestEvent.type === 'knowledge_check_presented') {
      trainingAudio.playCue('quiz');
      trainingAudio.speak('Blocco cantiere. Rispondi alla domanda rapida prima di proseguire.', 'capocantiere');
    } else if (latestEvent.type === 'knowledge_check_answered') {
      trainingAudio.playCue(latestEvent.payload.correct ? 'correct' : 'wrong');
    }
  }, [audioEnabled, eventLog, unlocked]);

  useEffect(() => {
    if (!audioEnabled || !unlocked) return;

    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const pressedMovementKeys = pressedMovementKeysRef.current;
    const playStep = () => {
      const now = performance.now();
      if (now - lastStepAtRef.current < 360) return;
      lastStepAtRef.current = now;
      trainingAudio.playCue('move');
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (isTypingTarget(event.target) || !movementKeys.has(key) || isPaused || hasBlockingOverlay()) return;
      pressedMovementKeys.add(key);
      playStep();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedMovementKeys.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedMovementKeys.clear();
    };
  }, [audioEnabled, isPaused, unlocked]);

  useEffect(
    () => () => {
      trainingAudio.shutdown();
    },
    [],
  );

  const audioLabel = audioEnabled ? (unlocked ? 'Audio attivo' : 'Audio pronto') : 'Audio spento';

  return (
    <div className="audio-control-panel" aria-label="Controlli audio simulazione">
      <button
        type="button"
        className="audio-toggle"
        aria-pressed={audioEnabled}
        onClick={() => {
          const nextEnabled = !audioEnabled;
          setAudioEnabled(nextEnabled);
          if (!nextEnabled) {
            setUnlocked(false);
          }
          if (nextEnabled) {
            void unlockAudio(true);
          }
        }}
      >
        {audioLabel}
      </button>
      <button
        type="button"
        className="audio-toggle"
        aria-pressed={speechEnabled}
        disabled={!audioEnabled}
        onClick={() => setSpeechEnabled((value) => !value)}
      >
        Voci {speechEnabled ? 'on' : 'off'}
      </button>
    </div>
  );
}
