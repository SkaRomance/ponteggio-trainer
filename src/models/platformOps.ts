import type {
  LicenseEntitlement,
  LicenseFeature,
  LicensePlan,
  LicenseStatus,
  SessionsArchiveStatus,
} from './accessControl';
import { normalizePageInfo, type PageInfo } from './pagination';

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
  pageInfo?: PageInfo | null;
  appliedFilters?: AdminTenantPageFilters;
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

export interface AdminLicenseHistoryEntry {
  licenseId: string;
  organizationId: string;
  organizationName: string | null;
  plan: LicensePlan;
  status: LicenseStatus;
  issuedAt: string | null;
  expiresAt: string | null;
  updatesUntil: string | null;
  seats: number;
  features: LicenseFeature[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminAuditTimelineEntry {
  id: string;
  action: string;
  objectType: string;
  objectId: string | null;
  actorUserId: string | null;
  actorDisplayName: string | null;
  actorEmail: string | null;
  organizationId: string | null;
  createdAt: string | null;
  details: Record<string, unknown>;
}

export interface AdminTenantHistoryResponse {
  tenant: AdminTenantSummary | null;
  licenses: AdminLicenseHistoryEntry[];
  auditEvents: AdminAuditTimelineEntry[];
  message: string | null;
}

export type AdminTenantFilter = 'all' | 'active' | 'expiring' | 'missing' | 'expired' | 'revoked';
export type AdminTenantSort = 'risk' | 'name' | 'sessions' | 'members' | 'expiry';
export type AdminTenantTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface AdminTenantPageFilters {
  query: string;
  status: AdminTenantFilter;
  sort: AdminTenantSort;
  direction: 'asc' | 'desc';
  warningWindowDays: number;
  limit: number;
  cursor: string | null;
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

const normalizeLicenseFeature = (value: unknown): LicenseFeature | null => {
  switch (asText(value)?.toLowerCase()) {
    case 'full_course':
      return 'full_course';
    case 'session_sync':
      return 'session_sync';
    case 'admin_sessions':
      return 'admin_sessions';
    case 'updates':
      return 'updates';
    case 'vr_runtime':
      return 'vr_runtime';
    default:
      return null;
  }
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

const normalizeLicenseFeatures = (value: unknown): LicenseFeature[] =>
  asStringArray(value)
    .map((entry) => normalizeLicenseFeature(entry))
    .filter((entry): entry is LicenseFeature => Boolean(entry));

const normalizeAdminTenantLicense = (
  value: unknown,
  organizationId: string,
  organizationName: string,
): LicenseEntitlement | null => {
  const record = asRecord(value);
  if (!record || Object.keys(record).length === 0) return null;

  return {
    licenseId: asText(readNested(record, 'licenseId')) ?? asText(readNested(record, 'id')),
    organizationId: asText(readNested(record, 'organizationId')) ?? organizationId,
    organizationName:
      asText(readNested(record, 'organizationName')) ?? organizationName,
    plan: normalizeLicensePlan(readNested(record, 'plan')),
    status: normalizeLicenseStatus(readNested(record, 'status')),
    issuedAt: asText(readNested(record, 'issuedAt')),
    expiresAt: asText(readNested(record, 'expiresAt')),
    updatesUntil: asText(readNested(record, 'updatesUntil')),
    seats: asNumber(readNested(record, 'seats')) ?? 0,
    features: normalizeLicenseFeatures(readNested(record, 'features')),
    source: 'backend',
  };
};

const normalizeAdminLicenseHistoryEntry = (value: unknown): AdminLicenseHistoryEntry | null => {
  const record = asRecord(value);
  if (!record) return null;

  const licenseId = asText(readNested(record, 'licenseId')) ?? asText(readNested(record, 'id'));
  const organizationId = asText(readNested(record, 'organizationId'));
  if (!licenseId || !organizationId) return null;

  return {
    licenseId,
    organizationId,
    organizationName: asText(readNested(record, 'organizationName')),
    plan: normalizeLicensePlan(readNested(record, 'plan')),
    status: normalizeLicenseStatus(readNested(record, 'status')),
    issuedAt: asText(readNested(record, 'issuedAt')),
    expiresAt: asText(readNested(record, 'expiresAt')),
    updatesUntil: asText(readNested(record, 'updatesUntil')),
    seats: asNumber(readNested(record, 'seats')) ?? 0,
    features: normalizeLicenseFeatures(readNested(record, 'features')),
    createdAt: asText(readNested(record, 'createdAt')),
    updatedAt: asText(readNested(record, 'updatedAt')),
  };
};

const normalizeAdminAuditTimelineEntry = (value: unknown): AdminAuditTimelineEntry | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = asText(readNested(record, 'id'));
  const action = asText(readNested(record, 'action'));
  const objectType = asText(readNested(record, 'objectType'));
  if (!id || !action || !objectType) return null;

  return {
    id,
    action,
    objectType,
    objectId: asText(readNested(record, 'objectId')),
    actorUserId: asText(readNested(record, 'actorUserId')),
    actorDisplayName: asText(readNested(record, 'actorDisplayName')),
    actorEmail: asText(readNested(record, 'actorEmail')),
    organizationId: asText(readNested(record, 'organizationId')),
    createdAt: asText(readNested(record, 'createdAt')),
    details: asRecord(readNested(record, 'details')) ?? {},
  };
};

const normalizeAdminTenant = (value: unknown, index: number): AdminTenantSummary => {
  const record = asRecord(value) ?? {};
  const id =
    asText(readNested(record, 'id')) ??
    asText(readNested(record, 'organizationId')) ??
    `tenant-${index + 1}`;
  const name =
    asText(readNested(record, 'name')) ??
    asText(readNested(record, 'organizationName')) ??
    `Tenant ${index + 1}`;

  return {
    id,
    name,
    activeMemberCount: asNumber(readNested(record, 'activeMemberCount')) ?? 0,
    activeCustomerCount: asNumber(readNested(record, 'activeCustomerCount')) ?? 0,
    activeInstructorCount: asNumber(readNested(record, 'activeInstructorCount')) ?? 0,
    sessionCount: asNumber(readNested(record, 'sessionCount')) ?? 0,
    lastSessionAt: asText(readNested(record, 'lastSessionAt')),
    currentLicense: normalizeAdminTenantLicense(readNested(record, 'currentLicense'), id, name),
  };
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

export const normalizeAdminTenantsResponse = (payload: unknown): AdminTenantsResponse => {
  const record = asRecord(payload);
  if (!record) {
    return {
      tenants: [],
      status: 'unavailable',
      message: 'Risposta tenant non valida.',
      query: '',
    };
  }

  const candidate = record.tenants ?? record.items ?? record.data ?? record.results ?? [];
  const rawStatus = asText(record.status);
  const status: SessionsArchiveStatus =
    rawStatus === 'ready' || rawStatus === 'database-required' ? rawStatus : 'unavailable';

  return {
    tenants: Array.isArray(candidate) ? candidate.map(normalizeAdminTenant) : [],
    status,
    message: asText(record.message),
    query: asText(record.query) ?? '',
    pageInfo: normalizePageInfo(record.pageInfo),
    appliedFilters: asRecord(record.appliedFilters)
      ? (record.appliedFilters as unknown as AdminTenantPageFilters)
      : undefined,
  };
};

export const normalizeAdminLicenseMutationResponse = (payload: unknown): AdminLicenseMutationResponse => {
  const record = asRecord(payload);
  if (!record) {
    return {
      tenant: null,
      license: null,
      message: 'Risposta licenza non valida.',
    };
  }

  const tenant = record.tenant ? normalizeAdminTenant(record.tenant, 0) : null;
  const fallbackLicense =
    normalizeAdminTenantLicense(
      readNested(record, 'license'),
      tenant?.id ?? '',
      tenant?.name ?? '',
    ) ?? null;
  return {
    tenant,
    license: tenant?.currentLicense ?? fallbackLicense,
    message: asText(record.message),
  };
};

export const normalizeAdminTenantHistoryResponse = (payload: unknown): AdminTenantHistoryResponse => {
  const record = asRecord(payload);
  if (!record) {
    return {
      tenant: null,
      licenses: [],
      auditEvents: [],
      message: 'Risposta storico tenant non valida.',
    };
  }

  const tenant = record.tenant ? normalizeAdminTenant(record.tenant, 0) : null;
  const licenses = Array.isArray(record.licenses)
    ? record.licenses
        .map((entry) => normalizeAdminLicenseHistoryEntry(entry))
        .filter((entry): entry is AdminLicenseHistoryEntry => Boolean(entry))
    : [];
  const auditEvents = Array.isArray(record.auditEvents)
    ? record.auditEvents
        .map((entry) => normalizeAdminAuditTimelineEntry(entry))
        .filter((entry): entry is AdminAuditTimelineEntry => Boolean(entry))
    : [];

  return {
    tenant,
    licenses,
    auditEvents,
    message: asText(record.message),
  };
};

export const getLicenseDaysRemaining = (expiresAt: string | null, now = Date.now()) => {
  if (!expiresAt) return null;
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) return null;
  return Math.ceil((expiresAtMs - now) / 86400000);
};

export const getAdminTenantDaysRemaining = (tenant: AdminTenantSummary) =>
  getLicenseDaysRemaining(tenant.currentLicense?.expiresAt ?? null);

export const isAdminTenantExpiringSoon = (tenant: AdminTenantSummary, warningWindowDays = 90) => {
  const daysRemaining = getAdminTenantDaysRemaining(tenant);
  return Boolean(
    tenant.currentLicense?.status === 'active' &&
      daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining <= warningWindowDays,
  );
};

export const getAdminTenantTone = (tenant: AdminTenantSummary, warningWindowDays = 90): AdminTenantTone => {
  const status = tenant.currentLicense?.status ?? 'missing';
  const daysRemaining = getAdminTenantDaysRemaining(tenant);
  if (status === 'active' && daysRemaining !== null && daysRemaining < 0) return 'danger';
  if (status === 'revoked' || status === 'expired' || status === 'missing') return 'danger';
  if (isAdminTenantExpiringSoon(tenant, warningWindowDays)) return 'warning';
  if (status === 'active') return 'success';
  return 'neutral';
};

export const matchesAdminTenantFilter = (
  tenant: AdminTenantSummary,
  filter: AdminTenantFilter,
  warningWindowDays = 90,
) => {
  const status = tenant.currentLicense?.status ?? 'missing';
  const daysRemaining = getAdminTenantDaysRemaining(tenant);
  if (filter === 'all') return true;
  if (filter === 'expiring') return isAdminTenantExpiringSoon(tenant, warningWindowDays);
  if (filter === 'expired') {
    return status === 'expired' || (status === 'active' && daysRemaining !== null && daysRemaining < 0);
  }
  return status === filter;
};

const getAdminTenantRiskScore = (tenant: AdminTenantSummary, warningWindowDays = 90) => {
  const tone = getAdminTenantTone(tenant, warningWindowDays);
  const daysRemaining = getAdminTenantDaysRemaining(tenant);
  const missingActivityPenalty = tenant.sessionCount === 0 ? 3 : 0;

  switch (tone) {
    case 'danger':
      return 1000 - tenant.sessionCount + missingActivityPenalty;
    case 'warning':
      return 700 - (daysRemaining ?? warningWindowDays) + missingActivityPenalty;
    case 'success':
      return 300 - tenant.activeMemberCount;
    default:
      return 100;
  }
};

export const sortAdminTenants = (
  tenants: AdminTenantSummary[],
  sort: AdminTenantSort,
  warningWindowDays = 90,
) =>
  [...tenants].sort((left, right) => {
    switch (sort) {
      case 'name':
        return left.name.localeCompare(right.name, 'it');
      case 'sessions':
        return right.sessionCount - left.sessionCount || left.name.localeCompare(right.name, 'it');
      case 'members':
        return right.activeMemberCount - left.activeMemberCount || left.name.localeCompare(right.name, 'it');
      case 'expiry': {
        const leftDays = getAdminTenantDaysRemaining(left);
        const rightDays = getAdminTenantDaysRemaining(right);
        if (leftDays === null && rightDays === null) return left.name.localeCompare(right.name, 'it');
        if (leftDays === null) return 1;
        if (rightDays === null) return -1;
        return leftDays - rightDays || left.name.localeCompare(right.name, 'it');
      }
      case 'risk':
      default:
        return (
          getAdminTenantRiskScore(right, warningWindowDays) -
            getAdminTenantRiskScore(left, warningWindowDays) ||
          left.name.localeCompare(right.name, 'it')
        );
    }
  });

export const summarizeAdminTenants = (tenants: AdminTenantSummary[], warningWindowDays = 90) => ({
  totalTenants: tenants.length,
  activeLicenses: tenants.filter((tenant) => tenant.currentLicense?.status === 'active').length,
  expiringSoon: tenants.filter((tenant) => isAdminTenantExpiringSoon(tenant, warningWindowDays)).length,
  attentionRequired: tenants.filter((tenant) => getAdminTenantTone(tenant, warningWindowDays) !== 'success').length,
  totalSeats: tenants.reduce((sum, tenant) => sum + (tenant.currentLicense?.seats ?? 0), 0),
  activeMembers: tenants.reduce((sum, tenant) => sum + tenant.activeMemberCount, 0),
  totalSessions: tenants.reduce((sum, tenant) => sum + tenant.sessionCount, 0),
});

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
