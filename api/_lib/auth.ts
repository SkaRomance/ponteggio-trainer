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
  type LicenseFeature,
  type LicensePlan,
  type LicenseStatus,
  type UserRole,
} from '../../src/models/accessControl';

type AccountRole = Exclude<UserRole, 'anonymous'>;

interface AccountRecord {
  userId: string;
  email: string;
  displayName: string;
  role: AccountRole;
  organizationId: string | null;
  organizationName?: string | null;
  passwordHash: string;
  licenseId?: string | null;
  plan?: LicensePlan;
  status?: LicenseStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  updatesUntil?: string | null;
  seats?: number;
  features?: LicenseFeature[];
}

interface SessionTokenPayload {
  userId: string;
  email: string;
  role: AccountRole;
  organizationId: string | null;
  exp: number;
}

const UTF8 = new TextEncoder();
const UTF8_DECODER = new TextDecoder();
const SESSION_COOKIE_NAME = 'mars_auth_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const UNCONFIGURED_MESSAGE =
  'Configura MARS_AUTH_SECRET e MARS_AUTH_ACCOUNTS_JSON per abilitare autenticazione admin e licenze cliente.';
const SESSION_ARCHIVE_MESSAGE =
  'Autenticazione attiva. L archivio globale delle sessioni richiede ancora un database server-side persistente.';

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

const createIdentityFromAccount = (account: AccountRecord | null): AuthIdentity =>
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

const createLicenseFromAccount = (account: AccountRecord | null): LicenseEntitlement => {
  if (!account) return createMissingLicense();

  const hasExplicitLicenseData = Boolean(
    account.licenseId || account.plan || account.status || account.features?.length || account.role !== 'admin',
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

const parseAccounts = () => {
  const raw = process.env.MARS_AUTH_ACCOUNTS_JSON;
  if (!raw) return [] as AccountRecord[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as AccountRecord[];
    return parsed
      .filter((entry): entry is AccountRecord => Boolean(entry && typeof entry === 'object'))
      .map((entry) => ({
        ...entry,
        email: normalizeEmail(entry.email),
        organizationId: entry.organizationId ?? null,
        organizationName: entry.organizationName ?? null,
      }));
  } catch {
    return [] as AccountRecord[];
  }
};

const getConfig = () => {
  const secret = process.env.MARS_AUTH_SECRET?.trim() ?? '';
  const accounts = parseAccounts();
  return {
    secret,
    accounts,
    configured: Boolean(secret && accounts.length > 0),
  };
};

const createMessage = (configured: boolean, identity: AuthIdentity, license: LicenseEntitlement) => {
  if (!configured) return UNCONFIGURED_MESSAGE;
  if (identity.status !== 'authenticated') {
    return 'Autenticazione pronta. Accedi con un account admin o cliente licenziato.';
  }
  if (canViewAllSessions(identity, license) || hasFeature(license, 'session_sync')) {
    return SESSION_ARCHIVE_MESSAGE;
  }
  return null;
};

const createAccessResponse = (configured: boolean, account: AccountRecord | null): AccessApiResponse => {
  const identity = createIdentityFromAccount(account);
  const license = createLicenseFromAccount(account);
  const sessionsArchiveStatus =
    canViewAllSessions(identity, license) || hasFeature(license, 'session_sync')
      ? 'database-required'
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

const findAccountByEmail = (accounts: AccountRecord[], email: string) =>
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
      accessResponse: createAccessResponse(false, null),
    };
  }

  const token = readCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    return {
      configured: true,
      account: null,
      accessResponse: createAccessResponse(true, null),
    };
  }

  const payload = await decodeTokenPayload(token, config.secret);
  if (!payload) {
    return {
      configured: true,
      account: null,
      accessResponse: createAccessResponse(true, null),
    };
  }

  const account = findAccountByEmail(config.accounts, payload.email);
  return {
    configured: true,
    account,
    accessResponse: createAccessResponse(true, account),
  };
};

export const authenticateCredentials = async (email: string, password: string) => {
  const config = getConfig();
  if (!config.configured) {
    return {
      ok: false,
      status: 503,
      message: UNCONFIGURED_MESSAGE,
      cookie: null,
    };
  }

  const account = findAccountByEmail(config.accounts, email);
  if (!account) {
    return {
      ok: false,
      status: 401,
      message: 'Credenziali non valide.',
      cookie: null,
    };
  }

  const providedPasswordHash = await sha256Hex(password);
  if (providedPasswordHash !== account.passwordHash) {
    return {
      ok: false,
      status: 401,
      message: 'Credenziali non valide.',
      cookie: null,
    };
  }

  const token = await encodeTokenPayload(
    {
      userId: account.userId,
      email: account.email,
      role: account.role,
      organizationId: account.organizationId,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    config.secret,
  );

  return {
    ok: true,
    status: 200,
    message: 'Accesso eseguito.',
    cookie: serializeSessionCookie(token, SESSION_TTL_SECONDS),
  };
};

export const clearSessionCookie = () => serializeExpiredSessionCookie();
