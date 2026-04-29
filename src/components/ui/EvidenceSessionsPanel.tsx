import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Database,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  formatDate,
  formatLicenseStatus,
  formatPlan,
  formatRole,
} from '../../models/accessControl';
import type {
  PersistedSessionDetailResponse,
  PersistedSessionStatus,
  PersistedSessionSummary,
} from '../../models/persistence';
import { useGameStore } from '../../stores/gameStore';

type EvidenceFilter = 'all' | 'server-signed' | 'local-preview';
type ArchiveOutcomeFilter = 'all' | 'success' | 'warning' | 'danger';
type ArchiveStatusFilter = 'all' | PersistedSessionStatus;

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

const formatFeatureLabel = (feature: string) => {
  switch (feature) {
    case 'full_course':
      return 'Percorso completo';
    case 'session_sync':
      return 'Sync sessioni';
    case 'admin_sessions':
      return 'Audit globale';
    case 'updates':
      return 'Aggiornamenti';
    case 'vr_runtime':
      return 'Runtime VR';
    default:
      return feature.replace(/_/g, ' ');
  }
};

const formatEvidenceMode = (value: PersistedSessionSummary['evidenceMode']) => {
  if (value === 'server-signed') return 'Firmata lato server';
  return 'Anteprima locale';
};

const formatPersistedStatus = (value: PersistedSessionStatus) => {
  switch (value) {
    case 'draft':
      return 'Bozza';
    case 'in_progress':
      return 'In corso';
    case 'aborted':
      return 'Interrotta';
    case 'finalized':
      return 'Finalizzata';
    default:
      return value;
  }
};

const formatMode = (value: PersistedSessionSummary['mode']) => (value === 'full' ? 'Corso completo' : 'Demo');

const getOutcomeTone = (label: string | null) => {
  if (!label) return 'neutral';

  const normalizedLabel = label.toLowerCase();
  if (
    normalizedLabel.includes('non') ||
    normalizedLabel.includes('critical') ||
    normalizedLabel.includes('errore')
  ) {
    return 'danger';
  }

  if (
    normalizedLabel.includes('riliev') ||
    normalizedLabel.includes('osserv') ||
    normalizedLabel.includes('pending')
  ) {
    return 'warning';
  }

  if (
    normalizedLabel.includes('conforme') ||
    normalizedLabel.includes('complet') ||
    normalizedLabel.includes('active')
  ) {
    return 'success';
  }

  return 'neutral';
};

const getPersistedStatusTone = (status: PersistedSessionStatus) => {
  switch (status) {
    case 'finalized':
      return 'success';
    case 'aborted':
      return 'danger';
    case 'in_progress':
      return 'warning';
    default:
      return 'neutral';
  }
};

const getSortableTimestamp = (session: PersistedSessionSummary) => {
  const candidate = session.startedAt ?? session.endedAt;
  return candidate ? new Date(candidate).getTime() : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const asText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];

const asRecordArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => isRecord(entry)) : [];

const formatPayloadPreview = (value: unknown) => {
  if (!isRecord(value)) return 'Payload non disponibile.';

  const entries = Object.entries(value).filter(([, entry]) => entry !== null && entry !== '');
  if (entries.length === 0) return 'Payload vuoto.';

  return entries
    .slice(0, 3)
    .map(([key, entry]) => `${key}: ${Array.isArray(entry) ? entry.join(', ') : String(entry)}`)
    .join(' · ');
};

const formatSeverityLabel = (value: string | null) => {
  if (!value) return 'n/d';
  if (value === 'critical') return 'Critica';
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  if (value === 'low') return 'Bassa';
  return value;
};

const getSeverityTone = (value: string | null) => {
  if (value === 'critical' || value === 'high') return 'danger';
  if (value === 'medium') return 'warning';
  return 'neutral';
};

const normalizeDetailResponse = (
  payload: unknown,
  fallbackSession: PersistedSessionSummary,
): PersistedSessionDetailResponse => {
  const record = isRecord(payload) ? payload : {};
  const sessionRecord = isRecord(record.session) ? record.session : null;
  return {
    session: sessionRecord ? ({ ...fallbackSession, ...sessionRecord } as PersistedSessionSummary) : fallbackSession,
    report: isRecord(record.report) ? record.report : null,
    serverHash: asText(record.serverHash),
    message: asText(record.message),
  };
};

export default function EvidenceSessionsPanel() {
  const {
    authConfigured,
    authIdentity,
    licenseEntitlement,
    accessSyncStatus,
    sessionsArchiveStatus,
    canViewGlobalSessions,
    persistedSessions,
    persistedSessionsStatus,
    persistedSessionsMessage,
    loadPersistedSessions,
  } = useGameStore();
  const [searchInput, setSearchInput] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<ArchiveOutcomeFilter>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ArchiveStatusFilter>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailErrorSessionId, setDetailErrorSessionId] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<PersistedSessionDetailResponse | null>(null);

  const canSeeGlobalSessions = canViewGlobalSessions();
  const deferredSearchInput = useDeferredValue(searchInput);
  const endpoint =
    authIdentity.status !== 'authenticated'
      ? null
      : canSeeGlobalSessions
        ? '/api/admin/sessions'
        : '/api/evidence/sessions';
  const archiveScopeLabel = canSeeGlobalSessions ? 'Archivio globale' : 'Archivio tenant';
  const archiveAvailabilityLabel =
    sessionsArchiveStatus === 'ready'
      ? 'Archivio disponibile'
      : sessionsArchiveStatus === 'database-required'
        ? 'Database richiesto'
        : 'Archivio non collegato';
  const isBusy = accessSyncStatus === 'loading' || persistedSessionsStatus === 'loading';

  const sessions = useMemo(
    () =>
      [...persistedSessions].sort((left, right) => getSortableTimestamp(right) - getSortableTimestamp(left)),
    [persistedSessions],
  );

  useEffect(() => {
    if (
      authIdentity.status !== 'authenticated' ||
      sessionsArchiveStatus !== 'ready' ||
      accessSyncStatus === 'loading' ||
      persistedSessionsStatus !== 'idle'
    ) {
      return;
    }

    void loadPersistedSessions();
  }, [
    accessSyncStatus,
    authIdentity.status,
    loadPersistedSessions,
    persistedSessionsStatus,
    sessionsArchiveStatus,
  ]);

  const filteredSessions = useMemo(() => {
    const query = deferredSearchInput.trim().toLowerCase();
    return sessions.filter((session) => {
      if (statusFilter !== 'all' && session.status !== statusFilter) {
        return false;
      }

      if (evidenceFilter !== 'all' && session.evidenceMode !== evidenceFilter) {
        return false;
      }

      const outcomeTone = getOutcomeTone(session.outcomeLabel);
      if (outcomeFilter !== 'all' && outcomeTone !== outcomeFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        session.id,
        session.organizationName,
        session.organizationId,
        session.traineeName,
        session.instructorName,
        session.providerName,
        session.courseCode,
        session.location,
        session.scenarioSeed,
      ]
        .filter((entry): entry is string => Boolean(entry))
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [deferredSearchInput, evidenceFilter, outcomeFilter, sessions, statusFilter]);

  const effectiveSelectedSessionId =
    selectedSessionId && filteredSessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : filteredSessions[0]?.id ?? null;

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === effectiveSelectedSessionId) ?? filteredSessions[0] ?? null,
    [effectiveSelectedSessionId, filteredSessions, sessions],
  );

  useEffect(() => {
    if (
      authIdentity.status !== 'authenticated' ||
      !selectedSession ||
      sessionDetail?.session.id === selectedSession.id
    ) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/evidence/sessions/${encodeURIComponent(selectedSession.id)}`, {
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = normalizeDetailResponse(await response.json(), selectedSession);
        if (!response.ok) {
          throw new Error(payload.message ?? 'Impossibile leggere il dettaglio sessione.');
        }
        if (cancelled) return;

        setSessionDetail(payload);
        setDetailErrorSessionId(null);
        setDetailMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;

        setDetailErrorSessionId(selectedSession.id);
        setDetailMessage(error instanceof Error ? error.message : 'Errore durante la lettura del dettaglio.');
      });

    return () => {
      cancelled = true;
    };
  }, [authIdentity.status, selectedSession, sessionDetail?.session.id]);

  const featureLabels =
    licenseEntitlement.features.length > 0
      ? licenseEntitlement.features.map((feature) => formatFeatureLabel(feature))
      : ['Nessun entitlement attivo'];

  let archiveStatusMessage = persistedSessionsMessage;
  if (!archiveStatusMessage) {
    if (accessSyncStatus === 'loading') {
      archiveStatusMessage = 'Verifica identita e contesto licenza in corso.';
    } else if (authIdentity.status !== 'authenticated') {
      archiveStatusMessage = authConfigured
        ? 'Accedi con un account tenant o admin per consultare l archivio persistente.'
        : 'Collega autenticazione e backend persistente per popolare l archivio delle sessioni.';
    } else if (persistedSessionsStatus === 'loading') {
      archiveStatusMessage = `Caricamento sessioni da ${endpoint}.`;
    } else if (persistedSessionsStatus === 'error') {
      archiveStatusMessage = 'Archivio non raggiungibile dal frontend.';
    } else if (sessions.length === 0) {
      archiveStatusMessage = canSeeGlobalSessions
        ? 'Nessuna sessione persistita trovata nell archivio globale.'
        : 'Nessuna sessione persistita trovata per il tenant attivo.';
    } else {
      archiveStatusMessage = canSeeGlobalSessions
        ? 'Workspace globale pronto per ispezionare evidenze, esiti e sessioni multi-tenant.'
        : 'Workspace tenant pronto per ispezionare evidenze e risultati della licenza corrente.';
    }
  }

  const activeDetail =
    selectedSession && sessionDetail?.session.id === selectedSession.id ? sessionDetail : null;
  const selectedDetailError =
    selectedSession && detailErrorSessionId === selectedSession.id ? detailMessage : null;
  const isDetailLoading =
    authIdentity.status === 'authenticated' && Boolean(selectedSession) && !activeDetail && !selectedDetailError;

  const detailSession = activeDetail?.session ?? selectedSession;
  const reportRecord = activeDetail?.report ?? null;
  const evidenceRecord = isRecord(reportRecord?.evidence) ? reportRecord.evidence : null;
  const outcomeRecord = isRecord(reportRecord?.outcome) ? reportRecord.outcome : null;
  const sessionRecord = isRecord(reportRecord?.session) ? reportRecord.session : null;
  const phases = asRecordArray(reportRecord?.phases);
  const errors = asRecordArray(reportRecord?.errors);
  const events = asRecordArray(reportRecord?.events);
  const visibleEvents = events.slice(0, 12);
  const detailOutcomeLabel =
    asText(outcomeRecord?.label) ?? detailSession?.outcomeLabel ?? 'Sessione persistita';
  const detailOutcomeTone = getOutcomeTone(detailOutcomeLabel);
  const detailEvidenceWarning = asText(evidenceRecord?.warning);
  const serverHash = activeDetail?.serverHash ?? detailSession?.serverHash ?? null;
  const localHash = asText(reportRecord?.integrityHash) ?? detailSession?.localIntegrityHash ?? null;

  return (
    <section className="archive-panel" aria-label="Sessioni persistite e riepilogo licenza">
      <div className="archive-panel-header">
        <div>
          <span className="summary-label">Archivio server-side</span>
          <h2>Sessioni persistite, filtri e dettaglio evidenza</h2>
        </div>

        <div className="archive-panel-actions">
          <span
            className={`archive-scope-pill${canSeeGlobalSessions ? ' global' : ''}`}
            title={archiveAvailabilityLabel}
          >
            {canSeeGlobalSessions ? <Users size={16} aria-hidden="true" /> : <Building2 size={16} aria-hidden="true" />}
            {archiveScopeLabel}
          </span>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadPersistedSessions()}
            disabled={!endpoint || isBusy}
          >
            <RefreshCw size={18} aria-hidden="true" />
            Aggiorna archivio
          </button>
        </div>
      </div>

      <div className="archive-summary-grid">
        <div className="access-card">
          <span className="detail-label">Visibilita</span>
          <strong className="detail-value">{archiveScopeLabel}</strong>
          <p className="access-card-copy">
            {canSeeGlobalSessions
              ? `Permessi ${formatRole(authIdentity.role).toLowerCase()} per audit multi-tenant.`
              : 'Sessioni limitate al tenant e alla licenza attivi.'}
          </p>
        </div>

        <div className="access-card">
          <span className="detail-label">Licenza corrente</span>
          <strong className="detail-value">
            {formatPlan(licenseEntitlement.plan)} · {formatLicenseStatus(licenseEntitlement.status)}
          </strong>
          <p className="access-card-copy">
            {licenseEntitlement.organizationName || 'Organizzazione non assegnata'}
          </p>
        </div>

        <div className="access-card">
          <span className="detail-label">Validita</span>
          <strong className="detail-value">{formatDate(licenseEntitlement.expiresAt)}</strong>
          <p className="access-card-copy">
            {licenseEntitlement.features.includes('updates')
              ? `Aggiornamenti inclusi fino al ${formatDate(licenseEntitlement.updatesUntil)}`
              : 'Aggiornamenti non inclusi nel termine corrente'}
          </p>
        </div>

        <div className="access-card">
          <span className="detail-label">Sessioni caricate</span>
          <strong className="detail-value">
            {persistedSessionsStatus === 'ready' ? sessions.length : '—'}
          </strong>
          <p className="access-card-copy">
            {licenseEntitlement.seats > 0
              ? `${licenseEntitlement.seats} posti disponibili nel termine attivo`
              : archiveAvailabilityLabel}
          </p>
        </div>
      </div>

      <div className="archive-feature-list" aria-label="Entitlement licenza attivi">
        {featureLabels.map((featureLabel) => (
          <span key={featureLabel} className="archive-feature-chip">
            <ShieldCheck size={14} aria-hidden="true" />
            {featureLabel}
          </span>
        ))}
      </div>

      <div
        className={`archive-feedback${persistedSessionsStatus === 'error' ? ' error' : ''}`}
        role="status"
        aria-live="polite"
      >
        <p>{archiveStatusMessage}</p>
        <span>{endpoint ? `Endpoint attivo: ${endpoint}` : 'Endpoint disponibile dopo autenticazione'}</span>
      </div>

      <div className="archive-toolbar">
        <div className="archive-filter-grid">
          <label className="course-field">
            <span>Cerca sessione</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ID, tenant, allievo, corso, seed"
            />
          </label>

          <label className="course-field">
            <span>Esito</span>
            <select
              value={outcomeFilter}
              onChange={(event) => setOutcomeFilter(event.target.value as ArchiveOutcomeFilter)}
            >
              <option value="all">Tutti</option>
              <option value="success">Conforme</option>
              <option value="warning">Con rilievi</option>
              <option value="danger">Non conforme</option>
            </select>
          </label>

          <label className="course-field">
            <span>Evidenza</span>
            <select
              value={evidenceFilter}
              onChange={(event) => setEvidenceFilter(event.target.value as EvidenceFilter)}
            >
              <option value="all">Tutte</option>
              <option value="server-signed">Firmata server</option>
              <option value="local-preview">Locale</option>
            </select>
          </label>

          <label className="course-field">
            <span>Stato</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ArchiveStatusFilter)}
            >
              <option value="all">Tutti</option>
              <option value="finalized">Finalizzate</option>
              <option value="in_progress">In corso</option>
              <option value="draft">Bozze</option>
              <option value="aborted">Interrotte</option>
            </select>
          </label>
        </div>

        <div className="archive-filter-note">
          <span>
            {filteredSessions.length}/{sessions.length} sessioni visibili nel workspace corrente.
          </span>
          <span>
            {selectedSession ? `Sessione in focus: ${selectedSession.id}` : 'Seleziona una sessione per ispezionare il dettaglio.'}
          </span>
        </div>
      </div>

      <div className="archive-workspace">
        <div className="archive-session-list workspace" aria-live="polite">
          {authIdentity.status !== 'authenticated' ? (
            <div className="archive-empty-state">
              <Database size={20} aria-hidden="true" />
              <strong>Accesso richiesto</strong>
              <p>Autentica un tenant o un amministratore per leggere le sessioni persistite.</p>
            </div>
          ) : persistedSessionsStatus === 'loading' && sessions.length === 0 ? (
            <div className="archive-empty-state">
              <RefreshCw size={20} aria-hidden="true" />
              <strong>Caricamento archivio</strong>
              <p>Recupero delle sessioni tracciate dal backend in corso.</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="archive-empty-state">
              <FileSearch size={20} aria-hidden="true" />
              <strong>Nessuna sessione in vista</strong>
              <p>Rivedi query e filtri oppure aggiorna l archivio per recuperare nuovi record.</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`archive-session-card-button${selectedSession?.id === session.id ? ' selected' : ''}`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="archive-session-top">
                  <div className="archive-session-heading">
                    <span className="archive-session-id">{session.id}</span>
                    <p className="archive-session-meta">
                      {session.organizationName || 'Organizzazione n/d'}
                      {' · '}
                      {session.traineeName || 'Allievo n/d'}
                      {' · '}
                      {session.courseCode || 'Corso n/d'}
                    </p>
                  </div>

                  <span className="archive-session-outcome" data-tone={getOutcomeTone(session.outcomeLabel)}>
                    {session.outcomeLabel || 'Sessione persistita'}
                  </span>
                </div>

                <div className="archive-session-grid">
                  <div className="archive-session-detail">
                    <span className="detail-label">Docente</span>
                    <strong className="detail-value">{session.instructorName || 'n/d'}</strong>
                  </div>

                  <div className="archive-session-detail">
                    <span className="detail-label">Inizio</span>
                    <strong className="detail-value">{formatDateTime(session.startedAt)}</strong>
                  </div>

                  <div className="archive-session-detail">
                    <span className="detail-label">Fine</span>
                    <strong className="detail-value">{formatDateTime(session.endedAt)}</strong>
                  </div>

                  <div className="archive-session-detail">
                    <span className="detail-label">Punteggio</span>
                    <strong className="detail-value">
                      {session.totalScore === null ? 'n/d' : `${session.totalScore} pt`}
                    </strong>
                  </div>
                </div>

                <div className="archive-session-status-row">
                  <span className={`archive-session-pill ${session.evidenceMode === 'server-signed' ? 'success' : 'warning'}`}>
                    {formatEvidenceMode(session.evidenceMode)}
                  </span>
                  <span className={`archive-session-pill ${getPersistedStatusTone(session.status)}`}>
                    {formatPersistedStatus(session.status)}
                  </span>
                  <span className="archive-session-pill neutral">{session.eventCount} eventi</span>
                </div>

                <p className="archive-session-note">
                  Modalita {formatMode(session.mode)} · infrazioni {session.infractions ?? 0}
                  {session.criticalInfractions ? ` · critiche ${session.criticalInfractions}` : ''}
                </p>
              </button>
            ))
          )}
        </div>

        <aside className="archive-detail-panel" aria-live="polite">
          {authIdentity.status !== 'authenticated' ? (
            <div className="archive-detail-empty">
              <Database size={20} aria-hidden="true" />
              <strong>Dettaglio bloccato</strong>
              <p>Il pannello evidenza si attiva dopo autenticazione e caricamento archivio.</p>
            </div>
          ) : !selectedSession ? (
            <div className="archive-detail-empty">
              <Search size={20} aria-hidden="true" />
              <strong>Nessuna sessione selezionata</strong>
              <p>Seleziona una sessione dalla lista per ispezionare outcome, eventi, errori e hash.</p>
            </div>
          ) : detailSession ? (
            <>
              <div className="archive-detail-header">
                <div className="archive-detail-heading">
                  <span className="summary-label">Sessione in focus</span>
                  <h3>{detailSession.traineeName || detailSession.id}</h3>
                  <p>
                    {detailSession.organizationName || 'Organizzazione n/d'}
                    {' · '}
                    {detailSession.providerName || 'Soggetto formatore n/d'}
                    {' · '}
                    {detailSession.courseCode || 'Corso n/d'}
                  </p>
                </div>

                <span className="archive-session-outcome" data-tone={detailOutcomeTone}>
                  {detailOutcomeLabel}
                </span>
              </div>

              <div className={`archive-feedback${selectedDetailError ? ' error' : ''}`}>
                <p>
                  {isDetailLoading
                    ? 'Dettaglio archivio in sincronizzazione.'
                    : selectedDetailError ??
                      activeDetail?.message ??
                      detailEvidenceWarning ??
                      'Report sessione disponibile per audit, riesame docente e verifica evidenza.'}
                </p>
                <span>
                  {isDetailLoading
                    ? 'Sync in corso'
                    : serverHash
                      ? 'Hash server disponibile'
                      : 'Solo evidenza locale'}
                </span>
              </div>

              <div className="archive-detail-scroll">
                <div className="archive-detail-grid">
                  <article className="archive-detail-card">
                    <span className="detail-label">Evidenza</span>
                    <strong className="detail-value">{formatEvidenceMode(detailSession.evidenceMode)}</strong>
                    <p>Stato record: {formatPersistedStatus(detailSession.status)}</p>
                    <p className="archive-hash">Hash server: {serverHash || 'assente'}</p>
                    <p className="archive-hash">Hash locale: {localHash || 'assente'}</p>
                  </article>

                  <article className="archive-detail-card">
                    <span className="detail-label">Outcome</span>
                    <strong className="detail-value">
                      {detailSession.totalScore === null ? 'n/d' : `${detailSession.totalScore} pt`}
                    </strong>
                    <p>Sicurezza residua: {detailSession.residualSafety ?? 'n/d'}</p>
                    <p>
                      Infrazioni: {detailSession.infractions ?? 0} · critiche {detailSession.criticalInfractions ?? 0} ·
                      alte {detailSession.highInfractions ?? 0}
                    </p>
                  </article>

                  <article className="archive-detail-card">
                    <span className="detail-label">Scenario</span>
                    <strong className="detail-value">{detailSession.scenarioSeed}</strong>
                    <p>Inizio: {formatDateTime(detailSession.startedAt)}</p>
                    <p>Fine: {formatDateTime(detailSession.endedAt)}</p>
                    <p>Modalita: {formatMode(detailSession.mode)}</p>
                  </article>

                  <article className="archive-detail-card">
                    <span className="detail-label">Aula e device</span>
                    <strong className="detail-value">{detailSession.location || 'Sede n/d'}</strong>
                    <p>Docente: {detailSession.instructorName || 'n/d'}</p>
                    <p>VR device: {detailSession.vrDeviceId || 'n/d'}</p>
                    <p>Versione evidenza: {detailSession.evidenceVersion}</p>
                  </article>

                  <article className="archive-detail-card full">
                    <span className="detail-label">Contesto sessione</span>
                    <p>Sessione client: {detailSession.clientSessionId}</p>
                    <p>Licenza: {detailSession.licenseId || 'n/d'}</p>
                    <p>Utente: {detailSession.userId || 'n/d'}</p>
                    <p>Ruolo avvio: {detailSession.startedByRole}</p>
                    <p>
                      Corso: {sessionRecord && asText(sessionRecord.courseCode) ? asText(sessionRecord.courseCode) : detailSession.courseCode || 'n/d'}
                    </p>
                  </article>
                </div>

                <section className="archive-detail-card full" aria-label="Fasi del percorso">
                  <span className="detail-label">Fasi e delta</span>
                  {phases.length === 0 ? (
                    <p>Nessun breakdown di fase disponibile nel report persistito.</p>
                  ) : (
                    <div className="archive-phase-list">
                      {phases.map((phase, index) => {
                        const phaseName = asText(phase.phase) ?? `phase-${index + 1}`;
                        const title = asText(phase.title) ?? phaseName;
                        const phaseErrors = asStringArray(phase.errorCodes);
                        const completed = Boolean(phase.completed);
                        return (
                          <article key={`${phaseName}-${index}`} className="archive-phase-item">
                            <div className="archive-phase-top">
                              <strong>{title}</strong>
                              <span className={`archive-session-pill ${completed ? 'success' : 'warning'}`}>
                                {completed ? 'Completata' : 'Incompleta'}
                              </span>
                            </div>
                            <p>
                              {phaseName} · score delta {asNumber(phase.scoreDelta) ?? 'n/d'} · safety delta{' '}
                              {asNumber(phase.healthDelta) ?? 'n/d'}
                            </p>
                            {phaseErrors.length > 0 ? (
                              <div className="archive-code-list">
                                {phaseErrors.map((code) => (
                                  <span key={`${phaseName}-${code}`} className="archive-code-chip">
                                    {code}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <small>Nessun codice errore associato a questa fase.</small>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="archive-detail-card full" aria-label="Errori registrati">
                  <span className="detail-label">Errori e warning</span>
                  {errors.length === 0 ? (
                    <p>Nessun errore persistito nel report finale.</p>
                  ) : (
                    <div className="archive-error-list">
                      {errors.map((error, index) => {
                        const code = asText(error.code) ?? `err-${index + 1}`;
                        const severity = asText(error.severity);
                        return (
                          <article key={`${code}-${index}`} className="archive-error-item">
                            <div className="archive-error-top">
                              <strong>{code}</strong>
                              <span className={`archive-session-pill ${getSeverityTone(severity)}`}>
                                {formatSeverityLabel(severity)}
                              </span>
                            </div>
                            <p>
                              Fase {asText(error.phase) ?? 'n/d'} · {formatDateTime(asText(error.timestamp))}
                            </p>
                            <small>{asText(error.messageKey) ?? 'Nessun message key disponibile.'}</small>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="archive-detail-card full" aria-label="Timeline eventi">
                  <span className="detail-label">Timeline eventi</span>
                  {visibleEvents.length === 0 ? (
                    <p>Nessun evento presente nella sessione persistita.</p>
                  ) : (
                    <>
                      <div className="archive-event-list">
                        {visibleEvents.map((event, index) => {
                          const eventType = asText(event.type) ?? `event-${index + 1}`;
                          return (
                            <article key={`${eventType}-${index}`} className="archive-event-item">
                              <div className="archive-event-top">
                                <strong>{eventType}</strong>
                                <span className="archive-session-pill neutral">
                                  {asText(event.phase) ?? 'phase n/d'}
                                </span>
                              </div>
                              <p>{formatDateTime(asText(event.timestamp))}</p>
                              <small>{formatPayloadPreview(event.payload)}</small>
                            </article>
                          );
                        })}
                      </div>
                      {events.length > visibleEvents.length ? (
                        <p>
                          Visualizzati {visibleEvents.length} eventi su {events.length}. Il report completo resta disponibile
                          nell export server-side.
                        </p>
                      ) : null}
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="archive-detail-empty">
              <AlertTriangle size={20} aria-hidden="true" />
              <strong>Dettaglio non disponibile</strong>
              <p>{detailMessage ?? 'Impossibile leggere il dettaglio della sessione selezionata.'}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
