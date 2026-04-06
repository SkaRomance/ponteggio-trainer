import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { useState } from 'react';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { useGameStore } from './stores/gameStore';
import { useInspectionStore } from './stores/inspectionStore';
import { messages, getDirection, getFontFamily } from './i18n';

// UI Components
import StartMenu from './components/ui/StartMenu';
import HealthBar from './components/ui/HealthBar';
import ScoreDisplay from './components/ui/ScoreDisplay';
import PhaseSelector from './components/ui/PhaseSelector';
import LanguageSelector from './components/ui/LanguageSelector';
import ControlsHelp from './components/game/ControlsHelp';
import VideoTutorial, { TutorialMenu } from './components/game/VideoTutorial';
import ComponentInspection from './components/game/ComponentInspection';
import DemoEndOverlay from './components/ui/DemoEndOverlay';

// Scenes
import WarehouseScene from './scenes/WarehouseScene';
import TransportScene from './scenes/TransportScene';
import StorageScene from './scenes/StorageScene';
import AssemblyScene from './scenes/AssemblyScene';
import UseScene from './scenes/UseScene';
import DisassemblyScene from './scenes/DisassemblyScene';
import ReturnScene from './scenes/ReturnScene';
import PlaceholderScene from './scenes/PlaceholderScene';

const phaseConfig: Record<string, { name: string; icon: string }> = {
  transport: { name: 'Trasporto', icon: '🚛' },
  storage: { name: 'Stoccaggio', icon: '🏗️' },
  assembly: { name: 'Montaggio', icon: '🔧' },
  use: { name: 'Uso', icon: '👷' },
  disassembly: { name: 'Smontaggio', icon: '🔨' },
  return: { name: 'Ritorno', icon: '🏭' },
};

function App() {
  const { locale, currentHealth, isPlaying, resetGame, currentPhase } = useGameStore();
  const isGameOver = isPlaying === false && currentHealth <= 0;
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const inspection = useInspectionStore();
  const prevPhaseRef = useRef(currentPhase);

  // Reset inspection state when phase changes
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      inspection.setPhaseComplete(false);
      prevPhaseRef.current = currentPhase;
    }
  }, [currentPhase]);

  // Apply RTL direction and font for Arabic
  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.body.style.fontFamily = getFontFamily(locale);
  }, [locale]);

  // Menu phase
  if (currentPhase === 'menu') {
    return (
      <IntlProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
        <StartMenu />
      </IntlProvider>
    );
  }

  // Game over
  if (isGameOver) {
    return (
      <IntlProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
        <div className="game-over-screen">
          <h1>
            <FormattedMessage id="game.over.title" defaultMessage="Game Over" />
          </h1>
          <p>
            <FormattedMessage 
              id="game.over.message" 
              defaultMessage="Hai commesso errori critici nella sicurezza." 
            />
          </p>
          <button onClick={resetGame} className="restart-btn">
            <FormattedMessage id="game.restart" defaultMessage="Ricomincia" />
          </button>
        </div>
      </IntlProvider>
    );
  }

  // Completed
  if (currentPhase === 'completed') {
    return (
      <IntlProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
        <div className="game-over-screen">
          <h1 style={{ color: '#00C851' }}>
            <FormattedMessage id="game.completed.title" defaultMessage="Corso Completato!" />
          </h1>
          <p>
            <FormattedMessage 
              id="game.completed.message" 
              defaultMessage="Hai completato tutte le fasi del corso di sicurezza." 
            />
          </p>
          <button onClick={resetGame} className="restart-btn">
            <FormattedMessage id="game.restart" defaultMessage="Ricomincia" />
          </button>
        </div>
        <DemoEndOverlay />
      </IntlProvider>
    );
  }

  return (
    <IntlProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
      <div className="game-container" style={{ direction: getDirection(locale) }}>
        {/* Header UI */}
        <header className="game-header">
          <div className="header-left">
            <h1 className="game-title">
              <FormattedMessage id="app.title" defaultMessage="MARS-Safe Ponteggio Trainer" />
            </h1>
            <LanguageSelector />
          </div>
          <div className="header-right">
            <ScoreDisplay />
            <HealthBar health={currentHealth} />
          </div>
        </header>

        {/* Phase Navigation */}
        <nav className="phase-nav">
          <PhaseSelector />
          <button 
            className="tutorial-btn"
            onClick={() => setShowTutorialMenu(true)}
          >
            <FormattedMessage id="tutorial.button" defaultMessage="📹 Tutorial" />
          </button>
        </nav>

        {/* Progresso ispezione magazzino */}
        {currentPhase === 'warehouse' && (
          <div className="warehouse-progress">
            <div className="progress-info">
              <span>Componenti ispezionati: {inspection.inspectedItems.size} / 8</span>
              {inspection.phaseComplete && (
                <span className="phase-complete-msg">✓ Fase completata! Passando a Trasporto...</span>
              )}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(inspection.inspectedItems.size / 8) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 3D Scene */}
        <div className="scene-container">
          <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} />
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              minDistance={3}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2 - 0.1}
            />
            <ambientLight intensity={0.5} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={1} 
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <Environment preset="city" />
            
            <Suspense fallback={null}>
              {currentPhase === 'warehouse' && <WarehouseScene inspection={inspection} />}
              {currentPhase === 'transport' && <TransportScene />}
              {currentPhase === 'storage' && <StorageScene />}
              {currentPhase === 'assembly' && <AssemblyScene />}
              {currentPhase === 'use' && <UseScene />}
              {currentPhase === 'disassembly' && <DisassemblyScene />}
              {currentPhase === 'return' && <ReturnScene />}
              {currentPhase !== 'warehouse' && currentPhase !== 'transport' && currentPhase !== 'storage' && currentPhase !== 'assembly' && currentPhase !== 'use' && currentPhase !== 'disassembly' && currentPhase !== 'return' && phaseConfig[currentPhase] && (
                <PlaceholderScene 
                  phaseName={phaseConfig[currentPhase].name} 
                  phaseIcon={phaseConfig[currentPhase].icon} 
                />
              )}
            </Suspense>
          </Canvas>
        </div>

        {/* Instructions Panel */}
        <div className="instructions-panel">
          <ControlsHelp />
        </div>

        {/* Tutorial Menu */}
        {showTutorialMenu && (
          <TutorialMenu 
            onSelect={(id) => {
              setCurrentTutorial(id);
              setShowTutorialMenu(false);
            }}
            onClose={() => setShowTutorialMenu(false)}
          />
        )}

        {/* Video Tutorial Player */}
        {currentTutorial && (
          <VideoTutorial
            videoId={currentTutorial}
            title="Tutorial"
            onClose={() => setCurrentTutorial(null)}
            onComplete={() => console.log('Tutorial completato!')}
          />
        )}

        {/* Component Inspection Overlay */}
        {inspection.showInspection && inspection.currentInspection && (
          <ComponentInspection
            component={inspection.currentInspection}
            onDecision={(decision, correct) => inspection.handleInspectionComplete(decision, correct)}
          />
        )}
      </div>
    </IntlProvider>
  );
}

export default App;
