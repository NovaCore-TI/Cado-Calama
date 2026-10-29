'use client';

import { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hand,
  HeartHandshake,
  MessageCircle,
  PauseCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCado, type Appointment, type ComfortProfile, type QuestionnaireSubmission } from '@/context/CadoContext';
import { ConfortLiveCard } from '@/components/ConfortLiveCard';
import { isVideoReady } from '@/lib/appointment-sync-status';

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

const soundOptions = [
  { id: 'musica_suave', label: 'Música suave relajante', desc: 'Música ambiental tranquila en el box durante la atención.', icon: Volume2 },
  { id: 'silencio', label: 'Silencio y calma total', desc: 'Sin música de fondo, ambiente silencioso y despejado.', icon: VolumeX },
] as const;

function BookingWizard() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const initialStep: 1 | 2 | 3 | 4 = stepParam === '2' ? 2 : stepParam === '3' ? 3 : 1;

  const {
    availableSlots,
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
  const [isSkippingQuestionnaire, setIsSkippingQuestionnaire] = useState(false);
  const [savedQuestionnaire, setSavedQuestionnaire] = useState<QuestionnaireSubmission | null>(null);

  // Estados del Paso 2: Confort
  const [sound, setSound] = useState<'musica_suave' | 'silencio'>(
    activeComfortProfile.soundPreference === 'silencio' ? 'silencio' : 'musica_suave'
  );
  const [breaks, setBreaks] = useState(activeComfortProfile.jawBreaks ?? true);
  const [companion, setCompanion] = useState(activeComfortProfile.companionAllowed ?? false);
  const [stopSignal, setStopSignal] = useState(activeComfortProfile.handSignalPledge ?? true);
  const [explanation, setExplanation] = useState(true);
  const [comfortNotes, setComfortNotes] = useState(activeComfortProfile.notes || '');

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
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const videoReady = isVideoReady(calendarStatus, createdAppointment?.meetLink);

  const refreshCalendarStatus = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/orientaciones', {
      headers: { 'x-management-token': managementSecret }, cache: 'no-store', signal,
    });
    const result = await response.json();
    if (!response.ok || !result.data) throw Error('No se pudo consultar la videollamada. Tu reserva sigue guardada.');
    if (signal?.aborted) return false;
    setCalendarStatus(result.data.estado_sync);
    setCreatedAppointment(previous => previous ? {
      ...previous, meetLink: result.data.meet_link || '', status: result.data.estado_atencion,
    } : previous);
    return isVideoReady(result.data.estado_sync, result.data.meet_link);
  }, [managementSecret]);

  useEffect(() => {
    if (!managementSecret || currentStep !== 4) return;
    const controller = new AbortController();
    const deadline = Date.now() + 60_000;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let ready = false;
      try { ready = await refreshCalendarStatus(controller.signal); } catch { /* Keep the saved reservation visible. */ }
      if (!ready && !controller.signal.aborted && Date.now() < deadline) timer = setTimeout(poll, 2000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [managementSecret, currentStep, refreshCalendarStatus]);

  const validDate = date >= today && !blockedDates.includes(date);
  const slots = availableSlots
    .filter((value) => value.startsWith(`${date}|`))
    .map((value) => value.split('|')[1])
    .filter((value) => /^\d{2}:\d{2}$/.test(value))
    .sort();

  // Validación de Paso 1
  const canAdvanceQuestionnaire = reason.trim().length >= 3 && questionnaireConsent;

  // Validación de Paso 3
  const canConfirmBooking =
    patientDraftInfo.name.trim().length >= 3 &&
    patientDraftInfo.email.includes('@') &&
    patientDraftInfo.phone.trim().length >= 8 &&
    slot.length > 0 &&
    finalConsent;

  // Manejo de paso 1 -> paso 2
  async function handleCompleteQuestionnaire(skip = false) {
    setErrorMsg('');
    if (skip) {
      setIsSkippingQuestionnaire(true);
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrorMsg('No se pudo guardar el cuestionario. Intenta nuevamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Manejo de paso 2 -> paso 3
  async function handleCompleteComfort() {
    setErrorMsg('');
    const profile: ComfortProfile = {
      anxietyLevel: (feeling as ComfortProfile['anxietyLevel']) || 'nervioso',
      soundPreference: sound,
      jawBreaks: breaks,
      companionAllowed: companion,
      handSignalPledge: stopSignal,
      notes: comfortNotes.trim(),
      explanationStepByStep: explanation,
    };

    setIsSubmitting(true);
    try {
      await saveComfortPreferences(profile);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Manejo de confirmación final
  async function handleFinalBooking() {
    if (!canConfirmBooking) return;
    setErrorMsg('');
    setIsSubmitting(true);

    const comfortPayload: ComfortProfile = {
      anxietyLevel: isSkippingQuestionnaire ? 'tranquilo' : ((feeling as ComfortProfile['anxietyLevel']) || 'nervioso'),
      soundPreference: sound,
      jawBreaks: breaks,
      companionAllowed: companion,
      handSignalPledge: stopSignal,
      notes: comfortNotes.trim(),
      explanationStepByStep: explanation,
    };

    try {
      const res = await fetch('/api/orientaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientDraftInfo.name.trim(),
          email: patientDraftInfo.email.trim(),
          phone: patientDraftInfo.phone.trim(),
          date,
          time: slot,
          consent: finalConsent,
          cuestionarioId: isSkippingQuestionnaire ? null : ((savedQuestionnaire?.id || activeQuestionnaire?.id) || null),
          comfortProfile: comfortPayload,
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
        comfortProfile: comfortPayload,
        questionnaire: isSkippingQuestionnaire ? undefined : (savedQuestionnaire || activeQuestionnaire || undefined),
        meetLink: json.data?.meet_link || '',
        derivationStatus: 'Sin derivación',
        skipSupabaseSync: true, // ¡Ya fue guardado e insertado por /api/orientaciones!
      });

      setCreatedAppointment(app);
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <span>Orientación Virtual de 15 Minutos · Calama</span>
          </div>

          <h1 className="mt-4 font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl">
            {currentStep === 1 && 'Paso 1: Tu historia y nivel de confort'}
            {currentStep === 2 && 'Paso 2: Personalización del box clínico'}
            {currentStep === 3 && 'Paso 3: Reserva tu horario y datos'}
            {currentStep === 4 && (videoReady ? '¡Orientación virtual confirmada!' : 'Reserva guardada; videollamada pendiente')}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#513D49] sm:text-base">
            {currentStep === 1 &&
              'Para que el Dr. Javier Beiza pueda ofrecerte una atención humana y respetuosa, personalizamos cada detalle antes de la videollamada.'}
            {currentStep === 2 &&
              'Elige las condiciones en que te gustaría que esté el box clínico en Edificio Espacio Parque: ambiente sonoro, pausas y señal de parada.'}
            {currentStep === 3 &&
              'Selecciona el día y bloque horario vespertino que mejor se acomode a tus turnos o jornada laboral.'}
            {currentStep === 4 &&
              'Tu cita ha quedado registrada y vinculada a tus respuestas de confort.'}
          </p>

          {/* Stepper visual con accesibilidad */}
          {currentStep < 4 && (
            <nav aria-label="Progreso del agendamiento" className="mt-8">
              <ol className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { step: 1, title: '1. Cuestionario', sub: 'Tu sensibilidad' },
                  { step: 2, title: '2. Confort', sub: 'Ambiente y pausas' },
                  { step: 3, title: '3. Horario', sub: 'Reserva final' },
                ].map((item) => {
                  const isCurrent = currentStep === item.step;
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
      <div className="mx-auto max-w-5xl px-6 pt-10">
        {errorMsg && (
          <div
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
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
                  <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                    ¿Por qué solicitamos este cuestionario antes de agendar?
                  </h2>
                  <p className="text-sm leading-relaxed text-[#513D49]">
                    El Dr. Javier Beiza lee personalmente tus respuestas antes de la videollamada para comprender tu nivel de sensibilidad, tus temores y adaptar el ritmo de la conversación.
                  </p>
                  <div className="rounded-2xl border border-[#B3BFBF]/40 bg-white/80 p-3.5 text-xs leading-relaxed text-[#513D49]">
                    <strong className="text-[#A14B92]">Importante para tu experiencia:</strong> Si decides omitir este cuestionario, podrás agendar de todos modos, pero la orientación se realizará con el <em>protocolo clínico estándar sin personalización de pausas ni adaptación a tus sensibilidades</em>.
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de preguntas ágiles */}
            <div className="clay-card rounded-[2rem] p-6 sm:p-9 space-y-7">
              {/* Pregunta 1: Motivo de consulta */}
              <div className="space-y-3">
                <label className="block font-title text-2xl font-semibold text-[#513D49]">
                  1. ¿Cuál es el principal motivo que te hace consultar hoy?
                </label>
                <p className="text-xs text-[#513D49]">
                  Puedes seleccionar una opción rápida o escribir con tus propias palabras:
                </p>

                {/* Chips de selección rápida */}
                <div className="flex flex-wrap gap-2">
                  {quickReasons.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setReason(item)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                        reason === item
                          ? 'border-[#A14B92] bg-[#A14B92] text-white shadow-sm'
                          : 'border-[#B3BFBF] bg-white text-[#513D49] hover:bg-[#F6F8F8]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <textarea
                  aria-label="Detalles del motivo de consulta"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Escribe aquí los detalles que quieras que el doctor conozca..."
                  className="mt-2 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3.5 text-sm outline-none focus:border-[#A14B92]"
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
                  className="btn-cado-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>
                    {isSubmitting ? 'Guardando respuestas...' : 'Guardar y avanzar a Test de Confort'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteQuestionnaire(true)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#766C75] hover:text-[#513D49] hover:underline"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  <span>Omitir cuestionario (Continuar con atención estándar)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 2: TEST DE CONFORT AMBIENTAL (BOX CLÍNICO)                  */}
        {/* ================================================================= */}
        {currentStep === 2 && (
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-6">
              {isSkippingQuestionnaire && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  ⚠️ Has elegido omitir el cuestionario previo. Aún puedes configurar tus preferencias de confort ambiental para el box si lo deseas.
                </div>
              )}

              {/* Preferencia de sonido */}
              <fieldset className="clay-card rounded-[2rem] p-6 sm:p-7">
                <legend className="font-title text-2xl font-semibold text-[#513D49]">
                  1. Ambiente sonoro del box
                </legend>
                <p className="mt-1 text-xs text-[#513D49]">
                  ¿Cómo te gustaría que esté el espacio clínico antes de tu ingreso?
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {soundOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${
                          sound === opt.id
                            ? 'border-[#A14B92] bg-[#F8EFF6] shadow-sm'
                            : 'border-[#E2E7E7] bg-white hover:bg-[#F6F8F8]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="h-5 w-5 text-[#A14B92]" aria-hidden="true" />
                          <input
                            type="radio"
                            name="sound_opt"
                            value={opt.id}
                            checked={sound === opt.id}
                            onChange={() => setSound(opt.id)}
                            className="accent-[#A14B92]"
                          />
                        </div>
                        <strong className="mt-2 text-sm font-semibold text-[#513D49]">{opt.label}</strong>
                        <span className="mt-1 text-xs leading-relaxed text-[#513D49]">{opt.desc}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Pausas, acompañante y pacto de mano */}
              <fieldset className="clay-card rounded-[2rem] p-6 sm:p-7 space-y-4">
                <legend className="font-title text-2xl font-semibold text-[#513D49]">
                  2. Control, pausas y acompañamiento
                </legend>

                <div className="space-y-3">
                  {[
                    {
                      label: 'Solicitar pausas periódicas para descansar la mandíbula',
                      desc: 'Hacemos detenciones conscientes cada 5-7 minutos.',
                      checked: breaks,
                      onChange: setBreaks,
                      icon: PauseCircle,
                    },
                    {
                      label: 'Acordar señal con la mano (Stop Signal) para detenernos de inmediato',
                      desc: 'Si levantas la mano, el doctor detiene cualquier procedimiento al instante.',
                      checked: stopSignal,
                      onChange: setStopSignal,
                      icon: Hand,
                    },
                    {
                      label: 'Asistir con un acompañante de confianza al box',
                      desc: 'Permitido para darte tranquilidad durante toda la sesión.',
                      checked: companion,
                      onChange: setCompanion,
                      icon: Users,
                    },
                    {
                      label: 'Explicación tranquila paso a paso antes de cada acción',
                      desc: 'Te contamos qué se siente antes de aplicar cualquier instrumento.',
                      checked: explanation,
                      onChange: setExplanation,
                      icon: HeartHandshake,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <label
                        key={item.label}
                        className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-[#E2E7E7] bg-white p-4 transition hover:bg-[#F6F8F8]"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.onChange(e.target.checked)}
                          className="mt-1 accent-[#A14B92]"
                        />
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A14B92]" aria-hidden="true" />
                        <div>
                          <strong className="block text-sm font-semibold text-[#513D49]">
                            {item.label}
                          </strong>
                          <span className="text-xs text-[#513D49]">{item.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-[#513D49]">
                    Comentario adicional o necesidad específica (opcional)
                    <input
                      type="text"
                      value={comfortNotes}
                      onChange={(e) => setComfortNotes(e.target.value)}
                      placeholder="Ej: Tengo dolor en el cuello si el sillón baja demasiado..."
                      className="mt-1.5 w-full rounded-xl border border-[#B3BFBF] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#A14B92]"
                    />
                  </label>
                </div>
              </fieldset>

              {/* Botones de navegación del paso 2 */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-cado-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Volver al cuestionario</span>
                </button>
                <button
                  type="button"
                  onClick={handleCompleteComfort}
                  disabled={isSubmitting}
                  className="btn-cado-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold shadow-md"
                >
                  <span>Elegir horario y confirmar cita</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Tarjeta interactiva en vivo a la derecha */}
            <aside className="lg:sticky lg:top-32 lg:self-start space-y-4">
              <ConfortLiveCard
                soundPreference={sound}
                jawBreaks={breaks}
                companionAllowed={companion}
                handSignalPledge={stopSignal}
              />
              <p className="text-center text-xs text-[#766C75]">
                Esta configuración se enviará a la bandeja clínica del Dr. Javier Beiza.
              </p>
            </aside>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 3: SELECCIÓN DE HORARIO Y DATOS DE CONTACTO                 */}
        {/* ================================================================= */}
        {currentStep === 3 && (
          <div className="clay-card rounded-[2rem] p-6 sm:p-9 space-y-8">
            <div>
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                Selecciona tu fecha y bloque de orientación virtual
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
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                  />
                </label>

                {/* Resumen de fecha seleccionada */}
                <div className="flex items-center gap-3 rounded-2xl bg-[#F6F8F8] p-4 text-xs">
                  <CalendarDays className="h-5 w-5 text-[#A14B92]" aria-hidden="true" />
                  <div>
                    <strong className="block font-semibold text-[#513D49]">Fecha: {date}</strong>
                    <span>{validDate ? 'Bloques disponibles abajo' : 'Día no disponible'}</span>
                  </div>
                </div>
              </div>

              {/* Botones de bloques horarios disponibles */}
              <div className="mt-5 space-y-2">
                <span className="block text-xs font-semibold text-[#513D49]">
                  Bloques horarios disponibles (15 minutos):
                </span>
                {slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#B3BFBF] p-4 text-center text-xs text-[#766C75]">
                    No hay bloques disponibles para esta fecha. Selecciona otro día en el calendario.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {slots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSlot(time)}
                        className={`rounded-xl border px-3.5 py-3 text-xs font-semibold transition ${
                          slot === time
                            ? 'border-[#A14B92] bg-[#A14B92] text-white shadow-sm'
                            : 'border-[#B3BFBF] bg-white text-[#513D49] hover:border-[#A14B92]'
                        }`}
                      >
                        {time}–{endTime(time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Datos de contacto del paciente */}
            <div className="border-t border-[#E2E7E7] pt-6 space-y-4">
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                Tus datos de contacto
              </h2>

              <label className="block text-xs font-semibold text-[#513D49]">
                Nombre completo <span className="text-[#A14B92]">*</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={patientDraftInfo.name}
                  onChange={(e) =>
                    setPatientDraftInfo((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Javiera Morales"
                  className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#513D49]">
                  Correo electrónico (para enviarte el Meet) <span className="text-[#A14B92]">*</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={patientDraftInfo.email}
                    onChange={(e) =>
                      setPatientDraftInfo((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="javiera@correo.cl"
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                  />
                </label>

                <label className="block text-xs font-semibold text-[#513D49]">
                  Teléfono / WhatsApp <span className="text-[#A14B92]">*</span>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    value={patientDraftInfo.phone}
                    onChange={(e) =>
                      setPatientDraftInfo((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+56 9 8765 4321"
                    className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                  />
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
                    ? '• Cuestionario previo: Omitido (Protocolo estándar)'
                    : '• Cuestionario previo: Respuestas vinculadas'}
                </span>
                <span>• Ambiente sonoro: {sound === 'silencio' ? 'Silencio' : 'Música suave'}</span>
                <span>• Pausas mandibulares: {breaks ? 'Activadas' : 'A demanda'}</span>
                <span>• Señal de mano (Stop): {stopSignal ? 'Acordada' : 'No'}</span>
              </div>
            </div>

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
                className="btn-cado-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Volver a confort</span>
              </button>

              <button
                type="button"
                disabled={!canConfirmBooking || isSubmitting}
                onClick={handleFinalBooking}
                className="btn-cado-primary inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isSubmitting ? 'Registrando reserva...' : 'Confirmar Reserva de Orientación'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 4: CONFIRMACIÓN FINAL CON ENLACE DE GOOGLE MEET              */}
        {/* ================================================================= */}
        {currentStep === 4 && createdAppointment && (
          <div className="clay-card rounded-[2rem] p-7 sm:p-10 space-y-6 text-center max-w-2xl mx-auto">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#10B981]/15 text-[#10B981] shadow-inner">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </span>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A14B92]">
                Código de Cita: {createdAppointment.id}
              </span>
              <h2 className="font-title text-4xl font-semibold text-[#513D49]">
                {videoReady ? '¡Tu orientación virtual está confirmada!' : 'Tu horario está reservado'}
              </h2>
              <p role="status" className="text-sm text-[#513D49] max-w-md mx-auto">
                {videoReady ? 'Tu videollamada está lista y se solicitó el envío de la invitación a' : 'La videollamada y su invitación siguen pendientes para'}{' '}
                <strong className="text-[#A14B92]">{createdAppointment.email}</strong>.
              </p>
              {!videoReady && <>
                <p className="text-sm text-[#513D49]">Conserva tu enlace privado de gestión. No necesitas volver a reservar.</p>
                <button type="button" disabled={checkingCalendar} className="btn-cado-secondary rounded-xl px-4 py-3 text-xs" onClick={async () => {
                  setCheckingCalendar(true); setErrorMsg('');
                  try { await refreshCalendarStatus(); } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'No se pudo consultar el estado.'); }
                  finally { setCheckingCalendar(false); }
                }}>{checkingCalendar ? 'Consultando…' : 'Consultar estado de la videollamada'}</button>
              </>}
            </div>

            {/* Tarjeta de horario y enlace Meet */}
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
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#513D49]">Pacto de confort:</span>
                <span className="text-[#10B981] font-semibold">
                  ✓ {createdAppointment.comfortProfile.soundPreference === 'silencio' ? 'Silencio' : 'Música'} · {createdAppointment.comfortProfile.handSignalPledge ? 'Señal de pausa solicitada' : 'Preferencias registradas'}
                </span>
              </div>
            </div>

            {/* Botones de Calendario: Google Calendar y Descarga .ics (RF-13 & RF-16) */}
            <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
              {videoReady && googleCalendarUrl && (
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
              <button type="button" disabled={!videoReady} onClick={async () => {
                try { const response=await fetch('/api/orientaciones/calendar',{headers:{'x-management-token':managementSecret}});if(!response.ok)throw Error();const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='CADO_Orientacion.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); } catch {setErrorMsg('No se pudo descargar el calendario.');}
              }} className="btn-cado-secondary rounded-xl px-4 py-3 text-xs font-semibold">Descargar calendario .ics</button>
            </div>

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
            {videoReady && (
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
            <span>Cargando flujo de reserva personalizada...</span>
          </div>
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
