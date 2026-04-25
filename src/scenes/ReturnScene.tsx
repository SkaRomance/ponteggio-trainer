import { useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore, type GamePhase } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';
import { phaseContent } from '../config/phaseContent';

const MARS_PRIMARY = '#1a472a';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';
const MARS_FONT = 'Inter';

const overlayShellStyle: CSSProperties = {
  width: 'min(720px, 92vw)',
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

export default function ReturnScene() {
  const { totalScore, errors, completedPhases, resetGame } = useGameStore();
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  const auditedPhases = (completedPhases.includes('return') ? completedPhases : [...completedPhases, 'return']) as GamePhase[];
  const severitySummary = {
    critical: errors.filter((error) => error.severity === 'critical').length,
    high: errors.filter((error) => error.severity === 'high').length,
    medium: errors.filter((error) => error.severity === 'medium').length,
    low: errors.filter((error) => error.severity === 'low').length,
  };

  return (
    <group>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Camion carico pronto */}
      <group position={[0, 0, -5]}>
        <Box args={[8, 1, 12]}>
          <meshStandardMaterial color="#111" metalness={0.8} />
        </Box>
        <Box args={[4.5, 4, 4]} position={[0, 2, -8]}>
          <meshStandardMaterial color="#111" metalness={0.9} />
        </Box>
        <Text position={[0, 6, -8]} fontSize={0.6} color={MARS_PRIMARY} font={MARS_FONT}>MEZZO DI RITORNO PRONTO</Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html center position={[0, 5, 0]}>
        <div style={overlayShellStyle}>
          <div style={overlayCardStyle}>
            <h1 style={{ margin: '0 0 1.5rem 0', fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.6rem, 6vw, 4rem)', fontWeight: 700, color: MARS_PRIMARY, lineHeight: 0.92 }}>
              Valutazione<br />finale
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '20px', padding: '1.5rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: MARS_MUTED, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Competenza acquisita
                </span>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, color: MARS_PRIMARY }}>{totalScore}</div>
              </div>
              <div style={{ border: `1px solid ${MARS_DANGER}`, borderRadius: '20px', padding: '1.5rem', background: 'rgba(220, 38, 38, 0.06)', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', color: MARS_DANGER, marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                  Infrazioni rilevate
                </span>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, color: MARS_DANGER }}>{errors.length}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Fasi chiuse</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_PRIMARY }}>{auditedPhases.length} / 7</strong>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Critiche</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_DANGER }}>{severitySummary.critical}</strong>
              </div>
              <div style={{ border: `1px solid ${MARS_BORDER}`, borderRadius: '18px', padding: '1rem', background: '#f9f7f4', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', color: MARS_MUTED, marginBottom: '0.35rem' }}>Alte</span>
                <strong style={{ fontSize: '1.2rem', color: MARS_DANGER }}>{severitySummary.high}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.75rem', padding: '1.25rem', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}`, borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 0.9rem 0', color: MARS_PRIMARY, fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700 }}>
                Copertura fasi
              </h4>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {auditedPhases.map((phase) => (
                  <div key={phase} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: MARS_MUTED }}>
                    <span>{phaseContent[phase]?.title ?? phase}</span>
                    <strong style={{ color: MARS_SUCCESS }}>Completata</strong>
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
                errors.map((e, i) => (
                  <div key={i} style={{ padding: '0.55rem 0', color: MARS_MUTED, borderTop: i === 0 ? 'none' : `1px solid ${MARS_BORDER}` }}>
                    [{e.severity.toUpperCase()}] {phaseContent[e.phase]?.title ?? e.phase} {'>'} {e.code}
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
          </div>
        </div>
      </Html>
    </group>
  );
}
