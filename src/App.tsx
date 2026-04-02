import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { useGameStore } from './stores/gameStore';
import { messages, getDirection, getFontFamily } from './i18n';

// UI Components
import HealthBar from './components/ui/HealthBar';
import ScoreDisplay from './components/ui/ScoreDisplay';
import PhaseSelector from './components/ui/PhaseSelector';
import LanguageSelector from './components/ui/LanguageSelector';
import ControlsHelp from './components/game/ControlsHelp';

// Scenes
import WarehouseScene from './scenes/WarehouseScene';

function App() {
  const { locale, currentHealth, isPlaying, resetGame } = useGameStore();
  const isGameOver = !isPlaying && currentHealth <= 0;

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
              <WarehouseScene />
            </Suspense>
          </Canvas>
        </div>

        {/* Instructions Panel */}
        <div className="instructions-panel">
          <ControlsHelp />
        </div>
      </div>
    </IntlProvider>
  );
}

export default App;
