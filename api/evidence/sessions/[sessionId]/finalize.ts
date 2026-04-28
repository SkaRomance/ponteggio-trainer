import { hasFeature } from '../../../../src/models/accessControl.js';
import type { FinalizeSessionPayload } from '../../../../src/models/persistence.js';
import { getAccessResponseForRequest, json } from '../../../_lib/auth.js';
import { finalizeSession, getSessionByPersistedId, isDatabaseConfigured } from '../../../_lib/db.js';

export const config = {
  runtime: 'edge',
};

const canFinalize = (
  identity: Awaited<ReturnType<typeof getAccessResponseForRequest>>['accessResponse']['identity'],
  license: Awaited<ReturnType<typeof getAccessResponseForRequest>>['accessResponse']['license'],
) => identity.status === 'authenticated' && (identity.role === 'admin' || hasFeature(license, 'session_sync'));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const getNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && Number.isFinite(Number(value))
      ? Number(value)
      : null;

const validateFinalizePayload = (
  payload: FinalizeSessionPayload,
  currentSession: Awaited<ReturnType<typeof getSessionByPersistedId>>,
) => {
  if (!currentSession) return 'Sessione non trovata.';
  if (!payload.report || !payload.outcome || !Array.isArray(payload.events)) return 'Payload finale incompleto.';
  if (!payload.endedAt || typeof payload.endedAt !== 'string') return 'Timestamp di chiusura sessione mancante.';
  if (payload.events.length === 0 || payload.events.length > 2000) return 'Numero eventi finale non valido.';
  if (
    payload.events.some(
      (event, eventIndex) =>
        typeof event.id !== 'string' ||
        !event.id.trim() ||
        typeof event.type !== 'string' ||
        !event.type.trim() ||
        typeof event.phase !== 'string' ||
        !event.phase.trim() ||
        typeof event.eventIndex !== 'number' ||
        event.eventIndex !== eventIndex,
    )
  ) {
    return 'Sequenza eventi finale non valida.';
  }

  const report = isRecord(payload.report) ? payload.report : null;
  const reportSession = report && isRecord(report.session) ? report.session : null;
  const reportOutcome = report && isRecord(report.outcome) ? report.outcome : null;
  if (!report || !reportSession || !reportOutcome) {
    return 'Report finale non valido.';
  }

  const expectedSessionFields: Array<[string, string, string | null]> = [
    ['sessionId', getText(reportSession.sessionId), currentSession.clientSessionId],
    ['scenarioSeed', getText(reportSession.scenarioSeed), currentSession.scenarioSeed],
    ['traineeName', getText(reportSession.traineeName), currentSession.traineeName],
    ['instructorName', getText(reportSession.instructorName), currentSession.instructorName],
    ['providerName', getText(reportSession.providerName), currentSession.providerName],
    ['courseCode', getText(reportSession.courseCode), currentSession.courseCode],
    ['location', getText(reportSession.location), currentSession.location],
    ['vrDeviceId', getText(reportSession.vrDeviceId), currentSession.vrDeviceId],
    ['mode', getText(reportSession.mode), currentSession.mode],
  ];
  if (expectedSessionFields.some(([, actualValue, expectedValue]) => actualValue !== (expectedValue ?? ''))) {
    return 'Il report finale non corrisponde alla sessione server registrata.';
  }

  if (
    getText(reportOutcome.label) !== payload.outcome.label ||
    getNumber(reportOutcome.totalScore) !== payload.outcome.totalScore ||
    getNumber(reportOutcome.residualSafety) !== payload.outcome.residualSafety ||
    getNumber(reportOutcome.infractions) !== payload.outcome.infractions ||
    getNumber(reportOutcome.criticalInfractions) !== payload.outcome.criticalInfractions ||
    getNumber(reportOutcome.highInfractions) !== payload.outcome.highInfractions
  ) {
    return 'Outcome finale incoerente tra report e payload.';
  }

  return null;
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  if (!isDatabaseConfigured()) {
    return json({ message: 'Persistence backend non configurato.' }, { status: 501 });
  }

  const sessionId = new URL(request.url).pathname.split('/').slice(-2, -1)[0];
  if (!sessionId) {
    return json({ message: 'Sessione non specificata.' }, { status: 400 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (!canFinalize(accessResponse.identity, accessResponse.license)) {
    return json({ message: 'Permessi insufficienti per finalizzare la sessione.' }, { status: 403 });
  }

  const currentSession = await getSessionByPersistedId(sessionId);
  if (!currentSession) {
    return json({ message: 'Sessione non trovata.' }, { status: 404 });
  }

  if (
    accessResponse.identity.role !== 'admin' &&
    currentSession.organizationId !== accessResponse.identity.organizationId
  ) {
    return json({ message: 'Sessione non accessibile per l organizzazione corrente.' }, { status: 403 });
  }

  if (currentSession.status === 'finalized' && currentSession.serverHash) {
    return json(
      {
        session: currentSession,
        serverHash: currentSession.serverHash,
        message: 'Sessione gia finalizzata.',
      },
      { status: 200 },
    );
  }

  let payload: FinalizeSessionPayload;
  try {
    payload = (await request.json()) as FinalizeSessionPayload;
  } catch {
    return json({ message: 'Payload non valido.' }, { status: 400 });
  }

  const validationError = validateFinalizePayload(payload, currentSession);
  if (validationError) {
    return json({ message: validationError }, { status: 400 });
  }

  const result = await finalizeSession(currentSession, accessResponse.identity, payload);
  return json(
    {
      session: result.session,
      serverHash: result.serverHash,
      message: 'Sessione finalizzata e firmata dal server.',
    },
    { status: 200 },
  );
}
