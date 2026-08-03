import React from 'react';
import ProgressBar from './ProgressBar';
import AnswerOption from './AnswerOption';

/* QuizCard — Schermata domanda con immagine, testo e opzioni */
export default function QuizCard({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showFeedback,
  isCorrect,
}) {
  return (
    <div
      className="mars-animate-fade-in-up"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'var(--space-4)',
      }}
    >
      {/* Top meta row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div className="mars-badge">
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--mars-green)' }} />
          DOMANDA {currentIndex + 1}/{totalQuestions}
        </div>
        <span className="mars-label" style={{ fontSize: '0.7rem' }}>
          PONTEGGIO · SICUREZZA
        </span>
      </div>

      {/* Progress */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* Question Card */}
      <div className="mars-card" style={{ marginTop: 'var(--space-6)' }}>
        {/* Big number */}
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: 'clamp(3rem, 6vw, 5rem)',
            lineHeight: 1,
            color: 'var(--mars-green)',
            marginBottom: 'var(--space-4)',
            opacity: 0.9,
          }}
        >
          {String(currentIndex + 1).padStart(2, '0')}
        </div>

        {/* Image if present */}
        {question.image && (
          <div className="mars-safety-image" style={{ marginBottom: 'var(--space-6)', aspectRatio: '16/9' }}>
            <img src={question.image} alt="Scenario di sicurezza" />
          </div>
        )}

        {/* Question text */}
        <h2 className="mars-heading-card" style={{ marginBottom: 'var(--space-6)' }}>
          {question.text}
        </h2>

        {/* Answer options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {question.options.map((opt, idx) => {
            let state = 'default';
            if (selectedAnswer === idx) {
              state = showFeedback ? (isCorrect ? 'correct' : 'wrong') : 'selected';
            }
            if (showFeedback && idx === question.correctIndex && selectedAnswer !== idx) {
              state = 'correct';
            }
            return (
              <AnswerOption
                key={idx}
                label={String.fromCharCode(65 + idx)}
                text={opt}
                state={state}
                disabled={showFeedback}
                onClick={() => onSelectAnswer(idx)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
