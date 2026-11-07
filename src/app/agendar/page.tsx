'use client';

import { Suspense, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { formatChileanPhone, validContactEmail, validContactName, validContactPhone } from '@/lib/booking-validation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { useCado, type Appointment, type ComfortProfile, type QuestionnaireSubmission } from '@/context/CadoContext';
import { SavPayment } from '@/components/SavPayment';
import { TesQuestions, TesSummary } from '@/components/TesPreferences';
import type { TesPreferences } from '@/lib/tes-preferences';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';

function endTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const end = hour * 60 + minute + 15;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

const quickReasons = [
  'Quiero volver al dentista pero siento miedo / ansiedad',
  'Dolor o molestia dental aguda',
  'Chequeo preventivo y evaluación general',
  'Bruxismo, tensión o dolor en la mandíbula',
  'Dudas sobre una posible extracción (exodoncia)',
  'Otro motivo',
];

const anxietyOptions = [
  { id: 'fobia', label: 'Miedo intenso o fobia previa', desc: 'Me cuesta mucho pedir hora y requiero avanzar muy despacio.' },
  { id: 'nervioso', label: 'Algo nervioso o inseguro', desc: 'Tengo inquietudes y me ayuda conversar antes de abrir la boca.' },
  { id: 'tranquilo', label: 'Tranquilo / Sin mayor temor', desc: 'Vengo principalmente por consulta técnica o chequeo.' },
  { id: 'no_responde', label: 'Prefiero no responder', desc: 'Prefiero comentarlo directamente en la videollamada.' },
] as const;

const pastExperienceOptions = [
  'Mala experiencia con dolor en el pasado',
  'Me sentí juzgado o regañado en otra clínica',
  'Experiencias normales sin mayores traumas',
  'Primera vez que consulto como adulto',
  'Prefiero no responder',
];

function BookingWizard() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const initialStep: 1 | 2 | 3 | 4 = stepParam === '3' ? 3 : 2;

  const {
    availableSlots,
    supabaseStatus,
    blockedDates,
    addAppointment,
    activeComfortProfile,
    saveComfortPreferences,
    activeQuestionnaire,
    submitQuestionnaire,
    patientDraftInfo,
    setPatientDraftInfo,
  } = useCado();

  // Paso del flujo unificado:
  // 1 = Cuestionario previo de sensibilidad
  // 2 = Test de confort ambiental
  // 3 = Selección de bloque horario y datos del paciente
  // 4 = Confirmación final con enlace
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(initialStep);

  // Estados del Paso 1: Cuestionario
  const [reason, setReason] = useState(activeQuestionnaire?.reason || '');
  const [feeling, setFeeling] = useState<string>(activeQuestionnaire?.feeling || 'nervioso');
  const [previousExp, setPreviousExp] = useState(activeQuestionnaire?.previousExperience || 'Prefiero no responder');
  const [sensitivity, setSensitivity] = useState(activeQuestionnaire?.painSensitivity || 'Alta sensibilidad; avisar antes de cada paso');
  const [communication, setCommunication] = useState(activeQuestionnaire?.communicationPreference || 'Explicación paso a paso con lenguaje sencillo');
  const [questionnaireConsent, setQuestionnaireConsent] = useState(false);
  const [isSkippingQuestionnaire, setIsSkippingQuestionnaire] = useState(!activeQuestionnaire);
  const [savedQuestionnaire, setSavedQuestionnaire] = useState<QuestionnaireSubmission | null>(null);

  const [tes, setTes] = useState<TesPreferences>(activeComfortProfile.tes ?? {});
  function updateTes(key: keyof TesPreferences, value: string) {
    setTes(previous => ({ ...previous, [key]: value }));
  }

  const comfortProfile: ComfortProfile = {
    anxietyLevel: isSkippingQuestionnaire ? 'no_responde' : feeling as ComfortProfile['anxietyLevel'],
    soundPreference: tes.music === 'Silencio y calma total' ? 'silencio' : 'musica_suave',
    jawBreaks: false,
    companionAllowed: false,
    handSignalPledge: false,
    notes: '',
    explanationStepByStep: false,
    tes,
  };

  // Estados del Paso 3: Agendamiento de Fecha y Hora
  const today = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    []
  );
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState('');
  const [finalConsent, setFinalConsent] = useState(false);

  // Estados de proceso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string>('');
  const [managementSecret, setManagementSecret] = useState('');
  const [calendarStatus, setCalendarStatus] = useState('Pendiente_Reintento');
  const confirmationSequence = useRef(0);
  const refreshConfirmation = useCallback(async () => {
    const request = ++confirmationSequence.current;
    const response = await fetch('/api/orientaciones', { headers: { 'x-management-token': managementSecret }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.data || request !== confirmationSequence.current) return false;
    setCalendarStatus(result.data.estado_sync);
    setCreatedAppointment(previous => previous ? {
      ...previous, date: result.data.fecha, time: String(result.data.hora).slice(0, 5),
      meetLink: result.data.meet_link || '', status: result.data.estado_atencion,
    } : previous);
    return result.data.estado_sync === 'Sincronizado';
  }, [managementSecret]);
  useLiveUpdates({ resources: ['availability'], enabled: currentStep === 4 && Boolean(managementSecret), pollMs: 15_000 }, async () => { await refreshConfirmation(); });

  useEffect(() => {
    if (!managementSecret || currentStep !== 4) return;
    let active = true;
    const timer = setInterval(async () => {
      try { if (active && await refreshConfirmation()) clearInterval(timer); } catch {}
    },2000);
    const timeout=setTimeout(()=>clearInterval(timer),60000);
    return()=>{active=false;clearInterval(timer);clearTimeout(timeout);};
  },[managementSecret,currentStep,refreshConfirmation]);

  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(currentStep);
  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [currentStep]);

  const validDate = date >= today && !blockedDates.includes(date);
  const slots = availableSlots
    .filter((value) => value.startsWith(`${date}|`))
    .map((value) => value.split('|')[1])
    .filter((value) => /^\d{2}:\d{2}$/.test(value))
    .sort();

  // Validación de Paso 1
  const canAdvanceQuestionnaire = reason.trim().length >= 3 && questionnaireConsent;

  // Validación de Paso 3
  const [touchedContact, setTouchedContact] = useState({ name: false, email: false, phone: false });
  const validName = validContactName(patientDraftInfo.name.trim());
  const validEmail = validContactEmail(patientDraftInfo.email.trim());
  const validPhone = validContactPhone(patientDraftInfo.phone.trim());
  const showNameError = touchedContact.name && !validName;
  const showEmailError = touchedContact.email && !validEmail;
  const showPhoneError = touchedContact.phone && !validPhone;
  const canConfirmBooking =
    validName && validEmail && validPhone &&
    validDate && slots.includes(slot) &&
    finalConsent;

  // Manejo de paso 1 -> paso 2
  async function handleCompleteQuestionnaire(skip = false) {
    setErrorMsg('');
    if (skip) {
      setIsSkippingQuestionnaire(true);
      setCurrentStep(2);
      return;
    }

    if (!canAdvanceQuestionnaire) {
      setErrorMsg('Por favor escribe o selecciona el motivo de tu consulta para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedQ = await submitQuestionnaire({
        reason: reason.trim(),
        feeling,
        previousExperience: previousExp,
        painSensitivity: sensitivity,
        communicationPreference: communication,
        consent: questionnaireConsent,
      });
      setSavedQuestionnaire(savedQ);
      setIsSkippingQuestionnaire(false);
      setCurrentStep(2);
    } catch {
      setErrorMsg('No se pudo guardar el cuestionario. Intenta nuevamente.');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Manejo de paso 2 -> paso 3
  async function handleCompleteComfort() {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await saveComfortPreferences(comfortProfile);
      setCurrentStep(3);
    } catch {
      setCurrentStep(3);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Manejo de confirmación final
  async function handleFinalBooking() {
    if (!canConfirmBooking) return;
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orientaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientDraftInfo.name.trim(),
          email: patientDraftInfo.email.trim(),
          phone: formatChileanPhone(patientDraftInfo.phone),
          date,
          time: slot,
          consent: finalConsent,
          cuestionarioId: isSkippingQuestionnaire ? null : ((savedQuestionnaire?.id || activeQuestionnaire?.id) || null),
          comfortProfile,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || 'No se pudo registrar la reserva. Revisa tus datos.');
        setIsSubmitting(false);
        return;
      }

      if (json.googleCalendarUrl) {
        setGoogleCalendarUrl(json.googleCalendarUrl);
      }

      setManagementSecret(json.data.token_gestion);
      setCalendarStatus(json.data.estado_sync);
      const app = addAppointment({
        id: json.data?.codigo || undefined,
        patientName: patientDraftInfo.name.trim(),
        email: patientDraftInfo.email.trim(),
        phone: patientDraftInfo.phone.trim(),
        date,
        time: slot,
        comfortProfile,
        questionnaire: isSkippingQuestionnaire ? undefined : (savedQuestionnaire || activeQuestionnaire || undefined),
        meetLink: json.data?.meet_link || '',
        derivationStatus: 'Sin derivación',
        skipSupabaseSync: true, // ¡Ya fue guardado e insertado por /api/orientaciones!
      });

      setCreatedAppointment(app);
      setCurrentStep(4);
    } catch {
      setErrorMsg('No se pudo confirmar la reserva. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-white pb-24 text-[#513D49]">
      {/* CABECERA Y STEPPER DE PROGRESO */}
      <section className="border-b border-[#E2E7E7] bg-[#F6F8F8] px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#513D49]">
            <Clock3 className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
            <span>Encuesta TES + SAV de 15 minutos · Calama</span>
          </div>

          <h1 className="mt-4 font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl">
            {currentStep === 1 && 'Tu historia (opcional)'}
            {currentStep === 2 && '1. Encuesta TES · Tu Espacio Seguro'}
            {currentStep === 3 && '2. Reserva tu SAV de 15 minutos'}
            {currentStep === 4 && '¡Tu SAV está reservada!'}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#513D49] sm:text-base">
            {currentStep === 1 &&
              'Para que el Dr. Javier Beiza pueda ofrecerte una atención humana y respetuosa, personalizamos cada detalle antes de la videollamada.'}
            {currentStep === 2 &&
              'Cuéntanos qué ambiente prefieres, a qué ritmo quieres avanzar y cómo te gustaría que nos comuniquemos contigo. Después podrás reservar tu Sesión de Acercamiento Virtual en esta misma página.'}
            {currentStep === 3 &&
              'Una videollamada de 15 minutos en Google Meet para conocernos y resolver tus dudas desde casa, sin sillón dental. Elige tu horario y revisa el valor antes de confirmar.'}
            {currentStep === 4 &&
              'Tu cita ha quedado registrada y vinculada a tus respuestas de confort.'}
          </p>

          {/* Stepper visual con accesibilidad */}
          {currentStep < 4 && (
            <nav aria-label="Progreso del agendamiento" className="mt-8">
              <ol className="grid grid-cols-2 gap-2 sm:gap-4">
                {[
                  { step: 2, title: '1. Encuesta TES', sub: 'Tu Espacio Seguro' },
                  { step: 3, title: '2. Reservar SAV', sub: 'Sesión de Acercamiento Virtual' },
                ].map((item) => {
                  const isCurrent = currentStep === item.step || (currentStep === 1 && item.step === 2);
                  const isCompleted = currentStep > item.step;
                  return (
                    <li
                      key={item.step}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`flex flex-col border-t-4 pt-2.5 transition-colors ${
                        isCurrent
                          ? 'border-[#A14B92] text-[#A14B92]'
                          : isCompleted
                          ? 'border-[#10B981] text-[#10B981]'
                          : 'border-[#E2E7E7] text-[#766C75]'
                      }`}
                    >
                      <span className="text-xs font-bold sm:text-sm">
                        {isCompleted ? `✓ ${item.title}` : item.title}
                      </span>
                      <span className="hidden text-[11px] text-[#513D49] sm:inline">
                        {item.sub}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>
      </section>

      {/* CONTENIDO DEL FLUJO SEGÚN EL PASO ACTIVO */}
      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        {errorMsg && (
          <div
            role="alert"
            className="material-error mb-8 flex items-start gap-3 rounded-2xl p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 1: CUESTIONARIO PREVIO DE SENSIBILIDAD & EXPLICACIÓN        */}
        {/* ================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-8">
            {/* Banner de explicación y advertencia de personalización */}
            <div className="rounded-3xl border border-[#A14B92]/30 bg-[#F8EFF6] p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#A14B92] text-white shadow-sm">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                  <h2 ref={stepHeading} tabIndex={-1} className="font-title text-2xl font-semibold text-[#513D49]">
                    ¿Por qué solicitamos este cuestionario antes de agendar?
                  </h2>
                  <p className="text-sm leading-relaxed text-[#513D49]">
                    El Dr. Javier Beiza lee personalmente tus respuestas antes de la videollamada para comprender tu nivel de sensibilidad, tus temores y adaptar el ritmo de la conversación.
                  </p>
                  <div className="rounded-2xl border border-[#B3BFBF]/40 bg-white/80 p-3.5 text-xs leading-relaxed text-[#513D49]">
                    <strong className="text-[#A14B92]">Importante para tu experiencia:</strong> Puedes omitir tu historia y completar igualmente la encuesta TES para compartir tus preferencias de atención.
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de preguntas ágiles */}
            <div className="material-card rounded-[2rem] p-6 sm:p-9 space-y-7">
              {/* Pregunta 1: Motivo de consulta */}
              <div className="space-y-3">
                <label htmlFor="sav-reason" className="block font-title text-2xl font-semibold text-[#513D49]">
                  1. ¿Cuál es el principal motivo que te hace consultar hoy?
                </label>
                <p id="sav-reason-help" className="text-xs text-[#513D49]">
                  Puedes seleccionar una opción rápida o escribir con tus propias palabras:
                </p>

                {/* Chips de selección rápida */}
                <div className="flex flex-wrap gap-2">
                  {quickReasons.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={reason === item}
                      onClick={() => setReason(item)}
                      className="material-option text-xs font-medium"
                    >
                      {reason === item && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      {item}
                    </button>
                  ))}
                </div>

                <textarea
                  id="sav-reason"
                  aria-describedby="sav-reason-help"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Escribe aquí los detalles que quieras que el doctor conozca..."
                  className="mt-2 material-field text-sm"
                />
              </div>

              {/* Pregunta 2: Nivel de ansiedad frente al dentista */}
              <div className="space-y-3 border-t border-[#E2E7E7] pt-6">
                <label className="block font-title text-2xl font-semibold text-[#513D49]">
                  2. ¿Cómo te sientes respecto a la atención odontológica?
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {anxietyOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition-all ${
                        feeling === opt.id
                          ? 'border-[#A14B92] bg-[#F8EFF6] shadow-sm'
                          : 'border-[#E2E7E7] bg-white hover:bg-[#F6F8F8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="anxiety_level"
                          value={opt.id}
                          checked={feeling === opt.id}
                          onChange={() => setFeeling(opt.id)}
                          className="accent-[#A14B92]"
                        />
                        <strong className="text-sm font-semibold text-[#513D49]">{opt.label}</strong>
                      </div>
                      <span className="mt-1 pl-6 text-xs text-[#513D49]">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pregunta 3: Experiencias anteriores */}
              <div className="space-y-3 border-t border-[#E2E7E7] pt-6">
                <label className="block font-title text-2xl font-semibold text-[#513D49]">
                  3. ¿Has tenido experiencias anteriores difíciles?
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pastExperienceOptions.map((exp) => (
                    <label
                      key={exp}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs transition ${
                        previousExp === exp
                          ? 'border-[#A14B92] bg-[#F8EFF6] font-semibold text-[#513D49]'
                          : 'border-[#E2E7E7] bg-white text-[#513D49] hover:bg-[#F6F8F8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="past_experience"
                        value={exp}
                        checked={previousExp === exp}
                        onChange={() => setPreviousExp(exp)}
                        className="accent-[#A14B92]"
                      />
                      <span>{exp}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Consentimiento Ley 19.628 */}
              <div className="rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-4">
                <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#513D49]">
                  <input
                    type="checkbox"
                    checked={questionnaireConsent}
                    onChange={(e) => setQuestionnaireConsent(e.target.checked)}
                    className="mt-0.5 accent-[#A14B92]"
                  />
                  <span>
                    Autorizo el tratamiento confidencial de mis respuestas para que el Dr. Javier Beiza las revise con fines de orientación médica previa (Ley N° 19.628 y N° 20.584).
                  </span>
                </label>
              </div>

              {/* Botones de acción del paso 1 */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => handleCompleteQuestionnaire(false)}
                  disabled={!canAdvanceQuestionnaire || isSubmitting}
                  className="btn-cado-primary material-button text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>
                    {isSubmitting ? 'Guardando respuestas...' : 'Guardar historia y volver a Encuesta TES'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteQuestionnaire(true)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#766C75] hover:text-[#513D49] hover:underline"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  <span>Continuar a TES sin compartir mi historia</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 2: TEST DE CONFORT AMBIENTAL (BOX CLÍNICO)                  */}
        {/* ================================================================= */}
        {currentStep === 2 && (
          <div id="tes" className="grid scroll-mt-40 gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="min-w-0 space-y-6">
              <h2 ref={stepHeading} tabIndex={-1} className="font-title text-2xl font-semibold">Encuesta de confort</h2>
              <div className="rounded-2xl border border-[#A14B92]/25 bg-[#F8EFF6] p-5 text-sm leading-7">
                Tus preferencias se enviarán con tu reserva. Puedes responder a tu ritmo y añadir tu historia si te ayuda a preparar la conversación.
              </div>

              <button type="button" onClick={() => setCurrentStep(1)}
                className="btn-cado-secondary material-button text-sm font-semibold">
                Agregar mi historia (opcional)
              </button>
              <TesQuestions answers={tes} onChange={updateTes} />

              {/* Botones de navegación del paso 2 */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCompleteComfort}
                  disabled={isSubmitting}
                  className="btn-cado-primary material-button text-sm font-semibold"
                >
                  <span>Continuar a reservar mi SAV</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Tarjeta interactiva en vivo a la derecha */}
            <aside className="lg:sticky lg:top-32 lg:self-start space-y-4">
              <section className="material-card rounded-2xl p-5" aria-labelledby="tes-summary">
                <h3 id="tes-summary" className="mb-4 font-title text-2xl font-semibold">Tu resumen TES</h3>
                <TesSummary answers={tes} />
              </section>
              <section className="material-card-tonal space-y-2 rounded-2xl p-4 text-sm" aria-labelledby="tes-hand-signal">
                <h3 id="tes-hand-signal" className="font-semibold">Pacto de la Mano Levantada</h3>
                <p>Durante la atención, puedes levantar la mano para que nos detengamos. Si prefieres acordar pausas o venir con un acompañante, podemos conversarlo en la SAV.</p>
              </section>
            </aside>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 3: SELECCIÓN DE HORARIO Y DATOS DE CONTACTO                 */}
        {/* ================================================================= */}
        {currentStep === 3 && (
          <div id="sav" className="material-card scroll-mt-40 rounded-[2rem] p-6 sm:p-9 space-y-8">
            <div>
              <h2 ref={stepHeading} tabIndex={-1} className="font-title text-2xl font-semibold text-[#513D49]">
                Selecciona tu horario de SAV
              </h2>
              <p className="mt-1 text-xs text-[#513D49]">
                Horarios vespertinos adaptados a jornadas laborales y turnos de Calama.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {/* Selector de Fecha */}
                <label className="block text-xs font-semibold text-[#513D49]">
                  Fecha de la sesión
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setSlot('');
                    }}
                    className="mt-1.5 material-field text-sm font-normal"
                  />
                </label>

                {/* Resumen de fecha seleccionada */}
                <div className="flex items-center gap-3 rounded-2xl bg-[#F6F8F8] p-4 text-xs">
                  <CalendarDays className="h-5 w-5 text-[#A14B92]" aria-hidden="true" />
                  <div>
                    <strong className="block font-semibold text-[#513D49]">Fecha: {date}</strong>
                    <span>{!supabaseStatus.connected ? 'Consultando disponibilidad de agenda' : validDate ? 'Bloques disponibles abajo' : 'Día no disponible'}</span>
                  </div>
                </div>
              </div>

              <fieldset className="mt-5 min-w-0 space-y-2">
                <legend className="text-sm font-semibold">
                  Bloques horarios disponibles (15 minutos)
                </legend>
                <p role="status" className={slots.length ? 'sr-only' : 'material-card-tonal rounded-xl p-4 text-sm'}>
                  {slots.length
                    ? slots.length + ' horarios disponibles para la fecha seleccionada.'
                    : supabaseStatus.latencyMs === 0
                      ? 'Consultando disponibilidad…'
                      : supabaseStatus.connected === false
                        ? 'No pudimos consultar la agenda. Intenta nuevamente más tarde o coordina tu SAV por WhatsApp.'
                        : 'No hay bloques disponibles para esta fecha. Selecciona otro día en el calendario.'}
                </p>
                {slots.length > 0 && (
                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {slots.map((time) => (
                      <label key={time} className="material-option text-sm font-semibold">
                        <input
                          type="radio"
                          name="sav-time"
                          value={time}
                          checked={slot === time}
                          onChange={() => setSlot(time)}
                          className="h-4 w-4 shrink-0 accent-cado-purple"
                        />
                        <span>{time}–{endTime(time)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </div>

            {/* Datos de contacto del paciente */}
            <div className="border-t border-[#E2E7E7] pt-6 space-y-4">
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                Tus datos de contacto
              </h2>
              <p className="text-sm">
                Los campos marcados con asterisco son obligatorios. Para confirmar, selecciona un horario, completa tus datos y acepta el consentimiento.
              </p>

              <label className="block text-xs font-semibold text-[#513D49]">
                <span className="material-labeled-field">
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder=" "
                    aria-labelledby="sav-name-label"
                    aria-invalid={showNameError || undefined}
                    aria-describedby={showNameError ? 'sav-name-error' : undefined}
                    onBlur={() => setTouchedContact(previous => ({ ...previous, name: true }))}
                    value={patientDraftInfo.name}
                    onChange={(e) =>
                      setPatientDraftInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="material-field text-sm font-normal"
                  />
                  <span id="sav-name-label">Nombre Completo <span className="text-[#A14B92]" aria-hidden="true">*</span></span>
                </span>
                {showNameError && <span id="sav-name-error" className="mt-1 block text-[var(--md-error)]" role="alert">Ingresa un nombre de 3 a 120 caracteres.</span>}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#513D49]">
                  <span className="material-labeled-field">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder=" "
                      aria-labelledby="sav-email-label"
                      aria-invalid={showEmailError || undefined}
                      aria-describedby={showEmailError ? 'sav-email-error sav-email-help' : 'sav-email-help'}
                      onBlur={() => setTouchedContact(previous => ({ ...previous, email: true }))}
                      spellCheck={false}
                      value={patientDraftInfo.email}
                      onChange={(e) =>
                        setPatientDraftInfo((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="material-field text-sm font-normal"
                    />
                    <span id="sav-email-label">Correo Electrónico <span className="text-[#A14B92]" aria-hidden="true">*</span></span>
                  </span>
                  <span id="sav-email-help" className="mt-1 block font-normal">Te enviaremos el enlace de Google Meet a este correo.</span>
                  {showEmailError && <span id="sav-email-error" className="mt-1 block text-[var(--md-error)]" role="alert">Ingresa una dirección de correo electrónico válida.</span>}
                </label>

                <label className="block text-xs font-semibold text-[#513D49]">
                  <span className="material-labeled-field">
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      aria-labelledby="sav-phone-label"
                      aria-invalid={showPhoneError || undefined}
                      aria-describedby={showPhoneError ? 'sav-phone-error' : undefined}
                      onBlur={() => {
                        setTouchedContact(previous => ({ ...previous, phone: true }));
                        setPatientDraftInfo(previous => ({
                          ...previous,
                          phone: formatChileanPhone(previous.phone),
                        }));
                      }}
                      value={patientDraftInfo.phone}
                      onChange={(e) =>
                        setPatientDraftInfo((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder=" "
                      className="material-field text-sm font-normal"
                    />
                    <span id="sav-phone-label">Teléfono / WhatsApp <span className="text-[#A14B92]" aria-hidden="true">*</span></span>
                  </span>
                  {showPhoneError && <span id="sav-phone-error" className="mt-1 block text-[var(--md-error)]" role="alert">Ingresa un teléfono de 8 a 25 caracteres, por ejemplo +56 9 8765 4321.</span>}
                </label>
              </div>
            </div>

            {/* Sello de resumen integrado: Cuestionario + Confort */}
            <div className="rounded-2xl border border-[#E2E7E7] bg-[#F8EFF6] p-4 text-xs space-y-2">
              <strong className="block text-[#513D49]">
                Resumen de vinculación clínica personalizada:
              </strong>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#513D49]">
                <span>
                  {isSkippingQuestionnaire
                    ? '• Historia adicional: No compartida'
                    : '• Historia adicional: Respuestas vinculadas'}
                </span>
              </div>
              <TesSummary answers={tes} />
            </div>

            <SavPayment />

            {/* Checkbox de consentimiento de agendamiento */}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-4 text-xs leading-relaxed text-[#513D49]">
              <input
                type="checkbox"
                checked={finalConsent}
                onChange={(e) => setFinalConsent(e.target.checked)}
                className="mt-0.5 accent-[#A14B92]"
              />
              <span>
                Acepto el tratamiento confidencial de mis datos personales (Ley N° 19.628) y entiendo que esta orientación telemática informativa no reemplaza una evaluación odontológica presencial.
              </span>
            </label>

            {/* Botones de acción del paso 3 */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-cado-secondary material-button text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Volver a Encuesta TES</span>
              </button>

              <button
                type="button"
                disabled={!canConfirmBooking || isSubmitting}
                onClick={handleFinalBooking}
                className="btn-cado-primary material-button text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isSubmitting ? 'Registrando reserva...' : 'Confirmar reserva de SAV'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 4: CONFIRMACIÓN FINAL CON ENLACE DE GOOGLE MEET              */}
        {/* ================================================================= */}
        {currentStep === 4 && createdAppointment && (
          <div className="material-card rounded-[2rem] p-7 sm:p-10 space-y-6 text-center max-w-2xl mx-auto">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#10B981]/15 text-[#10B981] shadow-inner">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </span>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A14B92]">
                Código de Cita: {createdAppointment.id}
              </span>
              <h2 ref={stepHeading} tabIndex={-1} className="font-title text-4xl font-semibold text-[#513D49]">
                {createdAppointment.status === 'Cancelada' ? 'Tu SAV fue cancelada' : createdAppointment.status === 'Programada' ? '¡Tu SAV está reservada!' : 'Estado de tu SAV'}
              </h2>
              {createdAppointment.status === 'Programada' && <p className="text-sm text-[#513D49] max-w-md mx-auto">
                {calendarStatus === 'Sincronizado' ? 'Tu evento de Google está sincronizado para' : 'La reserva está guardada. La videollamada y la notificación están pendientes para'}{' '}
                <strong className="break-all text-[#A14B92]">{createdAppointment.email}</strong>.
              </p>}
            </div>

            {/* Tarjeta de horario y enlace Meet */}
            <p className="text-sm font-semibold">Estado de la sesión: {createdAppointment.status}</p>
            <div className="rounded-2xl border border-[#E2E7E7] bg-[#F8EFF6] p-5 text-left space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#E2E7E7] pb-2">
                <span className="font-semibold text-[#513D49]">Fecha y hora:</span>
                <span className="font-bold text-[#A14B92]">
                  {createdAppointment.date} a las {createdAppointment.time} hrs
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-[#E2E7E7] pb-2">
                <span className="font-semibold text-[#513D49]">Paciente:</span>
                <span>{createdAppointment.patientName}</span>
              </div>
              {Object.values(tes).some(Boolean) && <p className="text-xs font-semibold text-emerald-800">
                Tus preferencias quedaron registradas con la reserva.
              </p>}
            </div>

            {createdAppointment.status === 'Programada' && <SavPayment bookingCode={createdAppointment.id} />}

            {/* Botones de Calendario: Google Calendar y Descarga .ics (RF-13 & RF-16) */}
            {createdAppointment.status === 'Programada' && <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
              {googleCalendarUrl && (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-xs font-semibold text-[#513D49] hover:border-[#A14B92] hover:bg-[#F6F8F8] transition shadow-sm"
                >
                  <CalendarDays className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
                  <span>Añadir a Google Calendar</span>
                </a>
              )}
              <button type="button" onClick={async () => {
                try { const response=await fetch('/api/orientaciones/calendar',{headers:{'x-management-token':managementSecret}});if(!response.ok)throw Error();const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='CADO_Orientacion.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); } catch {setErrorMsg('No se pudo descargar el calendario.');}
              }} className="btn-cado-secondary rounded-xl px-4 py-3 text-xs font-semibold">Descargar calendario .ics</button>
            </div>}

            {/* Acceso a autogestión */}
            <div className="pt-2 text-xs text-[#766C75]">
              ¿Necesitas reprogramar o anular más adelante?{' '}
              <Link
                href={`/gestionar#token=${managementSecret}`}
                className="font-semibold text-[#A14B92] hover:underline"
              >
                Gestionar o reprogramar mi orientación aquí
              </Link>
            </div>

            {/* Botón directo a Google Meet */}
            {createdAppointment.status === 'Programada' && createdAppointment.meetLink && (
              <a
                href={createdAppointment.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold shadow-md"
              >
                <Video className="h-4 w-4" aria-hidden="true" />
                <span>Abrir enlace de videollamada en Google Meet</span>
              </a>
            )}

            {/* Botón de contacto directo con WhatsApp */}
            <div className="pt-2">
              <a
                href={`https://wa.me/56944657815?text=${encodeURIComponent(
                  `Hola Dr. Javier Beiza, acabo de agendar la orientación telemática ${createdAppointment.id} para el día ${createdAppointment.date} a las ${createdAppointment.time} hrs.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#8A3D7D] hover:underline"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Avisar al doctor por WhatsApp sobre esta reserva</span>
              </a>
            </div>

            <div className="pt-4 border-t border-[#E2E7E7]">
              <Link
                href="/"
                className="btn-cado-secondary inline-flex rounded-xl px-5 py-2.5 text-xs font-semibold"
              >
                Volver a la página principal
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function UnifiedBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white p-12 text-[#513D49]">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#A14B92] border-t-transparent" />
            <span>Cargando Encuesta TES y reserva de SAV...</span>
          </div>
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
