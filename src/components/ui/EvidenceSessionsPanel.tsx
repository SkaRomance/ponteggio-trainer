import { useEffect } from 'react';
import { Building2, Database, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import {
  formatDate,
  formatLicenseStatus,
  formatPlan,
  formatRole,
} from '../../models/accessControl';
import type { PersistedSessionSummary } from '../../models/persistence';
import { useGameStore } from '../../stores/gameStore';

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

const getOutcomeTone = (label: string | null) => {
  if (!label) return 'neutral';

  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('non') || normalizedLabel.includes('critical') || normalizedLabel.includes('errore')) {
    return 'danger';
  }

  if (normalizedLabel.includes('riliev') || normalizedLabel.includes('osserv') || normalizedLabel.includes('pending')) {
    return 'warning';
  }

  if (normalizedLabel.includes('conforme') || normalizedLabel.includes('complet') || normalizedLabel.includes('active')) {
    return 'success';
  }

  return 'neutral';
};

const getSortableTimestamp = (session: PersistedSessionSummary) => {
  const candidate = session.startedAt ?? session.endedAt;
  return candidate ? new Date(candidate).getTime() : 0;
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

  const canSeeGlobalSessions = canViewGlobalSessions();
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
  const sessions = [...persistedSessions].sort(
    (left, right) => getSortableTimestamp(right) - getSortableTimestamp(left),
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
        ? 'Archivio globale allineato con il contesto admin corrente.'
        : 'Archivio tenant allineato con la licenza corrente.';
    }
  }

  return (
    <section className="archive-panel" aria-label="Sessioni persistite e riepilogo licenza">
      <div className="archive-panel-header">
        <div>
          <span className="summary-label">Archivio server-side</span>
          <h2>Sessioni persistite e licenza corrente</h2>
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

      <div className="archive-session-list" aria-live="polite">
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
        ) : sessions.length === 0 ? (
          <div className="archive-empty-state">
            <Database size={20} aria-hidden="true" />
            <strong>Archivio non popolato</strong>
            <p>
              {canSeeGlobalSessions
                ? 'Nessuna sessione globale disponibile nel dataset corrente.'
                : 'Nessuna sessione del tenant attivo e stata ancora persistita.'}
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <article key={session.id} className="archive-session-card">
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

                <span
                  className="archive-session-outcome"
                  data-tone={getOutcomeTone(session.outcomeLabel)}
                >
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

              <p className="archive-session-note">
                Modalita evidenza: {formatEvidenceMode(session.evidenceMode)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
