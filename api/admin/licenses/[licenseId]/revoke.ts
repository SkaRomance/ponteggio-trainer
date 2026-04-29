import { getAccessResponseForRequest, json } from '../../../_lib/auth.js';
import { isDatabaseConfigured, revokeTenantLicense } from '../../../_lib/db.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.role !== 'admin' || !accessResponse.identity.userId) {
    return json({ message: 'Solo gli admin piattaforma possono revocare licenze.' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return json(
      {
        tenant: null,
        license: null,
        message: 'Persistence backend non configurato.',
      },
      { status: 501 },
    );
  }

  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const licenseId = segments[segments.length - 2];
  if (!licenseId) {
    return json({ message: 'Licenza non specificata.' }, { status: 400 });
  }

  const result = await revokeTenantLicense(accessResponse.identity, licenseId);
  if (!result.tenant && !result.license) {
    return json({ message: 'Licenza non trovata.' }, { status: 404 });
  }

  return json(
    {
      tenant: result.tenant,
      license: result.license,
      message: 'Licenza revocata. Il tenant mantiene solo accesso storico in lettura.',
    },
    { status: 200 },
  );
}
