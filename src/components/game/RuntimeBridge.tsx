import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms?: number) => number;
  }
}

export default function RuntimeBridge() {
  useEffect(() => {
    window.render_game_to_text = () => {
      const state = useGameStore.getState();
      return JSON.stringify({
        coordinateSystem: 'three.js world coordinates, Y up, player-facing camera controlled by OrbitControls',
        phase: state.currentPhase,
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        session: {
          id: state.courseSession.sessionId,
          mode: state.courseSession.mode,
          startedAt: state.courseSession.startedAt,
          scenarioSeed: state.courseSession.scenarioSeed,
          evidenceReady: state.isCourseSessionReady(),
        },
        score: state.totalScore,
        safety: {
          currentHealth: state.currentHealth,
          maxHealth: state.maxHealth,
          errors: state.errors.length,
        },
        progress: {
          completedPhases: state.completedPhases,
          unlockedPhases: state.unlockedPhases,
          phaseScores: state.phaseScores.map((phaseScore) => ({
            phase: phaseScore.phase,
            completed: phaseScore.completed,
            errors: phaseScore.errors.length,
            scoreDelta: phaseScore.endScore - phaseScore.startScore,
            healthDelta: phaseScore.endHealth - phaseScore.startHealth,
          })),
          eventLogEntries: state.eventLog.length,
        },
        logistics: {
          loadedItems: state.loadedItems.length,
          transportGroundItems: state.transportGroundItems.length,
          transportTruckItems: state.transportTruckItems.length,
          isStrapped: state.isStrapped,
          weightBalance: state.weightBalance,
        },
      });
    };

    window.advanceTime = (ms = 16) => {
      window.dispatchEvent(new CustomEvent('mars:advance-time', { detail: { ms } }));
      return ms;
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, []);

  return null;
}
