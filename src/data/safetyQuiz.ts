import type { GamePhase } from '../stores/gameStore';

export type SafetyQuizOptionId = 'a' | 'b';

export type SafetyQuizTopic =
  | 'segnaletica'
  | 'dpi'
  | 'ponteggi'
  | 'ancoraggi'
  | 'carichi'
  | 'meteo'
  | 'accessi'
  | 'elettrico'
  | 'pimus'
  | 'ispezione'
  | 'stoccaggio'
  | 'smontaggio'
  | 'emergenza'
  | 'ruoli'
  | 'caduta-oggetti';

export interface SafetyQuizOption {
  id: SafetyQuizOptionId;
  label: string;
  correct: boolean;
  rationale: string;
}

export interface SafetyQuizQuestion {
  id: string;
  topic: SafetyQuizTopic;
  prompt: string;
  options: [SafetyQuizOption, SafetyQuizOption];
  phaseHints?: GamePhase[];
}

const option = (
  id: SafetyQuizOptionId,
  label: string,
  correct: boolean,
  rationale: string,
): SafetyQuizOption => ({
  id,
  label,
  correct,
  rationale,
});

export const SAFETY_QUIZ_QUESTIONS: SafetyQuizQuestion[] = [
  {
    id: 'signage-exclusion-zone',
    topic: 'segnaletica',
    prompt: 'Prima di montare vicino a un passaggio pedonale, cosa va fatto?',
    options: [
      option('a', 'Delimitare e segnalare l area di lavoro', true, 'Area interdetta e segnalata riduce accessi non autorizzati e caduta oggetti su terzi.'),
      option('b', 'Procedere se il passaggio sembra libero', false, 'Il passaggio libero al momento non basta: serve interdizione visibile e controllata.'),
    ],
    phaseHints: ['assembly', 'use'],
  },
  {
    id: 'dpi-height-anchor',
    topic: 'dpi',
    prompt: 'L operatore deve lavorare in quota su ponteggio non ancora completo. Cosa serve?',
    options: [
      option('a', 'Imbracatura collegata a punto idoneo', true, 'In quota il DPI anticaduta deve essere usato quando le protezioni collettive non sono complete.'),
      option('b', 'Solo casco, se il lavoro dura poco', false, 'La durata breve non elimina il rischio di caduta dall alto.'),
    ],
    phaseHints: ['assembly', 'disassembly'],
  },
  {
    id: 'scaffold-type-compatible',
    topic: 'ponteggi',
    prompt: 'Si possono mescolare componenti di sistemi diversi senza verifica tecnica?',
    options: [
      option('a', 'No, serve compatibilita documentata', true, 'Sistemi non compatibili possono perdere portata, geometria e sicurezza degli innesti.'),
      option('b', 'Si, se gli innesti sembrano entrare', false, 'L innesto apparente non certifica compatibilita strutturale.'),
    ],
    phaseHints: ['warehouse', 'assembly'],
  },
  {
    id: 'anchors-before-removal',
    topic: 'ancoraggi',
    prompt: 'Durante lo smontaggio un ancoraggio intralcia il lavoro. Quale scelta e corretta?',
    options: [
      option('a', 'Rimuoverlo solo dopo soluzione sostitutiva sicura', true, 'Gli ancoraggi mantengono stabilita: non vanno tolti senza controllo del preposto o nuova configurazione.'),
      option('b', 'Rimuoverlo subito e rimontarlo dopo', false, 'Rimuovere prima di garantire stabilita espone a ribaltamento o cedimenti.'),
    ],
    phaseHints: ['disassembly'],
  },
  {
    id: 'deck-load-limit',
    topic: 'carichi',
    prompt: 'Sul piano di lavoro arrivano molti materiali. Quale comportamento e sicuro?',
    options: [
      option('a', 'Rispettare portata e distribuire i carichi', true, 'Il piano non e un deposito: portata e ripartizione devono restare sotto controllo.'),
      option('b', 'Accatastare tutto vicino al punto di uso', false, 'Concentrare carichi puo superare la portata locale del ponteggio.'),
    ],
    phaseHints: ['use', 'assembly'],
  },
  {
    id: 'wind-stop-work',
    topic: 'meteo',
    prompt: 'Aumenta vento forte durante montaggio con teli o pannelli. Cosa fai?',
    options: [
      option('a', 'Fermo attivita e metto in sicurezza', true, 'Vento e superfici schermate aumentano forze sul ponteggio e rischio caduta materiali.'),
      option('b', 'Continuo accelerando per finire prima', false, 'Accelerare sotto vento aumenta errori e rischio strutturale.'),
    ],
    phaseHints: ['assembly', 'use'],
  },
  {
    id: 'internal-access',
    topic: 'accessi',
    prompt: 'Come deve salire un operatore al piano superiore del ponteggio?',
    options: [
      option('a', 'Da accesso previsto con botola o scala idonea', true, 'Gli accessi interni o predisposti evitano arrampicate sui telai.'),
      option('b', 'Arrampicandosi sui montanti esterni', false, 'Arrampicarsi sui telai non e accesso sicuro.'),
    ],
    phaseHints: ['assembly', 'use', 'disassembly'],
  },
  {
    id: 'power-lines',
    topic: 'elettrico',
    prompt: 'Il ponteggio e vicino a linee elettriche aeree. Quale azione e corretta?',
    options: [
      option('a', 'Valutare distanza, protezioni e disalimentazione se necessaria', true, 'Il rischio elettrico richiede valutazione preventiva e misure prima di operare.'),
      option('b', 'Lavorare evitando di toccare i cavi', false, 'La sola attenzione individuale non basta contro arco elettrico o contatto accidentale.'),
    ],
    phaseHints: ['assembly', 'use'],
  },
  {
    id: 'pimus-site-specific',
    topic: 'pimus',
    prompt: 'Il Pi.M.U.S. puo essere un modello generico non riferito al cantiere?',
    options: [
      option('a', 'No, deve guidare quel montaggio specifico', true, 'Il piano operativo deve essere aderente a ponteggio, contesto, sequenze e rischi reali.'),
      option('b', 'Si, basta che sia firmato', false, 'Una firma non rende idoneo un documento non specifico.'),
    ],
    phaseHints: ['assembly'],
  },
  {
    id: 'post-weather-inspection',
    topic: 'ispezione',
    prompt: 'Dopo forte pioggia o vento il ponteggio va usato subito?',
    options: [
      option('a', 'No, serve controllo prima dell uso', true, 'Eventi meteo possono alterare appoggi, ancoraggi, impalcati e protezioni.'),
      option('b', 'Si, se ieri era conforme', false, 'La conformita precedente non copre modifiche dovute al meteo.'),
    ],
    phaseHints: ['use'],
  },
  {
    id: 'storage-raised-dry',
    topic: 'stoccaggio',
    prompt: 'Come stoccare tubi e telai prima del montaggio?',
    options: [
      option('a', 'Su supporti stabili, ordinati e sollevati dal terreno', true, 'Stoccaggio ordinato riduce corrosione, inciampi e danneggiamenti.'),
      option('b', 'A terra, vicino al punto di scarico', false, 'Il deposito a terra favorisce umidita, instabilita e ostacoli.'),
    ],
    phaseHints: ['storage'],
  },
  {
    id: 'damaged-component-quarantine',
    topic: 'ispezione',
    prompt: 'Trovi un componente deformato ma ancora agganciabile. Cosa fai?',
    options: [
      option('a', 'Lo escludo e lo segnalo', true, 'Un pezzo deformato non va compensato in cantiere: va segregato e tracciato.'),
      option('b', 'Lo uso in zona poco sollecitata', false, 'La posizione meno sollecitata non rende sicuro un componente non conforme.'),
    ],
    phaseHints: ['warehouse'],
  },
  {
    id: 'transport-secured-load',
    topic: 'carichi',
    prompt: 'Prima di spostare il carico sul mezzo, qual e la verifica chiave?',
    options: [
      option('a', 'Carico bilanciato e fissato', true, 'Fissaggio e bilanciamento riducono ribaltamento, caduta pezzi e spostamenti.'),
      option('b', 'Solo numero pezzi corretto', false, 'Inventario corretto non garantisce stabilita durante il trasporto.'),
    ],
    phaseHints: ['transport'],
  },
  {
    id: 'toe-board-purpose',
    topic: 'caduta-oggetti',
    prompt: 'A cosa serve il fermapiede sul ponteggio?',
    options: [
      option('a', 'Limitare caduta di materiali e scivolamento oggetti', true, 'Il fermapiede protegge chi lavora sotto o vicino al ponteggio.'),
      option('b', 'Solo indicare il bordo del piano', false, 'Non e solo segnalazione: e protezione fisica contro caduta oggetti.'),
    ],
    phaseHints: ['assembly', 'use'],
  },
  {
    id: 'guardrail-before-use',
    topic: 'ponteggi',
    prompt: 'Quando un impalcato puo essere usato come piano di lavoro?',
    options: [
      option('a', 'Quando protezioni collettive e accesso sono completi', true, 'Parapetti, correnti, fermapiede e accesso sicuro devono essere presenti prima dell uso.'),
      option('b', 'Appena le tavole sono appoggiate', false, 'Le tavole da sole non bastano a rendere utilizzabile il piano.'),
    ],
    phaseHints: ['assembly', 'use'],
  },
  {
    id: 'base-plates-ground',
    topic: 'ponteggi',
    prompt: 'Le basette poggiano su terreno cedevole. Quale opzione e corretta?',
    options: [
      option('a', 'Ripristinare appoggio stabile e ripartizione corretta', true, 'La stabilita parte dal terreno: appoggi improvvisati o cedevoli compromettono tutto il ponteggio.'),
      option('b', 'Compensare con pezzi di fortuna', false, 'Spessori non idonei introducono instabilita e perdita di controllo geometrico.'),
    ],
    phaseHints: ['assembly'],
  },
  {
    id: 'preposto-sequence',
    topic: 'ruoli',
    prompt: 'Chi deve controllare che sequenza e misure operative siano rispettate?',
    options: [
      option('a', 'Il preposto o figura incaricata prevista', true, 'La supervisione riduce deviazioni operative e comportamenti non conformi.'),
      option('b', 'Solo chi monta, senza confronto', false, 'L autogestione senza controllo non garantisce rispetto del piano.'),
    ],
    phaseHints: ['assembly', 'disassembly'],
  },
  {
    id: 'emergency-stop',
    topic: 'emergenza',
    prompt: 'Un componente cade nell area di lavoro. Primo comportamento corretto?',
    options: [
      option('a', 'Fermare attivita, mettere in sicurezza e segnalare', true, 'Prima si blocca il rischio residuo, poi si analizzano cause e ripresa.'),
      option('b', 'Raccoglierlo e continuare', false, 'Continuare senza fermo e verifica lascia attivo il rischio.'),
    ],
    phaseHints: ['use', 'assembly'],
  },
  {
    id: 'modification-authorized',
    topic: 'pimus',
    prompt: 'Serve spostare un elemento per comodita operativa. Cosa si fa?',
    options: [
      option('a', 'Si autorizza e aggiorna la procedura prima di cambiare', true, 'Le modifiche vanno valutate: una variazione locale puo alterare stabilita e protezioni.'),
      option('b', 'Si modifica e si annota a fine turno', false, 'Registrare dopo non previene il rischio creato dalla modifica.'),
    ],
    phaseHints: ['use', 'assembly'],
  },
  {
    id: 'tag-before-use',
    topic: 'segnaletica',
    prompt: 'Il cartello di agibilita quando va esposto?',
    options: [
      option('a', 'Dopo controllo positivo della struttura', true, 'La segnaletica deve riflettere stato reale e verificato del ponteggio.'),
      option('b', 'Prima del controllo, per ricordarlo agli operatori', false, 'Esporre agibilita prima della verifica comunica una condizione non provata.'),
    ],
    phaseHints: ['use'],
  },
  {
    id: 'dismantling-top-down',
    topic: 'smontaggio',
    prompt: 'Quale logica guida lo smontaggio sicuro?',
    options: [
      option('a', 'Dall alto verso il basso, ordine inverso del montaggio', true, 'Lo smontaggio mantiene stabilita progressiva se segue sequenza controllata.'),
      option('b', 'Dal basso per liberare subito il passaggio', false, 'Togliere elementi inferiori prima puo compromettere stabilita.'),
    ],
    phaseHints: ['disassembly'],
  },
  {
    id: 'mesh-public-side',
    topic: 'caduta-oggetti',
    prompt: 'Ponteggio su lato pubblico con rischio caduta piccoli materiali. Quale misura e coerente?',
    options: [
      option('a', 'Protezioni, rete o schermature secondo rischio valutato', true, 'La protezione verso terzi va dimensionata al rischio reale di caduta oggetti.'),
      option('b', 'Solo avviso verbale agli operatori', false, 'L avviso verbale non protegge passanti e aree sottostanti.'),
    ],
    phaseHints: ['use', 'assembly'],
  },
  {
    id: 'unloading-exclusion',
    topic: 'stoccaggio',
    prompt: 'Durante scarico dei telai chi puo stare nella zona di caduta?',
    options: [
      option('a', 'Solo personale necessario e coordinato', true, 'Lo scarico richiede area controllata, comunicazione e distanza da chi non opera.'),
      option('b', 'Chiunque deve prendere subito i pezzi', false, 'Aumentare persone in area di caduta aumenta esposizione al rischio.'),
    ],
    phaseHints: ['transport', 'storage'],
  },
  {
    id: 'wet-deck-check',
    topic: 'meteo',
    prompt: 'Impalmato bagnato e sporco di fango. Quale scelta e corretta?',
    options: [
      option('a', 'Pulizia e verifica antiscivolo prima di usarlo', true, 'Scivolamento e inciampo vanno rimossi prima dell accesso operativo.'),
      option('b', 'Procedere lentamente senza pulire', false, 'Procedere piano riduce ma non elimina un pericolo evitabile.'),
    ],
    phaseHints: ['use'],
  },
  {
    id: 'helmet-falling-objects',
    topic: 'dpi',
    prompt: 'Sotto una zona di montaggio cosa e sempre coerente con rischio caduta oggetti?',
    options: [
      option('a', 'Casco idoneo e area sottostante controllata', true, 'DPI e protezione collettiva lavorano insieme: il casco da solo non basta.'),
      option('b', 'Solo tenere lo sguardo verso l alto', false, 'Guardare non protegge da urti improvvisi o accessi non autorizzati.'),
    ],
    phaseHints: ['assembly', 'storage'],
  },
];

const hashText = (input: string) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const shouldTriggerSafetyQuiz = (seed: string, salt: string, chance = 0.28) => {
  const bucket = hashText(`${seed || 'SEED'}:${salt}`) % 1000;
  return bucket < Math.round(chance * 1000);
};

export const pickSafetyQuizQuestion = (
  seed: string,
  usedIds: string[],
  phase: GamePhase,
  salt = '',
): SafetyQuizQuestion | null => {
  const used = new Set(usedIds);
  const remaining = SAFETY_QUIZ_QUESTIONS.filter((question) => !used.has(question.id));
  const pool = remaining.length > 0 ? remaining : SAFETY_QUIZ_QUESTIONS;
  const phasePool = pool.filter((question) => question.phaseHints?.includes(phase));
  const candidates = phasePool.length >= 2 ? phasePool : pool;

  if (candidates.length === 0) return null;

  const index = hashText(`${seed || 'SEED'}:${phase}:${salt}:${usedIds.length}`) % candidates.length;
  return candidates[index] ?? null;
};
