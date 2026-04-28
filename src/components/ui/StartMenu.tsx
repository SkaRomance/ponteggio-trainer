import { useGameStore } from '../../stores/gameStore';
import type { GamePhase } from '../../stores/gameStore';
import { Lock } from 'lucide-react';
import { formatDate, formatRole } from '../../models/accessControl';
import AccessStatusPanel from './AccessStatusPanel';
import CourseSessionPanel from './CourseSessionPanel';
import EvidenceSessionsPanel from './EvidenceSessionsPanel';

export default function StartMenu() {
  const {
    startGame,
    accessLevel,
    authIdentity,
    licenseEntitlement,
    isPhaseLocked,
    isCourseSessionReady,
    canViewGlobalSessions,
  } = useGameStore();
  const sessionReady = isCourseSessionReady();

  const phases: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'warehouse', label: 'Ispezione iniziale', icon: '🔍' },
    { id: 'transport', label: 'Trasporto', icon: '🚚' },
    { id: 'storage', label: 'Stoccaggio in cantiere', icon: '🏗️' },
    { id: 'assembly', label: 'Montaggio Pi.M.U.S.', icon: '🛠️' },
    { id: 'use', label: 'Controllo in uso', icon: '👷' },
    { id: 'disassembly', label: 'Smontaggio sicuro', icon: '🧱' },
    { id: 'return', label: 'Report finale', icon: '📊' },
  ];

  return (
    <div className="start-menu">
      <div className="menu-content">
        <div className="menu-header-row">
          <img className="mars-logo" src="/logo-mars.png" alt="Mars Compliance" />
          <div className="menu-badge">
            Mars Compliance trainer
          </div>
        </div>

        <h1 className="menu-title">
          Ponteggio <span className="menu-title-accent">Trainer</span>
        </h1>

        <p className="menu-subtitle">
          Simulatore Mars Compliance per la verifica dei componenti, la logistica di cantiere e le procedure di montaggio in sicurezza.
        </p>

        <div className="menu-stats" aria-label="Panoramica del corso">
          <div>
            <div className="menu-stat-value">{phases.length}</div>
            <div className="menu-stat-label">Fasi operative</div>
          </div>
          <div>
            <div className="menu-stat-value">
              {authIdentity.role === 'admin' ? 'Admin' : accessLevel === 'free' ? 'Base' : 'Licenza'}
            </div>
            <div className="menu-stat-label">Accesso attivo</div>
          </div>
          <div>
            <div className="menu-stat-value">
              {licenseEntitlement.status === 'active' ? formatDate(licenseEntitlement.expiresAt) : '81/08'}
            </div>
            <div className="menu-stat-label">
              {licenseEntitlement.status === 'active' ? 'Scadenza licenza' : 'Riferimento normativo'}
            </div>
          </div>
        </div>

        <AccessStatusPanel />
        <EvidenceSessionsPanel />
        <CourseSessionPanel />

        <ul className="phases-grid" aria-label="Fasi del percorso">
          {phases.map((phase) => {
            const locked = isPhaseLocked(phase.id);
            return (
              <li
                key={phase.id} 
                className="phase-item"
                aria-disabled={locked}
                data-state={locked ? 'locked' : 'available'}
              >
                <div className="phase-item-copy">
                  <span className="phase-item-icon" aria-hidden="true">{phase.icon}</span>
                  <div>
                    <span className="phase-item-title">{phase.label}</span>
                    <span className="phase-item-status">
                      {locked ? 'Richiede licenza attiva validata lato server' : 'Inclusa nel percorso autorizzato'}
                    </span>
                  </div>
                </div>
                {locked ? <Lock size={18} aria-hidden="true" /> : <span className="phase-check" aria-hidden="true">✓</span>}
              </li>
            );
          })}
        </ul>

        <div className="buttons-container">
          <button 
            type="button"
            className="start-btn" 
            onClick={startGame}
            disabled={!sessionReady}
            aria-describedby={!sessionReady ? 'session-required-note' : undefined}
          >
            {accessLevel === 'free' ? 'Avvia il percorso base' : 'Avvia la simulazione completa'}
          </button>
        </div>

        {!sessionReady && (
          <p className="course-required-note" id="session-required-note">
            Completa almeno allievo, docente, soggetto formatore e codice corso prima di avviare una sessione tracciata.
          </p>
        )}

        <p className="menu-license-note">
          {canViewGlobalSessions()
            ? `Profilo ${formatRole(authIdentity.role)} con permesso di audit globale. L archivio server-side e disponibile quando il backend risponde con stato pronto.`
            : 'Le fasi complete, gli aggiornamenti e gli upgrade triennali dipendono da licenza server-side attiva, non da sblocchi locali nel browser.'}
        </p>

        <p className="menu-legal">
          Piattaforma dimostrativa Mars Compliance S.r.l. Tutti i diritti riservati © 2026.
        </p>
      </div>
    </div>
  );
}
