import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import { isDatabaseConfigured, listAdminSessions, recordAuditEvent } from '../_lib/db.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.role !== 'admin') {
    return json({ message: 'Solo gli admin piattaforma possono accedere all archivio globale.' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return json(
      {
        sessions: [],
        message: 'Persistence backend non configurato.',
        status: 'database-required',
      },
      { status: 501 },
    );
  }

  const sessions = await listAdminSessions();
  await recordAuditEvent({
    actorUserId: accessResponse.identity.userId,
    organizationId: null,
    action: 'admin.sessions.read',
    objectType: 'training_session',
    objectId: null,
    details: {
      resultCount: sessions.length,
    },
  }).catch(() => {});
  return json(
    {
      sessions,
      message: sessions.length ? null : 'Nessuna sessione persistita disponibile.',
      status: 'ready',
    },
    { status: 200 },
  );
}
