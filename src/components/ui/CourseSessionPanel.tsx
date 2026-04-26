import { ShieldCheck } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

const fields = [
  {
    key: 'traineeName',
    label: 'Allievo',
    placeholder: 'Nome e cognome',
    required: true,
  },
  {
    key: 'instructorName',
    label: 'Docente / istruttore',
    placeholder: 'Responsabile della sessione',
    required: true,
  },
  {
    key: 'providerName',
    label: 'Soggetto formatore',
    placeholder: 'Ente o azienda',
    required: true,
  },
  {
    key: 'courseCode',
    label: 'Codice corso',
    placeholder: 'Es. PON-2026-01',
    required: true,
  },
  {
    key: 'location',
    label: 'Sede',
    placeholder: 'Aula / cantiere scuola',
    required: false,
  },
  {
    key: 'vrDeviceId',
    label: 'Device VR',
    placeholder: 'Quest / Pico / simulatore',
    required: false,
  },
  {
    key: 'scenarioSeed',
    label: 'Scenario seed',
    placeholder: 'Seed ripetibile',
    required: false,
  },
] as const;

export default function CourseSessionPanel() {
  const { courseSession, updateCourseSession, isCourseSessionReady } = useGameStore();
  const ready = isCourseSessionReady();

  return (
    <section className="course-session-panel" aria-label="Dati sessione corso">
      <div className="course-session-header">
        <div>
          <span className="summary-label">Evidenza corso</span>
          <h2>Dati sessione</h2>
        </div>
        <span className={`course-session-status${ready ? ' ready' : ''}`}>
          <ShieldCheck size={16} aria-hidden="true" />
          {ready ? 'Pronta per audit' : 'Da completare'}
        </span>
      </div>

      <div className="course-session-grid">
        {fields.map((field) => (
          <label key={field.key} className="course-field">
            <span>
              {field.label}
              {field.required && <strong aria-hidden="true"> *</strong>}
            </span>
            <input
              type="text"
              value={courseSession[field.key]}
              placeholder={field.placeholder}
              autoComplete="off"
              onChange={(event) => updateCourseSession({ [field.key]: event.target.value })}
              required={field.required}
            />
          </label>
        ))}
      </div>

      <div className="course-session-note">
        I campi obbligatori servono per produrre un&apos;evidenza esportabile da allegare al fascicolo corso.
        Il seed permette di ripetere lo stesso scenario; il simulatore supporta la valutazione didattica, ma non emette attestati ufficiali.
      </div>
    </section>
  );
}
