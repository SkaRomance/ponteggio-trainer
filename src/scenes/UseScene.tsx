import { useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const ANOMALIES = [
  { id: 'missing_toe_board', label: 'TAVOLA FERMAPIEDE MANCANTE', pos: [-4.5, 2.5, -2] },
  { id: 'loose_clamp', label: 'MORSETTO STRUTTURALE ALLENTATO', pos: [4.5, 4.5, -2] },
  { id: 'overload', label: 'SOVRACCARICO OLTRE 300KG/M2', pos: [0, 4.5, -2] },
  { id: 'missing_rail', label: 'PARAPETTO INTERMEDIO MANCANTE', pos: [1.5, 6.5, -2] },
];

const MARS_PRIMARY = '#1a472a';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';

const panelShellStyle: CSSProperties = {
  width: 'min(420px, 90vw)',
  padding: '0.75rem',
  background: 'rgba(10,10,10,0.18)',
  borderRadius: '28px',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 20px 60px rgba(10,10,10,0.18)',
};

const panelCardStyle: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${MARS_BORDER}`,
  borderRadius: '22px',
  padding: '1.5rem',
  color: MARS_TEXT,
  fontFamily: 'Inter, sans-serif',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

const getToggleButtonStyle = (active: boolean, disabled = false): CSSProperties => ({
  width: '100%',
  padding: '0.95rem 1rem',
  borderRadius: '999px',
  border: `1px solid ${active ? MARS_PRIMARY : MARS_BORDER}`,
  background: active ? MARS_PRIMARY : '#f9f7f4',
  color: active ? '#ffffff' : MARS_PRIMARY,
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
});

export default function UseScene() {
  const {
    addScore,
    addError,
    nextPhase,
    unlockPhase,
    isHarnessed,
    setHarnessed,
    isHooked,
    setHooked,
    pushNotice,
  } = useGameStore();
  const [identified, setIdentified] = useState<string[]>([]);
  const [cartelloPosto, setCartelloPosto] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));

  const handleIdentify = (id: string) => {
    if (identified.includes(id)) return;
    
    if (avatarPosition.y > 1.8 && !isHooked) {
      addError({
        code: 'INSPECTION_UNSAFE',
        severity: 'high',
        messageKey: 'error.unsafeInspection',
        phase: 'use'
      });
      pushNotice({
        severity: 'warning',
        title: 'Ancoraggio richiesto',
        message: 'In quota devi agganciarti prima di confermare l’anomalia rilevata.',
        phase: 'use',
      });
      return;
    }

    setIdentified([...identified, id]);
    addScore(150);
  };

  const handleFinish = () => {
    if (!cartelloPosto) {
      addError({
        code: 'MISSING_SIGNAGE',
        severity: 'medium',
        messageKey: 'error.missingSignage',
        phase: 'use'
      });
      pushNotice({
        severity: 'warning',
        title: 'Segnaletica mancante',
        message: 'Prima della chiusura fase devi affiggere il cartello di agibilita del ponteggio.',
        phase: 'use',
      });
      return;
    }

    if (identified.length < ANOMALIES.length) {
      pushNotice({
        severity: 'info',
        title: 'Verifica incompleta',
        message: `Ci sono ancora ${ANOMALIES.length - identified.length} criticita da individuare prima della validazione finale.`,
        phase: 'use',
      });
      return;
    }

    pushNotice({
      severity: 'success',
      title: 'Verifica completata',
      message: 'Struttura convalidata. Passaggio allo smontaggio in sicurezza.',
      phase: 'use',
    });
    unlockPhase('disassembly');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Struttura Ponteggio Finita */}
      <Box args={[12, 10, 2]} position={[0, 5, -2]}>
        <meshStandardMaterial color="#111" wireframe />
      </Box>

      {/* Anomalie */}
      {ANOMALIES.map((anomaly) => (
        <group key={anomaly.id} position={anomaly.pos as [number, number, number]} onClick={() => handleIdentify(anomaly.id)}>
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial 
              color={identified.includes(anomaly.id) ? "#00ff00" : "#ff0000"} 
              emissive={identified.includes(anomaly.id) ? "#00ff00" : "#ff0000"}
              emissiveIntensity={0.8}
          />
        </mesh>
        {!identified.includes(anomaly.id) && (
          <Text position={[0, 0.8, 0]} fontSize={0.2} color={MARS_DANGER}>ANOMALIA</Text>
        )}
      </group>
      ))}

      {/* Cartello Agibilità */}
      <group position={[-6, 1.5, -1]} onClick={() => setCartelloPosto(true)}>
        <Box args={[0.8, 1, 0.1]}>
          <meshStandardMaterial color={cartelloPosto ? "white" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.11]} fontSize={0.12} color={cartelloPosto ? "black" : "white"} fontWeight={900} textAlign="center">
          {cartelloPosto ? "PONTEGGIO\nAGIBILE" : "AFFIGGI\nCARTELLO"}
        </Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html position={[-12, 10, 0]}>
        <div style={panelShellStyle}>
          <div style={panelCardStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                CONTROLLO FINALE
              </span>
              <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.7rem', fontWeight: 700, color: MARS_PRIMARY }}>
                Verifica d&apos;uso
              </h2>
            </div>
            <p style={{ fontSize: '0.95rem', color: MARS_MUTED, margin: '0 0 1.25rem 0', lineHeight: 1.55 }}>
              Ispeziona la struttura finita, registra le non conformita&apos; e conferma la segnaletica di agibilita&apos;.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
              <button onClick={() => setHarnessed(!isHarnessed)} style={getToggleButtonStyle(isHarnessed)}>
                {isHarnessed ? 'IMBRACATURA ATTIVA' : 'INDOSSA IMBRACATURA'}
              </button>
              <button onClick={() => setHooked(!isHooked)} disabled={!isHarnessed} style={getToggleButtonStyle(isHooked, !isHarnessed)}>
                {isHooked ? 'CORDINO ANCORATO' : 'ANCORA CORDINO'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '18px', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.74rem', marginBottom: '0.3rem' }}>Imbracatura</span>
                <strong style={{ color: isHarnessed ? MARS_SUCCESS : MARS_MUTED }}>{isHarnessed ? 'Attiva' : 'Assente'}</strong>
              </div>
              <div style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '18px', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.74rem', marginBottom: '0.3rem' }}>Ancoraggio</span>
                <strong style={{ color: isHooked ? MARS_SUCCESS : MARS_DANGER }}>{isHooked ? 'Confermato' : 'Mancante'}</strong>
              </div>
            </div>
            <div style={{ padding: '1rem 1.1rem', borderRadius: '18px', background: '#f5f2ed', border: `1px solid ${MARS_BORDER}` }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                Anomalie rilevate
              </span>
              <strong style={{ fontSize: '1.45rem', color: MARS_PRIMARY }}>
                {identified.length} / {ANOMALIES.length}
              </strong>
            </div>
            {avatarPosition.y > 1.8 && !isHooked && (
              <div style={{ marginTop: '1rem', padding: '0.95rem 1rem', borderRadius: '18px', border: `1px solid ${MARS_DANGER}`, background: 'rgba(220, 38, 38, 0.08)', color: MARS_DANGER, fontWeight: 700, textAlign: 'center' }}>
                Pericolo caduta: ispezione in quota senza ancoraggio
              </div>
            )}
            <button
              onClick={handleFinish}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                background: MARS_PRIMARY,
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '0.95rem 1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.98rem',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              Valida struttura
            </button>
          </div>
        </div>
      </Html>
    </group>
  );
}
