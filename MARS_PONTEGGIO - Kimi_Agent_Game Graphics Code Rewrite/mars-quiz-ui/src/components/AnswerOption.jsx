import React from 'react';

/* AnswerOption — Singola risposta con stato selezione/corretto/errato */
export default function AnswerOption({ label, text, state = 'default', disabled, onClick }) {
  const classMap = {
    default: '',
    selected: 'mars-answer-selected',
    correct: 'mars-answer-correct',
    wrong: 'mars-answer-wrong',
  };

  const iconMap = {
    default: null,
    selected: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    correct: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    wrong: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <button
      className={`mars-answer ${classMap[state] || ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'selected'}
    >
      <span className="mars-answer-marker">{iconMap[state] || label}</span>
      <span style={{ fontWeight: 500 }}>{text}</span>
    </button>
  );
}
