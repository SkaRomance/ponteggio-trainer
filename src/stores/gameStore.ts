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
  startScore: number;
  endScore: number;
  errors: GameError[];
  completed: boolean;
  bonusPoints: number;
}

export interface CourseSession {
  sessionId: string;
  scenarioSeed: string;
  traineeName: string;
  instructorName: string;
  providerName: string;
  courseCode: string;
  location: string;
  vrDeviceId: string;
  startedAt: string | null;
  endedAt: string | null;
  mode: 'demo' | 'full';
  evidenceVersion: string;
}

export interface TrainingEvent {
  id: string;
  type:
    | 'session_started'
    | 'session_ended'
    | 'phase_completed'
    | 'phase_aborted'
    | 'error_recorded'
    | 'component_decision'
    | 'notice_recorded'
    | 'procedure_action';
  phase: GamePhase;
  timestamp: number;
  payload: Record<string, string | number | boolean | null>;
}

interface PhaseAuditStart {
  phase: GamePhase;
  health: number;
  score: number;
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

  // Course Session / Evidence
  courseSession: CourseSession;
  sessionRunId: number;
  updateCourseSession: (patch: Partial<CourseSession>) => void;
  isCourseSessionReady: () => boolean;
  eventLog: TrainingEvent[];
  logEvent: (event: Omit<TrainingEvent, 'id' | 'timestamp'>) => void;
  
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
  transportGroundItems: string[];
  setTransportGroundItems: (items: string[]) => void;
  transportTruckItems: Array<{ id: string; x: number; y: number; z: number }>;
  setTransportTruckItems: (items: Array<{ id: string; x: number; y: number; z: number }>) => void;
  storageLocations: Record<string, { x: number; y: number; z: number }>;
  setStorageLocation: (itemId: string, pos: { x: number; y: number; z: number }) => void;
  clearStorageLocations: () => void;
  
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

  // Internal Audit State
  phaseAuditStart: PhaseAuditStart | null;
  beginPhaseAudit: (phase: GamePhase) => void;
}

export const phaseOrder: GamePhase[] = [
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

const isAuditablePhase = (phase: GamePhase) => phase !== 'menu' && phase !== 'completed';

const createSessionId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MARS-PONTEGGIO-${datePart}-${randomPart}`;
};

const createScenarioSeed = () => `SEED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const createCourseSession = (mode: CourseSession['mode'] = 'full'): CourseSession => ({
  sessionId: createSessionId(),
  scenarioSeed: createScenarioSeed(),
  traineeName: '',
  instructorName: '',
  providerName: '',
  courseCode: '',
  location: '',
  vrDeviceId: '',
  startedAt: null,
  endedAt: null,
  mode,
  evidenceVersion: 'mars-ponteggio-evidence-v1',
});

const createTrainingEvent = (event: Omit<TrainingEvent, 'id' | 'timestamp'>): TrainingEvent => ({
  ...event,
  id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: Date.now(),
});

const completeSession = (session: CourseSession): CourseSession => ({
  ...session,
  endedAt: session.endedAt ?? new Date().toISOString(),
});

export const useGameStore = create<GameState>((set, get) => {
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
  const initialAccessLevel: 'free' | 'premium' = isDemoMode
    ? 'free'
    : (localStorage.getItem('mars_access_level') as 'free' | 'premium') || 'free';

  return {
    // Access Control
    accessLevel: initialAccessLevel,
    setAccessLevel: (level) => {
      if (isDemoMode) return;
      localStorage.setItem('mars_access_level', level);
      set({ accessLevel: level });
    },
    isPhaseLocked: (phase) => {
      if (get().accessLevel === 'premium') return false;
      return phase !== 'warehouse' && phase !== 'transport' && phase !== 'menu' && phase !== 'completed';
    },

    // Language
    locale: 'it',
    setLocale: (locale) => set({ locale }),

    // Course Session / Evidence
    courseSession: createCourseSession(isDemoMode || initialAccessLevel === 'free' ? 'demo' : 'full'),
    sessionRunId: 0,
    updateCourseSession: (patch) => set((state) => ({
      courseSession: {
        ...state.courseSession,
        ...patch,
      },
    })),
    isCourseSessionReady: () => {
      const { courseSession } = get();
      return Boolean(
        courseSession.traineeName.trim() &&
        courseSession.instructorName.trim() &&
        courseSession.providerName.trim() &&
        courseSession.courseCode.trim(),
      );
    },
    eventLog: [],
    logEvent: (event) => set((state) => ({
      eventLog: [...state.eventLog, createTrainingEvent(event)],
    })),
    
    // Game Flow
    currentPhase: 'menu',
    setPhase: (phase) => {
      if (get().isPhaseLocked(phase)) return;
      const { currentHealth, totalScore } = get();
      set({
        currentPhase: phase,
        phaseAuditStart: isAuditablePhase(phase)
          ? { phase, health: currentHealth, score: totalScore }
          : null,
      });
    },
    nextPhase: () => {
      const state = get();
      const current = state.currentPhase;
      const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
      const currentIndex = phaseOrder.indexOf(current);

      if (isAuditablePhase(current)) {
        const phaseAuditStart =
          state.phaseAuditStart?.phase === current
            ? state.phaseAuditStart
            : { phase: current, health: state.currentHealth, score: state.totalScore };
        const phaseErrors = state.errors.filter((error) => error.phase === current);

        state.addPhaseScore({
          phase: current,
          startHealth: phaseAuditStart.health,
          endHealth: state.currentHealth,
          startScore: phaseAuditStart.score,
          endScore: state.totalScore,
          errors: phaseErrors,
          completed: true,
          bonusPoints: state.totalScore - phaseAuditStart.score,
        });
        state.logEvent({
          type: 'phase_completed',
          phase: current,
          payload: {
            scoreDelta: state.totalScore - phaseAuditStart.score,
            healthDelta: state.currentHealth - phaseAuditStart.health,
            errors: phaseErrors.length,
          },
        });
        state.markPhaseCompleted(current);
      }

      if (currentIndex < phaseOrder.length - 1) {
        const next = phaseOrder[currentIndex + 1];
        if (isDemoMode && current === 'transport') {
          set({
            currentPhase: 'completed',
            isPlaying: false,
            phaseAuditStart: null,
            courseSession: completeSession(state.courseSession),
            eventLog: [
              ...state.eventLog,
              createTrainingEvent({
                type: 'session_ended',
                phase: current,
                payload: {
                  sessionId: state.courseSession.sessionId,
                  totalScore: state.totalScore,
                  errors: state.errors.length,
                },
              }),
            ],
          });
          return;
        }
        if (state.isPhaseLocked(next)) {
          set({
            currentPhase: 'completed',
            isPlaying: false,
            phaseAuditStart: null,
            courseSession: completeSession(state.courseSession),
            eventLog: [
              ...state.eventLog,
              createTrainingEvent({
                type: 'session_ended',
                phase: current,
                payload: {
                  sessionId: state.courseSession.sessionId,
                  totalScore: state.totalScore,
                  errors: state.errors.length,
                },
              }),
            ],
          });
        } else {
          set({
            currentPhase: next,
            phaseAuditStart: { phase: next, health: state.currentHealth, score: state.totalScore },
            transportGroundItems:
              current === 'warehouse' && next === 'transport' ? [...state.loadedItems] : state.transportGroundItems,
            transportTruckItems:
              current === 'warehouse' && next === 'transport' ? [] : state.transportTruckItems,
            isStrapped: current === 'warehouse' && next === 'transport' ? false : state.isStrapped,
            weightBalance: current === 'warehouse' && next === 'transport' ? 0 : state.weightBalance,
          });
        }
      } else {
        set({
          currentPhase: 'completed',
          isPlaying: false,
          phaseAuditStart: null,
          courseSession: completeSession(state.courseSession),
          eventLog: [
            ...state.eventLog,
            createTrainingEvent({
              type: 'session_ended',
              phase: current,
              payload: {
                sessionId: state.courseSession.sessionId,
                totalScore: state.totalScore,
                errors: state.errors.length,
              },
            }),
          ],
        });
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
      phaseScores: [...state.phaseScores.filter((entry) => entry.phase !== score.phase), score]
        .sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)),
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
      get().logEvent({
        type: 'error_recorded',
        phase: error.phase,
        payload: {
          code: error.code,
          severity: error.severity,
          messageKey: error.messageKey,
        },
      });
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
      get().logEvent({
        type: 'notice_recorded',
        phase: notice.phase ?? get().currentPhase,
        payload: {
          severity: notice.severity,
          title: notice.title ?? '',
          message: notice.message,
          persistent: notice.persistent ?? false,
        },
      });
    },
    dismissNotice: (id) => set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    })),
    clearNotices: () => set({ notices: [] }),
    
    // Game State
    isPlaying: false,
    isPaused: false,
    startGame: () => {
      const previousSession = get().courseSession;
      const nextSessionId = createSessionId();
      const runMode: CourseSession['mode'] = isDemoMode || get().accessLevel === 'free' ? 'demo' : 'full';
      const nextSession: CourseSession = {
        ...previousSession,
        sessionId: nextSessionId,
        scenarioSeed: previousSession.scenarioSeed.trim() || createScenarioSeed(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        mode: runMode,
      };
      const sessionStartEvent = createTrainingEvent({
        type: 'session_started',
        phase: 'warehouse',
        payload: {
          sessionId: nextSessionId,
          mode: nextSession.mode,
          scenarioSeed: nextSession.scenarioSeed,
        },
      });

      set({ 
        isPlaying: true, 
        isPaused: false, 
        currentPhase: 'warehouse',
        currentHealth: 100,
        totalScore: 0,
        errors: [],
        phaseScores: [],
        loadedItems: [],
        transportGroundItems: [],
        transportTruckItems: [],
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
        eventLog: [sessionStartEvent],
        phaseAuditStart: { phase: 'warehouse', health: 100, score: 0 },
        courseSession: nextSession,
        sessionRunId: get().sessionRunId + 1,
      });
    },
    pauseGame: () => set({ isPaused: true }),
    resumeGame: () => set({ isPaused: false }),
    endGame: () => {
      const state = get();
      const phaseAuditStart =
        isAuditablePhase(state.currentPhase)
          ? state.phaseAuditStart?.phase === state.currentPhase
            ? state.phaseAuditStart
            : { phase: state.currentPhase, health: state.currentHealth, score: state.totalScore }
          : null;
      const failedPhaseScore =
        phaseAuditStart && !state.phaseScores.some((entry) => entry.phase === state.currentPhase)
          ? {
              phase: state.currentPhase,
              startHealth: phaseAuditStart.health,
              endHealth: state.currentHealth,
              startScore: phaseAuditStart.score,
              endScore: state.totalScore,
              errors: state.errors.filter((error) => error.phase === state.currentPhase),
              completed: false,
              bonusPoints: state.totalScore - phaseAuditStart.score,
            }
          : null;

      set({
        isPlaying: false,
        courseSession: completeSession(state.courseSession),
        phaseScores: failedPhaseScore
          ? [...state.phaseScores, failedPhaseScore].sort(
              (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase),
            )
          : state.phaseScores,
        eventLog: [
          ...state.eventLog,
          ...(failedPhaseScore
            ? [
                createTrainingEvent({
                  type: 'phase_aborted',
                  phase: state.currentPhase,
                  payload: {
                    scoreDelta: failedPhaseScore.endScore - failedPhaseScore.startScore,
                    healthDelta: failedPhaseScore.endHealth - failedPhaseScore.startHealth,
                    errors: failedPhaseScore.errors.length,
                  },
                }),
              ]
            : []),
          createTrainingEvent({
            type: 'session_ended',
            phase: state.currentPhase,
            payload: {
              sessionId: state.courseSession.sessionId,
              totalScore: state.totalScore,
              errors: state.errors.length,
            },
          }),
        ],
      });
    },
    resetGame: () => set({
      currentPhase: 'menu',
      currentHealth: 100,
      totalScore: 0,
      errors: [],
      phaseScores: [],
      isPlaying: false,
      isPaused: false,
      loadedItems: [],
      transportGroundItems: [],
      transportTruckItems: [],
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
      eventLog: [],
      phaseAuditStart: null,
      courseSession: {
        ...get().courseSession,
        endedAt: get().courseSession.endedAt ?? new Date().toISOString(),
      },
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
    transportGroundItems: [],
    setTransportGroundItems: (items) => set({ transportGroundItems: items }),
    transportTruckItems: [],
    setTransportTruckItems: (items) => set({ transportTruckItems: items }),
    storageLocations: {},
    setStorageLocation: (itemId, pos) => set((state) => ({
      storageLocations: { ...state.storageLocations, [itemId]: pos }
    })),
    clearStorageLocations: () => set({ storageLocations: {} }),

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

    // Internal Audit State
    phaseAuditStart: null,
    beginPhaseAudit: (phase) => {
      if (!isAuditablePhase(phase)) {
        set({ phaseAuditStart: null });
        return;
      }

      const { currentHealth, totalScore } = get();
      set({
        phaseAuditStart: {
          phase,
          health: currentHealth,
          score: totalScore,
        },
      });
    },
  };
});
