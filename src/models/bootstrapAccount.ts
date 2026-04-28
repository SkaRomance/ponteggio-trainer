import type { LicenseFeature, LicensePlan, LicenseStatus, UserRole } from './accessControl';

export type AccountRole = Exclude<UserRole, 'anonymous'>;

export interface BootstrapAccount {
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
