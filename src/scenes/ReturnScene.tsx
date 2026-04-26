import { useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { phaseOrder, useGameStore, type GamePhase, type PhaseScore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';
import { phaseContent } from '../config/phaseContent';
import SessionReportActions from '../components/ui/SessionReportActions';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';

const overlayShellStyle: CSSProperties = {
  width: 'min(860px, 94vw)',
  padding: '1rem',
  background: 'rgba(10,10,10,0.22)',
  borderRadius: '30px',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 24px 80px rgba(10,10,10,0.22)',
};

const overlayCardStyle: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${MARS_BORDER}`,
  borderRadius: '26px',
  padding: '2rem',
  color: MARS_TEXT,
  fontFamily: 'Inter, sans-serif',
  textAlign: 'center',
  pointerEvents: 'auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

const getPhaseOutcome = (phaseScore: PhaseScore | undefined, isCurrentAuditPhase: boolean) => {
  if (!phaseScore) {
    return isCurrentAuditPhase
      ? { label: 'Audit in corso', color: MARS_ACCENT }
      : { label: 'Non completata', color: MARS_MUTED };
  }

  if (phaseScore.errors.some((error) => error.severity === 'critical')) {
    return { label: 'Bloccante', color: MARS_DANGER };
  }

  if (phaseScore.errors.some((error) => error.severity === 'high')) {
    return { label: 'Con rilievi', color: MARS_DANGER };
  }

  if (phaseScore.errors.length > 0) {
    return { label: 'Con osservazioni', color: MARS_ACCENT };
  }

  return { label: 'Conforme', color: MARS_SUCCESS };
};

const formatDelta = (value: number, suffix = '') => {
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
};

export default function ReturnScene() {
  const { totalScore, currentHealth, currentPhase, phaseScores, errors, resetGame, courseSession } = useGameStore();
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  const severitySummary = {
    critical: errors.filter((error) => error.severity === 'critical').length,
    high: errors.filter((error) => error.severity === 'high').length,
    medium: errors.filter((error) => error.severity === 'medium').length,
    low: errors.filter((error) => error.severity === 'low').length,
  };
  const finalOutcome =
    severitySummary.critical > 0
      ? { label: 'Non conforme', color: MARS_DANGER }
      : severitySummary.high > 0
        ? { label: 'Conforme con rilievi', color: MARS_ACCENT }
        : errors.length > 0
          ? { label: 'Conforme con osservazioni', color: MARS_ACCENT }
          : { label: 'Conforme', color: MARS_SUCCESS };
  const phaseScoreMap = new Map<GamePhase, PhaseScore>(
    phaseScores.map((phaseScore) => [phaseScore.phase, phaseScore]),
  );

  const auditRows = phaseOrder.map((phase) => {
    const phaseScore = phaseScoreMap.get(phase);
    const outcome = getPhaseOutcome(phaseScore, currentPhase === phase && phase === 'return');
    const majorInfractions = phaseScore
      ? phaseScore.errors
          .filter((error) => error.severity === 'critical' || error.severity === 'high')
          .map((error) => error.code)
      : [];

    return {
      phase,
      title: phaseContent[phase]?.title ?? phase,
      outcome,
      healthDelta: phaseScore ? phaseScore.endHealth - phaseScore.startHealth : null,
      scoreDelta: phaseScore ? phaseScore.endScore - phaseScore.startScore : null,
      infractions:
        majorInfractions.length > 0
          ? majorInfractions.slice(0, 2)
          : phaseScore && phaseScore.errors.length > 0
            ? phaseScore.errors.slice(0, 2).map((error) => error.code)
            : [],
    };
  });

  return (
    <group>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      <group position={[0, 0, -5]}>
        <Box args={[8, 1, 12]}>
          <meshStandardMaterial color="#111" metalness={0.8} />
        </Box>
        <Box args={[4.5, 4, 4]} position={[0, 2, -8]}>
          <meshStandardMaterial color="#111" metalness={0.9} />
        </Box>
        <Text position={[0, 6, -8]} fontSize={0.6} color={MARS_PRIMARY}>MEZZO DI RITORNO PRONTO</Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html center position={[0, 5, 0]}>
        <div style={overlayShellStyle}>
          <div style={overlayCardStyle}>
            <h1 style={{ margin: '0 0 1.5rem 0', fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.6rem, 6vw, 4rem)', fontWeight: 700, color: MARS_PRIMARY, lineHeight: 0.92 }}>
              Valutazione<br />finale
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '20px', padding: '1.5rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: MARS_MUTED, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Competenza acquisita
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: MARS_PRIMARY }}>{totalScore}</div>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '20px', padding: '1.5rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: MARS_MUTED, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Integrita residua
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: currentHealth >= 70 ? MARS_SUCCESS : currentHealth >= 40 ? MARS_ACCENT : MARS_DANGER }}>
                  {currentHealth}%
                </div>
              </div>
              <div style={{ border: `1px solid ${finalOutcome.color}`, borderRadius: '20px', padding: '1.5rem', background: finalOutcome.color === MARS_SUCCESS ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.06)', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: finalOutcome.color, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Esito audit
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: finalOutcome.color }}>{finalOutcome.label}</div>
              </div>
              <div style={{ border: `1px solid ${MARS_DANGER}`, borderRadius: '20px', padding: '1.5rem', background: 'rgba(220, 38, 38, 0.06)', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: MARS_DANGER, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Infrazioni rilevate
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: MARS_DANGER }}>{errors.length}</div>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.75rem', padding: '1.25rem', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}`, borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 0.9rem 0', color: MARS_PRIMARY, fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700 }}>
                Identificativi sessione
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.86rem', color: MARS_MUTED }}>
                <div>
                  <span style={{ display: 'block', marginBottom: '0.2rem' }}>Sessione</span>
                  <strong style={{ color: MARS_TEXT }}>{courseSession.sessionId}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', marginBottom: '0.2rem' }}>Allievo</span>
                  <strong style={{ color: MARS_TEXT }}>{courseSession.traineeName || 'n/d'}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', marginBottom: '0.2rem' }}>Docente</span>
                  <strong style={{ color: MARS_TEXT }}>{courseSession.instructorName || 'n/d'}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', marginBottom: '0.2rem' }}>Scenario seed</span>
                  <strong style={{ color: MARS_TEXT }}>{courseSession.scenarioSeed}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Critiche</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_DANGER }}>{severitySummary.critical}</strong>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Alte</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_DANGER }}>{severitySummary.high}</strong>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Medie</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_ACCENT }}>{severitySummary.medium}</strong>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Basse</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_PRIMARY }}>{severitySummary.low}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.75rem', padding: '1.25rem', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}`, borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 0.9rem 0', color: MARS_PRIMARY, fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700 }}>
                Audit per fase
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {auditRows.map((row) => (
                  <div key={row.phase} style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <strong style={{ color: MARS_TEXT }}>{row.title}</strong>
                      <span style={{ color: row.outcome.color, fontWeight: 700 }}>{row.outcome.label}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.86rem', color: MARS_MUTED }}>
                      <div>
                        <span style={{ display: 'block', marginBottom: '0.2rem' }}>Delta salute</span>
                        <strong style={{ color: row.healthDelta === null ? MARS_MUTED : row.healthDelta < 0 ? MARS_DANGER : MARS_SUCCESS }}>
                          {row.healthDelta === null ? 'n/d' : formatDelta(row.healthDelta, '%')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', marginBottom: '0.2rem' }}>Crediti fase</span>
                        <strong style={{ color: row.scoreDelta === null ? MARS_MUTED : MARS_PRIMARY }}>
                          {row.scoreDelta === null ? 'n/d' : formatDelta(row.scoreDelta)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', marginBottom: '0.2rem' }}>Rilievi principali</span>
                        <strong style={{ color: row.infractions.length > 0 ? MARS_DANGER : MARS_SUCCESS }}>
                          {row.infractions.length > 0 ? row.infractions.join(', ') : 'Nessuno'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.75rem', maxHeight: '220px', overflowY: 'auto', fontSize: '0.86rem', padding: '1.25rem', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}`, borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 0.9rem 0', color: MARS_PRIMARY, fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700 }}>
                Log degli errori
              </h4>
              {errors.length === 0 ? (
                <p style={{ margin: 0, color: MARS_SUCCESS, fontWeight: 700 }}>
                  ✓ Condotta esemplare. Nessuna infrazione ai protocolli.
                </p>
              ) : (
                errors.map((error, index) => (
                  <div key={`${error.code}-${error.timestamp}`} style={{ padding: '0.55rem 0', color: MARS_MUTED, borderTop: index === 0 ? 'none' : `1px solid ${MARS_BORDER}` }}>
                    [{error.severity.toUpperCase()}] {phaseContent[error.phase]?.title ?? error.phase} {'>'} {error.code}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={resetGame}
              style={{
                width: '100%',
                background: MARS_PRIMARY,
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Fine addestramento
            </button>
            <SessionReportActions />
          </div>
        </div>
      </Html>
    </group>
  );
}
