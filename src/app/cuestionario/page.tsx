'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Database,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { useCado } from '@/context/CadoContext';

const steps = [
  'Motivo de consulta',
  'Percepción y ansiedad',
  'Experiencias previas',
  'Sensibilidad y ritmo',
  'Comunicación',
  'Consentimiento (Ley 19.628)',
];

export default function CuestionarioPage() {
  const { submitQuestionnaire } = useCado();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState('');
  const [feeling, setFeeling] = useState('');
  const [previousExperience, setPreviousExperience] = useState('Prefiero no responder');
  const [painSensitivity, setPainSensitivity] = useState('Prefiero no responder');
  const [communicationPreference, setCommunicationPreference] = useState('Explicación paso a paso con lenguaje sencillo');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [syncedToCloud, setSyncedToCloud] = useState(false);

  const canContinue =
    step === 0
      ? reason.trim().length >= 3
      : step === 1
      ? feeling.length > 0
      : step === 5
      ? consent
      : true;

  async function handleNext() {
    setErrorMessage('');
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/cuestionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          feeling,
          previousExperience,
          painSensitivity,
          communicationPreference,
          consent,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        setErrorMessage(json.error || 'Verifica los campos obligatorios antes de continuar.');
        setIsSubmitting(false);
        return;
      }

      const saved = await submitQuestionnaire({
        reason,
        feeling,
        previousExperience,
        painSensitivity,
        communicationPreference,
        consent,
      });

      setSavedRecordId(json.data?.id || saved.id);
      setSyncedToCloud(Boolean(json.syncedToSupabase));
    } catch {
      const saved = await submitQuestionnaire({
        reason,
        feeling,
        previousExperience,
        painSensitivity,
        communicationPreference,
        consent,
      });
      setSavedRecordId(saved.id);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-[#F6F8F8] px-6 py-14 text-[#513D49] sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Cuestionario Previo de Perfilamiento</p>
          <h1 className="mt-3 font-title text-5xl font-semibold leading-tight sm:text-6xl">
            Conocerte antes de conversar.
          </h1>
          <p className="mt-5 leading-8 text-[#665D66]">
            Estas preguntas ayudan al Dr. Javier Beiza a comprender cómo acercarse a cada paciente con empatía y sin juicios. En cualquier pregunta sensible puedes elegir explícitamente <strong>«Prefiero no responder»</strong>.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section
            className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_18px_45px_rgba(81,61,73,.08)] sm:p-9"
            aria-label="Cuestionario de perfilamiento"
          >
            {savedRecordId ? (
              <div role="status" className="py-8 text-center">
                <span className="clay-icon mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-[#A14B92]">
                  <Check className="h-8 w-8" />
                </span>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F6F8F8] px-3.5 py-1 text-xs font-semibold text-[#8A3D7D]">
                  <Database className="h-3.5 w-3.5" />
                  <span>
                    Registro #{savedRecordId} · {syncedToCloud ? 'Guardado en Supabase' : 'Registrado correctamente'}
                  </span>
                </div>
                <h2 className="mt-4 font-title text-3xl font-semibold">
                  ¡Tu cuestionario ha sido registrado!
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#665D66]">
                  Tus respuestas consentidas quedaron vinculadas a tu sesión actual para acompañar tu solicitud de orientación telemática. Recuerda que puedes complementar con el Test de Confort o pasar directo a elegir tu bloque horario.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/test-confort"
                    className="btn-cado-primary rounded-xl px-5 py-3 text-sm font-semibold"
                  >
                    Configurar Preferencias de Confort →
                  </Link>
                  <Link
                    href="/agendar"
                    className="btn-cado-secondary rounded-xl px-5 py-3 text-sm font-semibold"
                  >
                    Ir a Reserva Telemática
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedRecordId(null);
                      setStep(0);
                      setReason('');
                      setFeeling('');
                      setConsent(false);
                    }}
                    className="rounded-xl border border-[#DDE4E4] px-4 py-3 text-sm font-semibold text-[#665D66] hover:bg-[#F6F8F8]"
                  >
                    Completar otro
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                  <span>
                    Paso {step + 1} de {steps.length} · {steps[step]}
                  </span>
                  <span>{Math.round(((step + 1) / steps.length) * 100)} %</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={step + 1}
                  aria-valuemin={1}
                  aria-valuemax={steps.length}
                  aria-label="Avance del cuestionario"
                  className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6EBEB]"
                >
                  <div
                    className="h-full rounded-full bg-[#A14B92] transition-all"
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  />
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {step === 0 && (
                  <div className="mt-8">
                    <h2 className="font-title text-3xl font-semibold">
                      ¿Qué te gustaría conversar con el doctor?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#665D66]">
                      Motivo general de consulta · campo obligatorio para preparar tu orientación.
                    </p>
                    <label className="mt-6 block text-sm font-semibold">
                      Motivo de consulta <span className="text-[#A14B92]">*</span>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={4}
                        maxLength={240}
                        placeholder="Ej: Hace tiempo no voy al dentista y quiero evaluar una molestia al masticar..."
                        className="mt-2 w-full rounded-2xl border border-[#B3BFBF] p-4 font-normal outline-none focus:border-[#A14B92]"
                      />
                    </label>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-8">
                    <h2 className="font-title text-3xl font-semibold">
                      ¿Cómo te sientes ante una consulta dental?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#665D66]">
                      Puedes elegir «Prefiero no responder» sin bloquear tu avance.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        'Me siento tranquilo/a',
                        'Tengo algunas inquietudes',
                        'Me cuesta dar este paso',
                        'Prefiero no responder',
                      ].map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm transition ${
                            feeling === option
                              ? 'border-[#A14B92] bg-[#F8EFF6] font-semibold'
                              : 'border-[#E2E7E7] hover:bg-[#F6F8F8]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="feeling"
                            checked={feeling === option}
                            onChange={() => setFeeling(option)}
                            className="accent-[#A14B92]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-8">
                    <span className="clay-icon flex h-12 w-12 items-center justify-center rounded-2xl text-[#A14B92]">
                      <ClipboardList className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 font-title text-3xl font-semibold">
                      ¿Cómo han sido tus experiencias dentales anteriores?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#665D66]">
                      Pregunta opcional. Puedes omitir detalles seleccionando «Prefiero no responder».
                    </p>
                    <div className="mt-5 space-y-2.5">
                      {[
                        'Buenas o regulares, solo busco un control actualizado',
                        'Tuve una experiencia incómoda o dolorosa en el pasado',
                        'Hace varios años que evito ir por temor o ansiedad',
                        'Prefiero no responder',
                      ].map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm ${
                            previousExperience === option
                              ? 'border-[#A14B92] bg-[#F8EFF6] font-semibold'
                              : 'border-[#E2E7E7]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="prevExp"
                            checked={previousExperience === option}
                            onChange={() => setPreviousExperience(option)}
                            className="accent-[#A14B92]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-8">
                    <h2 className="font-title text-3xl font-semibold">
                      ¿Hay algo que te genere especial sensibilidad?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#665D66]">
                      Esto ayuda al doctor a preparar tiempos más pausados si decides pasar a atención presencial.
                    </p>
                    <div className="mt-5 space-y-2.5">
                      {[
                        'Los ruidos o sonidos de los instrumentos',
                        'El momento de la anestesia o pinchazos',
                        'Mantener la boca abierta por mucho tiempo (cansancio mandibular)',
                        'Prefiero no responder',
                      ].map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm ${
                            painSensitivity === option
                              ? 'border-[#A14B92] bg-[#F8EFF6] font-semibold'
                              : 'border-[#E2E7E7]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="painSens"
                            checked={painSensitivity === option}
                            onChange={() => setPainSensitivity(option)}
                            className="accent-[#A14B92]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="mt-8">
                    <h2 className="font-title text-3xl font-semibold">
                      ¿Cómo prefieres que el doctor se comunique contigo?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#665D66]">
                      Cada paciente tiene su propio estilo para sentirse en confianza.
                    </p>
                    <div className="mt-5 space-y-2.5">
                      {[
                        'Explicación paso a paso con lenguaje sencillo',
                        'Ir directo a lo importante con explicaciones breves',
                        'Conversar primero con calma antes de revisar opciones',
                        'Prefiero no responder',
                      ].map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm ${
                            communicationPreference === option
                              ? 'border-[#A14B92] bg-[#F8EFF6] font-semibold'
                              : 'border-[#E2E7E7]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="commPref"
                            checked={communicationPreference === option}
                            onChange={() => setCommunicationPreference(option)}
                            className="accent-[#A14B92]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="mt-8">
                    <span className="clay-icon flex h-12 w-12 items-center justify-center rounded-2xl text-[#A14B92]">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 font-title text-3xl font-semibold">
                      Consentimiento Informado y Privacidad
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#665D66]">
                      En cumplimiento con la <strong>Ley N° 19.628</strong> sobre Protección de la Vida Privada y la <strong>Ley N° 20.584</strong> de Derechos y Deberes del Paciente en Chile, tus respuestas solo se almacenarán tras tu aceptación explícita y se vincularán únicamente a tu solicitud de orientación.
                    </p>
                    <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-5 text-sm leading-6">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                        className="mt-1 accent-[#A14B92]"
                      />
                      <span>
                        Acepto el aviso de privacidad y autorizo el almacenamiento confidencial de mis respuestas para preparar mi orientación con el Dr. Javier Beiza.{' '}
                        <strong className="text-[#A14B92]">Obligatorio *</strong>
                      </span>
                    </label>
                    <p className="mt-4 rounded-xl border border-[#E2E7E7] bg-white p-3.5 text-xs leading-6 text-[#665D66]">
                      <strong>Aviso de alcance clínico:</strong> Este cuestionario es estrictamente orientativo y de confort; no entrega diagnósticos médicos ni presupuestos clínicos automáticos.
                    </p>
                  </div>
                )}

                <div className="mt-10 flex items-center justify-between gap-3 border-t border-[#E2E7E7] pt-6">
                  <button
                    type="button"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0 || isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" /> Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinue || isSubmitting}
                    className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span>
                      {isSubmitting
                        ? 'Guardando respuestas...'
                        : step === steps.length - 1
                        ? 'Guardar y Vincular Cuestionario'
                        : 'Continuar'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <div className="clay-card rounded-3xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A14B92]">
                Tu recorrido (6 pasos)
              </p>
              <ol className="mt-5 space-y-3">
                {steps.map((name, index) => (
                  <li
                    key={name}
                    className={`flex items-center gap-3 text-sm ${
                      index === step ? 'font-semibold text-[#513D49]' : 'text-[#766C75]'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                        index <= step ? 'bg-[#A14B92] text-white' : 'bg-[#E6EBEB]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    {name}
                  </li>
                ))}
              </ol>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <HeartHandshake className="h-6 w-6 text-[#A14B92]" />
              <h2 className="mt-3 font-title text-2xl font-semibold">¿Y la comodidad en el box?</h2>
              <p className="mt-2 text-sm leading-6 text-[#665D66]">
                Música suave, pausas periódicas y acompañante presencial se personalizan en el Test de Confort.
              </p>
              <Link
                href="/test-confort"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline"
              >
                Ir al Test de Confort <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
