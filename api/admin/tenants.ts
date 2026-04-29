import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import { isDatabaseConfigured, listAdminTenants, recordAuditEvent } from '../_lib/db.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.role !== 'admin') {
    return json({ message: 'Solo gli admin piattaforma possono consultare i tenant.' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return json(
      {
        tenants: [],
        query: '',
        status: 'database-required',
        message: 'Persistence backend non configurato.',
      },
      { status: 501 },
    );
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get('query')?.trim() ?? '';
  const tenants = await listAdminTenants(query);
  await recordAuditEvent({
    actorUserId: accessResponse.identity.userId,
    organizationId: null,
    action: 'admin.tenants.read',
    objectType: 'organization',
    objectId: null,
    details: {
      query,
      resultCount: tenants.length,
    },
  }).catch(() => {});

  return json(
    {
      tenants,
      query,
      status: 'ready',
      message: tenants.length ? null : query ? 'Nessun tenant trovato per la ricerca corrente.' : 'Nessun tenant registrato.',
    },
    { status: 200 },
  );
}
