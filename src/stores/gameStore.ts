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
export type NoticeSeverity = 'success' | 'warning' | 'error' | 'info';

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

export interface GameNotice {
  id: string;
  title?: string;
  message: string;
  severity: NoticeSeverity;
  phase?: GamePhase;
  persistent?: boolean;
  timestamp: number;
}

export interface GameState {
  // Access Control
  accessLevel: 'free' | 'premium';
  setAccessLevel: (level: 'free' | 'premium') => void;
  isPhaseLocked: (phase: GamePhase) => boolean;

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

  // Notices
  notices: GameNotice[];
  pushNotice: (notice: Omit<GameNotice, 'id' | 'timestamp'>) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
  
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
  completedPhases: GamePhase[];
  markPhaseCompleted: (phase: GamePhase) => void;

  // Storage & Logistics State
  loadedItems: string[];
  setLoadedItems: (items: string[]) => void;
  storageLocations: Record<string, { x: number; y: number; z: number }>;
  setStorageLocation: (itemId: string, pos: { x: number; y: number; z: number }) => void;
  
  // Transport Specific
  isStrapped: boolean;
  setStrapped: (val: boolean) => void;
  weightBalance: number; // -1 to 1 (left to right balance)
  setWeightBalance: (val: number) => void;

  // Assembly & PPE State
  isHarnessed: boolean;
  setHarnessed: (val: boolean) => void;
  isHooked: boolean;
  setHooked: (val: boolean) => void;
  assembledItems: string[];
  addAssembledItem: (id: string) => void;
  lastAssemblyStep: number;
  setLastAssemblyStep: (step: number) => void;
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

export const useGameStore = create<GameState>((set, get) => {
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';

  return {
    // Access Control
    accessLevel: isDemoMode ? 'free' : (localStorage.getItem('mars_access_level') as 'free' | 'premium') || 'free',
    setAccessLevel: (level) => {
      if (isDemoMode) return;
      localStorage.setItem('mars_access_level', level);
      set({ accessLevel: level });
    },
    isPhaseLocked: (phase) => {
      if (get().accessLevel === 'premium') return false;
      return phase !== 'warehouse' && phase !== 'menu' && phase !== 'completed';
    },

    // Language
    locale: 'it',
    setLocale: (locale) => set({ locale }),
    
    // Game Flow
    currentPhase: 'menu',
    setPhase: (phase) => {
      if (get().isPhaseLocked(phase)) return;
      set({ currentPhase: phase });
    },
    nextPhase: () => {
      const current = get().currentPhase;
      const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
      const currentIndex = phaseOrder.indexOf(current);

      if (current !== 'menu' && current !== 'completed') {
        get().markPhaseCompleted(current);
      }
      
      if (currentIndex < phaseOrder.length - 1) {
        const next = phaseOrder[currentIndex + 1];
        if (isDemoMode && current === 'warehouse') {
          set({ currentPhase: 'completed', isPlaying: false });
          return;
        }
        if (get().isPhaseLocked(next)) {
          set({ currentPhase: 'completed', isPlaying: false });
        } else {
          set({ currentPhase: next });
        }
      } else {
        set({ currentPhase: 'completed', isPlaying: false });
      }
    },
    
    // Health System
    currentHealth: 100,
    maxHealth: 100,
    reduceHealth: (amount) => {
      const newHealth = Math.max(0, get().currentHealth - amount);
      set({ currentHealth: newHealth });
      if (newHealth === 0) get().endGame();
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
      get().reduceHealth(severityPenalty[error.severity]);
    },
    clearErrors: () => set({ errors: [] }),

    // Notices
    notices: [],
    pushNotice: (notice) => {
      const newNotice: GameNotice = {
        ...notice,
        id: `notice-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        notices: [...state.notices, newNotice].slice(-5),
      }));
    },
    dismissNotice: (id) => set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    })),
    clearNotices: () => set({ notices: [] }),
    
    // Game State
    isPlaying: false,
    isPaused: false,
    startGame: () => {
      set({ 
        isPlaying: true, 
        isPaused: false, 
        currentPhase: 'warehouse',
        currentHealth: 100,
        totalScore: 0,
        errors: [],
        phaseScores: [],
        loadedItems: [],
        storageLocations: {},
        isStrapped: false,
        weightBalance: 0,
        isHarnessed: false,
        isHooked: false,
        assembledItems: [],
        lastAssemblyStep: 0,
        unlockedPhases: ['warehouse'],
        completedPhases: [],
        notices: [],
      });
    },
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
      loadedItems: [],
      storageLocations: {},
      isStrapped: false,
      weightBalance: 0,
      isHarnessed: false,
      isHooked: false,
      assembledItems: [],
      lastAssemblyStep: 0,
      unlockedPhases: ['warehouse'],
      completedPhases: [],
      notices: [],
    }),
    
    // Progress
    unlockedPhases: ['warehouse'],
    unlockPhase: (phase) => set((state) => ({
      unlockedPhases: [...new Set([...state.unlockedPhases, phase])],
    })),
    completedPhases: [],
    markPhaseCompleted: (phase) => {
      if (phase === 'menu' || phase === 'completed') return;
      set((state) => ({
        completedPhases: [...new Set([...state.completedPhases, phase])],
      }));
    },

    // Storage & Logistics State
    loadedItems: [],
    setLoadedItems: (items) => set({ loadedItems: items }),
    storageLocations: {},
    setStorageLocation: (itemId, pos) => set((state) => ({
      storageLocations: { ...state.storageLocations, [itemId]: pos }
    })),

    // Transport Specific
    isStrapped: false,
    setStrapped: (isStrapped) => set({ isStrapped }),
    weightBalance: 0,
    setWeightBalance: (weightBalance) => set({ weightBalance }),

    // Assembly & PPE State
    isHarnessed: false,
    setHarnessed: (isHarnessed) => set({ isHarnessed }),
    isHooked: false,
    setHooked: (isHooked) => set({ isHooked }),
    assembledItems: [],
    addAssembledItem: (id) => set((state) => ({
      assembledItems: [...state.assembledItems, id]
    })),
    lastAssemblyStep: 0,
    setLastAssemblyStep: (lastAssemblyStep) => set({ lastAssemblyStep }),
  };
});
