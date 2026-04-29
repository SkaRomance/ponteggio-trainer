import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Ban,
  Building2,
  CalendarRange,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import {
  formatDate,
  formatLicenseStatus,
  formatPlan,
  formatRole,
  type LicenseFeature,
} from '../../models/accessControl';

const defaultFeatures: LicenseFeature[] = ['full_course', 'session_sync', 'updates', 'vr_runtime'];

const featureLabels: Record<LicenseFeature, string> = {
  full_course: 'Percorso completo',
  session_sync: 'Sync sessioni',
  admin_sessions: 'Audit globale',
  updates: 'Aggiornamenti',
  vr_runtime: 'Runtime VR',
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'n/d';

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export default function PlatformOpsPanel() {
  const {
    authIdentity,
    licenseEntitlement,
    sessionsArchiveStatus,
    persistedSessions,
    persistedSessionsStatus,
    adminTenantQuery,
    adminTenants,
    adminTenantsStatus,
    adminTenantsMessage,
    loadAdminTenants,
    issueAdminLicense,
    revokeAdminLicense,
  } = useGameStore();
  const [searchInput, setSearchInput] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [plan, setPlan] = useState<'trial' | 'professional' | 'enterprise'>('professional');
  const [seats, setSeats] = useState('10');
  const [features, setFeatures] = useState<LicenseFeature[]>(defaultFeatures);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const isAuthenticated = authIdentity.status === 'authenticated';
  const isAdmin = authIdentity.role === 'admin';
  const isBusy = adminTenantsStatus === 'loading' || adminTenantsStatus === 'syncing';

  useEffect(() => {
    setSearchInput(adminTenantQuery);
  }, [adminTenantQuery]);

  useEffect(() => {
    if (isAdmin && adminTenantsStatus === 'idle') {
      void loadAdminTenants('');
    }
  }, [adminTenantsStatus, isAdmin, loadAdminTenants]);

  const tenantStats = useMemo(
    () => ({
      persistedSessions: persistedSessions.length,
      archiveState:
        sessionsArchiveStatus === 'ready'
          ? 'Archivio pronto'
          : sessionsArchiveStatus === 'database-required'
            ? 'Database richiesto'
            : 'Archivio non attivo',
    }),
    [persistedSessions.length, sessionsArchiveStatus],
  );

  const toggleFeature = (feature: LicenseFeature) => {
    setFeatures((current) =>
      current.includes(feature) ? current.filter((entry) => entry !== feature) : [...current, feature],
    );
  };

  const resetLicenseForm = () => {
    setOrganizationId('');
    setOrganizationName('');
    setPlan('professional');
    setSeats('10');
    setFeatures(defaultFeatures);
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setLocalMessage(null);
    await loadAdminTenants(searchInput);
  };

  const handleIssueLicense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalMessage(null);

    const normalizedSeats = Number(seats);
    if (!organizationId.trim() || !organizationName.trim() || !Number.isFinite(normalizedSeats) || normalizedSeats < 0) {
      setLocalMessage('Compila tenant, nome e posti con valori validi.');
      return;
    }

    const ok = await issueAdminLicense({
      organizationId: organizationId.trim(),
      organizationName: organizationName.trim(),
      plan,
      seats: normalizedSeats,
      features,
    });
    if (ok) {
      resetLicenseForm();
      await loadAdminTenants(searchInput);
    }
  };

  const renewTenantLicense = async (tenantId: string, tenantName: string, tenantPlan: typeof plan, tenantSeats: number, tenantFeatures: LicenseFeature[]) => {
    setLocalMessage(null);
    const ok = await issueAdminLicense({
      organizationId: tenantId,
      organizationName: tenantName,
      plan: tenantPlan,
      seats: tenantSeats,
      features: tenantFeatures.length ? tenantFeatures : defaultFeatures,
    });
    if (ok) {
      await loadAdminTenants(searchInput);
    }
  };

  const handleRevoke = async (licenseId: string) => {
    setLocalMessage(null);
    const ok = await revokeAdminLicense(licenseId);
    if (ok) {
      await loadAdminTenants(searchInput);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="platform-ops-panel" aria-label="Control plane tenant e licenze">
        <div className="platform-ops-header">
          <div>
            <span className="summary-label">Control plane</span>
            <h2>Tenant, licenze e operazioni aula</h2>
          </div>
          <span className="platform-ops-pill">Accesso richiesto</span>
        </div>
        <p className="platform-ops-copy">
          Accedi come admin, cliente o docente per vedere tenant, stato licenza triennale e operazioni consentite.
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="platform-ops-panel" aria-label="Stato operativo account">
        <div className="platform-ops-header">
          <div>
            <span className="summary-label">Stato operativo</span>
            <h2>Licenza e readiness del tenant</h2>
          </div>
          <span className="platform-ops-pill success">{formatRole(authIdentity.role)}</span>
        </div>

        <div className="platform-ops-grid compact">
          <div className="platform-ops-card">
            <span className="detail-label">Organizzazione</span>
            <strong className="detail-value">{licenseEntitlement.organizationName || 'Tenant non assegnato'}</strong>
            <p>{licenseEntitlement.organizationId || 'Nessun tenant attivo nel contesto autenticato.'}</p>
          </div>
          <div className="platform-ops-card">
            <span className="detail-label">Licenza</span>
            <strong className="detail-value">
              {formatPlan(licenseEntitlement.plan)} · {formatLicenseStatus(licenseEntitlement.status)}
            </strong>
            <p>Validita fino al {formatDate(licenseEntitlement.expiresAt)}</p>
          </div>
          <div className="platform-ops-card">
            <span className="detail-label">Aggiornamenti</span>
            <strong className="detail-value">{formatDate(licenseEntitlement.updatesUntil)}</strong>
            <p>{tenantStats.archiveState}</p>
          </div>
          <div className="platform-ops-card">
            <span className="detail-label">Sessioni archiviate</span>
            <strong className="detail-value">
              {persistedSessionsStatus === 'ready' ? tenantStats.persistedSessions : '—'}
            </strong>
            <p>Posti previsti dal termine corrente: {licenseEntitlement.seats}</p>
          </div>
        </div>

        <div className="platform-ops-feature-list" aria-label="Entitlement correnti">
          {licenseEntitlement.features.length ? (
            licenseEntitlement.features.map((feature) => (
              <span key={feature} className="platform-feature-chip">
                <ShieldCheck size={14} aria-hidden="true" />
                {featureLabels[feature]}
              </span>
            ))
          ) : (
            <span className="platform-feature-chip warning">Nessun entitlement attivo</span>
          )}
        </div>

        <div className="platform-ops-feedback" role="status" aria-live="polite">
          <p>
            {licenseEntitlement.status === 'active'
              ? 'Il tenant puo usare il percorso autorizzato e ricevere aggiornamenti fino alla data indicata.'
              : 'Il tenant puo consultare lo storico, ma per nuove sessioni premium serve riattivazione licenza.'}
          </p>
          <span>Ruolo corrente: {formatRole(authIdentity.role)}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="platform-ops-panel" aria-label="Control plane admin tenant e licenze">
      <div className="platform-ops-header">
        <div>
          <span className="summary-label">Control plane admin</span>
          <h2>Tenant, rinnovi triennali e revoche</h2>
        </div>
        <span className="platform-ops-pill">{adminTenants.length} tenant caricati</span>
      </div>

      <div className="platform-ops-grid">
        <form className="platform-ops-card platform-ops-form" onSubmit={handleIssueLicense}>
          <div className="platform-card-heading">
            <Sparkles size={18} aria-hidden="true" />
            <strong>Nuovo termine licenza</strong>
          </div>

          <label className="course-field">
            <span>Tenant ID</span>
            <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="org_centro_roma" />
          </label>

          <label className="course-field">
            <span>Nome tenant</span>
            <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Centro Formazione Roma" />
          </label>

          <div className="platform-form-inline">
            <label className="course-field">
              <span>Piano</span>
              <select value={plan} onChange={(event) => setPlan(event.target.value as typeof plan)}>
                <option value="trial">Trial</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label className="course-field">
              <span>Posti</span>
              <input value={seats} onChange={(event) => setSeats(event.target.value)} inputMode="numeric" />
            </label>
          </div>

          <div className="platform-feature-editor" aria-label="Feature licenza">
            {Object.entries(featureLabels).map(([feature, label]) => {
              const typedFeature = feature as LicenseFeature;
              const selected = features.includes(typedFeature);
              return (
                <button
                  key={feature}
                  type="button"
                  className={`platform-feature-toggle${selected ? ' active' : ''}`}
                  onClick={() => toggleFeature(typedFeature)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="platform-ops-actions">
            <button type="submit" className="start-btn" disabled={isBusy}>
              <CalendarRange size={18} aria-hidden="true" />
              Emetti / rinnova 3 anni
            </button>
          </div>
        </form>

        <div className="platform-ops-card">
          <div className="platform-card-heading">
            <Search size={18} aria-hidden="true" />
            <strong>Ricerca tenant</strong>
          </div>

          <form className="platform-search-form" onSubmit={handleSearch}>
            <label className="course-field">
              <span>Query</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nome o ID tenant"
              />
            </label>
            <div className="platform-ops-actions inline">
              <button type="submit" className="btn-secondary" disabled={isBusy}>
                <Search size={18} aria-hidden="true" />
                Cerca
              </button>
              <button type="button" className="btn-secondary" onClick={() => void loadAdminTenants(searchInput)} disabled={isBusy}>
                <RefreshCw size={18} aria-hidden="true" />
                Aggiorna
              </button>
            </div>
          </form>

          <div className="platform-ops-feedback" role="status" aria-live="polite">
            <p>
              {adminTenantsMessage ??
                'Usa il control plane per creare termini triennali, rinnovare tenant esistenti e revocare il termine corrente.'}
            </p>
            <span>{isBusy ? 'Operazione in corso' : 'Database tenant live'}</span>
          </div>
        </div>
      </div>

      <div className="platform-tenant-list">
        {adminTenants.length === 0 ? (
          <div className="platform-tenant-empty">
            <Building2 size={20} aria-hidden="true" />
            <strong>Nessun tenant da mostrare</strong>
            <p>Il database tenant e ancora vuoto oppure la ricerca corrente non ha restituito risultati.</p>
          </div>
        ) : (
          adminTenants.map((tenant) => {
            const currentLicense = tenant.currentLicense;
            const tenantFeatures = currentLicense?.features ?? defaultFeatures;
            return (
              <article key={tenant.id} className="platform-tenant-card">
                <div className="platform-tenant-top">
                  <div>
                    <span className="platform-tenant-name">{tenant.name}</span>
                    <p className="platform-tenant-meta">
                      {tenant.id} · ultima attivita {formatDateTime(tenant.lastSessionAt)}
                    </p>
                  </div>
                  <span className={`platform-ops-pill${currentLicense?.status === 'active' ? ' success' : ''}`}>
                    {currentLicense
                      ? `${formatPlan(currentLicense.plan)} · ${formatLicenseStatus(currentLicense.status)}`
                      : 'Licenza assente'}
                  </span>
                </div>

                <div className="platform-tenant-grid">
                  <div className="platform-tenant-detail">
                    <span className="detail-label">Membri attivi</span>
                    <strong className="detail-value">{tenant.activeMemberCount}</strong>
                    <p><Users size={14} aria-hidden="true" /> {tenant.activeCustomerCount} clienti · {tenant.activeInstructorCount} docenti</p>
                  </div>
                  <div className="platform-tenant-detail">
                    <span className="detail-label">Sessioni</span>
                    <strong className="detail-value">{tenant.sessionCount}</strong>
                    <p>Archivio storico tenant</p>
                  </div>
                  <div className="platform-tenant-detail">
                    <span className="detail-label">Scadenza</span>
                    <strong className="detail-value">{formatDate(currentLicense?.expiresAt ?? null)}</strong>
                    <p>Aggiornamenti fino al {formatDate(currentLicense?.updatesUntil ?? null)}</p>
                  </div>
                  <div className="platform-tenant-detail">
                    <span className="detail-label">Posti</span>
                    <strong className="detail-value">{currentLicense?.seats ?? 0}</strong>
                    <p>Termine licenza attuale</p>
                  </div>
                </div>

                <div className="platform-ops-feature-list compact" aria-label={`Entitlement ${tenant.name}`}>
                  {tenantFeatures.map((feature) => (
                    <span key={`${tenant.id}-${feature}`} className="platform-feature-chip">
                      <ShieldCheck size={14} aria-hidden="true" />
                      {featureLabels[feature]}
                    </span>
                  ))}
                </div>

                <div className="platform-ops-actions inline">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      void renewTenantLicense(
                        tenant.id,
                        tenant.name,
                        currentLicense?.plan ?? 'professional',
                        currentLicense?.seats ?? 10,
                        tenantFeatures,
                      )
                    }
                    disabled={isBusy}
                  >
                    <CalendarRange size={18} aria-hidden="true" />
                    Rinnova 3 anni
                  </button>
                  {currentLicense && (
                    <button
                      type="button"
                      className="btn-secondary danger"
                      onClick={() => void handleRevoke(currentLicense.licenseId ?? '')}
                      disabled={isBusy || !currentLicense.licenseId}
                    >
                      <Ban size={18} aria-hidden="true" />
                      Revoca
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {localMessage && (
        <div className="platform-ops-feedback error" role="status" aria-live="polite">
          <p>{localMessage}</p>
          <span>Verifica i dati inseriti</span>
        </div>
      )}
    </section>
  );
}
