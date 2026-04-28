import { neon } from '@neondatabase/serverless';
import {
  createMissingLicense,
  type AuthIdentity,
  type LicenseEntitlement,
} from '../../src/models/accessControl.js';
import type { BootstrapAccount } from '../../src/models/bootstrapAccount.js';
import type {
  DraftSessionPayload,
  FinalizeSessionPayload,
  PersistedEventInput,
  PersistedSessionSummary,
} from '../../src/models/persistence.js';

type SqlRow = Record<string, unknown>;

const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? '';
const EVIDENCE_SECRET = process.env.MARS_EVIDENCE_SECRET?.trim() ?? process.env.MARS_AUTH_SECRET?.trim() ?? '';

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
  startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
  endedAt: row.ended_at ? new Date(String(row.ended_at)).toISOString() : null,
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

const buildSessionsQuery = (whereClause: string) => `
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
    COALESCE(COUNT(events.id), 0) AS event_count
  FROM training.training_sessions AS sessions
  LEFT JOIN training.organizations AS organizations
    ON organizations.id = sessions.organization_id
  LEFT JOIN training.training_session_events AS events
    ON events.training_session_id = sessions.id
  ${whereClause}
  GROUP BY sessions.id, organizations.name
  ORDER BY sessions.created_at DESC
  LIMIT 50
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

const runSessionsQuery = async (whereClause: string, params: unknown[] = []) => {
  const sql = assertDatabaseConfigured();
  return sql.query(buildSessionsQuery(whereClause), params);
};

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
};

export const getLicenseFromDatabase = async (organizationId: string | null) => {
  if (!organizationId || !DATABASE_URL) return createMissingLicense();

  const sql = assertDatabaseConfigured();
  const rows = await sql`
    SELECT
      licenses.id,
      licenses.organization_id,
      organizations.name AS organization_name,
      licenses.plan,
      licenses.status,
      licenses.issued_at,
      licenses.expires_at,
      licenses.updates_until,
      licenses.seats,
      licenses.features
    FROM training.licenses AS licenses
    LEFT JOIN training.organizations AS organizations
      ON organizations.id = licenses.organization_id
    WHERE organization_id = ${organizationId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return createMissingLicense();

  const featureValues = Array.isArray(row.features) ? row.features : JSON.parse(String(row.features ?? '[]'));
  return {
    licenseId: String(row.id),
    organizationId: String(row.organization_id),
    organizationName: row.organization_name ? String(row.organization_name) : null,
    plan: String(row.plan) as LicenseEntitlement['plan'],
    status: String(row.status) as LicenseEntitlement['status'],
    issuedAt: row.issued_at ? new Date(String(row.issued_at)).toISOString() : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    updatesUntil: row.updates_until ? new Date(String(row.updates_until)).toISOString() : null,
    seats: typeof row.seats === 'number' ? row.seats : Number(row.seats ?? 0),
    features: featureValues as LicenseEntitlement['features'],
    source: 'backend',
  } satisfies LicenseEntitlement;
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

  await sql`
    INSERT INTO training.audit_log (id, actor_user_id, organization_id, action, object_type, object_id, details)
    VALUES (
      ${`audit_${crypto.randomUUID()}`},
      ${identity.userId},
      ${organizationId},
      'session.create',
      'training_session',
      ${resolvedSessionId},
      ${JSON.stringify({ clientSessionId: payload.courseSession.sessionId })}::jsonb
    )
  `;

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

  const finalizeResult = transactionResults.at(-1) as SqlRow[] | undefined;
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
  const rows = await runSessionsQuery('');
  return rows.map(mapSessionRow);
};
