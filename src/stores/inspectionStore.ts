import { useState, useCallback, useEffect, useRef } from 'react';
import type { InspectionData } from '../components/game/ComponentInspection';
import { useGameStore } from './gameStore';

const ALL_COMPONENT_IDS = [
  'basetta-0', 'basetta-1', 'basetta-2',
  'telaio-0', 'telaio-1',
  'impalcato-0', 'impalcato-1', 'impalcato-2',
  'mantovana-0', 'fermapiede-0', 'corrente-0', 'traverso-0',
  'andatoia-0', 'impalcato_botola-0', 'scaletta-0', 'messa_a_terra-0', 'tavola_appoggio-0'
];

const TOTAL_COMPONENTS = ALL_COMPONENT_IDS.length;

const generateComponentData = (): Record<string, InspectionData> => {
  const components: Record<string, InspectionData> = {};
  
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`basetta-${i}`] = {
      id: `basetta-${i}`,
      type: 'basetta',
      name: `Basetta ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? (Math.random() < 0.5 ? 'corrosione' : 'filettatura_spanata') : undefined,
      damageDescription: isDamaged 
        ? (Math.random() < 0.5 ? "Presenta segni di ruggine visibili sulla superficie metallica." : "La vite di regolazione è spanata o sporca e non scorre.")
        : "Superficie metallica intatta, vite di regolazione funzionante."
    };
  });
  
  [0, 1].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`telaio-${i}`] = {
      id: `telaio-${i}`,
      type: 'telaio',
      name: `Telaio ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? (Math.random() < 0.5 ? 'deformazione' : 'saldatura_crepata') : undefined,
      damageDescription: isDamaged
        ? (Math.random() < 0.5 ? "Il montante presenta una leggera curvatura. Potrebbe compromettere la stabilità." : "Cricche visibili nelle saldature tra montanti e traversi.")
        : "Montanti perfettamente allineati, saldature intatte."
    };
  });
  
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`impalcato-${i}`] = {
      id: `impalcato-${i}`,
      type: 'impalcato',
      name: `Impalcato ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? (Math.random() < 0.5 ? 'usura' : 'deformazione') : undefined,
      damageDescription: isDamaged
        ? (Math.random() < 0.5 ? "La superficie di calpestio mostra segni di usura eccessiva (bugnatura consumata)." : "Il piano risulta imbarcato per un precedente sovraccarico.")
        : "Superficie di calpestio in buone condizioni, spessore regolare."
    };
  });

  const addSingle = (id: string, type: InspectionData['type'], name: string, dmgType: InspectionData['damageType'], descDamaged: string, descIntact: string) => {
    const isDamaged = Math.random() < 0.4;
    components[id] = {
      id, type, name, isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? dmgType : undefined,
      damageDescription: isDamaged ? descDamaged : descIntact
    };
  };

  addSingle('mantovana-0', 'mantovana', 'Mantovana 1', 'deformazione', 'Il telaio di supporto è inclinato in modo errato o la lamiera è sfondata.', 'Struttura integra, angolazione corretta per trattenere i materiali.');
  addSingle('fermapiede-0', 'fermapiede', 'Tavola Fermapiede 1', 'mancanza_fermi', 'Mancano i ganci di fissaggio o la tavola è pesantemente scheggiata.', 'Legno intatto, ganci di bloccaggio presenti e funzionanti.');
  addSingle('corrente-0', 'corrente', 'Corrente 1', 'schiacciamento', 'L\'estremità di aggancio è schiacciata o l\'asta è piegata.', 'Elemento rettilineo, spine di sicurezza integre.');
  addSingle('traverso-0', 'traverso', 'Traverso 1', 'corrosione', 'Corrosione severa sui punti di appoggio o torsione visibile.', 'Struttura lineare, punti di attacco sani.');
  addSingle('andatoia-0', 'andatoia', 'Andatoia 1', 'deformazione', 'Parapetto integrato piegato o ganci di fissaggio deformati.', 'Piano di calpestio integro, parapetto solido.');
  addSingle('impalcato_botola-0', 'impalcato_botola', 'Impalcato con Botola 1', 'cerniere_rotte', 'Le cerniere dello sportello sono bloccate o il meccanismo non chiude in sicurezza.', 'Sportello funzionante e a filo con il piano, cerniere lubrificate.');
  addSingle('scaletta-0', 'scaletta', 'Scaletta 1', 'saldatura_crepata', 'Saldature dei gradini saltate o ganci di attacco superiori deformati.', 'Gradini saldi, ganci di posizionamento perfettamente sagomati.');
  addSingle('messa_a_terra-0', 'messa_a_terra', 'Messa a Terra 1', 'corrosione', 'Il cavo è tranciato o il morsetto di collegamento è gravemente ossidato.', 'Continuità elettrica garantita, morsetto integro e cavo protetto.');
  addSingle('tavola_appoggio-0', 'tavola_appoggio', 'Tavola di Appoggio 1', 'marcescenza', 'Il tavolone in legno presenta fessurazioni longitudinali o marcescenza.', 'Legno compatto, spessore adeguato (>4cm) e senza crepe.');

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
  const [phaseComplete, setPhaseComplete] = useState(false);
  
  const { addScore, reduceHealth, addError, nextPhase, unlockPhase } = useGameStore();
  
  const inspectedItemsRef = useRef<Set<string>>(new Set());
  const phaseCompleteRef = useRef(false);
  const addScoreRef = useRef(addScore);
  const reduceHealthRef = useRef(reduceHealth);
  const addErrorRef = useRef(addError);
  const nextPhaseRef = useRef(nextPhase);
  const unlockPhaseRef = useRef(unlockPhase);
  const currentInspectionRef = useRef(currentInspection);
  
  useEffect(() => { inspectedItemsRef.current = inspectedItems; }, [inspectedItems]);
  useEffect(() => { phaseCompleteRef.current = phaseComplete; }, [phaseComplete]);
  useEffect(() => { addScoreRef.current = addScore; }, [addScore]);
  useEffect(() => { reduceHealthRef.current = reduceHealth; }, [reduceHealth]);
  useEffect(() => { addErrorRef.current = addError; }, [addError]);
  useEffect(() => { nextPhaseRef.current = nextPhase; }, [nextPhase]);
  useEffect(() => { unlockPhaseRef.current = unlockPhase; }, [unlockPhase]);
  useEffect(() => { currentInspectionRef.current = currentInspection; }, [currentInspection]);

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
      console.log(`[DEBUG] Ispezionati: ${newInspectedItems.size}/${TOTAL_COMPONENTS}, All inspected: ${allInspected}`);
      
      if (allInspected && !phaseCompleteRef.current) {
        console.log('[DEBUG] Fase completata! Passando a transport...');
        setPhaseComplete(true);
        phaseCompleteRef.current = true;
        
        setTimeout(() => {
          unlockPhaseRef.current('transport');
          nextPhaseRef.current();
          console.log('[DEBUG] nextPhase() chiamato');
        }, 2000);
      }
      
      if (decision === 'usable' && !inspection.isDamaged) {
        setLoadedItems(prev => [...prev, inspection.id]);
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
