import { TES_QUESTIONS, type TesPreferences } from '@/lib/tes-preferences';

export function TesQuestions({ answers, onChange }: {
  answers: TesPreferences;
  onChange: (key: keyof TesPreferences, value: string) => void;
}) {
  return <>
    {TES_QUESTIONS.map(({ key, title, prompt, options }, index) => {
      const number = key === 'music' ? '' : `${index + 1}. `;
      return <fieldset key={key} className="material-card min-w-0 space-y-3 rounded-2xl p-5">
        <legend className="px-2 font-title text-2xl font-semibold">{number}{title}</legend>
        <p className="text-sm" id={`tes-${key}-help`}>{prompt}</p>
        {key === 'wellbeing' && <p className="text-sm" id="tes-scale">
          1 · Necesito paciencia, empatía y avanzar a mi ritmo. 5 · Me siento completamente cómodo y listo para avanzar.
        </p>}
        <div className={key === 'wellbeing' ? 'flex flex-wrap gap-2' : 'grid gap-2'}>
          {options.map(option => <label key={option} className="material-option text-sm">
            <input type="radio" name={`tes-${key}`} value={option} checked={answers[key] === option}
              aria-describedby={key === 'wellbeing' ? 'tes-wellbeing-help tes-scale' : `tes-${key}-help`}
              className="shrink-0 accent-cado-purple" onChange={() => onChange(key, option)} />
            <span>{option}</span>
          </label>)}
        </div>
        {key === 'music' && answers.music === 'Elección musical propia' && <label className="block text-sm font-semibold">
          Artista o artistas (opcional)
          <input className="material-field mt-2 font-normal" maxLength={150} value={answers.artists ?? ''}
            onChange={event => onChange('artists', event.target.value)} />
        </label>}
      </fieldset>;
    })}
    <label className="material-card block space-y-3 rounded-2xl p-5">
      <span className="block font-title text-2xl font-semibold">6. Tu mensaje personal (opcional)</span>
      <span className="block text-sm">Este espacio es completamente tuyo. ¿Hay algo más que te gustaría que sepamos sobre ti para que tu visita sea lo más agradable posible?</span>
      <textarea className="material-field block text-sm" rows={4} maxLength={500} value={answers.message ?? ''}
        onChange={event => onChange('message', event.target.value)} />
    </label>
  </>;
}

export function TesSummary({ answers }: { answers: TesPreferences }) {
  return <dl className="space-y-3 text-sm">
    {TES_QUESTIONS.map(({ key, title }) => <div key={key}>
      <dt className="font-semibold">{title}</dt>
      <dd>{answers[key] ? (key === 'wellbeing' ? `${answers[key]} de 5` : answers[key]) : 'Sin responder'}</dd>
    </div>)}
    {answers.music === 'Elección musical propia' && answers.artists && <div><dt className="font-semibold">Artistas</dt><dd>{answers.artists}</dd></div>}
    {answers.message && <div><dt className="font-semibold">Mensaje personal</dt><dd className="whitespace-pre-wrap">{answers.message}</dd></div>}
  </dl>;
}
