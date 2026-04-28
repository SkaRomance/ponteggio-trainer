import type { LicenseFeature, LicensePlan, LicenseStatus, UserRole } from './accessControl';

export type AccountRole = Exclude<UserRole, 'anonymous'>;
export type PasswordAlgorithm = 'legacy-sha256' | 'pbkdf2-sha256';

export interface BootstrapAccount {
  userId: string;
  email: string;
  displayName: string;
  role: AccountRole;
  organizationId: string | null;
  organizationName?: string | null;
  passwordHash: string;
  passwordAlgorithm?: PasswordAlgorithm | null;
  licenseId?: string | null;
  plan?: LicensePlan;
  status?: LicenseStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  updatesUntil?: string | null;
  seats?: number;
  features?: LicenseFeature[];
}

export interface AuthAccountRecord
  extends Omit<BootstrapAccount, 'organizationName' | 'passwordHash' | 'passwordAlgorithm'> {
  organizationName: string | null;
  passwordHash: string | null;
  passwordAlgorithm: PasswordAlgorithm | null;
  authSource: 'bootstrap' | 'database';
  authActive: boolean;
}
