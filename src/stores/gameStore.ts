import { create } from 'zustand';
import type { Locale } from '../i18n';
import {
  canViewAllSessions,
  createAccessApiResponse,
  createAnonymousIdentity,
  createMissingLicense,
  getAccessLevel,
  getSessionMode,
  type AccessApiResponse,
  type AccessLevel,
  type AccessSyncStatus,
  type AuthIdentity,
  type EvidenceMode,
  type LicenseEntitlement,
  type SessionsArchiveStatus,
} from '../models/accessControl';

export type GamePhase =
  | 'menu'
  | 'warehouse'
  | 'transport'
  | 'storage'
  | 'assembly'
  | 'use'
  | 'disassembly'
  | 'return'
  | 'completed';

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
  organizationId: string | null;
  organizationName: string | null;
  licenseId: string | null;
  startedByUserId: string | null;
  startedByRole: AuthIdentity['role'];
  licenseExpiresAt: string | null;
  updatesUntil: string | null;
  evidenceMode: EvidenceMode;
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
  accessLevel: AccessLevel;
  isPhaseLocked: (phase: GamePhase) => boolean;
  authConfigured: boolean;
  authIdentity: AuthIdentity;
  licenseEntitlement: LicenseEntitlement;
  accessSyncStatus: AccessSyncStatus;
  accessSyncMessage: string | null;
  evidenceMode: EvidenceMode;
  sessionsArchiveStatus: SessionsArchiveStatus;
  syncAccessState: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  canViewGlobalSessions: () => boolean;

  locale: Locale;
  setLocale: (locale: Locale) => void;

  courseSession: CourseSession;
  sessionRunId: number;
  updateCourseSession: (patch: Partial<CourseSession>) => void;
  isCourseSessionReady: () => boolean;
  eventLog: TrainingEvent[];
  logEvent: (event: Omit<TrainingEvent, 'id' | 'timestamp'>) => void;

  currentPhase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  nextPhase: () => void;

  currentHealth: number;
  maxHealth: number;
  reduceHealth: (amount: number) => void;
  resetHealth: () => void;

  totalScore: number;
  addScore: (points: number) => void;
  phaseScores: PhaseScore[];
  addPhaseScore: (score: PhaseScore) => void;

  errors: GameError[];
  addError: (error: Omit<GameError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;

  notices: GameNotice[];
  pushNotice: (notice: Omit<GameNotice, 'id' | 'timestamp'>) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;

  isPlaying: boolean;
  isPaused: boolean;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  unlockedPhases: GamePhase[];
  unlockPhase: (phase: GamePhase) => void;
  completedPhases: GamePhase[];
  markPhaseCompleted: (phase: GamePhase) => void;

  loadedItems: string[];
  setLoadedItems: (items: string[]) => void;
  transportGroundItems: string[];
  setTransportGroundItems: (items: string[]) => void;
  transportTruckItems: Array<{ id: string; x: number; y: number; z: number }>;
  setTransportTruckItems: (items: Array<{ id: string; x: number; y: number; z: number }>) => void;
  storageLocations: Record<string, { x: number; y: number; z: number }>;
  setStorageLocation: (itemId: string, pos: { x: number; y: number; z: number }) => void;
  clearStorageLocations: () => void;

  isStrapped: boolean;
  setStrapped: (val: boolean) => void;
  weightBalance: number;
  setWeightBalance: (val: number) => void;

  isHarnessed: boolean;
  setHarnessed: (val: boolean) => void;
  isHooked: boolean;
  setHooked: (val: boolean) => void;
  assembledItems: string[];
  addAssembledItem: (id: string) => void;
  lastAssemblyStep: number;
  setLastAssemblyStep: (step: number) => void;

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

const createScenarioSeed = () =>
  `SEED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const withAccessContext = (
  session: CourseSession,
  identity: AuthIdentity,
  license: LicenseEntitlement,
  evidenceMode: EvidenceMode,
  mode: CourseSession['mode'],
): CourseSession => ({
  ...session,
  mode,
  organizationId: identity.organizationId ?? license.organizationId,
  organizationName: license.organizationName,
  licenseId: license.licenseId,
  startedByUserId: identity.userId,
  startedByRole: identity.role,
  licenseExpiresAt: license.expiresAt,
  updatesUntil: license.updatesUntil,
  evidenceMode,
});

const createCourseSession = (
  mode: CourseSession['mode'] = 'demo',
  accessResponse: AccessApiResponse = createAccessApiResponse(),
): CourseSession =>
  withAccessContext(
    {
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
      evidenceVersion: 'mars-ponteggio-evidence-v2',
      organizationId: null,
      organizationName: null,
      licenseId: null,
      startedByUserId: null,
      startedByRole: 'anonymous',
      licenseExpiresAt: null,
      updatesUntil: null,
      evidenceMode: accessResponse.evidenceMode,
    },
    accessResponse.identity,
    accessResponse.license,
    accessResponse.evidenceMode,
    mode,
  );

const createTrainingEvent = (event: Omit<TrainingEvent, 'id' | 'timestamp'>): TrainingEvent => ({
  ...event,
  id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: Date.now(),
});

const completeSession = (session: CourseSession): CourseSession => ({
  ...session,
  endedAt: session.endedAt ?? new Date().toISOString(),
});

const parseAccessResponse = async (response: Response) => {
  const payload = (await response.json()) as Partial<AccessApiResponse>;
  return createAccessApiResponse(payload);
};

const readResponseMessage = async (response: Response, fallback: string) => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const useGameStore = create<GameState>((set, get) => {
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
  const initialAccessResponse = createAccessApiResponse();
  const initialMode = getSessionMode(
    initialAccessResponse.identity,
    initialAccessResponse.license,
    isDemoMode,
  );

  return {
    accessLevel: isDemoMode
      ? 'free'
      : getAccessLevel(initialAccessResponse.identity, initialAccessResponse.license),
    isPhaseLocked: (phase) => {
      if (get().accessLevel === 'premium') return false;
      return phase !== 'warehouse' && phase !== 'transport' && phase !== 'menu' && phase !== 'completed';
    },
    authConfigured: false,
    authIdentity: createAnonymousIdentity(),
    licenseEntitlement: createMissingLicense(),
    accessSyncStatus: 'idle',
    accessSyncMessage: null,
    evidenceMode: initialAccessResponse.evidenceMode,
    sessionsArchiveStatus: initialAccessResponse.sessionsArchiveStatus,
    syncAccessState: async () => {
      set({ accessSyncStatus: 'loading', accessSyncMessage: null });

      try {
        const response = await fetch('/api/me', {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error(await readResponseMessage(response, 'Impossibile sincronizzare l’accesso.'));
        }

        const payload = await parseAccessResponse(response);
        const nextAccessLevel = isDemoMode ? 'free' : getAccessLevel(payload.identity, payload.license);
        const nextMode = getSessionMode(payload.identity, payload.license, isDemoMode);

        set((state) => ({
          authConfigured: payload.configured,
          authIdentity: payload.identity,
          licenseEntitlement: payload.license,
          accessLevel: nextAccessLevel,
          evidenceMode: payload.evidenceMode,
          sessionsArchiveStatus: payload.sessionsArchiveStatus,
          accessSyncStatus: 'ready',
          accessSyncMessage: payload.message,
          courseSession: withAccessContext(
            {
              ...state.courseSession,
              mode: nextMode,
            },
            payload.identity,
            payload.license,
            payload.evidenceMode,
            nextMode,
          ),
        }));
      } catch (error) {
        set({
          authConfigured: false,
          authIdentity: createAnonymousIdentity(),
          licenseEntitlement: createMissingLicense(),
          accessLevel: 'free',
          evidenceMode: 'local-preview',
          sessionsArchiveStatus: 'unavailable',
          accessSyncStatus: 'error',
          accessSyncMessage: error instanceof Error ? error.message : 'Errore di sincronizzazione accessi.',
        });
      }
    },
    login: async (email, password) => {
      set({ accessSyncStatus: 'loading', accessSyncMessage: null });

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error(await readResponseMessage(response, 'Credenziali non valide.'));
        }

        await get().syncAccessState();
        return true;
      } catch (error) {
        set({
          accessSyncStatus: 'error',
          accessSyncMessage: error instanceof Error ? error.message : 'Errore di autenticazione.',
        });
        return false;
      }
    },
    logout: async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
        });
      } catch {
        // Even if the backend call fails, the local UI should fall back to anonymous access.
      }

      const anonymousIdentity = createAnonymousIdentity();
      const missingLicense = createMissingLicense();
      const nextMode = getSessionMode(anonymousIdentity, missingLicense, isDemoMode);

      set((state) => ({
        accessLevel: 'free',
        authIdentity: anonymousIdentity,
        licenseEntitlement: missingLicense,
        evidenceMode: 'local-preview',
        sessionsArchiveStatus: 'unavailable',
        accessSyncStatus: 'ready',
        accessSyncMessage: state.authConfigured
          ? 'Sessione autenticata chiusa. Archivio globale non disponibile senza backend.'
          : 'Sessione chiusa.',
        courseSession: withAccessContext(
          {
            ...state.courseSession,
            mode: nextMode,
          },
          anonymousIdentity,
          missingLicense,
          'local-preview',
          nextMode,
        ),
      }));
    },
    canViewGlobalSessions: () => canViewAllSessions(get().authIdentity, get().licenseEntitlement),

    locale: 'it',
    setLocale: (locale) => set({ locale }),

    courseSession: createCourseSession(initialMode, initialAccessResponse),
    sessionRunId: 0,
    updateCourseSession: (patch) =>
      set((state) => ({
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
    logEvent: (event) =>
      set((state) => ({
        eventLog: [...state.eventLog, createTrainingEvent(event)],
      })),

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

    currentHealth: 100,
    maxHealth: 100,
    reduceHealth: (amount) => {
      const newHealth = Math.max(0, get().currentHealth - amount);
      set({ currentHealth: newHealth });
      if (newHealth === 0) get().endGame();
    },
    resetHealth: () => set({ currentHealth: 100 }),

    totalScore: 0,
    addScore: (points) =>
      set((state) => ({
        totalScore: state.totalScore + points,
      })),
    phaseScores: [],
    addPhaseScore: (score) =>
      set((state) => ({
        phaseScores: [...state.phaseScores.filter((entry) => entry.phase !== score.phase), score].sort(
          (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase),
        ),
      })),

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
    dismissNotice: (id) =>
      set((state) => ({
        notices: state.notices.filter((notice) => notice.id !== id),
      })),
    clearNotices: () => set({ notices: [] }),

    isPlaying: false,
    isPaused: false,
    startGame: () => {
      const state = get();
      const previousSession = state.courseSession;
      const nextSessionId = createSessionId();
      const runMode = getSessionMode(state.authIdentity, state.licenseEntitlement, isDemoMode);
      const nextSession = withAccessContext(
        {
          ...previousSession,
          sessionId: nextSessionId,
          scenarioSeed: previousSession.scenarioSeed.trim() || createScenarioSeed(),
          startedAt: new Date().toISOString(),
          endedAt: null,
          mode: runMode,
        },
        state.authIdentity,
        state.licenseEntitlement,
        state.evidenceMode,
        runMode,
      );
      const sessionStartEvent = createTrainingEvent({
        type: 'session_started',
        phase: 'warehouse',
        payload: {
          sessionId: nextSessionId,
          mode: nextSession.mode,
          scenarioSeed: nextSession.scenarioSeed,
          organizationId: nextSession.organizationId,
          licenseId: nextSession.licenseId,
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
        sessionRunId: state.sessionRunId + 1,
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
    resetGame: () =>
      set((state) => ({
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
          ...state.courseSession,
          endedAt: state.courseSession.endedAt ?? new Date().toISOString(),
        },
      })),

    unlockedPhases: ['warehouse'],
    unlockPhase: (phase) =>
      set((state) => ({
        unlockedPhases: [...new Set([...state.unlockedPhases, phase])],
      })),
    completedPhases: [],
    markPhaseCompleted: (phase) => {
      if (phase === 'menu' || phase === 'completed') return;
      set((state) => ({
        completedPhases: [...new Set([...state.completedPhases, phase])],
      }));
    },

    loadedItems: [],
    setLoadedItems: (items) => set({ loadedItems: items }),
    transportGroundItems: [],
    setTransportGroundItems: (items) => set({ transportGroundItems: items }),
    transportTruckItems: [],
    setTransportTruckItems: (items) => set({ transportTruckItems: items }),
    storageLocations: {},
    setStorageLocation: (itemId, pos) =>
      set((state) => ({
        storageLocations: { ...state.storageLocations, [itemId]: pos },
      })),
    clearStorageLocations: () => set({ storageLocations: {} }),

    isStrapped: false,
    setStrapped: (isStrapped) => set({ isStrapped }),
    weightBalance: 0,
    setWeightBalance: (weightBalance) => set({ weightBalance }),

    isHarnessed: false,
    setHarnessed: (isHarnessed) => set({ isHarnessed }),
    isHooked: false,
    setHooked: (isHooked) => set({ isHooked }),
    assembledItems: [],
    addAssembledItem: (id) =>
      set((state) => ({
        assembledItems: [...state.assembledItems, id],
      })),
    lastAssemblyStep: 0,
    setLastAssemblyStep: (lastAssemblyStep) => set({ lastAssemblyStep }),

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
