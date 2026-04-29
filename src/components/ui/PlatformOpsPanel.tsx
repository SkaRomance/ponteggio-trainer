import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Building2,
  CalendarRange,
  Clock3,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import {
  LICENSE_VALIDITY_YEARS,
  formatDate,
  formatLicenseStatus,
  formatPlan,
  formatRole,
  type LicenseFeature,
} from '../../models/accessControl';
import {
  getAdminTenantDaysRemaining,
  getAdminTenantTone,
  isAdminTenantExpiringSoon,
  normalizeAdminTenantHistoryResponse,
  sortAdminTenants,
  summarizeAdminTenants,
  type AdminTenantHistoryResponse,
  type AdminTenantFilter,
  type AdminTenantSort,
} from '../../models/platformOps';

const defaultFeatures: LicenseFeature[] = ['full_course', 'session_sync', 'updates', 'vr_runtime'];
const warningWindowDays = 90;

const featureLabels: Record<LicenseFeature, string> = {
  full_course: 'Percorso completo',
  session_sync: 'Sync sessioni',
  admin_sessions: 'Audit globale',
  updates: 'Aggiornamenti',
  vr_runtime: 'Runtime VR',
};

const filterLabels: Record<AdminTenantFilter, string> = {
  all: 'Tutti',
  active: 'Attivi',
  expiring: 'In scadenza',
  missing: 'Assenti',
  expired: 'Scaduti',
  revoked: 'Revocati',
};

const sortLabels: Record<AdminTenantSort, string> = {
  risk: 'Priorita rischio',
  expiry: 'Scadenza',
  sessions: 'Volume sessioni',
  members: 'Membri attivi',
  name: 'Nome tenant',
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

const formatDaysRemaining = (daysRemaining: number | null) => {
  if (daysRemaining === null) return 'Scadenza non definita';
  if (daysRemaining < 0) return `Scaduta da ${Math.abs(daysRemaining)} gg`;
  if (daysRemaining === 0) return 'Scade oggi';
  return `Scade tra ${daysRemaining} gg`;
};

const getAttentionCopy = (
  status: ReturnType<typeof getAdminTenantTone>,
  daysRemaining: number | null,
  sessionCount: number,
) => {
  if (status === 'danger') {
    if (daysRemaining !== null && daysRemaining < 0) return 'Licenza non valida, rinnovo prioritario.';
    return 'Tenant fuori copertura o senza licenza attiva.';
  }
  if (status === 'warning') {
    return `Finestra di rinnovo aperta nei prossimi ${warningWindowDays} giorni.`;
  }
  if (sessionCount === 0) {
    return 'Tenant pronto ma senza sessioni archiviate lato server.';
  }
  return 'Tenant in linea con il presidio operativo corrente.';
};

const formatAuditAction = (action: string) => {
  switch (action) {
    case 'admin.license.upsert':
      return 'Rinnovo o emissione licenza';
    case 'admin.license.revoke':
      return 'Revoca licenza';
    case 'admin.tenant.history.read':
      return 'Lettura storico tenant';
    case 'session.create':
      return 'Creazione sessione persistita';
    case 'session.finalize':
      return 'Finalizzazione sessione';
    default:
      return action.replace(/\./g, ' ');
  }
};

const formatAuditDetails = (details: Record<string, unknown>) => {
  const entries = Object.entries(details).filter(([, value]) => value !== null && value !== '');
  if (entries.length === 0) return 'Nessun dettaglio aggiuntivo.';

  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ');
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
  const [issuedAt, setIssuedAt] = useState('');
  const [features, setFeatures] = useState<LicenseFeature[]>(defaultFeatures);
  const [statusFilter, setStatusFilter] = useState<AdminTenantFilter>('all');
  const [sortMode, setSortMode] = useState<AdminTenantSort>('risk');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantHistory, setTenantHistory] = useState<AdminTenantHistoryResponse>({
    tenant: null,
    licenses: [],
    auditEvents: [],
    message: null,
  });
  const [tenantHistoryStatus, setTenantHistoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [tenantHistoryMessage, setTenantHistoryMessage] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localMessageTone, setLocalMessageTone] = useState<'info' | 'error'>('error');
  const isAuthenticated = authIdentity.status === 'authenticated';
  const isAdmin = authIdentity.role === 'admin';
  const isBusy = adminTenantsStatus === 'loading' || adminTenantsStatus === 'syncing';
  const deferredAdminTenants = useDeferredValue(adminTenants);

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

  const summary = useMemo(
    () => summarizeAdminTenants(deferredAdminTenants, warningWindowDays),
    [deferredAdminTenants],
  );

  const filteredTenants = useMemo(
    () =>
      sortAdminTenants(
        deferredAdminTenants.filter((tenant) => {
          if (statusFilter === 'all') return true;
          if (statusFilter === 'expiring') return isAdminTenantExpiringSoon(tenant, warningWindowDays);
          return (tenant.currentLicense?.status ?? 'missing') === statusFilter;
        }),
        sortMode,
        warningWindowDays,
      ),
    [deferredAdminTenants, sortMode, statusFilter],
  );

  const attentionTenants = useMemo(
    () =>
      sortAdminTenants(
        deferredAdminTenants.filter(
          (tenant) =>
            getAdminTenantTone(tenant, warningWindowDays) !== 'success' || tenant.sessionCount === 0,
        ),
        'risk',
        warningWindowDays,
      ).slice(0, 5),
    [deferredAdminTenants],
  );

  const selectedTenant = useMemo(() => {
    if (!selectedTenantId) return attentionTenants[0] ?? filteredTenants[0] ?? null;
    return (
      deferredAdminTenants.find((tenant) => tenant.id === selectedTenantId) ??
      attentionTenants[0] ??
      filteredTenants[0] ??
      null
    );
  }, [attentionTenants, deferredAdminTenants, filteredTenants, selectedTenantId]);

  useEffect(() => {
    if (!isAdmin || !selectedTenant) {
      setTenantHistory({ tenant: null, licenses: [], auditEvents: [], message: null });
      setTenantHistoryStatus('idle');
      setTenantHistoryMessage(null);
      return;
    }

    let cancelled = false;
    setTenantHistoryStatus('loading');
    setTenantHistoryMessage(null);

    void fetch(`/api/admin/tenants/${encodeURIComponent(selectedTenant.id)}/history`, {
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = normalizeAdminTenantHistoryResponse(await response.json());
        if (!response.ok) {
          throw new Error(payload.message ?? 'Impossibile caricare lo storico tenant.');
        }
        if (cancelled) return;

        setTenantHistory(payload);
        setTenantHistoryStatus('ready');
        setTenantHistoryMessage(payload.message);
      })
      .catch((error) => {
        if (cancelled) return;

        setTenantHistory({
          tenant: selectedTenant,
          licenses: [],
          auditEvents: [],
          message: null,
        });
        setTenantHistoryStatus('error');
        setTenantHistoryMessage(
          error instanceof Error ? error.message : 'Errore durante il caricamento dello storico tenant.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedTenant]);

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
    setIssuedAt('');
    setFeatures(defaultFeatures);
  };

  const prefillTenantForm = (tenantId: string) => {
    const tenant = deferredAdminTenants.find((entry) => entry.id === tenantId);
    if (!tenant) return;

    const currentLicense = tenant.currentLicense;
    setSelectedTenantId(tenant.id);
    setOrganizationId(tenant.id);
    setOrganizationName(tenant.name);
    setPlan(currentLicense?.plan ?? 'professional');
    setSeats(String(currentLicense?.seats ?? Math.max(10, tenant.activeMemberCount)));
    setIssuedAt('');
    setFeatures(currentLicense?.features?.length ? currentLicense.features : defaultFeatures);
    setLocalMessageTone('info');
    setLocalMessage(`Tenant ${tenant.name} caricato nel form rinnovo.`);
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
    if (
      !organizationId.trim() ||
      !organizationName.trim() ||
      !Number.isFinite(normalizedSeats) ||
      normalizedSeats < 0
    ) {
      setLocalMessageTone('error');
      setLocalMessage('Compila tenant, nome e posti con valori validi.');
      return;
    }

    if (!features.length) {
      setLocalMessageTone('error');
      setLocalMessage('Seleziona almeno una feature licenza.');
      return;
    }

    const ok = await issueAdminLicense({
      organizationId: organizationId.trim(),
      organizationName: organizationName.trim(),
      plan,
      seats: normalizedSeats,
      issuedAt: issuedAt || null,
      features,
    });
    if (ok) {
      resetLicenseForm();
      await loadAdminTenants(searchInput);
    }
  };

  const renewTenantLicense = async (
    tenantId: string,
    tenantName: string,
    tenantPlan: typeof plan,
    tenantSeats: number,
    tenantFeatures: LicenseFeature[],
  ) => {
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
          Accedi come admin, cliente o docente per vedere tenant, stato licenza triennale e
          operazioni consentite.
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
            <strong className="detail-value">
              {licenseEntitlement.organizationName || 'Tenant non assegnato'}
            </strong>
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
          <h2>Radar licenze, rinnovi e presidio tenant</h2>
        </div>
        <span className="platform-ops-pill">
          {filteredTenants.length}/{adminTenants.length} tenant visibili
        </span>
      </div>

      <div className="platform-ops-summary-grid">
        <article className="platform-summary-card">
          <span className="summary-label">Tenant</span>
          <strong className="summary-value">{summary.totalTenants}</strong>
          <p>Catalogo tenant caricato nel control plane.</p>
        </article>
        <article className="platform-summary-card success">
          <span className="summary-label">Licenze attive</span>
          <strong className="summary-value">{summary.activeLicenses}</strong>
          <p>Termini attivi oggi sul perimetro formativo.</p>
        </article>
        <article className="platform-summary-card warning">
          <span className="summary-label">Scadenze &lt;= 90 gg</span>
          <strong className="summary-value">{summary.expiringSoon}</strong>
          <p>Finestra di rinnovo da presidiare subito.</p>
        </article>
        <article className="platform-summary-card danger">
          <span className="summary-label">Attention required</span>
          <strong className="summary-value">{summary.attentionRequired}</strong>
          <p>Tenant fuori copertura o con licenza fragile.</p>
        </article>
        <article className="platform-summary-card">
          <span className="summary-label">Posti assegnati</span>
          <strong className="summary-value">{summary.totalSeats}</strong>
          <p>{summary.activeMembers} membri attivi registrati.</p>
        </article>
        <article className="platform-summary-card">
          <span className="summary-label">Sessioni archiviate</span>
          <strong className="summary-value">{summary.totalSessions}</strong>
          <p>Volume server-side disponibile all audit.</p>
        </article>
      </div>

      <div className="platform-ops-admin-grid">
        <div className="platform-ops-stack">
          <div className="platform-ops-card">
            <div className="platform-card-heading">
              <Search size={18} aria-hidden="true" />
              <strong>Ricerca e filtri operativi</strong>
            </div>

            <form className="platform-search-form" onSubmit={handleSearch}>
              <label className="course-field">
                <span>Query backend</span>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Nome o ID tenant"
                />
              </label>

              <div className="platform-filter-grid">
                <label className="course-field">
                  <span>Filtro stato</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as AdminTenantFilter)}
                  >
                    {Object.entries(filterLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="course-field">
                  <span>Ordina per</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as AdminTenantSort)}
                  >
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="platform-ops-actions inline">
                <button type="submit" className="btn-secondary" disabled={isBusy}>
                  <Search size={18} aria-hidden="true" />
                  Cerca
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void loadAdminTenants(searchInput)}
                  disabled={isBusy}
                >
                  <RefreshCw size={18} aria-hidden="true" />
                  Aggiorna
                </button>
              </div>
            </form>

            <div className="platform-filter-pills" aria-label="Stato radar licenze">
              <button
                type="button"
                className={`platform-filter-pill${statusFilter === 'all' ? ' active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <Layers3 size={14} aria-hidden="true" />
                Tutto il perimetro
              </button>
              <button
                type="button"
                className={`platform-filter-pill${statusFilter === 'expiring' ? ' active warning' : ' warning'}`}
                onClick={() => setStatusFilter('expiring')}
              >
                <Clock3 size={14} aria-hidden="true" />
                Scadenze vicine
              </button>
              <button
                type="button"
                className={`platform-filter-pill${statusFilter === 'missing' ? ' active danger' : ' danger'}`}
                onClick={() => setStatusFilter('missing')}
              >
                <ShieldAlert size={14} aria-hidden="true" />
                Nessuna licenza
              </button>
            </div>

            <div className="platform-ops-feedback" role="status" aria-live="polite">
              <p>
                {adminTenantsMessage ??
                  'Usa il control plane per creare termini triennali, filtrare le scadenze e richiamare rapidamente i tenant nel form rinnovo.'}
              </p>
              <span>{isBusy ? 'Operazione in corso' : 'Database tenant live'}</span>
            </div>
          </div>

          <div className="platform-ops-card">
            <div className="platform-card-heading">
              <AlertTriangle size={18} aria-hidden="true" />
              <strong>Radar scadenze e criticita</strong>
            </div>

            {attentionTenants.length === 0 ? (
              <div className="platform-tenant-empty">
                <ShieldCheck size={20} aria-hidden="true" />
                <strong>Nessuna criticita immediata</strong>
                <p>Tutti i tenant caricati risultano coperti o senza segnali prioritari sul radar.</p>
              </div>
            ) : (
              <div className="platform-radar-list">
                {attentionTenants.map((tenant) => {
                  const tone = getAdminTenantTone(tenant, warningWindowDays);
                  const daysRemaining = getAdminTenantDaysRemaining(tenant);
                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      className={`platform-radar-item${selectedTenant?.id === tenant.id ? ' selected' : ''}`}
                      data-tone={tone}
                      onClick={() => setSelectedTenantId(tenant.id)}
                    >
                      <div>
                        <strong>{tenant.name}</strong>
                        <span>{formatDaysRemaining(daysRemaining)}</span>
                      </div>
                      <small>{getAttentionCopy(tone, daysRemaining, tenant.sessionCount)}</small>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTenant && (
              <div className="platform-selected-tenant" data-tone={getAdminTenantTone(selectedTenant, warningWindowDays)}>
                <div className="platform-selected-header">
                  <div>
                    <span className="summary-label">Tenant in focus</span>
                    <h3>{selectedTenant.name}</h3>
                  </div>
                  <span className="platform-ops-pill">
                    {formatDaysRemaining(getAdminTenantDaysRemaining(selectedTenant))}
                  </span>
                </div>
                <p>
                  {getAttentionCopy(
                    getAdminTenantTone(selectedTenant, warningWindowDays),
                    getAdminTenantDaysRemaining(selectedTenant),
                    selectedTenant.sessionCount,
                  )}
                </p>
                <div className="platform-ops-actions inline">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => prefillTenantForm(selectedTenant.id)}
                  >
                    <Sparkles size={18} aria-hidden="true" />
                    Carica nel form
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      void renewTenantLicense(
                        selectedTenant.id,
                        selectedTenant.name,
                        selectedTenant.currentLicense?.plan ?? 'professional',
                        selectedTenant.currentLicense?.seats ?? Math.max(10, selectedTenant.activeMemberCount),
                        selectedTenant.currentLicense?.features ?? defaultFeatures,
                      )
                    }
                    disabled={isBusy}
                  >
                    <CalendarRange size={18} aria-hidden="true" />
                    Rinnova subito
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <form className="platform-ops-card platform-ops-form" onSubmit={handleIssueLicense}>
          <div className="platform-card-heading">
            <Sparkles size={18} aria-hidden="true" />
            <strong>Emissione o rinnovo triennale</strong>
          </div>

          <label className="course-field">
            <span>Tenant ID</span>
            <input
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              placeholder="org_centro_roma"
            />
          </label>

          <label className="course-field">
            <span>Nome tenant</span>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Centro Formazione Roma"
            />
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

          <div className="platform-form-inline">
            <label className="course-field">
              <span>Emissione</span>
              <input type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} />
            </label>

            <div className="platform-mini-note">
              <span className="detail-label">Regola</span>
              <strong className="detail-value">Durata {LICENSE_VALIDITY_YEARS} anni</strong>
              <p>Se la data e vuota, il backend usa il timestamp corrente.</p>
            </div>
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
            <button type="button" className="btn-secondary" onClick={resetLicenseForm} disabled={isBusy}>
              <RefreshCw size={18} aria-hidden="true" />
              Reset form
            </button>
          </div>
        </form>
      </div>

      {selectedTenant && (
        <div className="platform-history-grid">
          <section className="platform-ops-card" aria-label="Storico termini licenza">
            <div className="platform-card-heading">
              <Clock3 size={18} aria-hidden="true" />
              <strong>Storico termini licenza</strong>
            </div>

            <div
              className={`platform-ops-feedback${
                tenantHistoryStatus === 'error' ? ' error' : tenantHistoryStatus === 'ready' ? ' info' : ''
              }`}
              role="status"
              aria-live="polite"
            >
              <p>
                {tenantHistoryStatus === 'loading'
                  ? 'Caricamento termini licenza e timeline tenant in corso.'
                  : tenantHistoryMessage ??
                    'Ogni rinnovo genera un nuovo termine storico, mantenendo il tenant auditabile nel tempo.'}
              </p>
              <span>{selectedTenant.name}</span>
            </div>

            <div className="platform-history-list">
              {tenantHistoryStatus === 'loading' && tenantHistory.licenses.length === 0 ? (
                <div className="platform-tenant-empty">
                  <RefreshCw size={20} aria-hidden="true" />
                  <strong>Caricamento storico</strong>
                  <p>Recupero dei termini licenza associati al tenant selezionato.</p>
                </div>
              ) : tenantHistory.licenses.length === 0 ? (
                <div className="platform-tenant-empty">
                  <ShieldAlert size={20} aria-hidden="true" />
                  <strong>Nessun termine disponibile</strong>
                  <p>Il tenant non ha ancora una cronologia licenze nel backend corrente.</p>
                </div>
              ) : (
                tenantHistory.licenses.map((license) => {
                  const isCurrent = selectedTenant.currentLicense?.licenseId === license.licenseId;
                  return (
                    <article key={license.licenseId} className="platform-history-card">
                      <div className="platform-history-top">
                        <div>
                          <strong>{formatPlan(license.plan)}</strong>
                          <p>{license.licenseId}</p>
                        </div>
                        <span className={`platform-tenant-chip ${license.status === 'active' ? 'success' : license.status === 'pending' ? 'warning' : 'danger'}`}>
                          {isCurrent ? 'Termine corrente · ' : ''}
                          {formatLicenseStatus(license.status)}
                        </span>
                      </div>

                      <div className="platform-history-grid-inline">
                        <div>
                          <span className="detail-label">Emissione</span>
                          <strong className="detail-value">{formatDate(license.issuedAt)}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Scadenza</span>
                          <strong className="detail-value">{formatDate(license.expiresAt)}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Posti</span>
                          <strong className="detail-value">{license.seats}</strong>
                        </div>
                      </div>

                      <div className="platform-ops-feature-list compact" aria-label={`Feature termine ${license.licenseId}`}>
                        {license.features.length ? (
                          license.features.map((feature) => (
                            <span key={`${license.licenseId}-${feature}`} className="platform-feature-chip">
                              <ShieldCheck size={14} aria-hidden="true" />
                              {featureLabels[feature]}
                            </span>
                          ))
                        ) : (
                          <span className="platform-feature-chip warning">Nessuna feature attiva</span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="platform-ops-card" aria-label="Timeline audit tenant">
            <div className="platform-card-heading">
              <Activity size={18} aria-hidden="true" />
              <strong>Timeline audit tenant</strong>
            </div>

            <div className="platform-timeline-list">
              {tenantHistoryStatus === 'loading' && tenantHistory.auditEvents.length === 0 ? (
                <div className="platform-tenant-empty">
                  <RefreshCw size={20} aria-hidden="true" />
                  <strong>Caricamento timeline</strong>
                  <p>Recupero degli ultimi eventi audit lato server.</p>
                </div>
              ) : tenantHistory.auditEvents.length === 0 ? (
                <div className="platform-tenant-empty">
                  <Activity size={20} aria-hidden="true" />
                  <strong>Nessun evento audit</strong>
                  <p>Il tenant non ha ancora eventi amministrativi o di evidenza tracciati nella timeline.</p>
                </div>
              ) : (
                tenantHistory.auditEvents.map((event) => (
                  <article key={event.id} className="platform-timeline-item">
                    <div className="platform-timeline-dot" aria-hidden="true" />
                    <div className="platform-timeline-content">
                      <div className="platform-timeline-top">
                        <strong>{formatAuditAction(event.action)}</strong>
                        <span>{formatDateTime(event.createdAt)}</span>
                      </div>
                      <p>
                        {event.actorDisplayName || event.actorEmail || 'Sistema'} · {event.objectType}
                        {event.objectId ? ` · ${event.objectId}` : ''}
                      </p>
                      <small>{formatAuditDetails(event.details)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <div className="platform-tenant-list">
        {filteredTenants.length === 0 ? (
          <div className="platform-tenant-empty">
            <Building2 size={20} aria-hidden="true" />
            <strong>Nessun tenant da mostrare</strong>
            <p>Rivedi filtro e query oppure aggiorna il catalogo tenant.</p>
          </div>
        ) : (
          filteredTenants.map((tenant) => {
            const currentLicense = tenant.currentLicense;
            const tenantFeatures = currentLicense?.features ?? defaultFeatures;
            const tone = getAdminTenantTone(tenant, warningWindowDays);
            const daysRemaining = getAdminTenantDaysRemaining(tenant);
            const seatCapacity = currentLicense?.seats ?? 0;
            const seatFill =
              seatCapacity > 0
                ? Math.min(100, Math.round((tenant.activeMemberCount / seatCapacity) * 100))
                : 0;

            return (
              <article key={tenant.id} className="platform-tenant-card" data-tone={tone}>
                <div className="platform-tenant-top">
                  <div>
                    <span className="platform-tenant-name">{tenant.name}</span>
                    <p className="platform-tenant-meta">
                      {tenant.id} · ultima attivita {formatDateTime(tenant.lastSessionAt)}
                    </p>
                  </div>
                  <div className="platform-tenant-status-stack">
                    <span className={`platform-ops-pill${currentLicense?.status === 'active' ? ' success' : ''}`}>
                      {currentLicense
                        ? `${formatPlan(currentLicense.plan)} · ${formatLicenseStatus(currentLicense.status)}`
                        : 'Licenza assente'}
                    </span>
                    <span className={`platform-tenant-chip ${tone}`}>{formatDaysRemaining(daysRemaining)}</span>
                  </div>
                </div>

                <div className="platform-tenant-grid">
                  <div className="platform-tenant-detail">
                    <span className="detail-label">Membri attivi</span>
                    <strong className="detail-value">{tenant.activeMemberCount}</strong>
                    <p>
                      <Users size={14} aria-hidden="true" /> {tenant.activeCustomerCount} clienti ·{' '}
                      {tenant.activeInstructorCount} docenti
                    </p>
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

                <div className="platform-seat-meter" aria-label={`Occupazione posti ${tenant.name}`}>
                  <div className="platform-seat-meter-copy">
                    <span className="detail-label">Copertura posti</span>
                    <strong className="detail-value">
                      {seatCapacity > 0 ? `${tenant.activeMemberCount}/${seatCapacity}` : 'Posti non assegnati'}
                    </strong>
                  </div>
                  <div className="platform-seat-meter-bar">
                    <span className="platform-seat-meter-fill" style={{ width: `${seatFill}%` }} />
                  </div>
                </div>

                <p className="platform-tenant-note">{getAttentionCopy(tone, daysRemaining, tenant.sessionCount)}</p>

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
                    onClick={() => prefillTenantForm(tenant.id)}
                  >
                    <Sparkles size={18} aria-hidden="true" />
                    Carica nel form
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      void renewTenantLicense(
                        tenant.id,
                        tenant.name,
                        currentLicense?.plan ?? 'professional',
                        currentLicense?.seats ?? Math.max(10, tenant.activeMemberCount),
                        tenantFeatures,
                      )
                    }
                    disabled={isBusy}
                  >
                    <CalendarRange size={18} aria-hidden="true" />
                    {currentLicense ? 'Rinnova 3 anni' : 'Emetti licenza'}
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
        <div
          className={`platform-ops-feedback${localMessageTone === 'error' ? ' error' : ' info'}`}
          role="status"
          aria-live="polite"
        >
          <p>{localMessage}</p>
          <span>{localMessageTone === 'error' ? 'Verifica i dati inseriti' : 'Form aggiornato'}</span>
        </div>
      )}
    </section>
  );
}
