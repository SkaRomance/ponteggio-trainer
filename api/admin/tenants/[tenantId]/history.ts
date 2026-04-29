import { getAccessResponseForRequest, json } from '../../../_lib/auth.js';
import {
  getAdminTenantHistory,
  isDatabaseConfigured,
  recordAuditEvent,
} from '../../../_lib/db.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.role !== 'admin') {
    return json({ message: 'Solo gli admin piattaforma possono consultare lo storico tenant.' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return json(
      {
        tenant: null,
        licenses: [],
        auditEvents: [],
        message: 'Persistence backend non configurato.',
      },
      { status: 501 },
    );
  }

  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const tenantId = segments[segments.length - 2] ? decodeURIComponent(segments[segments.length - 2]) : '';
  if (!tenantId) {
    return json({ message: 'Tenant non specificato.' }, { status: 400 });
  }

  const history = await getAdminTenantHistory(tenantId);
  if (!history.tenant) {
    return json({ message: 'Tenant non trovato.' }, { status: 404 });
  }

  await recordAuditEvent({
    actorUserId: accessResponse.identity.userId,
    organizationId: tenantId,
    action: 'admin.tenant.history.read',
    objectType: 'organization',
    objectId: tenantId,
    details: {
      licenseCount: history.licenses.length,
      auditEventCount: history.auditEvents.length,
    },
  }).catch(() => {});

  return json(history, { status: 200 });
}
