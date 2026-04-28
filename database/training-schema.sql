CREATE SCHEMA IF NOT EXISTS training;

CREATE TABLE IF NOT EXISTS training.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_name_idx
  ON training.organizations (name);

CREATE TABLE IF NOT EXISTS training.users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_platform_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx
  ON training.users (LOWER(email));

CREATE TABLE IF NOT EXISTS training.auth_accounts (
  user_id text PRIMARY KEY REFERENCES training.users (id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_algorithm text NOT NULL CHECK (password_algorithm IN ('legacy-sha256', 'pbkdf2-sha256')),
  auth_source text NOT NULL DEFAULT 'database' CHECK (auth_source IN ('bootstrap', 'database')),
  active boolean NOT NULL DEFAULT true,
  password_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_accounts_active_idx
  ON training.auth_accounts (active, updated_at DESC);

CREATE TABLE IF NOT EXISTS training.auth_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES training.users (id) ON DELETE CASCADE,
  organization_id text REFERENCES training.organizations (id) ON DELETE SET NULL,
  issued_role text NOT NULL CHECK (issued_role IN ('customer', 'instructor', 'admin')),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
  ON training.auth_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_sessions_active_idx
  ON training.auth_sessions (expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS training.auth_rate_limits (
  bucket_key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  window_started_at timestamptz NOT NULL,
  blocked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_blocked_idx
  ON training.auth_rate_limits (blocked_until);

CREATE TABLE IF NOT EXISTS training.organization_memberships (
  organization_id text NOT NULL REFERENCES training.organizations (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES training.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'instructor', 'admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_idx
  ON training.organization_memberships (user_id);

CREATE TABLE IF NOT EXISTS training.licenses (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES training.organizations (id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('trial', 'professional', 'enterprise')),
  status text NOT NULL CHECK (status IN ('missing', 'active', 'expired', 'revoked', 'pending')),
  issued_at timestamptz,
  expires_at timestamptz,
  updates_until timestamptz,
  seats integer NOT NULL DEFAULT 0 CHECK (seats >= 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licenses_org_idx
  ON training.licenses (organization_id);

CREATE INDEX IF NOT EXISTS licenses_status_idx
  ON training.licenses (status);

CREATE TABLE IF NOT EXISTS training.training_sessions (
  id text PRIMARY KEY,
  client_session_id text NOT NULL,
  organization_id text REFERENCES training.organizations (id) ON DELETE SET NULL,
  license_id text REFERENCES training.licenses (id) ON DELETE SET NULL,
  user_id text REFERENCES training.users (id) ON DELETE SET NULL,
  started_by_role text NOT NULL CHECK (started_by_role IN ('anonymous', 'customer', 'instructor', 'admin')),
  scenario_seed text NOT NULL,
  trainee_name text NOT NULL,
  instructor_name text NOT NULL,
  provider_name text NOT NULL,
  course_code text NOT NULL,
  location text NOT NULL DEFAULT '',
  vr_device_id text NOT NULL DEFAULT '',
  mode text NOT NULL CHECK (mode IN ('demo', 'full')),
  evidence_version text NOT NULL,
  evidence_mode text NOT NULL CHECK (evidence_mode IN ('local-preview', 'server-signed')),
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'finalized', 'aborted')),
  outcome_label text,
  total_score integer,
  residual_safety integer,
  infractions integer,
  critical_infractions integer,
  high_infractions integer,
  local_integrity_hash text,
  server_hash text,
  report_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_org_client_session_uidx
  ON training.training_sessions (organization_id, client_session_id);

CREATE INDEX IF NOT EXISTS sessions_org_created_idx
  ON training.training_sessions (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sessions_user_created_idx
  ON training.training_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sessions_status_idx
  ON training.training_sessions (status);

CREATE TABLE IF NOT EXISTS training.training_session_events (
  id text PRIMARY KEY,
  training_session_id text NOT NULL REFERENCES training.training_sessions (id) ON DELETE CASCADE,
  event_index integer NOT NULL CHECK (event_index >= 0),
  event_type text NOT NULL,
  phase text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_session_id, event_index)
);

CREATE INDEX IF NOT EXISTS session_events_session_idx
  ON training.training_session_events (training_session_id, event_index);

CREATE INDEX IF NOT EXISTS session_events_timestamp_idx
  ON training.training_session_events (event_timestamp);

CREATE TABLE IF NOT EXISTS training.audit_log (
  id text PRIMARY KEY,
  actor_user_id text REFERENCES training.users (id) ON DELETE SET NULL,
  organization_id text REFERENCES training.organizations (id) ON DELETE SET NULL,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON training.audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_org_idx
  ON training.audit_log (organization_id, created_at DESC);
