import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { SafetyQuizOptionId } from '../../data/safetyQuiz';

const optionShortcut: Record<number, SafetyQuizOptionId> = {
  0: 'a',
  1: 'b',
};

export default function SafetyQuizModal() {
  const activeSafetyQuiz = useGameStore((state) => state.activeSafetyQuiz);
  const answerSafetyQuiz = useGameStore((state) => state.answerSafetyQuiz);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeSafetyQuiz) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => firstButtonRef.current?.focus(), 0);

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [activeSafetyQuiz]);

  useEffect(() => {
    if (!activeSafetyQuiz) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === '1' || event.key === '2') {
        event.preventDefault();
        answerSafetyQuiz(optionShortcut[Number(event.key) - 1]);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [activeSafetyQuiz, answerSafetyQuiz]);

  if (!activeSafetyQuiz) return null;

  const { question } = activeSafetyQuiz;

  return (
    <div className="safety-quiz-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="safety-quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-quiz-title"
        aria-describedby="safety-quiz-description"
      >
        <div className="safety-quiz-kicker">Blocco cantiere a sorpresa</div>
        <h2 id="safety-quiz-title">Domanda rapida sicurezza</h2>
        <p id="safety-quiz-description">{question.prompt}</p>
        <div className="safety-quiz-meta">
          <span>Argomento: {question.topic.replace(/-/g, ' ')}</span>
          <span>Scorciatoie: 1 / 2</span>
        </div>
        <div className="safety-quiz-options" aria-label="Scegli una risposta">
          {question.options.map((choice, index) => (
            <button
              key={choice.id}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              className="safety-quiz-option"
              onClick={() => answerSafetyQuiz(choice.id)}
            >
              <span className="safety-quiz-option-key">{index + 1}</span>
              <span>{choice.label}</span>
            </button>
          ))}
        </div>
        <p className="safety-quiz-note">
          Il gioco resta in pausa: scegli una delle due risposte per riprendere la prova.
        </p>
      </section>
    </div>
  );
}
