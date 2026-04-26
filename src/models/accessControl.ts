export type AccessLevel = 'free' | 'premium';
export type UserRole = 'anonymous' | 'customer' | 'instructor' | 'admin';
export type LicenseStatus = 'missing' | 'active' | 'expired' | 'revoked' | 'pending';
export type LicensePlan = 'trial' | 'professional' | 'enterprise';
export type AccessSyncStatus = 'idle' | 'loading' | 'ready' | 'error';
export type EvidenceMode = 'local-preview' | 'server-signed';
export type SessionsArchiveStatus = 'unavailable' | 'database-required' | 'ready';
export type LicenseFeature =
  | 'full_course'
  | 'session_sync'
  | 'admin_sessions'
  | 'updates'
  | 'vr_runtime';

export interface AuthIdentity {
  status: 'anonymous' | 'authenticated';
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  organizationId: string | null;
}

export interface LicenseEntitlement {
  licenseId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  plan: LicensePlan;
  status: LicenseStatus;
  issuedAt: string | null;
  expiresAt: string | null;
  updatesUntil: string | null;
  seats: number;
  features: LicenseFeature[];
  source: 'none' | 'backend';
}

export interface AccessApiResponse {
  configured: boolean;
  identity: AuthIdentity;
  license: LicenseEntitlement;
  evidenceMode: EvidenceMode;
  sessionsArchiveStatus: SessionsArchiveStatus;
  message: string | null;
}

export const LICENSE_VALIDITY_YEARS = 3;

export const createAnonymousIdentity = (): AuthIdentity => ({
  status: 'anonymous',
  userId: null,
  email: null,
  displayName: null,
  role: 'anonymous',
  organizationId: null,
});

export const createMissingLicense = (): LicenseEntitlement => ({
  licenseId: null,
  organizationId: null,
  organizationName: null,
  plan: 'trial',
  status: 'missing',
  issuedAt: null,
  expiresAt: null,
  updatesUntil: null,
  seats: 0,
  features: [],
  source: 'none',
});

export const createAccessApiResponse = (
  patch: Partial<AccessApiResponse> = {},
): AccessApiResponse => ({
  configured: false,
  identity: createAnonymousIdentity(),
  license: createMissingLicense(),
  evidenceMode: 'local-preview',
  sessionsArchiveStatus: 'unavailable',
  message: null,
  ...patch,
});

export const addYears = (date: Date, years: number) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

export const isLicenseActive = (license: LicenseEntitlement, now = new Date()) => {
  if (license.status !== 'active' || !license.expiresAt) return false;
  return new Date(license.expiresAt).getTime() > now.getTime();
};

export const hasFeature = (license: LicenseEntitlement, feature: LicenseFeature) =>
  isLicenseActive(license) && license.features.includes(feature);

export const getAccessLevel = (identity: AuthIdentity, license: LicenseEntitlement): AccessLevel => {
  if (identity.role === 'admin') return 'premium';
  return hasFeature(license, 'full_course') ? 'premium' : 'free';
};

export const canViewAllSessions = (identity: AuthIdentity, license: LicenseEntitlement) =>
  identity.role === 'admin' || hasFeature(license, 'admin_sessions');

export const getSessionMode = (
  identity: AuthIdentity,
  license: LicenseEntitlement,
  isDemoMode: boolean,
) => (isDemoMode || getAccessLevel(identity, license) === 'free' ? 'demo' : 'full');

export const createBackendLicensePreview = (
  organizationName: string,
  issuedAt = new Date(),
): LicenseEntitlement => {
  const expiresAt = addYears(issuedAt, LICENSE_VALIDITY_YEARS).toISOString();

  return {
    licenseId: 'lic_backend_generated',
    organizationId: 'org_backend_generated',
    organizationName,
    plan: 'professional',
    status: 'active',
    issuedAt: issuedAt.toISOString(),
    expiresAt,
    updatesUntil: expiresAt,
    seats: 10,
    features: ['full_course', 'session_sync', 'updates', 'vr_runtime'],
    source: 'backend',
  };
};

export const formatDate = (value: string | null) => {
  if (!value) return 'n/d';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatRole = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'Admin piattaforma';
    case 'instructor':
      return 'Docente / istruttore';
    case 'customer':
      return 'Cliente licenziatario';
    default:
      return 'Ospite';
  }
};

export const formatLicenseStatus = (status: LicenseStatus) => {
  switch (status) {
    case 'active':
      return 'Attiva';
    case 'expired':
      return 'Scaduta';
    case 'revoked':
      return 'Revocata';
    case 'pending':
      return 'In attivazione';
    default:
      return 'Assente';
  }
};

export const formatPlan = (plan: LicensePlan) => {
  switch (plan) {
    case 'enterprise':
      return 'Enterprise';
    case 'professional':
      return 'Professional';
    default:
      return 'Trial';
  }
};
