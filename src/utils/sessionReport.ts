import { phaseContent } from '../config/phaseContent';
import { phaseOrder, type GamePhase, type GameState, type PhaseScore } from '../stores/gameStore';

export interface TrainingSessionReport {
  schemaVersion: string;
  generatedAt: string;
  integrityHash: string;
  evidence: {
    mode: GameState['courseSession']['evidenceMode'];
    authority: 'local-preview' | 'server-signed';
    warning: string | null;
    serverHash: string | null;
  };
  product: {
    name: string;
    purpose: string;
    accreditationNote: string;
    regulatoryBasis: string[];
  };
  session: GameState['courseSession'];
  outcome: {
    label: string;
    totalScore: number;
    residualSafety: number;
    completedPhases: GamePhase[];
    infractions: number;
    criticalInfractions: number;
    highInfractions: number;
  };
  phases: Array<{
    phase: GamePhase;
    title: string;
    completed: boolean;
    scoreDelta: number | null;
    healthDelta: number | null;
    errorCodes: string[];
  }>;
  errors: Array<{
    code: string;
    severity: string;
    phase: GamePhase;
    messageKey: string;
    timestamp: string;
  }>;
  events: Array<{
    type: string;
    phase: GamePhase;
    timestamp: string;
    payload: Record<string, string | number | boolean | null>;
  }>;
}

const csvEscape = (value: string | number | null | undefined) => {
  const rawText = value === null || value === undefined ? '' : String(value);
  const text = /^[\t\r ]*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const createLocalIntegrityHash = (content: string) => {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const createIntegrityHashSource = (report: TrainingSessionReport) => ({
  ...report,
  integrityHash: '',
  evidence: {
    ...report.evidence,
    mode: 'canonical',
    authority: 'canonical',
    warning: null,
    serverHash: null,
  },
});

const buildPhaseScoreMap = (phaseScores: PhaseScore[]) =>
  new Map<GamePhase, PhaseScore>(phaseScores.map((phaseScore) => [phaseScore.phase, phaseScore]));

const getOutcomeLabel = (state: GameState) => {
  if (state.errors.some((error) => error.severity === 'critical')) return 'Non conforme';
  if (state.errors.some((error) => error.severity === 'high')) return 'Conforme con rilievi';
  if (state.errors.length > 0) return 'Conforme con osservazioni';
  return 'Conforme';
};

export const buildTrainingSessionReport = (state: GameState): TrainingSessionReport => {
  const phaseScoreMap = buildPhaseScoreMap(state.phaseScores);
  const criticalInfractions = state.errors.filter((error) => error.severity === 'critical').length;
  const highInfractions = state.errors.filter((error) => error.severity === 'high').length;

  const report: TrainingSessionReport = {
    schemaVersion: 'mars-ponteggio-training-report-v1',
    generatedAt: new Date().toISOString(),
    integrityHash: '',
    evidence: {
      mode: state.courseSession.evidenceMode,
      authority: state.courseSession.evidenceMode === 'server-signed' ? 'server-signed' : 'local-preview',
      warning:
        state.courseSession.evidenceMode === 'server-signed'
          ? null
          : 'Evidenza locale non firmata dal server. Per audit globale e immutabilita serve archivio backend.',
      serverHash: state.serverEvidenceHash,
    },
    product: {
      name: 'MARS-Safe Ponteggio Trainer',
      purpose: 'Supporto didattico e simulativo per corsi ponteggi con tracciamento degli esiti.',
      accreditationNote:
        'Il report documenta la sessione simulativa. Non sostituisce attestato, verbale ufficiale o valutazione del soggetto formatore.',
      regulatoryBasis: [
        'D.Lgs. 81/2008 - Titolo IV, ponteggi, Pi.M.U.S. e obblighi di sicurezza in quota',
        'Accordo Stato-Regioni 17/04/2025 - organizzazione, tracciabilita e verifica della formazione',
      ],
    },
    session: state.courseSession,
    outcome: {
      label: getOutcomeLabel(state),
      totalScore: state.totalScore,
      residualSafety: state.currentHealth,
      completedPhases: state.completedPhases,
      infractions: state.errors.length,
      criticalInfractions,
      highInfractions,
    },
    phases: phaseOrder.map((phase) => {
      const phaseScore = phaseScoreMap.get(phase);
      return {
        phase,
        title: phaseContent[phase]?.title ?? phase,
        completed: state.completedPhases.includes(phase),
        scoreDelta: phaseScore ? phaseScore.endScore - phaseScore.startScore : null,
        healthDelta: phaseScore ? phaseScore.endHealth - phaseScore.startHealth : null,
        errorCodes: phaseScore ? phaseScore.errors.map((error) => error.code) : [],
      };
    }),
    errors: state.errors.map((error) => ({
      code: error.code,
      severity: error.severity,
      phase: error.phase,
      messageKey: error.messageKey,
      timestamp: new Date(error.timestamp).toISOString(),
    })),
    events: state.eventLog.map((event) => ({
      type: event.type,
      phase: event.phase,
      timestamp: new Date(event.timestamp).toISOString(),
      payload: event.payload,
    })),
  };

  report.integrityHash = createLocalIntegrityHash(JSON.stringify(createIntegrityHashSource(report)));
  return report;
};

export const buildTrainingSessionCsv = (report: TrainingSessionReport) => {
  const rows: Array<Array<string | number | null | undefined>> = [
    ['Mars Ponteggio Trainer - Report sessione'],
    ['Generato il', report.generatedAt],
    ['Hash integrita locale', report.integrityHash],
    ['Modalita evidenza', report.evidence.mode],
    ['Hash server', report.evidence.serverHash],
    ['Avviso evidenza', report.evidence.warning],
    ['Sessione', report.session.sessionId],
    ['Scenario seed', report.session.scenarioSeed],
    ['Organizzazione', report.session.organizationName],
    ['Licenza', report.session.licenseId],
    ['Allievo', report.session.traineeName],
    ['Docente/Istruttore', report.session.instructorName],
    ['Soggetto formatore', report.session.providerName],
    ['Codice corso', report.session.courseCode],
    ['Sede', report.session.location],
    ['Dispositivo VR', report.session.vrDeviceId],
    ['Inizio', report.session.startedAt],
    ['Fine', report.session.endedAt],
    ['Esito', report.outcome.label],
    ['Punteggio', report.outcome.totalScore],
    ['Stato sicurezza residuo', report.outcome.residualSafety],
    ['Infrazioni', report.outcome.infractions],
    [],
    ['Fase', 'Titolo', 'Completata', 'Crediti fase', 'Delta sicurezza', 'Errori'],
    ...report.phases.map((phase) => [
      phase.phase,
      phase.title,
      phase.completed ? 'si' : 'no',
      phase.scoreDelta,
      phase.healthDelta,
      phase.errorCodes.join(' | '),
    ]),
    [],
    ['Codice errore', 'Severita', 'Fase', 'Timestamp', 'Message key'],
    ...report.errors.map((error) => [
      error.code,
      error.severity,
      error.phase,
      error.timestamp,
      error.messageKey,
    ]),
    [],
    ['Evento', 'Fase', 'Timestamp', 'Payload'],
    ...report.events.map((event) => [
      event.type,
      event.phase,
      event.timestamp,
      JSON.stringify(event.payload),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(';')).join('\n');
};

const downloadTextFile = (fileName: string, mimeType: string, content: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildSafeFileName = (sessionId: string, extension: string) =>
  `${sessionId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.${extension}`;

export const downloadTrainingSessionReport = (state: GameState, format: 'json' | 'csv') => {
  const report = buildTrainingSessionReport(state);
  const fileName = buildSafeFileName(report.session.sessionId, format);

  if (format === 'json') {
    downloadTextFile(fileName, 'application/json;charset=utf-8', JSON.stringify(report, null, 2));
    return;
  }

  downloadTextFile(fileName, 'text/csv;charset=utf-8', buildTrainingSessionCsv(report));
};
