import { useState, useEffect, useRef } from 'react';
import type { InspectionData } from '../components/game/ComponentInspection';
import { useGameStore } from './gameStore';

const COMPONENT_TYPES = [
  { type: 'basetta', name: 'Basetta Regolabile', count: 6 },
  { type: 'telaio', name: 'Telaio a Portale', count: 6 },
  { type: 'impalcato', name: 'Impalcato Metallico', count: 6 },
  { type: 'corrente', name: 'Corrente di Collegamento', count: 10 },
  { type: 'traverso', name: 'Traverso di Rinforzo', count: 2 },
  { type: 'diagonale', name: 'Diagonale di Facciata', count: 6 },
  { type: 'fermapiede', name: 'Tavola Fermapiede', count: 6 },
  { type: 'mantovana', name: 'Mantovana (Parasassi)', count: 2 },
  { type: 'impalcato_botola', name: 'Impalcato con Botola', count: 1 },
  { type: 'scaletta', name: 'Scaletta di Accesso', count: 1 },
  { type: 'parapetto', name: 'Parapetto Prefabbricato', count: 6 },
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

const MIN_USABLE_FOR_ASSEMBLY: Partial<Record<InspectionData['type'], number>> = {
  basetta: 4,
  telaio: 4,
  impalcato: 4,
  corrente: 8,
  diagonale: 4,
  fermapiede: 4,
  parapetto: 4,
};

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: string) => {
  let value = hashSeed(seed);
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const getComponentTypeFromId = (id: string) => id.split('-')[0] as InspectionData['type'];
const getComponentIndexFromId = (id: string) => Number(id.split('-')[1] ?? 0);

const createProtectedAssemblyStock = (seed: string) => {
  const random = createSeededRandom(`${seed}:assembly-stock`);
  const protectedIds = new Set<string>();

  Object.entries(MIN_USABLE_FOR_ASSEMBLY).forEach(([type, requiredCount]) => {
    const candidates = ALL_COMPONENT_IDS.filter((id) => getComponentTypeFromId(id) === type);
    const shuffled = [...candidates];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
    }

    shuffled.slice(0, Math.min(requiredCount ?? 0, shuffled.length)).forEach((id) => {
      protectedIds.add(id);
    });
  });

  return protectedIds;
};

const generateComponentData = (seed: string): Record<string, InspectionData> => {
  const random = createSeededRandom(seed);
  const protectedAssemblyStock = createProtectedAssemblyStock(seed);
  const components: Record<string, InspectionData> = {};
  
  ALL_COMPONENT_IDS.forEach(id => {
    const type = getComponentTypeFromId(id);
    const index = getComponentIndexFromId(id);
    const isProtectedAssemblyStock = protectedAssemblyStock.has(id);
    const isDamaged = !isProtectedAssemblyStock && random() < 0.65;
    const ctInfo = COMPONENT_TYPES.find(ct => ct.type === type);
    
    let damageType: InspectionData['damageType'];
    let damageDescription = "Componente in ottime condizioni, pronto per l'uso.";
    
    if (isDamaged) {
      // Logica danni specifici per tipo
      switch(type) {
        case 'basetta':
          damageType = random() < 0.5 ? 'filettatura_spanata' : 'corrosione';
          damageDescription = damageType === 'filettatura_spanata' 
            ? "La filettatura è ostruita da cemento o deformata, la ghiera non scorre." 
            : "Corrosione profonda sul fusto che ne riduce la sezione resistente.";
          break;
        case 'telaio':
          damageType = random() < 0.5 ? 'saldatura_crepata' : 'deformazione';
          damageDescription = damageType === 'saldatura_crepata'
            ? "Presenza di cricche visibili nella saldatura tra montante e traverso superiore."
            : "Il montante presenta una deviazione dalla verticalità superiore a 3mm.";
          break;
        case 'impalcato':
        case 'impalcato_botola':
          damageType = random() < 0.5 ? 'deformazione' : 'usura';
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
      integrity: isDamaged ? Math.floor(random() * 40) + 20 : 100,
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
  const [componentData, setComponentData] = useState(() =>
    generateComponentData(useGameStore.getState().courseSession.scenarioSeed),
  );
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const [phaseComplete, setPhaseComplete] = useState(false);
  
  const {
    addScore,
    addError,
    nextPhase,
    unlockPhase,
    setLoadedItems,
    loadedItems,
    pushNotice,
    logEvent,
    courseSession,
    sessionRunId,
  } = useGameStore();
  
  const inspectedItemsRef = useRef<Set<string>>(new Set());
  const phaseCompleteRef = useRef(false);
  const addScoreRef = useRef(addScore);
  const addErrorRef = useRef(addError);
  const nextPhaseRef = useRef(nextPhase);
  const unlockPhaseRef = useRef(unlockPhase);
  const pushNoticeRef = useRef(pushNotice);
  const logEventRef = useRef(logEvent);
  const currentInspectionRef = useRef(currentInspection);
  const loadedItemsRef = useRef(loadedItems);
  
  useEffect(() => { inspectedItemsRef.current = inspectedItems; }, [inspectedItems]);
  useEffect(() => { phaseCompleteRef.current = phaseComplete; }, [phaseComplete]);
  useEffect(() => { addScoreRef.current = addScore; }, [addScore]);
  useEffect(() => { addErrorRef.current = addError; }, [addError]);
  useEffect(() => { nextPhaseRef.current = nextPhase; }, [nextPhase]);
  useEffect(() => { unlockPhaseRef.current = unlockPhase; }, [unlockPhase]);
  useEffect(() => { pushNoticeRef.current = pushNotice; }, [pushNotice]);
  useEffect(() => { logEventRef.current = logEvent; }, [logEvent]);
  useEffect(() => { currentInspectionRef.current = currentInspection; }, [currentInspection]);
  useEffect(() => { loadedItemsRef.current = loadedItems; }, [loadedItems]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedItem(null);
      setNearbyItem(null);
      setShowInspection(false);
      setCurrentInspection(null);
      setInspectedItems(new Set());
      setCameraMode('follow');
      setPhaseComplete(false);
      inspectedItemsRef.current = new Set();
      phaseCompleteRef.current = false;
      currentInspectionRef.current = null;
      setComponentData(generateComponentData(courseSession.scenarioSeed));
    });

    return () => {
      cancelled = true;
    };
  }, [courseSession.scenarioSeed, sessionRunId]);

  const handleInspectionComplete = (decision: 'usable' | 'damaged', correct: boolean) => {
    setShowInspection(false);
    setCameraMode('follow');
    
    const inspection = currentInspectionRef.current;

    if (!inspection || inspectedItemsRef.current.has(inspection.id)) return;

    logEventRef.current({
      type: 'component_decision',
      phase: 'warehouse',
      payload: {
        componentId: inspection.id,
        componentType: inspection.type,
        decision,
        correct,
        wasDamaged: inspection.isDamaged,
        damageType: inspection.damageType ?? null,
        scenarioSeed: courseSession.scenarioSeed,
      },
    });

    const newInspectedItems = new Set(inspectedItemsRef.current);
    newInspectedItems.add(inspection.id);
    setInspectedItems(newInspectedItems);
    inspectedItemsRef.current = newInspectedItems;
    
    if (correct) {
      addScoreRef.current(50);
      
      if (decision === 'usable' && !inspection.isDamaged) {
        const nextLoadedItems = Array.from(new Set([...loadedItemsRef.current, inspection.id]));
        setLoadedItems(nextLoadedItems);
        loadedItemsRef.current = nextLoadedItems;
      }
    } else {
      addErrorRef.current({
        code: 'WRONG_EVALUATION',
        severity: 'medium',
        messageKey: 'error.wrongEvaluation',
        phase: 'warehouse',
      });
      pushNoticeRef.current({
        severity: 'error',
        title: 'Valutazione errata',
        message: 'La valutazione e stata registrata. Il componente resta chiuso: non puoi correggere dopo il feedback.',
        phase: 'warehouse',
      });
    }

    const allInspected = ALL_COMPONENT_IDS.every(id => newInspectedItems.has(id));

    if (allInspected && !phaseCompleteRef.current) {
      setPhaseComplete(true);
      phaseCompleteRef.current = true;
      pushNoticeRef.current({
        severity: 'success',
        title: 'Fase completata',
        message: 'Tutti i componenti sono stati ispezionati. Passaggio al trasporto in corso.',
        phase: 'warehouse',
      });

      setTimeout(() => {
        unlockPhaseRef.current('transport');
        nextPhaseRef.current();
      }, 2000);
    }
  };

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
