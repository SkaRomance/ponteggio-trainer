import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, LogOut, RefreshCw, Shield, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import {
  formatDate,
  formatLicenseStatus,
  formatPlan,
  formatRole,
} from '../../models/accessControl';

export default function AccessStatusPanel() {
  const {
    accessLevel,
    authConfigured,
    authIdentity,
    licenseEntitlement,
    accessSyncStatus,
    accessSyncMessage,
    sessionsArchiveStatus,
    persistedSessionId,
    serverEvidenceHash,
    sessionPersistenceStatus,
    sessionPersistenceMessage,
    syncAccessState,
    login,
    logout,
    canViewGlobalSessions,
  } = useGameStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const isBusy = accessSyncStatus === 'loading';
  const canSeeGlobalSessions = canViewGlobalSessions();
  const persistenceStatusMessage =
    sessionPersistenceMessage ??
    (sessionPersistenceStatus === 'loading'
      ? 'Creazione della bozza evidenza server in corso.'
      : sessionPersistenceStatus === 'syncing'
        ? 'Finalizzazione e firma server-side della sessione in corso.'
        : null);

  const capabilitySummary = useMemo(
    () => [
      accessLevel === 'premium' ? 'Percorso completo abilitato' : 'Solo percorso base disponibile',
      licenseEntitlement.features.includes('updates')
        ? `Aggiornamenti inclusi fino al ${formatDate(licenseEntitlement.updatesUntil)}`
        : 'Aggiornamenti non inclusi',
      canSeeGlobalSessions
        ? sessionsArchiveStatus === 'ready'
          ? 'Archivio sessioni globale disponibile'
          : 'Archivio sessioni globale richiede database server-side'
        : 'Archivio globale non autorizzato',
    ],
    [accessLevel, canSeeGlobalSessions, licenseEntitlement.features, licenseEntitlement.updatesUntil, sessionsArchiveStatus],
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);

    const authenticated = await login(email, password);
    if (!authenticated) {
      setFormMessage('Accesso non riuscito. Verifica credenziali e configurazione backend.');
      return;
    }

    setPassword('');
    setFormMessage('Accesso eseguito. Stato licenza sincronizzato dal backend.');
  };

  const handleLogout = async () => {
    setFormMessage(null);
    await logout();
    setPassword('');
    setFormMessage('Sessione autenticata chiusa.');
  };

  return (
    <section className="access-panel" aria-label="Accesso e licenza">
      <div className="access-panel-header">
        <div>
          <span className="summary-label">Accesso server-side</span>
          <h2>Identita, licenza e permessi</h2>
        </div>
        <span className={`access-status-pill${authIdentity.status === 'authenticated' ? ' active' : ''}`}>
          {authIdentity.status === 'authenticated' ? <Shield size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}
          {authIdentity.status === 'authenticated' ? 'Autenticato' : 'Anonimo'}
        </span>
      </div>

      <div className="access-grid">
        <div className="access-card">
          <span className="detail-label">Ruolo</span>
          <strong className="detail-value">{formatRole(authIdentity.role)}</strong>
          <p className="access-card-copy">
            {authIdentity.displayName || authIdentity.email || 'Nessun account autenticato'}
          </p>
        </div>

        <div className="access-card">
          <span className="detail-label">Licenza</span>
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
            Upgrade inclusi fino al {formatDate(licenseEntitlement.updatesUntil)}
          </p>
        </div>
      </div>

      <ul className="access-capabilities" aria-label="Permessi attivi">
        {capabilitySummary.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>

      {authIdentity.status !== 'authenticated' ? (
        <form className="access-login-form" onSubmit={handleLogin}>
          <label className="course-field">
            <span>Email account</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="admin@mars-compliance.it"
              disabled={isBusy}
              required
            />
          </label>

          <label className="course-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Password account"
              disabled={isBusy}
              required
            />
          </label>

          <div className="buttons-container access-actions">
            <button type="submit" className="start-btn" disabled={isBusy}>
              <KeyRound size={18} aria-hidden="true" />
              Accedi
            </button>
            <button type="button" className="btn-secondary" onClick={() => void syncAccessState()} disabled={isBusy}>
              <RefreshCw size={18} aria-hidden="true" />
              Sincronizza
            </button>
          </div>
        </form>
      ) : (
        <div className="buttons-container access-actions">
          <button type="button" className="btn-secondary" onClick={() => void syncAccessState()} disabled={isBusy}>
            <RefreshCw size={18} aria-hidden="true" />
            Aggiorna permessi
          </button>
          <button type="button" className="btn-secondary" onClick={handleLogout} disabled={isBusy}>
            <LogOut size={18} aria-hidden="true" />
            Disconnetti
          </button>
        </div>
      )}

      <div className="access-note">
        {authConfigured
          ? sessionsArchiveStatus === 'ready'
            ? 'Autenticazione e archivio server-side attivi. Le sessioni possono essere persistite e consultate dai profili autorizzati.'
            : 'Autenticazione applicativa attiva. Per persistere e consultare le sessioni serve anche DATABASE_URL in Vercel.'
          : 'Backend auth non configurato. Imposta MARS_AUTH_SECRET e MARS_AUTH_ACCOUNTS_JSON in Vercel per abilitare admin e clienti con licenza.'}
      </div>

      {(accessSyncMessage || formMessage) && (
        <div className="access-feedback" role="status" aria-live="polite">
          {formMessage || accessSyncMessage}
        </div>
      )}

      {(sessionPersistenceStatus !== 'idle' || persistenceStatusMessage || persistedSessionId || serverEvidenceHash) && (
        <div
          className={`access-feedback${sessionPersistenceStatus === 'error' ? ' error' : ''}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {sessionPersistenceStatus === 'ready'
              ? serverEvidenceHash
                ? 'Evidenza server firmata'
                : 'Bozza evidenza server pronta'
              : sessionPersistenceStatus === 'error'
                ? 'Persistenza sessione non riuscita'
                : sessionPersistenceStatus === 'syncing'
                  ? 'Firma server-side in corso'
                  : 'Persistenza sessione in corso'}
          </strong>
          {persistenceStatusMessage && <span>{persistenceStatusMessage}</span>}
          {persistedSessionId && <span>Sessione server: {persistedSessionId}</span>}
          {serverEvidenceHash && <span>Hash server: {serverEvidenceHash}</span>}
        </div>
      )}
    </section>
  );
}
