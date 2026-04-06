import { useState, useCallback, useEffect, useRef } from 'react';
import type { InspectionData } from '../components/game/ComponentInspection';
import { useGameStore } from './gameStore';

const COMPONENT_TYPES = [
  { type: 'basetta', name: 'Basetta Regolabile', count: 3 },
  { type: 'telaio', name: 'Telaio a Portale', count: 4 },
  { type: 'impalcato', name: 'Impalcato Metallico', count: 4 },
  { type: 'corrente', name: 'Corrente di Collegamento', count: 4 },
  { type: 'traverso', name: 'Traverso di Rinforzo', count: 2 },
  { type: 'diagonale', name: 'Diagonale di Facciata', count: 2 },
  { type: 'fermapiede', name: 'Tavola Fermapiede', count: 4 },
  { type: 'mantovana', name: 'Mantovana (Parasassi)', count: 2 },
  { type: 'impalcato_botola', name: 'Impalcato con Botola', count: 1 },
  { type: 'scaletta', name: 'Scaletta di Accesso', count: 1 },
  { type: 'parapetto', name: 'Parapetto Prefabbricato', count: 2 },
  { type: 'cancelletto', name: 'Cancelletto di Sicurezza', count: 1 },
  { type: 'messa_a_terra', name: 'Cavo Messa a Terra', count: 1 },
  { type: 'palina_terra', name: 'Palina di Terra', count: 1 },
  { type: 'tavola_appoggio', name: 'Tavola di Appoggio Legno', count: 3 }
];

const generateAllIds = () => {
  const ids: string[] = [];
  COMPONENT_TYPES.forEach(ct => {
    for (let i = 0; i < ct.count; i++) {
      ids.push(`${ct.type}-${i}`);
    }
  });
  return ids;
};

export const ALL_COMPONENT_IDS = generateAllIds();
export const TOTAL_COMPONENTS = ALL_COMPONENT_IDS.length;

const generateComponentData = (): Record<string, InspectionData> => {
  const components: Record<string, InspectionData> = {};
  
  ALL_COMPONENT_IDS.forEach(id => {
    const type = id.split('-')[0] as InspectionData['type'];
    const index = parseInt(id.split('-')[1]);
    const isDamaged = Math.random() < 0.35;
    const ctInfo = COMPONENT_TYPES.find(ct => ct.type === type);
    
    let damageType: InspectionData['damageType'];
    let damageDescription = "Componente in ottime condizioni, pronto per l'uso.";
    
    if (isDamaged) {
      // Logica danni specifici per tipo
      switch(type) {
        case 'basetta':
          damageType = Math.random() < 0.5 ? 'filettatura_spanata' : 'corrosione';
          damageDescription = damageType === 'filettatura_spanata' 
            ? "La filettatura è ostruita da cemento o deformata, la ghiera non scorre." 
            : "Corrosione profonda sul fusto che ne riduce la sezione resistente.";
          break;
        case 'telaio':
          damageType = Math.random() < 0.5 ? 'saldatura_crepata' : 'deformazione';
          damageDescription = damageType === 'saldatura_crepata'
            ? "Presenza di cricche visibili nella saldatura tra montante e traverso superiore."
            : "Il montante presenta una deviazione dalla verticalità superiore a 3mm.";
          break;
        case 'impalcato':
        case 'impalcato_botola':
          damageType = Math.random() < 0.5 ? 'deformazione' : 'usura';
          damageDescription = damageType === 'deformazione'
            ? "I ganci di attacco sono deformati e non garantiscono l'appoggio sicuro."
            : "La bugnatura antiscivolo è completamente consumata, rischio scivolamento.";
          break;
        case 'tavola_appoggio':
        case 'fermapiede':
          damageType = 'marcescenza';
          damageDescription = "Il legno presenta fessurazioni longitudinali passanti o segni di marciume.";
          break;
        case 'corrente':
        case 'traverso':
        case 'diagonale':
          damageType = 'schiacciamento';
          damageDescription = "Il tubo presenta uno schiacciamento evidente che ne compromette la stabilità.";
          break;
        case 'scaletta':
        case 'cancelletto':
          damageType = 'mancanza_sicura';
          damageDescription = "Il meccanismo di blocco o la molla di ritorno sono rotti o mancanti.";
          break;
        case 'messa_a_terra':
        case 'palina_terra':
          damageType = 'ossidazione_contatti';
          damageDescription = "I punti di contatto sono pesantemente ossidati, impedendo la conducibilità.";
          break;
        default:
          damageType = 'usura';
          damageDescription = "Il componente mostra segni di usura eccessiva incompatibili con la sicurezza.";
      }
    }

    components[id] = {
      id,
      type,
      name: `${ctInfo?.name || type} ${index + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType,
      damageDescription
    };
  });

  return components;
};

export function useInspectionStore() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspectedItems, setInspectedItems] = useState<Set<string>>(new Set());
  const [nearbyItem, setNearbyItem] = useState<string | null>(null);
  const [showInspection, setShowInspection] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<InspectionData | null>(null);
  const [componentData] = useState(() => generateComponentData());
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const [phaseComplete, setPhaseComplete] = useState(false);
  
  const { addScore, reduceHealth, addError, nextPhase, unlockPhase, setLoadedItems, loadedItems } = useGameStore();
  
  const inspectedItemsRef = useRef<Set<string>>(new Set());
  const phaseCompleteRef = useRef(false);
  const addScoreRef = useRef(addScore);
  const reduceHealthRef = useRef(reduceHealth);
  const addErrorRef = useRef(addError);
  const nextPhaseRef = useRef(nextPhase);
  const unlockPhaseRef = useRef(unlockPhase);
  const currentInspectionRef = useRef(currentInspection);
  const loadedItemsRef = useRef(loadedItems);
  
  useEffect(() => { inspectedItemsRef.current = inspectedItems; }, [inspectedItems]);
  useEffect(() => { phaseCompleteRef.current = phaseComplete; }, [phaseComplete]);
  useEffect(() => { addScoreRef.current = addScore; }, [addScore]);
  useEffect(() => { reduceHealthRef.current = reduceHealth; }, [reduceHealth]);
  useEffect(() => { addErrorRef.current = addError; }, [addError]);
  useEffect(() => { nextPhaseRef.current = nextPhase; }, [nextPhase]);
  useEffect(() => { unlockPhaseRef.current = unlockPhase; }, [unlockPhase]);
  useEffect(() => { currentInspectionRef.current = currentInspection; }, [currentInspection]);
  useEffect(() => { loadedItemsRef.current = loadedItems; }, [loadedItems]);

  const handleInspectionComplete = useCallback((decision: 'usable' | 'damaged', correct: boolean) => {
    setShowInspection(false);
    setCameraMode('follow');
    
    const inspection = currentInspectionRef.current;
    
    if (correct && inspection) {
      addScoreRef.current(50);
      
      const newInspectedItems = new Set(inspectedItemsRef.current);
      newInspectedItems.add(inspection.id);
      
      setInspectedItems(newInspectedItems);
      inspectedItemsRef.current = newInspectedItems;
      
      const allInspected = ALL_COMPONENT_IDS.every(id => newInspectedItems.has(id));
      
      if (allInspected && !phaseCompleteRef.current) {
        setPhaseComplete(true);
        phaseCompleteRef.current = true;
        
        setTimeout(() => {
          unlockPhaseRef.current('transport');
          nextPhaseRef.current();
        }, 2000);
      }
      
      if (decision === 'usable' && !inspection.isDamaged) {
        setLoadedItems([...loadedItemsRef.current, inspection.id]);
      }
    } else {
      reduceHealthRef.current(20);
      addErrorRef.current({
        code: 'WRONG_EVALUATION',
        severity: 'medium',
        messageKey: 'error.wrongEvaluation',
        phase: 'warehouse',
      });
    }
  }, []);

  return {
    selectedItem,
    setSelectedItem,
    inspectedItems,
    setInspectedItems,
    loadedItems,
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
    phaseComplete,
    setPhaseComplete,
  };
}
