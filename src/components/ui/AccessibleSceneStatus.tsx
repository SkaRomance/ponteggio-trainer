import { TOTAL_COMPONENTS } from '../../stores/inspectionStore';
import { useGameStore } from '../../stores/gameStore';
import { phaseContent } from '../../config/phaseContent';

interface AccessibleSceneStatusProps {
  inspectedItemsCount: number;
  nearbyItem: string | null;
}

export default function AccessibleSceneStatus({ inspectedItemsCount, nearbyItem }: AccessibleSceneStatusProps) {
  const {
    currentPhase,
    totalScore,
    currentHealth,
    errors,
    loadedItems,
    transportGroundItems,
    transportTruckItems,
    isStrapped,
    weightBalance,
  } = useGameStore();
  const content = phaseContent[currentPhase];

  return (
    <section className="scene-a11y-status" aria-live="polite" aria-label="Stato testuale della scena">
      <h2>Stato simulazione</h2>
      <p>
        Fase: {content?.title ?? currentPhase}. Punteggio: {totalScore}. Stato sicurezza: {currentHealth}%.
        Infrazioni registrate: {errors.length}.
      </p>
      {currentPhase === 'warehouse' && (
        <p>
          Ispezione: {inspectedItemsCount} di {TOTAL_COMPONENTS} componenti completati.
          {nearbyItem ? ` Oggetto vicino: ${nearbyItem}. Premi E per aprire l'ispezione.` : ' Nessun oggetto interattivo vicino.'}
        </p>
      )}
      {currentPhase === 'transport' && (
        <p>
          Trasporto: {transportTruckItems.length} componenti sul mezzo, {transportGroundItems.length} a terra,
          fissaggio {isStrapped ? 'confermato' : 'non confermato'}, bilanciamento {(weightBalance * 100).toFixed(0)}%.
        </p>
      )}
      {currentPhase === 'storage' && (
        <p>Stoccaggio: {loadedItems.length} componenti da mantenere su supporti idonei e fuori dalle zone di pericolo.</p>
      )}
    </section>
  );
}
