import {
  LICENSE_VALIDITY_YEARS,
  addYears,
  canViewAllSessions,
  createAccessApiResponse,
  createAnonymousIdentity,
  createMissingLicense,
  hasFeature,
  type AccessApiResponse,
  type AuthIdentity,
  type LicenseEntitlement,
} from '../../src/models/accessControl.js';
import type {
  AuthAccountRecord,
  BootstrapAccount,
  PasswordAlgorithm,
} from '../../src/models/bootstrapAccount.js';
import {
  clearLoginRateLimit,
  createAuthSession,
  getAuthAccountByEmail,
  getAuthAccountByUserId,
  getAuthSession,
  getLicenseFromDatabase,
  getLoginRateLimitState,
  isDatabaseConfigured,
  recordAuditEvent,
  registerFailedLogin,
  revokeAuthSession,
  updateAccountPasswordHash,
  upsertBootstrapAccount,
} from './db.js';

interface SessionTokenPayload {
  sessionId: string | null;
  userId: string;
  email: string;
  role: BootstrapAccount['role'];
  organizationId: string | null;
  exp: number;
}

interface AuthResult {
  ok: boolean;
  status: number;
  message: string;
  cookie: string | null;
}

interface MemoryRateLimitBucket {
  attemptCount: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

const UTF8 = new TextEncoder();
const UTF8_DECODER = new TextDecoder();
const SESSION_COOKIE_NAME = 'mars_auth_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const PBKDF2_ITERATIONS = Number(process.env.MARS_AUTH_PBKDF2_ITERATIONS ?? '310000');
const MEMORY_LOGIN_WINDOW_MS = Number(process.env.MARS_AUTH_RATE_LIMIT_WINDOW_MS ?? `${15 * 60 * 1000}`);
const MEMORY_LOGIN_BLOCK_MS = Number(process.env.MARS_AUTH_RATE_LIMIT_BLOCK_MS ?? `${30 * 60 * 1000}`);
const MEMORY_LOGIN_MAX_ATTEMPTS = Number(process.env.MARS_AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? '6');
const UNCONFIGURED_MESSAGE =
  'Configura MARS_AUTH_SECRET e almeno una sorgente account valida tra database persistente e bootstrap env.';
const SESSION_ARCHIVE_MESSAGE =
  'Autenticazione attiva. L archivio globale delle sessioni richiede ancora un database server-side persistente.';

const getMemoryRateLimitStore = () => {
  const globalState = globalThis as typeof globalThis & {
    __marsAuthRateLimits?: Map<string, MemoryRateLimitBucket>;
  };
  if (!globalState.__marsAuthRateLimits) {
    globalState.__marsAuthRateLimits = new Map();
  }
  return globalState.__marsAuthRateLimits;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const toBase64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const importHmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', UTF8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

const signValue = async (value: string, secret: string) => {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, UTF8.encode(value));
  return toBase64Url(new Uint8Array(signature));
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', UTF8.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
};

const inferPasswordAlgorithm = (
  passwordHash: string | null | undefined,
  explicit?: PasswordAlgorithm | null,
): PasswordAlgorithm => {
  if (explicit === 'pbkdf2-sha256' || explicit === 'legacy-sha256') {
    return explicit;
  }

  return passwordHash?.startsWith('pbkdf2_sha256$') ? 'pbkdf2-sha256' : 'legacy-sha256';
};

const parsePbkdf2Hash = (value: string) => {
  const match = value.match(/^pbkdf2_sha256\$(\d+)\$([^$]+)\$([^$]+)$/);
  if (!match) return null;

  return {
    iterations: Number(match[1]),
    salt: match[2],
    digest: match[3],
  };
};

const derivePbkdf2Digest = async (password: string, salt: string, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', UTF8.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64Url(salt),
      iterations,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return toBase64Url(new Uint8Array(bits));
};

const createPasswordHash = async (password: string, iterations = PBKDF2_ITERATIONS) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encodedSalt = toBase64Url(salt);
  const digest = await derivePbkdf2Digest(password, encodedSalt, iterations);
  return `pbkdf2_sha256$${iterations}$${encodedSalt}$${digest}`;
};

const verifyPassword = async (
  password: string,
  passwordHash: string,
  passwordAlgorithm?: PasswordAlgorithm | null,
) => {
  const algorithm = inferPasswordAlgorithm(passwordHash, passwordAlgorithm ?? undefined);
  if (algorithm === 'pbkdf2-sha256') {
    const parsed = parsePbkdf2Hash(passwordHash);
    if (!parsed) return false;

    const digest = await derivePbkdf2Digest(password, parsed.salt, parsed.iterations);
    return constantTimeEqual(digest, parsed.digest);
  }

  const providedPasswordHash = await sha256Hex(password);
  return constantTimeEqual(providedPasswordHash, passwordHash);
};

const shouldUpgradePasswordHash = (
  passwordHash: string,
  passwordAlgorithm?: PasswordAlgorithm | null,
) => {
  const algorithm = inferPasswordAlgorithm(passwordHash, passwordAlgorithm ?? undefined);
  if (algorithm !== 'pbkdf2-sha256') return true;

  const parsed = parsePbkdf2Hash(passwordHash);
  return !parsed || parsed.iterations < PBKDF2_ITERATIONS;
};

const createIdentityFromAccount = (account: AuthAccountRecord | BootstrapAccount | null): AuthIdentity =>
  account
    ? {
        status: 'authenticated',
        userId: account.userId,
        email: normalizeEmail(account.email),
        displayName: account.displayName,
        role: account.role,
        organizationId: account.organizationId,
      }
    : createAnonymousIdentity();

const createLicenseFromAccount = (account: AuthAccountRecord | BootstrapAccount | null): LicenseEntitlement => {
  if (!account) return createMissingLicense();

  const hasExplicitLicenseData = Boolean(
    account.licenseId ||
      account.plan ||
      account.status ||
      account.features?.length ||
      account.issuedAt ||
      account.expiresAt ||
      account.updatesUntil ||
      typeof account.seats === 'number',
  );
  if (!hasExplicitLicenseData) return createMissingLicense();

  const issuedAt = new Date(account.issuedAt ?? new Date().toISOString());
  const expiresAt = account.expiresAt ?? addYears(issuedAt, LICENSE_VALIDITY_YEARS).toISOString();
  const updatesUntil = account.updatesUntil ?? expiresAt;

  return {
    licenseId: account.licenseId ?? `lic_${account.organizationId ?? account.userId}`,
    organizationId: account.organizationId,
    organizationName: account.organizationName ?? null,
    plan: account.plan ?? 'professional',
    status: account.status ?? 'active',
    issuedAt: issuedAt.toISOString(),
    expiresAt,
    updatesUntil,
    seats: account.seats ?? 10,
    features: account.features?.length
      ? account.features
      : ['full_course', 'session_sync', 'updates', 'vr_runtime'],
    source: 'backend',
  };
};

const toAuthAccountRecord = (account: BootstrapAccount): AuthAccountRecord => ({
  ...account,
  organizationName: account.organizationName ?? null,
  passwordAlgorithm: inferPasswordAlgorithm(account.passwordHash, account.passwordAlgorithm ?? undefined),
  authSource: 'bootstrap',
  authActive: true,
});

const parseAccounts = () => {
  const raw = process.env.MARS_AUTH_ACCOUNTS_JSON;
  if (!raw) return [] as BootstrapAccount[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as BootstrapAccount[];
    return parsed
      .filter((entry): entry is BootstrapAccount => Boolean(entry && typeof entry === 'object'))
      .map((entry) => ({
        ...entry,
        email: normalizeEmail(entry.email),
        organizationId: entry.organizationId ?? null,
        organizationName: entry.organizationName ?? null,
        passwordAlgorithm: inferPasswordAlgorithm(entry.passwordHash, entry.passwordAlgorithm ?? undefined),
      }));
  } catch {
    return [] as BootstrapAccount[];
  }
};

const getConfig = () => {
  const secret = process.env.MARS_AUTH_SECRET?.trim() ?? '';
  const accounts = parseAccounts();
  return {
    secret,
    accounts,
    configured: Boolean(secret && (accounts.length > 0 || isDatabaseConfigured())),
  };
};

const createMessage = (configured: boolean, identity: AuthIdentity, license: LicenseEntitlement) => {
  if (!configured) return UNCONFIGURED_MESSAGE;
  if (identity.status !== 'authenticated') {
    return 'Autenticazione pronta. Accedi con un account admin o cliente licenziato.';
  }
  if (canViewAllSessions(identity, license) || hasFeature(license, 'session_sync')) {
    return isDatabaseConfigured()
      ? 'Autenticazione applicativa e archivio sessioni attivi.'
      : SESSION_ARCHIVE_MESSAGE;
  }
  return null;
};

const createAccessResponse = (
  configured: boolean,
  account: AuthAccountRecord | BootstrapAccount | null,
  licenseOverride?: LicenseEntitlement,
): AccessApiResponse => {
  const identity = createIdentityFromAccount(account);
  const license = licenseOverride ?? createLicenseFromAccount(account);
  const persistenceReady = isDatabaseConfigured();
  const canArchiveSessions = canViewAllSessions(identity, license) || hasFeature(license, 'session_sync');
  const sessionsArchiveStatus =
    canArchiveSessions
      ? persistenceReady
        ? 'ready'
        : 'database-required'
      : 'unavailable';

  return createAccessApiResponse({
    configured,
    identity,
    license,
    evidenceMode: 'local-preview',
    sessionsArchiveStatus,
    message: createMessage(configured, identity, license),
  });
};

const findBootstrapAccountByEmail = (accounts: BootstrapAccount[], email: string) =>
  accounts.find((account) => account.email === normalizeEmail(email)) ?? null;

const serializeSessionCookie = (token: string, maxAgeSeconds: number) =>
  `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

const serializeExpiredSessionCookie = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

const readCookieValue = (request: Request, name: string) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
};

const encodeTokenPayload = async (payload: SessionTokenPayload, secret: string) => {
  const payloadBytes = UTF8.encode(JSON.stringify(payload));
  const encodedPayload = toBase64Url(payloadBytes);
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

const decodeTokenPayload = async (token: string, secret: string) => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload, secret);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(UTF8_DECODER.decode(fromBase64Url(encodedPayload))) as SessionTokenPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
};

const getUserAgent = (request: Request) => request.headers.get('user-agent')?.trim() ?? 'unknown';

const createAuditDetails = async (request: Request, email: string) => ({
  emailHash: await sha256Hex(normalizeEmail(email)),
  ipHash: await sha256Hex(getClientIp(request)),
  userAgentHash: await sha256Hex(getUserAgent(request)),
});

const buildRateLimitBucketKey = async (request: Request, email: string) =>
  sha256Hex(`${normalizeEmail(email)}|${getClientIp(request)}`);

const getMemoryRateLimitState = (bucketKey: string) => {
  const store = getMemoryRateLimitStore();
  const bucket = store.get(bucketKey);
  if (!bucket) {
    return {
      attemptCount: 0,
      blockedUntil: null,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.blockedUntil && bucket.blockedUntil > Date.now()) {
    return {
      attemptCount: bucket.attemptCount,
      blockedUntil: new Date(bucket.blockedUntil).toISOString(),
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - Date.now()) / 1000),
    };
  }

  return {
    attemptCount: bucket.attemptCount,
    blockedUntil: null,
    retryAfterSeconds: 0,
  };
};

const registerFailedLoginInMemory = (bucketKey: string) => {
  const store = getMemoryRateLimitStore();
  const now = Date.now();
  const bucket = store.get(bucketKey);
  const withinWindow = Boolean(bucket && now - bucket.windowStartedAt < MEMORY_LOGIN_WINDOW_MS);
  const attemptCount = withinWindow && bucket ? bucket.attemptCount + 1 : 1;
  const blockedUntil = attemptCount >= MEMORY_LOGIN_MAX_ATTEMPTS ? now + MEMORY_LOGIN_BLOCK_MS : null;

  store.set(bucketKey, {
    attemptCount,
    blockedUntil,
    windowStartedAt: withinWindow && bucket ? bucket.windowStartedAt : now,
  });

  return {
    attemptCount,
    blockedUntil: blockedUntil ? new Date(blockedUntil).toISOString() : null,
    retryAfterSeconds: blockedUntil ? Math.ceil((blockedUntil - now) / 1000) : 0,
  };
};

const clearFailedLoginInMemory = (bucketKey: string) => {
  getMemoryRateLimitStore().delete(bucketKey);
};

const getRateLimitState = async (bucketKey: string) => {
  try {
    return isDatabaseConfigured() ? await getLoginRateLimitState(bucketKey) : getMemoryRateLimitState(bucketKey);
  } catch {
    return getMemoryRateLimitState(bucketKey);
  }
};

const registerFailedLoginAttempt = async (bucketKey: string) => {
  try {
    return isDatabaseConfigured() ? await registerFailedLogin(bucketKey) : registerFailedLoginInMemory(bucketKey);
  } catch {
    return registerFailedLoginInMemory(bucketKey);
  }
};

const clearFailedLoginAttempt = async (bucketKey: string) => {
  try {
    if (isDatabaseConfigured()) {
      await clearLoginRateLimit(bucketKey);
      return;
    }
  } catch {
    // Fall back to process-local cleanup below.
  }

  clearFailedLoginInMemory(bucketKey);
};

const hydrateLicense = async (account: AuthAccountRecord | BootstrapAccount | null) => {
  const fallbackLicense = createLicenseFromAccount(account);
  if (!account?.organizationId || !isDatabaseConfigured()) {
    return fallbackLicense;
  }

  try {
    const persistedLicense = await getLicenseFromDatabase(account.organizationId);
    if (persistedLicense.status !== 'missing' || persistedLicense.licenseId) {
      return {
        ...persistedLicense,
        organizationName: persistedLicense.organizationName ?? fallbackLicense.organizationName,
      } satisfies LicenseEntitlement;
    }
  } catch {
    // Keep the locally resolved fallback if the database is temporarily unavailable.
  }

  return fallbackLicense;
};

const resolveAccountForLogin = async (
  config: ReturnType<typeof getConfig>,
  email: string,
) => {
  const normalizedEmail = normalizeEmail(email);
  let databaseAccount: AuthAccountRecord | null = null;

  if (isDatabaseConfigured()) {
    try {
      databaseAccount = await getAuthAccountByEmail(normalizedEmail);
      if (databaseAccount?.passwordHash) {
        return databaseAccount;
      }
    } catch {
      // Fall back to bootstrap accounts below while auth schema is being introduced.
    }
  }

  const bootstrapAccount = findBootstrapAccountByEmail(config.accounts, normalizedEmail);
  if (!bootstrapAccount) return null;

  if (isDatabaseConfigured()) {
    try {
      await upsertBootstrapAccount(bootstrapAccount);
      const seededAccount = await getAuthAccountByEmail(normalizedEmail);
      if (seededAccount) {
        return seededAccount;
      }
    } catch {
      // Keep bootstrap fallback during incremental rollout.
    }
  }

  if (databaseAccount) {
    return databaseAccount;
  }

  return toAuthAccountRecord(bootstrapAccount);
};

const resolveAccountFromToken = async (
  payload: SessionTokenPayload,
  bootstrapAccounts: BootstrapAccount[],
) => {
  if (isDatabaseConfigured()) {
    try {
      if (!payload.sessionId) {
        return null;
      }

      const session = await getAuthSession(payload.sessionId);
      if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
        return null;
      }

      const databaseAccount = await getAuthAccountByUserId(session.userId);
      if (!databaseAccount || !databaseAccount.authActive) {
        return null;
      }

      const orgMismatch =
        session.organizationId !== databaseAccount.organizationId &&
        !(session.organizationId === null && databaseAccount.organizationId === null);
      if (
        orgMismatch ||
        session.issuedRole !== databaseAccount.role ||
        normalizeEmail(databaseAccount.email) !== normalizeEmail(payload.email) ||
        databaseAccount.userId !== payload.userId
      ) {
        return null;
      }

      return databaseAccount;
    } catch {
      return null;
    }
  }

  const bootstrapAccount = findBootstrapAccountByEmail(bootstrapAccounts, payload.email);
  if (
    bootstrapAccount &&
    payload.userId === bootstrapAccount.userId &&
    payload.role === bootstrapAccount.role &&
    payload.organizationId === bootstrapAccount.organizationId
  ) {
    return toAuthAccountRecord(bootstrapAccount);
  }

  return null;
};

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });

export const getAccessResponseForRequest = async (request: Request) => {
  const config = getConfig();
  if (!config.configured) {
    return {
      configured: false,
      account: null,
      sessionId: null,
      accessResponse: createAccessResponse(false, null),
    };
  }

  const token = readCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    return {
      configured: true,
      account: null,
      sessionId: null,
      accessResponse: createAccessResponse(true, null),
    };
  }

  const payload = await decodeTokenPayload(token, config.secret);
  if (!payload) {
    return {
      configured: true,
      account: null,
      sessionId: null,
      accessResponse: createAccessResponse(true, null),
    };
  }

  const account = await resolveAccountFromToken(payload, config.accounts);
  if (!account) {
    return {
      configured: true,
      account: null,
      sessionId: null,
      accessResponse: createAccessResponse(true, null),
    };
  }

  const effectiveLicense = await hydrateLicense(account);
  return {
    configured: true,
    account,
    sessionId: payload.sessionId,
    accessResponse: createAccessResponse(true, account, effectiveLicense),
  };
};

const buildSessionToken = async (
  config: ReturnType<typeof getConfig>,
  account: AuthAccountRecord,
  sessionId: string | null,
) => {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await encodeTokenPayload(
    {
      sessionId,
      userId: account.userId,
      email: account.email,
      role: account.role,
      organizationId: account.organizationId,
      exp,
    },
    config.secret,
  );

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
};

const handleAuthenticationFailure = async (
  request: Request,
  bucketKey: string,
  actorUserId: string | null,
  organizationId: string | null,
  email: string,
  action: string,
) => {
  const rateLimitState = await registerFailedLoginAttempt(bucketKey);
  await recordAuditEvent({
    actorUserId,
    organizationId,
    action,
    objectType: 'auth',
    objectId: email,
    details: {
      ...(await createAuditDetails(request, email)),
      blockedUntil: rateLimitState.blockedUntil,
      attemptCount: rateLimitState.attemptCount,
    },
  }).catch(() => {});

  return rateLimitState;
};

export const authenticateCredentials = async (request: Request, email: string, password: string): Promise<AuthResult> => {
  const config = getConfig();
  if (!config.configured) {
    return {
      ok: false,
      status: 503,
      message: UNCONFIGURED_MESSAGE,
      cookie: null,
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const bucketKey = await buildRateLimitBucketKey(request, normalizedEmail);
  const rateLimitState = await getRateLimitState(bucketKey);
  if (rateLimitState.blockedUntil && rateLimitState.retryAfterSeconds > 0) {
    await recordAuditEvent({
      actorUserId: null,
      organizationId: null,
      action: 'auth.login.rate_limited',
      objectType: 'auth',
      objectId: normalizedEmail,
      details: {
        ...(await createAuditDetails(request, normalizedEmail)),
        blockedUntil: rateLimitState.blockedUntil,
        retryAfterSeconds: rateLimitState.retryAfterSeconds,
      },
    }).catch(() => {});

    return {
      ok: false,
      status: 429,
      message: `Troppi tentativi di accesso. Riprova tra ${rateLimitState.retryAfterSeconds} secondi.`,
      cookie: null,
    };
  }

  const account = await resolveAccountForLogin(config, normalizedEmail);
  if (!account || !account.passwordHash || !account.authActive) {
    await handleAuthenticationFailure(
      request,
      bucketKey,
      account?.userId ?? null,
      account?.organizationId ?? null,
      normalizedEmail,
      'auth.login.failure',
    );
    return {
      ok: false,
      status: 401,
      message: 'Credenziali non valide.',
      cookie: null,
    };
  }

  const passwordValid = await verifyPassword(password, account.passwordHash, account.passwordAlgorithm);
  if (!passwordValid) {
    await handleAuthenticationFailure(
      request,
      bucketKey,
      account.userId,
      account.organizationId,
      normalizedEmail,
      'auth.login.failure',
    );
    return {
      ok: false,
      status: 401,
      message: 'Credenziali non valide.',
      cookie: null,
    };
  }

  if (shouldUpgradePasswordHash(account.passwordHash, account.passwordAlgorithm)) {
    try {
      const upgradedHash = await createPasswordHash(password);
      await updateAccountPasswordHash(account.userId, upgradedHash, 'pbkdf2-sha256', 'database');
    } catch {
      // Successful login should not fail if background rehashing is temporarily unavailable.
    }
  }

  await clearFailedLoginAttempt(bucketKey);

  let sessionId: string | null = null;
  try {
    if (isDatabaseConfigured()) {
      const { expiresAt } = await buildSessionToken(config, account, null);
      sessionId = await createAuthSession(account, expiresAt);
      if (!sessionId) {
        throw new Error('Impossibile creare una sessione autenticata revocabile.');
      }
    }
  } catch {
    await recordAuditEvent({
      actorUserId: account.userId,
      organizationId: account.organizationId,
      action: 'auth.login.failure',
      objectType: 'auth',
      objectId: account.userId,
      details: {
        ...(await createAuditDetails(request, normalizedEmail)),
        reason: 'session_create_failed',
      },
    }).catch(() => {});

    return {
      ok: false,
      status: 503,
      message: 'Autenticazione temporaneamente non disponibile. Riprova tra poco.',
      cookie: null,
    };
  }

  const { token } = await buildSessionToken(config, account, sessionId);
  await recordAuditEvent({
    actorUserId: account.userId,
    organizationId: account.organizationId,
    action: 'auth.login.success',
    objectType: 'auth',
    objectId: account.userId,
    details: {
      ...(await createAuditDetails(request, normalizedEmail)),
      sessionId,
      authSource: account.authSource,
      passwordAlgorithm: inferPasswordAlgorithm(account.passwordHash, account.passwordAlgorithm),
    },
  }).catch(() => {});

  return {
    ok: true,
    status: 200,
    message: 'Accesso eseguito.',
    cookie: serializeSessionCookie(token, SESSION_TTL_SECONDS),
  };
};

export const closeAuthenticatedSession = async (request: Request) => {
  const config = getConfig();
  if (!config.configured) {
    return serializeExpiredSessionCookie();
  }

  const token = readCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    return serializeExpiredSessionCookie();
  }

  const payload = await decodeTokenPayload(token, config.secret);
  if (!payload) {
    return serializeExpiredSessionCookie();
  }

  if (payload.sessionId) {
    try {
      await revokeAuthSession(payload.sessionId);
    } catch {
      // Cookie invalidation remains the primary logout mechanism if DB revocation is unavailable.
    }
  }

  await recordAuditEvent({
    actorUserId: payload.userId,
    organizationId: payload.organizationId,
    action: 'auth.logout',
    objectType: 'auth',
    objectId: payload.sessionId ?? payload.userId,
    details: {
      ...(await createAuditDetails(request, payload.email)),
      sessionId: payload.sessionId,
    },
  }).catch(() => {});

  return serializeExpiredSessionCookie();
};

export const clearSessionCookie = () => serializeExpiredSessionCookie();
