import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import { isDatabaseConfigured, listAdminSessionsPage, recordAuditEvent } from '../_lib/db.js';

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

  const requestUrl = new URL(request.url);
  const page = await listAdminSessionsPage({
    query: requestUrl.searchParams.get('query') ?? '',
    organizationId: requestUrl.searchParams.get('organizationId'),
    status: requestUrl.searchParams.get('status') ?? 'all',
    evidenceMode: requestUrl.searchParams.get('evidenceMode') ?? 'all',
    startedByRole: requestUrl.searchParams.get('startedByRole') ?? 'all',
    createdFrom: requestUrl.searchParams.get('createdFrom'),
    createdTo: requestUrl.searchParams.get('createdTo'),
    limit: Number(requestUrl.searchParams.get('limit') ?? ''),
    cursor: requestUrl.searchParams.get('cursor'),
  });
  await recordAuditEvent({
    actorUserId: accessResponse.identity.userId,
    organizationId: null,
    action: 'admin.sessions.read',
    objectType: 'training_session',
    objectId: null,
    details: {
      filters: page.appliedFilters,
      resultCount: page.sessions.length,
    },
  }).catch(() => {});
  return json(
    {
      sessions: page.sessions,
      pageInfo: page.pageInfo,
      appliedFilters: page.appliedFilters,
      message: page.sessions.length ? null : 'Nessuna sessione persistita disponibile.',
      status: 'ready',
    },
    { status: 200 },
  );
}
