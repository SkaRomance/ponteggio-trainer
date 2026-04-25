import type { GamePhase } from '../stores/gameStore';

export interface PhaseContent {
  title: string;
  eyebrow: string;
  level: 'base' | 'intermedio' | 'avanzato';
  description: string;
  objectives: string[];
  rules: string[];
}

export const phaseContent: Partial<Record<GamePhase, PhaseContent>> = {
  warehouse: {
    title: 'Ispezione iniziale',
    eyebrow: 'Fase 1',
    level: 'base',
    description: 'Verifica i componenti del ponteggio e separa il materiale sicuro da quello danneggiato.',
    objectives: [
      'Controllare tutti i componenti disponibili',
      'Caricare solo gli elementi integri',
      'Evitare valutazioni errate che riducono la salute',
    ],
    rules: [
      'Ogni componente va classificato prima del trasporto',
      'Un componente danneggiato non puo essere caricato',
      'L’errore di valutazione genera penalita e warning',
    ],
  },
  transport: {
    title: 'Trasporto e logistica',
    eyebrow: 'Fase 2',
    level: 'intermedio',
    description: 'Carica il mezzo, distribuisci il peso e conferma il fissaggio del carico prima della partenza.',
    objectives: [
      'Caricare tutti i pezzi nel cassone',
      'Mantenere il bilanciamento entro soglia',
      'Confermare il fissaggio finale del carico',
    ],
    rules: [
      'Non lasciare materiale a terra',
      'Un carico sbilanciato blocca la fase',
      'Ogni modifica al carico richiede un nuovo fissaggio',
    ],
  },
  storage: {
    title: 'Stoccaggio in cantiere',
    eyebrow: 'Fase 3',
    level: 'intermedio',
    description: 'Scarica il materiale e posizionalo in modo ordinato e asciutto sui supporti.',
    objectives: [
      'Posizionare i ceppi di appoggio',
      'Scaricare tutti i componenti dal mezzo',
      'Evitare lo stoccaggio in aree non sicure',
    ],
    rules: [
      'Il materiale non deve restare sul camion',
      'I supporti devono isolare dall’umidita del suolo',
      'La zona pericolo non puo essere usata per lo stoccaggio',
    ],
  },
  assembly: {
    title: 'Montaggio Pi.M.U.S.',
    eyebrow: 'Fase 4',
    level: 'avanzato',
    description: 'Esegui il montaggio seguendo la sequenza operativa e con DPI/ancoraggi attivi.',
    objectives: [
      'Rispettare l’ordine di montaggio previsto',
      'Attivare imbracatura e ancoraggio in quota',
      'Completare tutti gli step della struttura',
    ],
    rules: [
      'Una sequenza errata genera errore procedurale',
      'In quota senza ancoraggio la fase viene penalizzata',
      'Ogni step va chiuso prima di passare al successivo',
    ],
  },
  use: {
    title: 'Controllo in uso',
    eyebrow: 'Fase 5',
    level: 'avanzato',
    description: 'Ispeziona la struttura completata, rileva le anomalie e verifica la segnaletica di agibilita.',
    objectives: [
      'Individuare tutte le anomalie presenti',
      'Affiggere il cartello di agibilita',
      'Convalidare la struttura solo a verifica completa',
    ],
    rules: [
      'L’ispezione in quota richiede ancoraggio',
      'La segnaletica e obbligatoria prima della chiusura fase',
      'Le anomalie residue impediscono la validazione finale',
    ],
  },
  disassembly: {
    title: 'Smontaggio sicuro',
    eyebrow: 'Fase 6',
    level: 'avanzato',
    description: 'Smonta la struttura in sicurezza procedendo dall’alto verso il basso.',
    objectives: [
      'Rimuovere gli elementi nell’ordine corretto',
      'Mantenere l’ancoraggio in quota',
      'Completare lo smontaggio senza infrazioni critiche',
    ],
    rules: [
      'Lo smontaggio segue l’ordine inverso del montaggio',
      'In quota senza ancoraggio la rimozione e vietata',
      'Gli elementi rimossi devono essere tracciati fino a fine fase',
    ],
  },
  return: {
    title: 'Report finale',
    eyebrow: 'Fase 7',
    level: 'base',
    description: 'Riepilogo di conformita con esito, infrazioni e copertura delle fasi completate.',
    objectives: [
      'Verificare punteggio e infrazioni',
      'Controllare il completamento del percorso',
      'Ripetere l’addestramento se necessario',
    ],
    rules: [
      'Ogni infrazione resta nel report finale',
      'Il punteggio dipende da accuratezza e sicurezza',
      'Le fasi completate vengono marcate nell’audit finale',
    ],
  },
};
