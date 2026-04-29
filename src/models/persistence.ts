import type { EvidenceMode, SessionsArchiveStatus } from './accessControl';

export type PersistenceSyncStatus = 'idle' | 'loading' | 'syncing' | 'ready' | 'error';
export type PersistedSessionStatus = 'draft' | 'in_progress' | 'finalized' | 'aborted';

export interface PersistedSessionSummary {
  id: string;
  clientSessionId: string;
  organizationId: string | null;
  organizationName: string | null;
  licenseId: string | null;
  userId: string | null;
  startedByRole: string;
  scenarioSeed: string;
  traineeName: string;
  instructorName: string;
  providerName: string;
  courseCode: string;
  location: string;
  vrDeviceId: string;
  mode: 'demo' | 'full';
  evidenceVersion: string;
  evidenceMode: EvidenceMode;
  startedAt: string | null;
  endedAt: string | null;
  status: PersistedSessionStatus;
  outcomeLabel: string | null;
  totalScore: number | null;
  residualSafety: number | null;
  infractions: number | null;
  criticalInfractions: number | null;
  highInfractions: number | null;
  localIntegrityHash: string | null;
  serverHash: string | null;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
}

export interface PersistedSessionsResponse {
  sessions: PersistedSessionSummary[];
  status: SessionsArchiveStatus;
  message: string | null;
}

export interface PersistedSessionDetailResponse {
  session: PersistedSessionSummary;
  report: Record<string, unknown> | null;
  serverHash: string | null;
  message?: string | null;
}

export interface PersistedEventInput {
  id: string;
  eventIndex: number;
  type: string;
  phase: string;
  timestamp: number;
  payload: Record<string, string | number | boolean | null>;
}

export interface DraftSessionPayload {
  courseSession: {
    sessionId: string;
    scenarioSeed: string;
    traineeName: string;
    instructorName: string;
    providerName: string;
    courseCode: string;
    location: string;
    vrDeviceId: string;
    mode: 'demo' | 'full';
    evidenceVersion: string;
    organizationId: string | null;
    organizationName: string | null;
    licenseId: string | null;
    startedByUserId: string | null;
    startedByRole: string;
    startedAt: string | null;
    evidenceMode: EvidenceMode;
  };
}

export interface DraftSessionResponse {
  session: PersistedSessionSummary;
  message: string | null;
  status: SessionsArchiveStatus;
}

export interface FinalizeSessionPayload {
  report: Record<string, unknown>;
  localIntegrityHash: string | null;
  status: Extract<PersistedSessionStatus, 'finalized' | 'aborted'>;
  endedAt: string | null;
  events: PersistedEventInput[];
  outcome: {
    label: string;
    totalScore: number;
    residualSafety: number;
    infractions: number;
    criticalInfractions: number;
    highInfractions: number;
  };
}

export interface FinalizeSessionResponse {
  session: PersistedSessionSummary;
  serverHash: string;
  message: string | null;
}
