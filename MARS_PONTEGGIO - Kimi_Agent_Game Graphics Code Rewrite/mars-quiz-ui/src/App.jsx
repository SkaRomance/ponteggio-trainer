import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import HeroScreen from './components/HeroScreen';
import QuizCard from './components/QuizCard';
import ResultScreen from './components/ResultScreen';
import Footer from './components/Footer';
import './styles/variables.css';
import './styles/global.css';

/* Esempio dati quiz — sostituire con dati reali del gioco */
const DEMO_QUESTIONS = [
  {
    text: 'Qual è l\'altezza massima di un ponteggio mobile senza progetto specifico?',
    options: ['3 metri', '5 metri', '12 metri', '20 metri'],
    correctIndex: 2,
    image: '/images/ponteggio-mobile.jpg',
  },
  {
    text: 'Il colore giallo su un cartello di sicurezza indica:',
    options: ['Pericolo generico', 'Obbligo', 'Divieto', 'Primo soccorso'],
    correctIndex: 0,
    image: '/images/cartello-giallo.jpg',
  },
  {
    text: 'Quale DPI è obbligatorio per lavori su ponteggio oltre i 2 metri?',
    options: ['Guanti antitaglio', 'Casco', 'Imbracatura anticaduta', 'Occhiali protettivi'],
    correctIndex: 2,
    image: '/images/dpi-imbracatura.jpg',
  },
];

/* App principale — Quiz Game Mars Compliance */
export default function App() {
  const [screen, setScreen] = useState('hero'); // 'hero' | 'quiz' | 'result'
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  const questions = DEMO_QUESTIONS;

  const startQuiz = useCallback(() => {
    setScreen('quiz');
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelected(null);
    setShowFeedback(false);
  }, []);

  const handleSelect = useCallback(
    (idx) => {
      if (showFeedback) return;
      setSelected(idx);
      const correct = idx === questions[currentQ].correctIndex;
      setIsCorrect(correct);
      setShowFeedback(true);
      if (correct) setScore((s) => s + 1);
      setAnswers((a) => [...a, { question: currentQ, selected: idx, correct }]);

      // Auto-advance dopo 1.5s
      setTimeout(() => {
        if (currentQ + 1 < questions.length) {
          setCurrentQ((q) => q + 1);
          setSelected(null);
          setShowFeedback(false);
        } else {
          setScreen('result');
        }
      }, 1500);
    },
    [showFeedback, currentQ, questions]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--mars-cream)',
      }}
    >
      <Header variant={screen === 'hero' ? 'light' : 'dark'} />

      <main style={{ flex: 1 }}>
        {screen === 'hero' && (
          <HeroScreen
            onStart={startQuiz}
            stats={[
              { value: '15+', label: 'Anni di esperienza' },
              { value: '500+', label: 'Clienti gestiti' },
              { value: '24/7', label: 'Supporto continuo' },
            ]}
          />
        )}

        {screen === 'quiz' && (
          <div style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
            <QuizCard
              question={questions[currentQ]}
              currentIndex={currentQ}
              totalQuestions={questions.length}
              selectedAnswer={selected}
              onSelectAnswer={handleSelect}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
            />

            {/* Feedback toast */}
            <div className={`mars-toast ${showFeedback ? 'mars-toast-visible' : ''} ${isCorrect ? 'mars-toast-success' : 'mars-toast-error'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.25rem' }}>{isCorrect ? '✅' : '❌'}</span>
                <span>{isCorrect ? 'Risposta corretta!' : 'Risposta errata'}</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'result' && (
          <ResultScreen
            score={score}
            total={questions.length}
            onRetry={startQuiz}
            onHome={() => setScreen('hero')}
          />
        )}
      </main>

      {screen === 'hero' && <Footer />}
    </div>
  );
}
