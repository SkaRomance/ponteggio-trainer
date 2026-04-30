import { neon } from '@neondatabase/serverless';
import {
  LICENSE_VALIDITY_YEARS,
  addYears,
  createMissingLicense,
  type AuthIdentity,
  type LicenseEntitlement,
} from '../../src/models/accessControl.js';
import type {
  AuthAccountRecord,
  BootstrapAccount,
  PasswordAlgorithm,
} from '../../src/models/bootstrapAccount.js';
import type {
  DraftSessionPayload,
  FinalizeSessionPayload,
  PersistedEventInput,
  PersistedSessionsFilters,
  PersistedSessionSummary,
} from '../../src/models/persistence.js';
import type {
  AdminAuditTimelineEntry,
  AdminLicenseHistoryEntry,
  AdminLicenseUpsertPayload,
  AdminTenantPageFilters,
  AdminTenantHistoryResponse,
  AdminTenantSummary,
} from '../../src/models/platformOps.js';
import type { PageInfo } from '../../src/models/pagination.js';

type SqlRow = Record<string, unknown>;

export interface AuthSessionRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  issuedRole: AuthIdentity['role'];
  expiresAt: string;
  revokedAt: string | null;
}

export interface LoginRateLimitState {
  attemptCount: number;
  blockedUntil: string | null;
  retryAfterSeconds: number;
}

interface AuditEventInput {
  actorUserId: string | null;
  organizationId: string | null;
  action: string;
  objectType: string;
  objectId: string | null;
  details?: Record<string, unknown>;
}

const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? '';
const EVIDENCE_SECRET = process.env.MARS_EVIDENCE_SECRET?.trim() ?? process.env.MARS_AUTH_SECRET?.trim() ?? '';
const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.MARS_AUTH_RATE_LIMIT_WINDOW_MS ?? `${15 * 60 * 1000}`);
const LOGIN_RATE_LIMIT_BLOCK_MS = Number(process.env.MARS_AUTH_RATE_LIMIT_BLOCK_MS ?? `${30 * 60 * 1000}`);
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.MARS_AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? '6');
const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

const parseIsoDate = (value: unknown) => (value ? new Date(String(value)).toISOString() : null);

const parseFeatureValues = (value: unknown) =>
  Array.isArray(value) ? value : JSON.parse(String(value ?? '[]'));

const parseJsonRecord = (value: unknown) => {
  if (!value) return {} as Record<string, unknown>;
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const currentLicensePrioritySql = (alias: string) => `
  CASE
    WHEN ${alias}.status = 'active' AND ${alias}.expires_at IS NOT NULL AND ${alias}.expires_at <= now() THEN 3
    WHEN ${alias}.status = 'active' THEN 0
    WHEN ${alias}.status = 'pending' THEN 1
    WHEN ${alias}.status = 'expired' THEN 2
    WHEN ${alias}.status = 'revoked' THEN 4
    ELSE 5
  END
`;

const clampPageLimit = (value: unknown, fallback = DEFAULT_PAGE_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(MAX_PAGE_LIMIT, Math.floor(parsed)));
};

const addQueryParam = (params: unknown[], value: unknown) => {
  params.push(value);
  return `$${params.length}`;
};

const base64UrlEncode = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const base64UrlDecode = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(`${base64}${padding}`);
};

const encodePageCursor = (payload: Record<string, unknown>) =>
  base64UrlEncode(JSON.stringify(payload));

const decodePageCursor = (cursor: string | null | undefined): Record<string, unknown> | null => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(cursor)) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const decodeOffsetCursor = (cursor: string | null | undefined) => {
  const decoded = decodePageCursor(cursor);
  const offset = Number(decoded?.offset ?? 0);
  return Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
};

const createPageInfo = (
  limit: number,
  hasNextPage: boolean,
  nextCursor: string | null,
): PageInfo => ({
  limit,
  hasNextPage,
  nextCursor,
});

const normalizeDateFilter = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const normalizeSessionStatusFilter = (value: unknown): PersistedSessionsFilters['status'] => {
  switch (String(value ?? 'all')) {
    case 'draft':
    case 'in_progress':
    case 'finalized':
    case 'aborted':
      return String(value) as PersistedSessionsFilters['status'];
    default:
      return 'all';
  }
};

const normalizeEvidenceModeFilter = (value: unknown): PersistedSessionsFilters['evidenceMode'] => {
  switch (String(value ?? 'all')) {
    case 'server-signed':
    case 'local-preview':
      return String(value) as PersistedSessionsFilters['evidenceMode'];
    default:
      return 'all';
  }
};

const normalizeStartedByRoleFilter = (value: unknown): PersistedSessionsFilters['startedByRole'] => {
  switch (String(value ?? 'all')) {
    case 'anonymous':
    case 'customer':
    case 'instructor':
    case 'admin':
      return String(value) as PersistedSessionsFilters['startedByRole'];
    default:
      return 'all';
  }
};

const normalizeAdminSessionsFilters = (
  filters: Partial<PersistedSessionsFilters> = {},
): PersistedSessionsFilters => ({
  query: String(filters.query ?? '').trim(),
  organizationId: filters.organizationId ? String(filters.organizationId).trim() : null,
  status: normalizeSessionStatusFilter(filters.status),
  evidenceMode: normalizeEvidenceModeFilter(filters.evidenceMode),
  startedByRole: normalizeStartedByRoleFilter(filters.startedByRole),
  createdFrom: normalizeDateFilter(filters.createdFrom),
  createdTo: normalizeDateFilter(filters.createdTo),
  limit: clampPageLimit(filters.limit),
  cursor: filters.cursor ? String(filters.cursor) : null,
});

const normalizeTenantFilter = (value: unknown): AdminTenantPageFilters['status'] => {
  switch (String(value ?? 'all')) {
    case 'active':
    case 'expiring':
    case 'missing':
    case 'expired':
    case 'revoked':
      return String(value) as AdminTenantPageFilters['status'];
    default:
      return 'all';
  }
};

const normalizeTenantSort = (value: unknown): AdminTenantPageFilters['sort'] => {
  switch (String(value ?? 'risk')) {
    case 'name':
    case 'sessions':
    case 'members':
    case 'expiry':
      return String(value) as AdminTenantPageFilters['sort'];
    default:
      return 'risk';
  }
};

const normalizeTenantDirection = (value: unknown): AdminTenantPageFilters['direction'] =>
  String(value ?? 'asc') === 'desc' ? 'desc' : 'asc';

const normalizeWarningWindowDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 90;
  return Math.max(1, Math.min(365, Math.floor(parsed)));
};

const normalizeAdminTenantPageFilters = (
  filters: Partial<AdminTenantPageFilters> = {},
): AdminTenantPageFilters => ({
  query: String(filters.query ?? '').trim(),
  status: normalizeTenantFilter(filters.status),
  sort: normalizeTenantSort(filters.sort),
  direction: normalizeTenantDirection(filters.direction),
  warningWindowDays: normalizeWarningWindowDays(filters.warningWindowDays),
  limit: clampPageLimit(filters.limit),
  cursor: filters.cursor ? String(filters.cursor) : null,
});

const inferPasswordAlgorithm = (
  passwordHash: string | null | undefined,
  explicit?: string | null,
): PasswordAlgorithm | null => {
  if (explicit === 'legacy-sha256' || explicit === 'pbkdf2-sha256') {
    return explicit;
  }

  if (!passwordHash) return null;
  return passwordHash.startsWith('pbkdf2_sha256$') ? 'pbkdf2-sha256' : 'legacy-sha256';
};

const mapSessionRow = (row: SqlRow): PersistedSessionSummary => ({
  id: String(row.id),
  clientSessionId: String(row.client_session_id),
  organizationId: row.organization_id ? String(row.organization_id) : null,
  organizationName: row.organization_name ? String(row.organization_name) : null,
  licenseId: row.license_id ? String(row.license_id) : null,
  userId: row.user_id ? String(row.user_id) : null,
  startedByRole: String(row.started_by_role),
  scenarioSeed: String(row.scenario_seed),
  traineeName: String(row.trainee_name),
  instructorName: String(row.instructor_name),
  providerName: String(row.provider_name),
  courseCode: String(row.course_code),
  location: String(row.location ?? ''),
  vrDeviceId: String(row.vr_device_id ?? ''),
  mode: row.mode === 'full' ? 'full' : 'demo',
  evidenceVersion: String(row.evidence_version),
  evidenceMode: row.evidence_mode === 'server-signed' ? 'server-signed' : 'local-preview',
  startedAt: parseIsoDate(row.started_at),
  endedAt: parseIsoDate(row.ended_at),
  status: String(row.status) as PersistedSessionSummary['status'],
  outcomeLabel: row.outcome_label ? String(row.outcome_label) : null,
  totalScore: typeof row.total_score === 'number' ? row.total_score : row.total_score ? Number(row.total_score) : null,
  residualSafety:
    typeof row.residual_safety === 'number'
      ? row.residual_safety
      : row.residual_safety
        ? Number(row.residual_safety)
        : null,
  infractions: typeof row.infractions === 'number' ? row.infractions : row.infractions ? Number(row.infractions) : null,
  criticalInfractions:
    typeof row.critical_infractions === 'number'
      ? row.critical_infractions
      : row.critical_infractions
        ? Number(row.critical_infractions)
        : null,
  highInfractions:
    typeof row.high_infractions === 'number'
      ? row.high_infractions
      : row.high_infractions
        ? Number(row.high_infractions)
        : null,
  localIntegrityHash: row.local_integrity_hash ? String(row.local_integrity_hash) : null,
  serverHash: row.server_hash ? String(row.server_hash) : null,
  createdAt: new Date(String(row.created_at)).toISOString(),
  updatedAt: new Date(String(row.updated_at)).toISOString(),
  eventCount: typeof row.event_count === 'number' ? row.event_count : Number(row.event_count ?? 0),
});

const mapLicenseRow = (row: SqlRow): LicenseEntitlement => ({
  licenseId: String(row.id),
  organizationId: String(row.organization_id),
  organizationName: row.organization_name ? String(row.organization_name) : null,
  plan: String(row.plan) as LicenseEntitlement['plan'],
  status: String(row.status) as LicenseEntitlement['status'],
  issuedAt: parseIsoDate(row.issued_at),
  expiresAt: parseIsoDate(row.expires_at),
  updatesUntil: parseIsoDate(row.updates_until),
  seats: typeof row.seats === 'number' ? row.seats : Number(row.seats ?? 0),
  features: parseFeatureValues(row.features) as LicenseEntitlement['features'],
  source: 'backend',
});

const mapCurrentLicenseFromTenantRow = (row: SqlRow): LicenseEntitlement | null => {
  if (!row.license_id) return null;

  return {
    licenseId: String(row.license_id),
    organizationId: String(row.organization_id),
    organizationName: row.organization_name ? String(row.organization_name) : null,
    plan: String(row.license_plan) as LicenseEntitlement['plan'],
    status: String(row.license_status) as LicenseEntitlement['status'],
    issuedAt: parseIsoDate(row.license_issued_at),
    expiresAt: parseIsoDate(row.license_expires_at),
    updatesUntil: parseIsoDate(row.license_updates_until),
    seats: typeof row.license_seats === 'number' ? row.license_seats : Number(row.license_seats ?? 0),
    features: parseFeatureValues(row.license_features) as LicenseEntitlement['features'],
    source: 'backend',
  };
};

const mapAdminTenantRow = (row: SqlRow): AdminTenantSummary => ({
  id: String(row.organization_id),
  name: String(row.organization_name),
  activeMemberCount:
    typeof row.active_member_count === 'number'
      ? row.active_member_count
      : Number(row.active_member_count ?? 0),
  activeCustomerCount:
    typeof row.active_customer_count === 'number'
      ? row.active_customer_count
      : Number(row.active_customer_count ?? 0),
  activeInstructorCount:
    typeof row.active_instructor_count === 'number'
      ? row.active_instructor_count
      : Number(row.active_instructor_count ?? 0),
  sessionCount: typeof row.session_count === 'number' ? row.session_count : Number(row.session_count ?? 0),
  lastSessionAt: parseIsoDate(row.last_session_at),
  currentLicense: mapCurrentLicenseFromTenantRow(row),
});

const mapAdminLicenseHistoryRow = (row: SqlRow): AdminLicenseHistoryEntry => ({
  licenseId: String(row.id),
  organizationId: String(row.organization_id),
  organizationName: row.organization_name ? String(row.organization_name) : null,
  plan: String(row.plan) as AdminLicenseHistoryEntry['plan'],
  status: String(row.status) as AdminLicenseHistoryEntry['status'],
  issuedAt: parseIsoDate(row.issued_at),
  expiresAt: parseIsoDate(row.expires_at),
  updatesUntil: parseIsoDate(row.updates_until),
  seats: typeof row.seats === 'number' ? row.seats : Number(row.seats ?? 0),
  features: parseFeatureValues(row.features) as AdminLicenseHistoryEntry['features'],
  createdAt: parseIsoDate(row.created_at),
  updatedAt: parseIsoDate(row.updated_at),
});

const mapAdminAuditTimelineRow = (row: SqlRow): AdminAuditTimelineEntry => ({
  id: String(row.id),
  action: String(row.action),
  objectType: String(row.object_type),
  objectId: row.object_id ? String(row.object_id) : null,
  actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
  actorDisplayName: row.actor_display_name ? String(row.actor_display_name) : null,
  actorEmail: row.actor_email ? String(row.actor_email) : null,
  organizationId: row.organization_id ? String(row.organization_id) : null,
  createdAt: parseIsoDate(row.created_at),
  details: parseJsonRecord(row.details),
});

const mapAuthAccountRow = (row: SqlRow): AuthAccountRecord => ({
  userId: String(row.user_id),
  email: String(row.email),
  displayName: String(row.display_name),
  role: row.is_platform_admin ? 'admin' : (String(row.membership_role ?? 'customer') as AuthAccountRecord['role']),
  organizationId: row.organization_id ? String(row.organization_id) : null,
  organizationName: row.organization_name ? String(row.organization_name) : null,
  passwordHash: row.password_hash ? String(row.password_hash) : null,
  passwordAlgorithm: inferPasswordAlgorithm(
    row.password_hash ? String(row.password_hash) : null,
    row.password_algorithm ? String(row.password_algorithm) : null,
  ),
  authSource: row.auth_source === 'database' ? 'database' : 'bootstrap',
  authActive: row.auth_active === false ? false : row.auth_active === 'f' ? false : true,
  licenseId: row.license_id ? String(row.license_id) : null,
  plan: row.plan ? (String(row.plan) as AuthAccountRecord['plan']) : undefined,
  status: row.status ? (String(row.status) as AuthAccountRecord['status']) : undefined,
  issuedAt: parseIsoDate(row.issued_at),
  expiresAt: parseIsoDate(row.expires_at),
  updatesUntil: parseIsoDate(row.updates_until),
  seats: typeof row.seats === 'number' ? row.seats : row.seats ? Number(row.seats) : undefined,
  features: row.features ? (parseFeatureValues(row.features) as AuthAccountRecord['features']) : undefined,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const createServerSignedReport = (
  report: Record<string, unknown>,
  session?: Pick<
    PersistedSessionSummary,
    | 'clientSessionId'
    | 'organizationId'
    | 'organizationName'
    | 'licenseId'
    | 'userId'
    | 'startedByRole'
    | 'scenarioSeed'
    | 'traineeName'
    | 'instructorName'
    | 'providerName'
    | 'courseCode'
    | 'location'
    | 'vrDeviceId'
    | 'mode'
    | 'evidenceVersion'
    | 'startedAt'
    | 'endedAt'
  >,
  endedAt?: string | null,
) => {
  const evidence = isRecord(report.evidence) ? report.evidence : {};
  const reportSession = isRecord(report.session) ? report.session : {};

  return {
    ...report,
    evidence: {
      ...evidence,
      mode: 'server-signed',
      authority: 'server-signed',
      warning: null,
    },
    ...(session
      ? {
          session: {
            ...reportSession,
            sessionId: session.clientSessionId,
            scenarioSeed: session.scenarioSeed,
            traineeName: session.traineeName,
            instructorName: session.instructorName,
            providerName: session.providerName,
            courseCode: session.courseCode,
            location: session.location,
            vrDeviceId: session.vrDeviceId,
            mode: session.mode,
            evidenceVersion: session.evidenceVersion,
            organizationId: session.organizationId,
            organizationName: session.organizationName,
            licenseId: session.licenseId,
            startedByUserId: session.userId,
            startedByRole: session.startedByRole,
            startedAt: session.startedAt,
            endedAt: endedAt ?? session.endedAt,
            evidenceMode: 'server-signed',
          },
        }
      : {}),
  };
};

const buildSessionsQuery = (
  whereClause: string,
  orderClause = 'ORDER BY sessions.created_at DESC, sessions.id DESC',
  limitClause = 'LIMIT 50',
) => `
  SELECT
    sessions.id,
    sessions.client_session_id,
    sessions.organization_id,
    organizations.name AS organization_name,
    sessions.license_id,
    sessions.user_id,
    sessions.started_by_role,
    sessions.scenario_seed,
    sessions.trainee_name,
    sessions.instructor_name,
    sessions.provider_name,
    sessions.course_code,
    sessions.location,
    sessions.vr_device_id,
    sessions.mode,
    sessions.evidence_version,
    sessions.evidence_mode,
    sessions.started_at,
    sessions.ended_at,
    sessions.status,
    sessions.outcome_label,
    sessions.total_score,
    sessions.residual_safety,
    sessions.infractions,
    sessions.critical_infractions,
    sessions.high_infractions,
    sessions.local_integrity_hash,
    sessions.server_hash,
    sessions.created_at,
    sessions.updated_at,
    COALESCE(event_counts.event_count, 0)::int AS event_count
  FROM training.training_sessions AS sessions
  LEFT JOIN training.organizations AS organizations
    ON organizations.id = sessions.organization_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS event_count
    FROM training.training_session_events AS events
    WHERE events.training_session_id = sessions.id
  ) AS event_counts
    ON true
  ${whereClause}
  ${orderClause}
  ${limitClause}
`;

const buildAuthAccountQuery = (whereClause: string) => `
  SELECT
    users.id AS user_id,
    users.email,
    users.display_name,
    users.is_platform_admin,
    auth_accounts.password_hash,
    auth_accounts.password_algorithm,
    auth_accounts.auth_source,
    auth_accounts.active AS auth_active,
    memberships.organization_id,
    organizations.name AS organization_name,
    memberships.role AS membership_role,
    licenses.id AS license_id,
    licenses.plan,
    licenses.status,
    licenses.issued_at,
    licenses.expires_at,
    licenses.updates_until,
    licenses.seats,
    licenses.features
  FROM training.users AS users
  LEFT JOIN training.auth_accounts AS auth_accounts
    ON auth_accounts.user_id = users.id
  LEFT JOIN LATERAL (
    SELECT organization_id, role
    FROM training.organization_memberships
    WHERE user_id = users.id
      AND active = true
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  ) AS memberships
    ON true
  LEFT JOIN training.organizations AS organizations
    ON organizations.id = memberships.organization_id
  LEFT JOIN LATERAL (
    SELECT
      term.id,
      term.plan,
      CASE
        WHEN term.status = 'active' AND term.expires_at IS NOT NULL AND term.expires_at <= now()
          THEN 'expired'
        ELSE term.status
      END AS status,
      term.issued_at,
      term.expires_at,
      term.updates_until,
      term.seats,
      term.features
    FROM training.licenses AS term
    WHERE term.organization_id = memberships.organization_id
    ORDER BY
      ${currentLicensePrioritySql('term')},
      term.issued_at DESC NULLS LAST,
      term.updated_at DESC
    LIMIT 1
  ) AS licenses
    ON true
  ${whereClause}
`;

const buildTenantsQuery = (
  whereClause: string,
  orderClause = 'ORDER BY organizations.name ASC',
  limitClause = 'LIMIT 50',
  offsetClause = '',
) => `
  SELECT
    organizations.id AS organization_id,
    organizations.name AS organization_name,
    COUNT(DISTINCT memberships.user_id) FILTER (WHERE memberships.active = true) AS active_member_count,
    COUNT(DISTINCT memberships.user_id) FILTER (
      WHERE memberships.active = true AND memberships.role = 'customer'
    ) AS active_customer_count,
    COUNT(DISTINCT memberships.user_id) FILTER (
      WHERE memberships.active = true AND memberships.role = 'instructor'
    ) AS active_instructor_count,
    COUNT(DISTINCT sessions.id) AS session_count,
    MAX(sessions.created_at) AS last_session_at,
    current_license.id AS license_id,
    current_license.plan AS license_plan,
    current_license.status AS license_status,
    current_license.issued_at AS license_issued_at,
    current_license.expires_at AS license_expires_at,
    current_license.updates_until AS license_updates_until,
    current_license.seats AS license_seats,
    current_license.features AS license_features
  FROM training.organizations AS organizations
  LEFT JOIN training.organization_memberships AS memberships
    ON memberships.organization_id = organizations.id
  LEFT JOIN training.training_sessions AS sessions
    ON sessions.organization_id = organizations.id
  LEFT JOIN LATERAL (
    SELECT
      term.id,
      term.plan,
      CASE
        WHEN term.status = 'active' AND term.expires_at IS NOT NULL AND term.expires_at <= now()
          THEN 'expired'
        ELSE term.status
      END AS status,
      term.issued_at,
      term.expires_at,
      term.updates_until,
      term.seats,
      term.features
    FROM training.licenses AS term
    WHERE term.organization_id = organizations.id
    ORDER BY
      ${currentLicensePrioritySql('term')},
      term.issued_at DESC NULLS LAST,
      term.updated_at DESC
    LIMIT 1
  ) AS current_license
    ON true
  ${whereClause}
  GROUP BY
    organizations.id,
    organizations.name,
    current_license.id,
    current_license.plan,
    current_license.status,
    current_license.issued_at,
    current_license.expires_at,
    current_license.updates_until,
    current_license.seats,
    current_license.features
  ${orderClause}
  ${limitClause}
  ${offsetClause}
`;

const createServerEvidenceDigest = async (value: string) => {
  if (!EVIDENCE_SECRET) {
    throw new Error('MARS_EVIDENCE_SECRET o MARS_AUTH_SECRET non configurato per la firma evidenze.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(EVIDENCE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const assertDatabaseConfigured = () => {
  if (!DATABASE_URL) {
    throw new Error('Persistence backend non configurato.');
  }

  return neon(DATABASE_URL);
};

const runSessionsQuery = async (
  whereClause: string,
  params: unknown[] = [],
  orderClause?: string,
  limitClause?: string,
) => {
  const sql = assertDatabaseConfigured();
  return sql.query(buildSessionsQuery(whereClause, orderClause, limitClause), params);
};

const runTenantsQuery = async (
  whereClause: string,
  params: unknown[] = [],
  orderClause?: string,
  limitClause?: string,
  offsetClause?: string,
) => {
  const sql = assertDatabaseConfigured();
  return sql.query(buildTenantsQuery(whereClause, orderClause, limitClause, offsetClause), params);
};

const insertAuditEvent = async (event: AuditEventInput) => {
  if (!DATABASE_URL) return;

  const sql = assertDatabaseConfigured();
  await sql`
    INSERT INTO training.audit_log (id, actor_user_id, organization_id, action, object_type, object_id, details)
    VALUES (
      ${`audit_${crypto.randomUUID()}`},
      ${event.actorUserId},
      ${event.organizationId},
      ${event.action},
      ${event.objectType},
      ${event.objectId},
      ${JSON.stringify(event.details ?? {})}::jsonb
    )
  `;
};

const createEmptyRateLimitState = (): LoginRateLimitState => ({
  attemptCount: 0,
  blockedUntil: null,
  retryAfterSeconds: 0,
});

const toRateLimitState = (attemptCount: number, blockedUntil: string | null): LoginRateLimitState => ({
  attemptCount,
  blockedUntil,
  retryAfterSeconds: blockedUntil
    ? Math.max(0, Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 1000))
    : 0,
});

export const isDatabaseConfigured = () => Boolean(DATABASE_URL);

export const upsertBootstrapAccount = async (account: BootstrapAccount | null) => {
  if (!account || !DATABASE_URL) return;

  const sql = assertDatabaseConfigured();
  const issuedAt = account.issuedAt ?? new Date().toISOString();
  const expiresAt = account.expiresAt ?? null;
  const updatesUntil = account.updatesUntil ?? expiresAt;
  const features = JSON.stringify(account.features ?? []);

  await sql.transaction([
    sql`
      INSERT INTO training.users (id, email, display_name, is_platform_admin, updated_at)
      VALUES (${account.userId}, ${account.email}, ${account.displayName}, ${account.role === 'admin'}, now())
      ON CONFLICT (id)
      DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        is_platform_admin = EXCLUDED.is_platform_admin,
        updated_at = now()
    `,
    ...(account.organizationId
      ? [
          sql`
            INSERT INTO training.organizations (id, name, updated_at)
            VALUES (${account.organizationId}, ${account.organizationName ?? account.organizationId}, now())
            ON CONFLICT (id)
            DO UPDATE SET
              name = EXCLUDED.name,
              updated_at = now()
          `,
          sql`
            INSERT INTO training.organization_memberships (organization_id, user_id, role, active, updated_at)
            VALUES (${account.organizationId}, ${account.userId}, ${account.role === 'admin' ? 'customer' : account.role}, true, now())
            ON CONFLICT (organization_id, user_id)
            DO UPDATE SET
              role = EXCLUDED.role,
              active = true,
              updated_at = now()
          `,
          ...(account.licenseId
            ? [
                sql`
                  INSERT INTO training.licenses (
                    id,
                    organization_id,
                    plan,
                    status,
                    issued_at,
                    expires_at,
                    updates_until,
                    seats,
                    features,
                    updated_at
                  )
                  VALUES (
                    ${account.licenseId},
                    ${account.organizationId},
                    ${account.plan ?? 'professional'},
                    ${account.status ?? 'active'},
                    ${issuedAt},
                    ${expiresAt},
                    ${updatesUntil},
                    ${account.seats ?? 10},
                    ${features}::jsonb,
                    now()
                  )
                  ON CONFLICT (id)
                  DO NOTHING
                `,
              ]
            : []),
        ]
      : []),
  ]);

  if (!account.passwordHash) return;

  const passwordAlgorithm = inferPasswordAlgorithm(account.passwordHash, account.passwordAlgorithm) ?? 'legacy-sha256';
  try {
    await sql`
      INSERT INTO training.auth_accounts (
        user_id,
        password_hash,
        password_algorithm,
        auth_source,
        active,
        password_updated_at,
        updated_at
      )
      VALUES (
        ${account.userId},
        ${account.passwordHash},
        ${passwordAlgorithm},
        ${'bootstrap'},
        true,
        now(),
        now()
      )
      ON CONFLICT (user_id)
      DO NOTHING
    `;
  } catch {
    // Keep bootstrap seeding backward-compatible while auth tables are being introduced.
  }
};

export const getLicenseFromDatabase = async (organizationId: string | null) => {
  if (!organizationId || !DATABASE_URL) return createMissingLicense();

  const sql = assertDatabaseConfigured();
  const rows = await sql.query(
    `
    SELECT
      licenses.id,
      licenses.organization_id,
      organizations.name AS organization_name,
      licenses.plan,
      CASE
        WHEN licenses.status = 'active' AND licenses.expires_at IS NOT NULL AND licenses.expires_at <= now()
          THEN 'expired'
        ELSE licenses.status
      END AS status,
      licenses.issued_at,
      licenses.expires_at,
      licenses.updates_until,
      licenses.seats,
      licenses.features
    FROM training.licenses AS licenses
    LEFT JOIN training.organizations AS organizations
      ON organizations.id = licenses.organization_id
    WHERE organization_id = $1
    ORDER BY
      ${currentLicensePrioritySql('licenses')},
      licenses.issued_at DESC NULLS LAST,
      licenses.updated_at DESC
    LIMIT 1
  `,
    [organizationId],
  );

  const row = rows[0];
  if (!row) return createMissingLicense();
  return mapLicenseRow(row);
};

export const getAuthAccountByEmail = async (email: string) => {
  if (!DATABASE_URL) return null;

  const sql = assertDatabaseConfigured();
  const rows = await sql.query(buildAuthAccountQuery('WHERE LOWER(users.email) = LOWER($1) LIMIT 1'), [email]);
  return rows[0] ? mapAuthAccountRow(rows[0]) : null;
};

export const getAuthAccountByUserId = async (userId: string) => {
  if (!DATABASE_URL) return null;

  const sql = assertDatabaseConfigured();
  const rows = await sql.query(buildAuthAccountQuery('WHERE users.id = $1 LIMIT 1'), [userId]);
  return rows[0] ? mapAuthAccountRow(rows[0]) : null;
};

export const updateAccountPasswordHash = async (
  userId: string,
  passwordHash: string,
  passwordAlgorithm: PasswordAlgorithm,
  authSource: 'bootstrap' | 'database' = 'database',
) => {
  if (!DATABASE_URL) return;

  const sql = assertDatabaseConfigured();
  await sql`
    INSERT INTO training.auth_accounts (
      user_id,
      password_hash,
      password_algorithm,
      auth_source,
      active,
      password_updated_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${passwordHash},
      ${passwordAlgorithm},
      ${authSource},
      true,
      now(),
      now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      password_algorithm = EXCLUDED.password_algorithm,
      auth_source = EXCLUDED.auth_source,
      active = true,
      password_updated_at = now(),
      updated_at = now()
  `;
};

export const createAuthSession = async (
  account: Pick<AuthAccountRecord, 'userId' | 'organizationId' | 'role'>,
  expiresAt: string,
) => {
  if (!DATABASE_URL) return null;

  const sql = assertDatabaseConfigured();
  const sessionId = `authsess_${crypto.randomUUID()}`;
  await sql`
    INSERT INTO training.auth_sessions (
      id,
      user_id,
      organization_id,
      issued_role,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${sessionId},
      ${account.userId},
      ${account.organizationId},
      ${account.role},
      ${expiresAt},
      now(),
      now()
    )
  `;
  return sessionId;
};

export const getAuthSession = async (sessionId: string) => {
  if (!DATABASE_URL) return null;

  const sql = assertDatabaseConfigured();
  const rows = await sql`
    SELECT id, user_id, organization_id, issued_role, expires_at, revoked_at
    FROM training.auth_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    userId: String(row.user_id),
    organizationId: row.organization_id ? String(row.organization_id) : null,
    issuedRole: String(row.issued_role) as AuthSessionRecord['issuedRole'],
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    revokedAt: parseIsoDate(row.revoked_at),
  } satisfies AuthSessionRecord;
};

export const revokeAuthSession = async (sessionId: string) => {
  if (!DATABASE_URL) return false;

  const sql = assertDatabaseConfigured();
  const rows = await sql`
    UPDATE training.auth_sessions
    SET revoked_at = now(), updated_at = now()
    WHERE id = ${sessionId}
      AND revoked_at IS NULL
    RETURNING id
  `;
  return Boolean(rows[0]);
};

export const getLoginRateLimitState = async (bucketKey: string) => {
  if (!DATABASE_URL) return createEmptyRateLimitState();

  const sql = assertDatabaseConfigured();
  const rows = await sql`
    SELECT attempt_count, blocked_until
    FROM training.auth_rate_limits
    WHERE bucket_key = ${bucketKey}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return createEmptyRateLimitState();

  const blockedUntil = parseIsoDate(row.blocked_until);
  if (blockedUntil && new Date(blockedUntil).getTime() <= Date.now()) {
    return createEmptyRateLimitState();
  }

  return toRateLimitState(
    typeof row.attempt_count === 'number' ? row.attempt_count : Number(row.attempt_count ?? 0),
    blockedUntil,
  );
};

export const registerFailedLogin = async (bucketKey: string) => {
  if (!DATABASE_URL) return createEmptyRateLimitState();

  const sql = assertDatabaseConfigured();
  const now = new Date();
  const nowIso = now.toISOString();
  const rows = await sql`
    INSERT INTO training.auth_rate_limits (
      bucket_key,
      attempt_count,
      window_started_at,
      blocked_until,
      last_attempt_at,
      updated_at
    )
    VALUES (
      ${bucketKey},
      1,
      ${nowIso},
      NULL,
      ${nowIso},
      now()
    )
    ON CONFLICT (bucket_key)
    DO UPDATE SET
      attempt_count = CASE
        WHEN training.auth_rate_limits.window_started_at >
          (${nowIso}::timestamptz - ${LOGIN_RATE_LIMIT_WINDOW_MS} * interval '1 millisecond')
          THEN training.auth_rate_limits.attempt_count + 1
        ELSE 1
      END,
      window_started_at = CASE
        WHEN training.auth_rate_limits.window_started_at >
          (${nowIso}::timestamptz - ${LOGIN_RATE_LIMIT_WINDOW_MS} * interval '1 millisecond')
          THEN training.auth_rate_limits.window_started_at
        ELSE ${nowIso}::timestamptz
      END,
      blocked_until = CASE
        WHEN training.auth_rate_limits.blocked_until IS NOT NULL
          AND training.auth_rate_limits.blocked_until > ${nowIso}::timestamptz
          THEN training.auth_rate_limits.blocked_until
        WHEN (
          CASE
            WHEN training.auth_rate_limits.window_started_at >
              (${nowIso}::timestamptz - ${LOGIN_RATE_LIMIT_WINDOW_MS} * interval '1 millisecond')
              THEN training.auth_rate_limits.attempt_count + 1
            ELSE 1
          END
        ) >= ${LOGIN_RATE_LIMIT_MAX_ATTEMPTS}
          THEN ${nowIso}::timestamptz + ${LOGIN_RATE_LIMIT_BLOCK_MS} * interval '1 millisecond'
        ELSE NULL
      END,
      last_attempt_at = ${nowIso},
      updated_at = now()
    RETURNING attempt_count, blocked_until
  `;

  const row = rows[0];
  return toRateLimitState(
    typeof row?.attempt_count === 'number' ? row.attempt_count : Number(row?.attempt_count ?? 0),
    parseIsoDate(row?.blocked_until),
  );
};

export const clearLoginRateLimit = async (bucketKey: string) => {
  if (!DATABASE_URL) return;

  const sql = assertDatabaseConfigured();
  await sql`
    DELETE FROM training.auth_rate_limits
    WHERE bucket_key = ${bucketKey}
  `;
};

export const recordAuditEvent = async (event: AuditEventInput) => {
  await insertAuditEvent(event);
};

export interface AdminSessionsPage {
  sessions: PersistedSessionSummary[];
  pageInfo: PageInfo;
  appliedFilters: PersistedSessionsFilters;
}

export interface AdminTenantsPage {
  tenants: AdminTenantSummary[];
  pageInfo: PageInfo;
  appliedFilters: AdminTenantPageFilters;
}

export const listAdminSessionsPage = async (
  filters: Partial<PersistedSessionsFilters> = {},
): Promise<AdminSessionsPage> => {
  const appliedFilters = normalizeAdminSessionsFilters(filters);
  const params: unknown[] = [];
  const whereParts: string[] = [];

  if (appliedFilters.query) {
    const placeholder = addQueryParam(params, appliedFilters.query);
    whereParts.push(`
      (
        sessions.id ILIKE '%' || ${placeholder} || '%'
        OR sessions.client_session_id ILIKE '%' || ${placeholder} || '%'
        OR sessions.trainee_name ILIKE '%' || ${placeholder} || '%'
        OR sessions.instructor_name ILIKE '%' || ${placeholder} || '%'
        OR sessions.provider_name ILIKE '%' || ${placeholder} || '%'
        OR sessions.course_code ILIKE '%' || ${placeholder} || '%'
        OR sessions.scenario_seed ILIKE '%' || ${placeholder} || '%'
        OR organizations.name ILIKE '%' || ${placeholder} || '%'
      )
    `);
  }

  if (appliedFilters.organizationId) {
    whereParts.push(`sessions.organization_id = ${addQueryParam(params, appliedFilters.organizationId)}`);
  }

  if (appliedFilters.status !== 'all') {
    whereParts.push(`sessions.status = ${addQueryParam(params, appliedFilters.status)}`);
  }

  if (appliedFilters.evidenceMode !== 'all') {
    whereParts.push(`sessions.evidence_mode = ${addQueryParam(params, appliedFilters.evidenceMode)}`);
  }

  if (appliedFilters.startedByRole !== 'all') {
    whereParts.push(`sessions.started_by_role = ${addQueryParam(params, appliedFilters.startedByRole)}`);
  }

  if (appliedFilters.createdFrom) {
    whereParts.push(`sessions.created_at >= ${addQueryParam(params, appliedFilters.createdFrom)}::timestamptz`);
  }

  if (appliedFilters.createdTo) {
    whereParts.push(`sessions.created_at <= ${addQueryParam(params, appliedFilters.createdTo)}::timestamptz`);
  }

  const cursor = decodePageCursor(appliedFilters.cursor);
  const cursorCreatedAt = typeof cursor?.createdAt === 'string' ? cursor.createdAt : null;
  const cursorId = typeof cursor?.id === 'string' ? cursor.id : null;
  if (cursorCreatedAt && cursorId) {
    const createdAtPlaceholder = addQueryParam(params, cursorCreatedAt);
    const idPlaceholder = addQueryParam(params, cursorId);
    whereParts.push(`
      (
        sessions.created_at < ${createdAtPlaceholder}::timestamptz
        OR (
          sessions.created_at = ${createdAtPlaceholder}::timestamptz
          AND sessions.id < ${idPlaceholder}
        )
      )
    `);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const rows = await runSessionsQuery(
    whereClause,
    params,
    'ORDER BY sessions.created_at DESC, sessions.id DESC',
    `LIMIT ${appliedFilters.limit + 1}`,
  );
  const sessions = rows.map(mapSessionRow);
  const visibleSessions = sessions.slice(0, appliedFilters.limit);
  const hasNextPage = sessions.length > appliedFilters.limit;
  const lastVisibleSession = visibleSessions[visibleSessions.length - 1] ?? null;

  return {
    sessions: visibleSessions,
    pageInfo: createPageInfo(
      appliedFilters.limit,
      hasNextPage,
      hasNextPage && lastVisibleSession
        ? encodePageCursor({ createdAt: lastVisibleSession.createdAt, id: lastVisibleSession.id })
        : null,
    ),
    appliedFilters,
  };
};

const buildTenantOrderClause = (filters: AdminTenantPageFilters) => {
  const direction = filters.direction === 'desc' ? 'DESC' : 'ASC';
  const riskRank = `
    CASE
      WHEN current_license.id IS NULL THEN 5
      WHEN current_license.status IN ('expired', 'revoked') THEN 4
      WHEN current_license.status = 'active'
        AND current_license.expires_at IS NOT NULL
        AND current_license.expires_at <= now() + ${filters.warningWindowDays} * interval '1 day'
        THEN 3
      WHEN COUNT(DISTINCT sessions.id) = 0 THEN 2
      WHEN current_license.status = 'pending' THEN 1
      ELSE 0
    END
  `;

  switch (filters.sort) {
    case 'name':
      return `ORDER BY organizations.name ${direction}, organizations.id ASC`;
    case 'sessions':
      return `ORDER BY COUNT(DISTINCT sessions.id) ${direction}, organizations.name ASC, organizations.id ASC`;
    case 'members':
      return `ORDER BY COUNT(DISTINCT memberships.user_id) FILTER (WHERE memberships.active = true) ${direction}, organizations.name ASC, organizations.id ASC`;
    case 'expiry':
      return `ORDER BY current_license.expires_at ${direction} NULLS LAST, organizations.name ASC, organizations.id ASC`;
    case 'risk':
    default:
      return `ORDER BY ${riskRank} DESC, organizations.name ASC, organizations.id ASC`;
  }
};

export const listAdminTenantsPage = async (
  filters: Partial<AdminTenantPageFilters> = {},
): Promise<AdminTenantsPage> => {
  const appliedFilters = normalizeAdminTenantPageFilters(filters);
  const params: unknown[] = [];
  const whereParts: string[] = [];

  if (appliedFilters.query) {
    const placeholder = addQueryParam(params, appliedFilters.query);
    whereParts.push(`
      (
        organizations.id ILIKE '%' || ${placeholder} || '%'
        OR organizations.name ILIKE '%' || ${placeholder} || '%'
      )
    `);
  }

  switch (appliedFilters.status) {
    case 'active':
      whereParts.push(`current_license.status = 'active'`);
      break;
    case 'expiring':
      whereParts.push(`
        current_license.status = 'active'
        AND current_license.expires_at IS NOT NULL
        AND current_license.expires_at >= now()
        AND current_license.expires_at <= now() + ${appliedFilters.warningWindowDays} * interval '1 day'
      `);
      break;
    case 'missing':
      whereParts.push(`current_license.id IS NULL`);
      break;
    case 'expired':
      whereParts.push(`current_license.status = 'expired'`);
      break;
    case 'revoked':
      whereParts.push(`current_license.status = 'revoked'`);
      break;
    case 'all':
    default:
      break;
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const offset = decodeOffsetCursor(appliedFilters.cursor);
  const rows = await runTenantsQuery(
    whereClause,
    params,
    buildTenantOrderClause(appliedFilters),
    `LIMIT ${appliedFilters.limit + 1}`,
    offset > 0 ? `OFFSET ${offset}` : '',
  );
  const tenants = rows.map(mapAdminTenantRow);
  const visibleTenants = tenants.slice(0, appliedFilters.limit);
  const hasNextPage = tenants.length > appliedFilters.limit;

  return {
    tenants: visibleTenants,
    pageInfo: createPageInfo(
      appliedFilters.limit,
      hasNextPage,
      hasNextPage ? encodePageCursor({ offset: offset + appliedFilters.limit }) : null,
    ),
    appliedFilters,
  };
};

export const listAdminTenants = async (query = '') => {
  const result = await listAdminTenantsPage({ query, limit: 50 });
  return result.tenants;
};

export const getAdminTenantById = async (organizationId: string) => {
  const rows = await runTenantsQuery('WHERE organizations.id = $1', [organizationId]);
  return rows[0] ? mapAdminTenantRow(rows[0]) : null;
};

export const listAdminTenantLicenseHistory = async (organizationId: string, limit = 12) => {
  const sql = assertDatabaseConfigured();
  const rows = await sql.query(
    `
    SELECT
      licenses.id,
      licenses.organization_id,
      organizations.name AS organization_name,
      licenses.plan,
      CASE
        WHEN licenses.status = 'active' AND licenses.expires_at IS NOT NULL AND licenses.expires_at <= now()
          THEN 'expired'
        ELSE licenses.status
      END AS status,
      licenses.issued_at,
      licenses.expires_at,
      licenses.updates_until,
      licenses.seats,
      licenses.features,
      licenses.created_at,
      licenses.updated_at
    FROM training.licenses AS licenses
    LEFT JOIN training.organizations AS organizations
      ON organizations.id = licenses.organization_id
    WHERE licenses.organization_id = $1
    ORDER BY licenses.issued_at DESC NULLS LAST, licenses.updated_at DESC
    LIMIT $2
  `,
    [organizationId, Math.max(1, Math.min(limit, 50))],
  );

  return rows.map(mapAdminLicenseHistoryRow);
};

export const listOrganizationAuditTimeline = async (organizationId: string, limit = 20) => {
  const sql = assertDatabaseConfigured();
  const rows = await sql.query(
    `
    SELECT
      audit_log.id,
      audit_log.action,
      audit_log.object_type,
      audit_log.object_id,
      audit_log.actor_user_id,
      users.display_name AS actor_display_name,
      users.email AS actor_email,
      audit_log.organization_id,
      audit_log.details,
      audit_log.created_at
    FROM training.audit_log AS audit_log
    LEFT JOIN training.users AS users
      ON users.id = audit_log.actor_user_id
    WHERE audit_log.organization_id = $1
    ORDER BY audit_log.created_at DESC
    LIMIT $2
  `,
    [organizationId, Math.max(1, Math.min(limit, 100))],
  );

  return rows.map(mapAdminAuditTimelineRow);
};

export const getAdminTenantHistory = async (
  organizationId: string,
  licenseLimit = 12,
  auditLimit = 20,
): Promise<AdminTenantHistoryResponse> => {
  const [tenant, licenses, auditEvents] = await Promise.all([
    getAdminTenantById(organizationId),
    listAdminTenantLicenseHistory(organizationId, licenseLimit),
    listOrganizationAuditTimeline(organizationId, auditLimit),
  ]);

  return {
    tenant,
    licenses,
    auditEvents,
    message:
      tenant && (licenses.length > 0 || auditEvents.length > 0)
        ? null
        : tenant
          ? 'Storico tenant disponibile ma ancora poco popolato.'
          : 'Tenant non trovato.',
  };
};

export const createOrRenewTenantLicense = async (
  actor: Pick<AuthIdentity, 'userId'>,
  payload: AdminLicenseUpsertPayload,
) => {
  const sql = assertDatabaseConfigured();
  const issuedAtDate = payload.issuedAt ? new Date(payload.issuedAt) : new Date();
  if (!Number.isFinite(issuedAtDate.getTime())) {
    throw new Error('Data emissione licenza non valida.');
  }

  const issuedAtIso = issuedAtDate.toISOString();
  const expiresAt = addYears(issuedAtDate, LICENSE_VALIDITY_YEARS).toISOString();
  const updatesUntil = expiresAt;
  const licenseId = `lic_${payload.organizationId}_${issuedAtIso.slice(0, 10).replace(/-/g, '')}_${crypto.randomUUID().slice(0, 8)}`;
  const features = JSON.stringify(payload.features);

  const transactionResults = await sql.transaction([
    sql`
      INSERT INTO training.organizations (id, name, created_at, updated_at)
      VALUES (${payload.organizationId}, ${payload.organizationName}, now(), now())
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now()
    `,
    sql`
      UPDATE training.licenses
      SET status = 'revoked', updated_at = now()
      WHERE organization_id = ${payload.organizationId}
        AND status IN ('active', 'pending')
    `,
    sql`
      INSERT INTO training.licenses (
        id,
        organization_id,
        plan,
        status,
        issued_at,
        expires_at,
        updates_until,
        seats,
        features,
        created_at,
        updated_at
      )
      VALUES (
        ${licenseId},
        ${payload.organizationId},
        ${payload.plan},
        'active',
        ${issuedAtIso},
        ${expiresAt},
        ${updatesUntil},
        ${payload.seats},
        ${features}::jsonb,
        now(),
        now()
      )
      RETURNING id, organization_id, plan, status, issued_at, expires_at, updates_until, seats, features
    `,
    sql`
      INSERT INTO training.audit_log (id, actor_user_id, organization_id, action, object_type, object_id, details)
      VALUES (
        ${`audit_${crypto.randomUUID()}`},
        ${actor.userId},
        ${payload.organizationId},
        'admin.license.upsert',
        'license',
        ${licenseId},
        ${JSON.stringify({
          organizationName: payload.organizationName,
          plan: payload.plan,
          seats: payload.seats,
          features: payload.features,
          expiresAt,
        })}::jsonb
      )
    `,
  ]);

  const insertedLicenseRows = transactionResults[2] as SqlRow[] | undefined;
  const insertedLicense = insertedLicenseRows?.[0];
  const fallbackLicense: LicenseEntitlement = {
    licenseId,
    organizationId: payload.organizationId,
    organizationName: payload.organizationName,
    plan: payload.plan,
    status: 'active',
    issuedAt: issuedAtIso,
    expiresAt,
    updatesUntil,
    seats: payload.seats,
    features: payload.features,
    source: 'backend',
  };

  if (insertedLicense) {
    fallbackLicense.licenseId = String(insertedLicense.id);
    fallbackLicense.organizationId = String(insertedLicense.organization_id);
    fallbackLicense.issuedAt = parseIsoDate(insertedLicense.issued_at);
    fallbackLicense.expiresAt = parseIsoDate(insertedLicense.expires_at);
    fallbackLicense.updatesUntil = parseIsoDate(insertedLicense.updates_until);
    fallbackLicense.seats =
      typeof insertedLicense.seats === 'number' ? insertedLicense.seats : Number(insertedLicense.seats ?? 0);
    fallbackLicense.features = parseFeatureValues(insertedLicense.features) as LicenseEntitlement['features'];
  }

  const tenant = await getAdminTenantById(payload.organizationId).catch(() => null);
  return {
    tenant,
    license: tenant?.currentLicense ?? fallbackLicense,
  };
};

export const revokeTenantLicense = async (
  actor: Pick<AuthIdentity, 'userId'>,
  licenseId: string,
) => {
  const sql = assertDatabaseConfigured();
  const rows = await sql`
    WITH updated_license AS (
      UPDATE training.licenses
      SET status = 'revoked', updated_at = now()
      WHERE id = ${licenseId}
      RETURNING id, organization_id, plan, status, issued_at, expires_at, updates_until, seats, features
    ),
    inserted_audit AS (
      INSERT INTO training.audit_log (id, actor_user_id, organization_id, action, object_type, object_id, details)
      SELECT
        ${`audit_${crypto.randomUUID()}`},
        ${actor.userId},
        updated_license.organization_id,
        'admin.license.revoke',
        'license',
        updated_license.id,
        ${JSON.stringify({})}::jsonb
      FROM updated_license
    )
    SELECT *
    FROM updated_license
  `;

  const row = rows[0];
  if (!row) {
    return {
      tenant: null,
      license: null,
    };
  }

  const organizationId = String(row.organization_id);
  const fallbackLicense: LicenseEntitlement = {
    licenseId: String(row.id),
    organizationId,
    organizationName: null,
    plan: String(row.plan) as LicenseEntitlement['plan'],
    status: 'revoked',
    issuedAt: parseIsoDate(row.issued_at),
    expiresAt: parseIsoDate(row.expires_at),
    updatesUntil: parseIsoDate(row.updates_until),
    seats: typeof row.seats === 'number' ? row.seats : Number(row.seats ?? 0),
    features: parseFeatureValues(row.features) as LicenseEntitlement['features'],
    source: 'backend',
  };

  const tenant = await getAdminTenantById(organizationId).catch(() => null);
  return {
    tenant,
    license: tenant?.currentLicense ?? fallbackLicense,
  };
};

export const createDraftSession = async (
  identity: AuthIdentity,
  license: LicenseEntitlement,
  payload: DraftSessionPayload,
) => {
  const sql = assertDatabaseConfigured();
  const organizationId = identity.organizationId ?? license.organizationId;
  if (!organizationId) {
    throw new Error('Organizzazione attiva mancante per la creazione sessione.');
  }
  if (!identity.userId) {
    throw new Error('Utente autenticato non valido per la creazione sessione.');
  }

  const persistedSessionId = `dbsess_${crypto.randomUUID()}`;
  const startedAt = payload.courseSession.startedAt ?? new Date().toISOString();
  const rows = await sql`
    INSERT INTO training.training_sessions (
      id,
      client_session_id,
      organization_id,
      license_id,
      user_id,
      started_by_role,
      scenario_seed,
      trainee_name,
      instructor_name,
      provider_name,
      course_code,
      location,
      vr_device_id,
      mode,
      evidence_version,
      evidence_mode,
      started_at,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${persistedSessionId},
      ${payload.courseSession.sessionId},
      ${organizationId},
      ${license.licenseId},
      ${identity.userId},
      ${identity.role},
      ${payload.courseSession.scenarioSeed},
      ${payload.courseSession.traineeName},
      ${payload.courseSession.instructorName},
      ${payload.courseSession.providerName},
      ${payload.courseSession.courseCode},
      ${payload.courseSession.location},
      ${payload.courseSession.vrDeviceId},
      ${payload.courseSession.mode},
      ${payload.courseSession.evidenceVersion},
      ${'local-preview'},
      ${startedAt},
      'in_progress',
      now(),
      now()
    )
    ON CONFLICT (organization_id, client_session_id)
    DO UPDATE SET
      updated_at = now()
    RETURNING *
  `;
  const resolvedSessionId = String(rows[0]?.id ?? persistedSessionId);

  await insertAuditEvent({
    actorUserId: identity.userId,
    organizationId,
    action: 'session.create',
    objectType: 'training_session',
    objectId: resolvedSessionId,
    details: { clientSessionId: payload.courseSession.sessionId },
  });

  const summaryRows = await runSessionsQuery('WHERE sessions.id = $1', [resolvedSessionId]);
  return mapSessionRow(summaryRows[0] ?? rows[0]);
};

export const appendSessionEvents = async (
  persistedSessionId: string,
  events: PersistedEventInput[],
) => {
  if (!events.length) return;

  const sql = assertDatabaseConfigured();
  const statements = events.map((event) =>
    sql`
      INSERT INTO training.training_session_events (
        id,
        training_session_id,
        event_index,
        event_type,
        phase,
        event_timestamp,
        payload,
        created_at
      )
      VALUES (
        ${event.id},
        ${persistedSessionId},
        ${event.eventIndex},
        ${event.type},
        ${event.phase},
        ${new Date(event.timestamp).toISOString()},
        ${JSON.stringify(event.payload)}::jsonb,
        now()
      )
      ON CONFLICT (training_session_id, event_index)
      DO NOTHING
    `,
  );

  await sql.transaction(statements);
};

export const finalizeSession = async (
  currentSession: PersistedSessionSummary,
  identity: AuthIdentity,
  payload: FinalizeSessionPayload,
) => {
  const sql = assertDatabaseConfigured();
  const reportToPersist = createServerSignedReport(payload.report, currentSession, payload.endedAt);
  const reportJson = JSON.stringify(reportToPersist);
  const serverHash = await createServerEvidenceDigest(reportJson);
  const persistedSessionId = currentSession.id;

  const transactionResults = await sql.transaction((tx) => [
    ...payload.events.map((event) =>
      tx`
        INSERT INTO training.training_session_events (
          id,
          training_session_id,
          event_index,
          event_type,
          phase,
          event_timestamp,
          payload,
          created_at
        )
        VALUES (
          ${event.id},
          ${persistedSessionId},
          ${event.eventIndex},
          ${event.type},
          ${event.phase},
          ${new Date(event.timestamp).toISOString()},
          ${JSON.stringify(event.payload)}::jsonb,
          now()
        )
        ON CONFLICT (training_session_id, event_index)
        DO NOTHING
      `,
    ),
    tx`
      WITH updated_session AS (
        UPDATE training.training_sessions
        SET
          ended_at = ${payload.endedAt},
          status = ${payload.status},
          outcome_label = ${payload.outcome.label},
          total_score = ${payload.outcome.totalScore},
          residual_safety = ${payload.outcome.residualSafety},
          infractions = ${payload.outcome.infractions},
          critical_infractions = ${payload.outcome.criticalInfractions},
          high_infractions = ${payload.outcome.highInfractions},
          local_integrity_hash = ${payload.localIntegrityHash},
          server_hash = ${serverHash},
          report_json = ${reportJson}::jsonb,
          evidence_mode = 'server-signed',
          updated_at = now()
        WHERE id = ${persistedSessionId}
          AND server_hash IS NULL
          AND status IN ('draft', 'in_progress', 'aborted')
        RETURNING id, organization_id
      ),
      inserted_audit AS (
        INSERT INTO training.audit_log (id, actor_user_id, organization_id, action, object_type, object_id, details)
        SELECT
          ${`audit_${crypto.randomUUID()}`},
          ${identity.userId},
          updated_session.organization_id,
          'session.finalize',
          'training_session',
          updated_session.id,
          ${JSON.stringify({
            status: payload.status,
            clientIntegrityHash: payload.localIntegrityHash,
            serverHash,
          })}::jsonb
        FROM updated_session
      )
      SELECT COUNT(*)::int AS updated_count
      FROM updated_session
    `,
  ]);

  const finalizeResult = transactionResults[transactionResults.length - 1] as SqlRow[] | undefined;
  const updatedCount = Number(finalizeResult?.[0]?.updated_count ?? 0);
  const rows = await runSessionsQuery('WHERE sessions.id = $1', [persistedSessionId]);
  if (updatedCount === 0 && rows[0]) {
    const existingSession = mapSessionRow(rows[0]);
    if (existingSession.status === 'finalized' && existingSession.serverHash) {
      return {
        session: existingSession,
        serverHash: existingSession.serverHash,
      };
    }
  }
  if (!rows[0]) {
    throw new Error('Sessione persistita non trovata dopo la finalizzazione.');
  }

  return {
    session: mapSessionRow(rows[0]),
    serverHash,
  };
};

export const getSessionByPersistedId = async (persistedSessionId: string) => {
  const rows = await runSessionsQuery('WHERE sessions.id = $1', [persistedSessionId]);
  return rows[0] ? mapSessionRow(rows[0]) : null;
};

export const getSessionByClientSessionIdForOrganization = async (organizationId: string, clientSessionId: string) => {
  const rows = await runSessionsQuery(
    'WHERE sessions.organization_id = $1 AND sessions.client_session_id = $2',
    [organizationId, clientSessionId],
  );
  return rows[0] ? mapSessionRow(rows[0]) : null;
};

export const getSessionDetailByPersistedId = async (persistedSessionId: string) => {
  const sql = assertDatabaseConfigured();
  const rows = await sql`
    SELECT report_json, server_hash
    FROM training.training_sessions
    WHERE id = ${persistedSessionId}
    LIMIT 1
  `;
  const summary = await getSessionByPersistedId(persistedSessionId);
  if (!summary || !rows[0]) return null;

  const report = isRecord(rows[0].report_json)
    ? createServerSignedReport(rows[0].report_json as Record<string, unknown>, summary, summary.endedAt)
    : ((rows[0].report_json ?? null) as Record<string, unknown> | null);
  if (report && isRecord(report.evidence)) {
    report.evidence = {
      ...report.evidence,
      serverHash: rows[0].server_hash ? String(rows[0].server_hash) : null,
    };
  }

  return {
    session: summary,
    report,
    serverHash: rows[0].server_hash ? String(rows[0].server_hash) : null,
  };
};

export const listOrganizationSessions = async (organizationId: string) => {
  const rows = await runSessionsQuery('WHERE sessions.organization_id = $1', [organizationId]);
  return rows.map(mapSessionRow);
};

export const listUserSessions = async (organizationId: string, userId: string) => {
  const rows = await runSessionsQuery(
    'WHERE sessions.organization_id = $1 AND sessions.user_id = $2',
    [organizationId, userId],
  );
  return rows.map(mapSessionRow);
};

export const listAdminSessions = async () => {
  const result = await listAdminSessionsPage({ limit: 50 });
  return result.sessions;
};
