import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { useState } from 'react';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { useGameStore } from './stores/gameStore';
import { useInspectionStore } from './stores/inspectionStore';
import { messages, getDirection, getFontFamily } from './i18n';

// UI Components
import HealthBar from './components/ui/HealthBar';
import ScoreDisplay from './components/ui/ScoreDisplay';
import PhaseSelector from './components/ui/PhaseSelector';
import LanguageSelector from './components/ui/LanguageSelector';
import ControlsHelp from './components/game/ControlsHelp';
import VideoTutorial, { TutorialMenu } from './components/game/VideoTutorial';
import ComponentInspection from './components/game/ComponentInspection';

// Scenes
import WarehouseScene from './scenes/WarehouseScene';

function App() {
  const { locale, currentHealth, isPlaying, resetGame } = useGameStore();
  const isGameOver = !isPlaying && currentHealth <= 0;
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  
  // Store per ispezione componenti
  const inspection = useInspectionStore();

  // Apply RTL direction and font for Arabic
  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.body.style.fontFamily = getFontFamily(locale);
  }, [locale]);

  if (isGameOver) {
    return (
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
          <FormattedMessage id="game.restart" defaultMessage="Riprova" />
        </button>
      </div>
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
            <Environment preset="warehouse" />
            
            <Suspense fallback={null}>
              <WarehouseScene inspection={inspection} />
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

        {/* Component Inspection Overlay - FUORI dalla Canvas! */}
        {inspection.showInspection && inspection.currentInspection && (
          <ComponentInspection
            component={inspection.currentInspection}
            onDecision={(_, correct) => inspection.handleInspectionComplete(correct)}
          />
        )}
      </div>
    </IntlProvider>
  );
}

export default App;
