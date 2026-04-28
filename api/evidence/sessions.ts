import { hasFeature } from '../../src/models/accessControl.js';
import type { DraftSessionPayload, PersistedSessionsResponse } from '../../src/models/persistence.js';
import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import {
  createDraftSession,
  getSessionByClientSessionIdForOrganization,
  isDatabaseConfigured,
  listOrganizationSessions,
  listUserSessions,
} from '../_lib/db.js';

export const config = {
  runtime: 'edge',
};

const hasArchiveWriteAccess = (
  identity: Awaited<ReturnType<typeof getAccessResponseForRequest>>['accessResponse']['identity'],
  license: Awaited<ReturnType<typeof getAccessResponseForRequest>>['accessResponse']['license'],
) => identity.status === 'authenticated' && (identity.role === 'admin' || hasFeature(license, 'session_sync'));

const validateDraftPayload = (payload: Partial<DraftSessionPayload>) => {
  const courseSession = payload.courseSession;
  if (!courseSession) return 'Payload sessione mancante.';

  const requiredFields = [
    courseSession.sessionId,
    courseSession.scenarioSeed,
    courseSession.traineeName,
    courseSession.instructorName,
    courseSession.providerName,
    courseSession.courseCode,
    courseSession.startedAt,
  ];

  return requiredFields.every((value) => typeof value === 'string' && value.trim())
    ? null
    : 'Campi sessione obbligatori mancanti.';
};

export default async function handler(request: Request) {
  const { accessResponse } = await getAccessResponseForRequest(request);

  if (!isDatabaseConfigured()) {
    return json(
      {
        sessions: [],
        status: 'database-required',
        message: 'DATABASE_URL non configurato. Archivio sessioni non disponibile.',
      } satisfies PersistedSessionsResponse,
      { status: 501 },
    );
  }

  if (request.method === 'GET') {
    if (accessResponse.identity.status !== 'authenticated' || !accessResponse.identity.organizationId) {
      return json({ message: 'Autenticazione tenant richiesta.' }, { status: 401 });
    }

    const sessions =
      accessResponse.identity.role === 'customer' && accessResponse.identity.userId
        ? await listUserSessions(accessResponse.identity.organizationId, accessResponse.identity.userId)
        : await listOrganizationSessions(accessResponse.identity.organizationId);
    return json(
      {
        sessions,
        status: accessResponse.sessionsArchiveStatus,
        message: sessions.length ? null : 'Nessuna sessione persistita per l organizzazione corrente.',
      } satisfies PersistedSessionsResponse,
      { status: 200 },
    );
  }

  if (request.method === 'POST') {
    if (!hasArchiveWriteAccess(accessResponse.identity, accessResponse.license)) {
      return json({ message: 'Licenza o permessi insufficienti per archiviare sessioni.' }, { status: 403 });
    }
    if (!accessResponse.identity.organizationId) {
      return json({ message: 'Organizzazione attiva mancante per la persistenza sessioni.' }, { status: 409 });
    }

    let payload: DraftSessionPayload;
    try {
      payload = (await request.json()) as DraftSessionPayload;
    } catch {
      return json({ message: 'Payload non valido.' }, { status: 400 });
    }

    const validationError = validateDraftPayload(payload);
    if (validationError) {
      return json({ message: validationError }, { status: 400 });
    }

    const existing = await getSessionByClientSessionIdForOrganization(
      accessResponse.identity.organizationId,
      payload.courseSession.sessionId,
    );
    if (existing) {
      return json(
        {
          session: existing,
          status: accessResponse.sessionsArchiveStatus,
          message: 'Sessione server gia presente.',
        },
        { status: 200 },
      );
    }

    const session = await createDraftSession(accessResponse.identity, accessResponse.license, payload);
    return json(
      {
        session,
        status: accessResponse.sessionsArchiveStatus,
        message: 'Bozza sessione creata nel database.',
      },
      { status: 201 },
    );
  }

  return json({ message: 'Metodo non consentito.' }, { status: 405 });
}
