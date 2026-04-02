import { useState, useCallback } from 'react';
import type { InspectionData } from '../components/game/ComponentInspection';
import { useGameStore } from './gameStore';

// Dati componenti con stati di danno
const generateComponentData = (): Record<string, InspectionData> => {
  const components: Record<string, InspectionData> = {};
  
  // Basette
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`basetta-${i}`] = {
      id: `basetta-${i}`,
      type: 'basetta',
      name: `Basetta ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'corrosione' : undefined,
      damageDescription: isDamaged 
        ? "Presenta segni di ruggine visibili sulla superficie metallica. La vite di regolazione è corrosta."
        : "Superficie metallica intatta, vite di regolazione funzionante."
    };
  });
  
  // Telai
  [0, 1].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`telaio-${i}`] = {
      id: `telaio-${i}`,
      type: 'telaio',
      name: `Telaio ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'deformazione' : undefined,
      damageDescription: isDamaged
        ? "Il montante sinistro presenta una leggera curvatura. Potrebbe compromettere la stabilità."
        : "Montanti perfettamente allineati, saldature intatte."
    };
  });
  
  // Impalcato
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`impalcato-${i}`] = {
      id: `impalcato-${i}`,
      type: 'impalcato',
      name: `Impalcato ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'usura' : undefined,
      damageDescription: isDamaged
        ? "La superficie di calpestio mostra segni di usura eccessiva e assottigliamento in alcuni punti."
        : "Superficie di calpestio in buone condizioni, spessore regolare."
    };
  });
  
  return components;
};

export function useInspectionStore() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspectedItems, setInspectedItems] = useState<Set<string>>(new Set());
  const [loadedItems, setLoadedItems] = useState<string[]>([]);
  const [nearbyItem, setNearbyItem] = useState<string | null>(null);
  const [showInspection, setShowInspection] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<InspectionData | null>(null);
  const [componentData] = useState(() => generateComponentData());
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  
  const { addScore, reduceHealth, addError } = useGameStore();
  
  const handleInspectionComplete = useCallback((decision: 'usable' | 'damaged', correct: boolean) => {
    setShowInspection(false);
    setCameraMode('follow');
    
    if (correct && currentInspection) {
      addScore(50);
      setInspectedItems(prev => new Set(prev).add(currentInspection.id));
      // Se il giocatore ha correttamente identificato come utilizzabile, aggiungi al carico
      if (decision === 'usable' && !currentInspection.isDamaged) {
        setLoadedItems(prev => [...prev, currentInspection.id]);
      }
    } else {
      reduceHealth(20);
      addError({
        code: 'WRONG_EVALUATION',
        severity: 'medium',
        messageKey: 'error.wrongEvaluation',
        phase: 'warehouse',
      });
    }
  }, [currentInspection, addScore, reduceHealth, addError]);

  return {
    selectedItem,
    setSelectedItem,
    inspectedItems,
    setInspectedItems,
    loadedItems,
    setLoadedItems,
    nearbyItem,
    setNearbyItem,
    showInspection,
    setShowInspection,
    currentInspection,
    setCurrentInspection,
    componentData,
    cameraMode,
    setCameraMode,
    handleInspectionComplete,
  };
}
