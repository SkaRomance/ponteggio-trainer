import { LICENSE_VALIDITY_YEARS, type LicenseFeature, type LicensePlan } from '../../src/models/accessControl.js';
import type { AdminLicenseUpsertPayload } from '../../src/models/platformOps.js';
import { getAccessResponseForRequest, json } from '../_lib/auth.js';
import { createOrRenewTenantLicense, isDatabaseConfigured } from '../_lib/db.js';

export const config = {
  runtime: 'edge',
};

const isLicenseFeature = (value: unknown): value is LicenseFeature =>
  value === 'full_course' ||
  value === 'session_sync' ||
  value === 'admin_sessions' ||
  value === 'updates' ||
  value === 'vr_runtime';

const isLicensePlan = (value: unknown): value is LicensePlan =>
  value === 'trial' || value === 'professional' || value === 'enterprise';

const normalizePayload = (body: unknown): AdminLicenseUpsertPayload | null => {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const organizationName = typeof record.organizationName === 'string' ? record.organizationName.trim() : '';
  const plan = record.plan;
  const seats = typeof record.seats === 'number' ? record.seats : Number(record.seats ?? NaN);
  const issuedAtInput = typeof record.issuedAt === 'string' ? record.issuedAt.trim() : '';
  const features = Array.isArray(record.features) ? record.features.filter(isLicenseFeature) : [];
  const issuedAtDate = issuedAtInput ? new Date(issuedAtInput) : null;
  const issuedAt =
    issuedAtDate && Number.isFinite(issuedAtDate.getTime()) ? issuedAtDate.toISOString() : issuedAtInput ? null : null;

  if (
    !organizationId ||
    !organizationName ||
    !isLicensePlan(plan) ||
    !Number.isFinite(seats) ||
    seats < 0 ||
    (issuedAtInput && !issuedAt)
  ) {
    return null;
  }

  return {
    organizationId,
    organizationName,
    plan,
    seats,
    issuedAt,
    features,
  };
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.role !== 'admin' || !accessResponse.identity.userId) {
    return json({ message: 'Solo gli admin piattaforma possono emettere o rinnovare licenze.' }, { status: 403 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Payload non valido.' }, { status: 400 });
  }

  const payload = normalizePayload(body);
  if (!payload) {
    return json(
      {
        message: `Campi obbligatori mancanti o non validi. La licenza ha durata ${LICENSE_VALIDITY_YEARS} anni.`,
      },
      { status: 400 },
    );
  }

  const result = await createOrRenewTenantLicense(accessResponse.identity, payload);
  return json(
    {
      tenant: result.tenant,
      license: result.license,
      message: result.license
        ? `Licenza ${result.license.plan} aggiornata con validita triennale per ${payload.organizationName}.`
        : 'Licenza aggiornata, ma riepilogo tenant non disponibile.',
    },
    { status: 200 },
  );
}
