import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import { isDatabaseConfigured, listAdminTenantsPage, recordAuditEvent } from '../_lib/db.js';
import type { AdminTenantPageFilters } from '../../src/models/platformOps.js';

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
  const page = await listAdminTenantsPage({
    query,
    status: (requestUrl.searchParams.get('status') ?? 'all') as AdminTenantPageFilters['status'],
    sort: (requestUrl.searchParams.get('sort') ?? 'risk') as AdminTenantPageFilters['sort'],
    direction: (requestUrl.searchParams.get('direction') ?? 'asc') as AdminTenantPageFilters['direction'],
    warningWindowDays: Number(requestUrl.searchParams.get('warningWindowDays') ?? ''),
    limit: Number(requestUrl.searchParams.get('limit') ?? ''),
    cursor: requestUrl.searchParams.get('cursor'),
  });
  await recordAuditEvent({
    actorUserId: accessResponse.identity.userId,
    organizationId: null,
    action: 'admin.tenants.read',
    objectType: 'organization',
    objectId: null,
    details: {
      filters: page.appliedFilters,
      resultCount: page.tenants.length,
    },
  }).catch(() => {});

  return json(
    {
      tenants: page.tenants,
      query: page.appliedFilters.query,
      pageInfo: page.pageInfo,
      appliedFilters: page.appliedFilters,
      status: 'ready',
      message: page.tenants.length ? null : query ? 'Nessun tenant trovato per la ricerca corrente.' : 'Nessun tenant registrato.',
    },
    { status: 200 },
  );
}
