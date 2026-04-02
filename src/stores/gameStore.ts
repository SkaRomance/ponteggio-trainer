import { create } from 'zustand';
import type { Locale } from '../i18n';

export type GamePhase = 
  | 'menu'
  | 'warehouse'      // Fase 1: Magazzino
  | 'transport'      // Fase 2: Trasporto
  | 'storage'        // Fase 3: Stoccaggio
  | 'assembly'       // Fase 4: Montaggio
  | 'use'            // Fase 5: Uso
  | 'disassembly'    // Fase 6: Smontaggio
  | 'return'         // Fase 7: Ritorno
  | 'completed';     // Fine gioco

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface GameError {
  id: string;
  code: string;
  severity: ErrorSeverity;
  messageKey: string;
  phase: GamePhase;
  timestamp: number;
}

export interface PhaseScore {
  phase: GamePhase;
  startHealth: number;
  endHealth: number;
  errors: GameError[];
  completed: boolean;
  bonusPoints: number;
}

interface GameState {
  // Language
  locale: Locale;
  setLocale: (locale: Locale) => void;
  
  // Game Flow
  currentPhase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  nextPhase: () => void;
  
  // Health System
  currentHealth: number;
  maxHealth: number;
  reduceHealth: (amount: number) => void;
  resetHealth: () => void;
  
  // Score System
  totalScore: number;
  addScore: (points: number) => void;
  phaseScores: PhaseScore[];
  addPhaseScore: (score: PhaseScore) => void;
  
  // Errors
  errors: GameError[];
  addError: (error: Omit<GameError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
  
  // Game State
  isPlaying: boolean;
  isPaused: boolean;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Progress
  unlockedPhases: GamePhase[];
  unlockPhase: (phase: GamePhase) => void;
}

const phaseOrder: GamePhase[] = [
  'warehouse',
  'transport',
  'storage',
  'assembly',
  'use',
  'disassembly',
  'return',
];

const severityPenalty: Record<ErrorSeverity, number> = {
  critical: 50,
  high: 30,
  medium: 15,
  low: 5,
};

export const useGameStore = create<GameState>((set, get) => ({
  // Language
  locale: 'it',
  setLocale: (locale) => set({ locale }),
  
  // Game Flow
  currentPhase: 'menu',
  setPhase: (phase) => set({ currentPhase: phase }),
  nextPhase: () => {
    const current = get().currentPhase;
    const currentIndex = phaseOrder.indexOf(current);
    if (currentIndex < phaseOrder.length - 1) {
      set({ currentPhase: phaseOrder[currentIndex + 1] });
    } else {
      set({ currentPhase: 'completed' });
    }
  },
  
  // Health System
  currentHealth: 100,
  maxHealth: 100,
  reduceHealth: (amount) => {
    const newHealth = Math.max(0, get().currentHealth - amount);
    set({ currentHealth: newHealth });
    if (newHealth === 0) {
      // Game over for this phase
      get().endGame();
    }
  },
  resetHealth: () => set({ currentHealth: 100 }),
  
  // Score System
  totalScore: 0,
  addScore: (points) => set((state) => ({ 
    totalScore: state.totalScore + points 
  })),
  phaseScores: [],
  addPhaseScore: (score) => set((state) => ({
    phaseScores: [...state.phaseScores, score],
  })),
  
  // Errors
  errors: [],
  addError: (error) => {
    const newError: GameError = {
      ...error,
      id: `${error.phase}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    set((state) => ({ errors: [...state.errors, newError] }));
    // Auto-reduce health based on severity
    get().reduceHealth(severityPenalty[error.severity]);
  },
  clearErrors: () => set({ errors: [] }),
  
  // Game State
  isPlaying: false,
  isPaused: false,
  startGame: () => set({ 
    isPlaying: true, 
    isPaused: false, 
    currentPhase: 'warehouse',
    currentHealth: 100,
    totalScore: 0,
    errors: [],
    phaseScores: [],
  }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  endGame: () => set({ isPlaying: false }),
  resetGame: () => set({
    currentPhase: 'menu',
    currentHealth: 100,
    totalScore: 0,
    errors: [],
    phaseScores: [],
    isPlaying: false,
    isPaused: false,
  }),
  
  // Progress
  unlockedPhases: ['warehouse'],
  unlockPhase: (phase) => set((state) => ({
    unlockedPhases: [...new Set([...state.unlockedPhases, phase])],
  })),
}));
