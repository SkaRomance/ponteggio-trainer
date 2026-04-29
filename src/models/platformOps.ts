import type {
  LicenseEntitlement,
  LicenseFeature,
  LicensePlan,
  LicenseStatus,
  SessionsArchiveStatus,
} from './accessControl';

export interface AdminTenantSummary {
  id: string;
  name: string;
  activeMemberCount: number;
  activeCustomerCount: number;
  activeInstructorCount: number;
  sessionCount: number;
  lastSessionAt: string | null;
  currentLicense: LicenseEntitlement | null;
}

export interface AdminTenantsResponse {
  tenants: AdminTenantSummary[];
  status: SessionsArchiveStatus;
  message: string | null;
  query: string;
}

export interface AdminLicenseUpsertPayload {
  organizationId: string;
  organizationName: string;
  plan: LicensePlan;
  seats: number;
  issuedAt?: string | null;
  features: LicenseFeature[];
}

export interface AdminLicenseMutationResponse {
  tenant: AdminTenantSummary | null;
  license: LicenseEntitlement | null;
  message: string | null;
}

export type PlatformOpsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PlatformOpsTenantSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  licenseId: string | null;
  licenseStatus: LicenseStatus;
  plan: LicensePlan;
  expiresAt: string | null;
  updatesUntil: string | null;
  seats: number;
  activeSeats: number | null;
  sessionCount: number;
  lastSessionAt: string | null;
  contactEmail: string | null;
  note: string | null;
  features: string[];
}

export interface PlatformOpsTenantsResponse {
  tenants: PlatformOpsTenantSummary[];
  status: PlatformOpsStatus;
  message: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' && entry.trim() ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeLicenseStatus = (value: unknown): LicenseStatus => {
  switch (asText(value)?.toLowerCase()) {
    case 'active':
      return 'active';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    case 'pending':
      return 'pending';
    default:
      return 'missing';
  }
};

const normalizeLicensePlan = (value: unknown): LicensePlan => {
  switch (asText(value)?.toLowerCase()) {
    case 'enterprise':
      return 'enterprise';
    case 'professional':
      return 'professional';
    default:
      return 'trial';
  }
};

const readNested = (record: Record<string, unknown>, key: string) => {
  const direct = record[key];
  if (direct !== undefined) return direct;
  return record[key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)];
};

const normalizeTenant = (value: unknown, index: number): PlatformOpsTenantSummary => {
  const record = asRecord(value) ?? {};
  const license = asRecord(record.license) ?? {};
  const organizationId =
    asText(readNested(record, 'organizationId')) ??
    asText(readNested(record, 'tenantId')) ??
    asText(readNested(record, 'orgId')) ??
    `tenant-${index + 1}`;
  const organizationName =
    asText(readNested(record, 'organizationName')) ??
    asText(readNested(record, 'tenantName')) ??
    asText(readNested(record, 'name')) ??
    `Tenant ${index + 1}`;
  const licenseId =
    asText(readNested(record, 'licenseId')) ??
    asText(readNested(license, 'licenseId')) ??
    asText(readNested(license, 'id'));
  const features = [
    ...asStringArray(readNested(record, 'features')),
    ...asStringArray(readNested(license, 'features')),
  ];

  return {
    id: asText(readNested(record, 'id')) ?? licenseId ?? organizationId,
    organizationId,
    organizationName,
    licenseId,
    licenseStatus: normalizeLicenseStatus(
      readNested(record, 'licenseStatus') ?? readNested(record, 'status') ?? readNested(license, 'status'),
    ),
    plan: normalizeLicensePlan(
      readNested(record, 'plan') ?? readNested(record, 'licensePlan') ?? readNested(license, 'plan'),
    ),
    expiresAt:
      asText(readNested(record, 'expiresAt')) ??
      asText(readNested(record, 'licenseExpiresAt')) ??
      asText(readNested(license, 'expiresAt')),
    updatesUntil:
      asText(readNested(record, 'updatesUntil')) ??
      asText(readNested(record, 'upgradeUntil')) ??
      asText(readNested(license, 'updatesUntil')),
    seats:
      asNumber(readNested(record, 'seats')) ??
      asNumber(readNested(record, 'seatCount')) ??
      asNumber(readNested(license, 'seats')) ??
      0,
    activeSeats:
      asNumber(readNested(record, 'activeSeats')) ??
      asNumber(readNested(record, 'usedSeats')) ??
      asNumber(readNested(license, 'activeSeats')),
    sessionCount:
      asNumber(readNested(record, 'sessionCount')) ??
      asNumber(readNested(record, 'sessions')) ??
      asNumber(readNested(record, 'trainingSessionsCount')) ??
      0,
    lastSessionAt:
      asText(readNested(record, 'lastSessionAt')) ??
      asText(readNested(record, 'updatedAt')) ??
      asText(readNested(record, 'lastActivityAt')),
    contactEmail:
      asText(readNested(record, 'contactEmail')) ??
      asText(readNested(record, 'email')) ??
      asText(readNested(record, 'ownerEmail')),
    note:
      asText(readNested(record, 'note')) ??
      asText(readNested(record, 'message')) ??
      asText(readNested(record, 'summary')),
    features: Array.from(new Set(features)),
  };
};

export const normalizePlatformOpsTenantsResponse = (payload: unknown): PlatformOpsTenantsResponse => {
  if (Array.isArray(payload)) {
    return {
      tenants: payload.map(normalizeTenant),
      status: 'ready',
      message: null,
    };
  }

  const record = asRecord(payload);
  if (!record) {
    return {
      tenants: [],
      status: 'error',
      message: 'Risposta tenant/licenze non valida.',
    };
  }

  const candidate = record.tenants ?? record.items ?? record.data ?? record.results ?? [];

  return {
    tenants: Array.isArray(candidate) ? candidate.map(normalizeTenant) : [],
    status: (record.status as PlatformOpsStatus) ?? 'ready',
    message: asText(record.message),
  };
};

export const getPlatformOpsTone = (status: LicenseStatus) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'expired':
    case 'revoked':
      return 'danger';
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

export const getLicenseDaysRemaining = (expiresAt: string | null, now = Date.now()) => {
  if (!expiresAt) return null;
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) return null;
  return Math.ceil((expiresAtMs - now) / 86400000);
};

export const formatSeatUtilization = (tenant: PlatformOpsTenantSummary) => {
  if (tenant.seats <= 0) return 'Posti non assegnati';
  if (tenant.activeSeats === null) return `${tenant.seats} posti previsti`;
  return `${tenant.activeSeats}/${tenant.seats} postazioni in uso`;
};

export const getNextLicenseActionLabel = (tenant: PlatformOpsTenantSummary) =>
  tenant.licenseId && tenant.licenseStatus !== 'missing' ? 'Rinnova triennio' : 'Emetti licenza';

export const matchesTenantSearch = (tenant: PlatformOpsTenantSummary, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = [
    tenant.organizationName,
    tenant.organizationId,
    tenant.contactEmail,
    tenant.licenseId,
    tenant.licenseStatus,
    tenant.plan,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
};
