'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  HeartHandshake,
  Info,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { useCado, type Appointment } from '@/context/CadoContext';
import { ConfortLiveCard } from '@/components/ConfortLiveCard';

function endTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const end = hour * 60 + minute + 15;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

export default function OrientacionPage() {
  const {
    availableSlots,
    blockedDates,
    addAppointment,
    activeComfortProfile,
    activeQuestionnaire,
    patientDraftInfo,
    setPatientDraftInfo,
  } = useCado();

  const today = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    []
  );
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState('');
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<'seleccion' | 'resumen' | 'final'>('seleccion');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  const validDate = date >= today && !blockedDates.includes(date);
  const slots = availableSlots
    .filter((value) => value.startsWith(`${date}|`))
    .map((value) => value.split('|')[1])
    .filter((value) => /^\d{2}:\d{2}$/.test(value))
    .sort();

  const canConfirmBooking =
    patientDraftInfo.name.trim().length >= 3 &&
    patientDraftInfo.email.includes('@') &&
    patientDraftInfo.phone.trim().length >= 8 &&
    consent;

  async function handleConfirmBooking() {
    if (!canConfirmBooking) return;
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orientaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientDraftInfo.name,
          email: patientDraftInfo.email,
          phone: patientDraftInfo.phone,
          date,
          time: slot,
          consent,
          cuestionarioId: activeQuestionnaire?.id || null,
          comfortProfile: activeComfortProfile,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || 'No se pudo procesar la reserva.');
        setIsSubmitting(false);
        return;
      }

      const app = addAppointment({
        patientName: patientDraftInfo.name.trim(),
        email: patientDraftInfo.email.trim(),
        phone: patientDraftInfo.phone.trim(),
        date,
        time: slot,
        comfortProfile: activeComfortProfile,
        questionnaire: activeQuestionnaire || undefined,
        meetLink: json.data?.meet_link || '',
        derivationStatus: 'Sin derivación',
      });

      setCreatedAppointment(app);
      setStage('final');
    } catch {
      const app = addAppointment({
        patientName: patientDraftInfo.name.trim(),
        email: patientDraftInfo.email.trim(),
        phone: patientDraftInfo.phone.trim(),
        date,
        time: slot,
        comfortProfile: activeComfortProfile,
        questionnaire: activeQuestionnaire || undefined,
        meetLink: '',
        derivationStatus: 'Sin derivación',
      });
      setCreatedAppointment(app);
      setStage('final');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-[70vh] bg-[#F6F8F8] px-6 py-14 text-[#513D49] sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-9 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="section-eyebrow">Orientación Virtual de 15 Minutos</p>
            <h1 className="mt-3 font-title text-5xl font-semibold leading-tight sm:text-6xl">
              Una conversación antes de la consulta.
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-[#665D66]">
              La orientación virtual dura 15 minutos y vincula automáticamente tu Cuestionario de Perfilamiento y tu Test de Confort para que el Dr. Javier Beiza te reciba preparado.
            </p>

            <div className="mt-8 rounded-[2rem] border border-white bg-white p-6 shadow-[0_18px_45px_rgba(81,61,73,.07)] sm:p-9">
              <div className="mb-7 flex flex-wrap gap-3 text-xs font-semibold">
                {['1 · Horario', '2 · Datos y Consentimiento', '3 · Confirmación'].map(
                  (label, index) => (
                    <span
                      key={label}
                      className={`rounded-full px-4 py-2 ${
                        index === ['seleccion', 'resumen', 'final'].indexOf(stage)
                          ? 'bg-[#A14B92] text-white'
                          : 'bg-[#E6EBEB] text-[#513D49]'
                      }`}
                    >
                      {label}
                    </span>
                  )
                )}
              </div>

              {stage === 'seleccion' && (
                <>
                  <h2 className="font-title text-3xl font-semibold">
                    Elige una fecha y un bloque virtual
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#665D66]">
                    Bloques vespertinos de 15 minutos en hora de Chile (America/Santiago).
                  </p>
                  <label className="mt-7 block text-sm font-semibold">
                    Fecha de orientación
                    <input
                      type="date"
                      value={date}
                      min={today}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setSlot('');
                      }}
                      className="mt-2 block w-full max-w-sm rounded-xl border border-[#B3BFBF] bg-white px-4 py-3"
                    />
                  </label>
                  {date && !validDate && (
                    <p role="status" className="mt-3 text-sm text-[#8A3D7D]">
                      {blockedDates.includes(date)
                        ? 'El doctor bloqueó esta fecha por feriado o agenda.'
                        : 'Selecciona una fecha futura.'}
                    </p>
                  )}

                  <div className="mt-7">
                    <p className="text-sm font-semibold">Bloques disponibles de 15 minutos</p>
                    <p className="mt-1 text-xs text-[#766C75]">
                      {date ? `Disponibilidad para ${date}` : 'Selecciona primero una fecha'}
                    </p>
                    {slots.length === 0 ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-[#B3BFBF] bg-[#F6F8F8] p-5 text-sm leading-7 text-[#665D66]">
                        No hay bloques disponibles para esta fecha. Prueba seleccionando mañana o habilita nuevos bloques desde la Intranet del Doctor (/admin).
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {slots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            disabled={!validDate}
                            onClick={() => setSlot(time)}
                            aria-pressed={slot === time}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                              slot === time
                                ? 'border-[#A14B92] bg-[#A14B92] text-white'
                                : 'border-[#B3BFBF] bg-white hover:border-[#A14B92]'
                            }`}
                          >
                            {time}–{endTime(time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!validDate || !slot}
                    onClick={() => setStage('resumen')}
                    className="btn-cado-primary mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuar con mis datos <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {stage === 'resumen' && (
                <>
                  <h2 className="font-title text-3xl font-semibold">
                    Datos de contacto y vinculación
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#F6F8F8] p-4">
                      <CalendarDays className="h-5 w-5 text-[#A14B92]" />
                      <p className="mt-2 text-sm font-semibold">{date}</p>
                      <p className="text-xs text-[#665D66]">Fecha seleccionada</p>
                    </div>
                    <div className="rounded-2xl bg-[#F6F8F8] p-4">
                      <Clock3 className="h-5 w-5 text-[#A14B92]" />
                      <p className="mt-2 text-sm font-semibold">
                        {slot}–{endTime(slot)} · Hora de Chile
                      </p>
                      <p className="text-xs text-[#665D66]">Duración: 15 minutos</p>
                    </div>
                  </div>

                  {errorMsg && (
                    <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                      {errorMsg}
                    </p>
                  )}

                  <div className="mt-6 space-y-4">
                    <label className="block text-sm font-semibold">
                      Nombre completo <span className="text-[#A14B92]">*</span>
                      <input
                        type="text"
                        required
                        value={patientDraftInfo.name}
                        onChange={(e) =>
                          setPatientDraftInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Ej: Javiera Morales"
                        className="mt-1.5 w-full rounded-xl border border-[#B3BFBF] px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">
                        Correo electrónico <span className="text-[#A14B92]">*</span>
                        <input
                          type="email"
                          required
                          value={patientDraftInfo.email}
                          onChange={(e) =>
                            setPatientDraftInfo((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="javiera@correo.cl"
                          className="mt-1.5 w-full rounded-xl border border-[#B3BFBF] px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                        />
                      </label>
                      <label className="block text-sm font-semibold">
                        Teléfono / WhatsApp <span className="text-[#A14B92]">*</span>
                        <input
                          type="tel"
                          required
                          value={patientDraftInfo.phone}
                          onChange={(e) =>
                            setPatientDraftInfo((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="+56 9 8765 4321"
                          className="mt-1.5 w-full rounded-xl border border-[#B3BFBF] px-4 py-3 text-sm font-normal outline-none focus:border-[#A14B92]"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <ConfortLiveCard
                      compact
                      soundPreference={activeComfortProfile.soundPreference}
                      jawBreaks={activeComfortProfile.jawBreaks}
                      companionAllowed={activeComfortProfile.companionAllowed}
                      handSignalPledge={activeComfortProfile.handSignalPledge}
                    />
                  <div className="rounded-2xl border border-[#E2E7E7] bg-[#F8EFF6]/50 p-4 text-xs leading-6 text-[#513D49]">
                    <strong>Preferencias de Confort vinculadas:</strong> Ambiente:{' '}
                    {activeComfortProfile.soundPreference === 'silencio'
                      ? 'Silencio'
                      : 'Música suave'}{' '}
                    · Pausas: {activeComfortProfile.jawBreaks ? 'Sí' : 'No'} · Acompañante:{' '}
                    {activeComfortProfile.companionAllowed ? 'Sí' : 'No'}
                    {activeQuestionnaire && (
                      <span className="block text-[#8A3D7D]">
                        ✓ Cuestionario Previo #{activeQuestionnaire.id} vinculado a esta solicitud.
                      </span>
                    )}
                  </div>

                  </div>

                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E7E7] bg-[#F6F8F8] p-4 text-xs sm:text-sm leading-6">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 accent-[#A14B92]"
                    />
                    <span>
                      Acepto el tratamiento confidencial de mis datos personales (Ley N° 19.628) y autorizo vincular mis respuestas de confort a esta reserva telemática.{' '}
                      <strong className="text-[#A14B92]">Obligatorio *</strong>
                    </span>
                  </label>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setStage('seleccion')}
                      className="btn-cado-secondary rounded-xl px-5 py-3 text-sm font-semibold"
                    >
                      Cambiar horario
                    </button>
                    <button
                      type="button"
                      disabled={!canConfirmBooking || isSubmitting}
                      onClick={handleConfirmBooking}
                      className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Database className="h-4 w-4" />
                      <span>
                        {isSubmitting ? 'Registrando reserva...' : 'Confirmar Reserva Telemática'}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {stage === 'final' && createdAppointment && (
                <div role="status" className="py-5">
                  <CheckCircle2 className="h-12 w-12 text-[#A14B92]" />
                  <span className="mt-3 inline-flex rounded-full bg-[#F8EFF6] px-3.5 py-1 text-xs font-bold text-[#8A3D7D]">
                    Código de Reserva: {createdAppointment.id} · Estado: {createdAppointment.status}
                  </span>
                  <h2 className="mt-3 font-title text-3xl font-semibold">
                    ¡Orientación Telemática Programada!
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#665D66]">
                    Hola <strong>{createdAppointment.patientName}</strong>, tu orientación quedó registrada para el{' '}
                    <strong>{createdAppointment.date}</strong> de{' '}
                    <strong>
                      {createdAppointment.time} a {endTime(createdAppointment.time)}
                    </strong>{' '}
                    (hora de Chile). Ya puedes visualizarla en la Bandeja del Doctor en{' '}
                    <Link href="/admin" className="font-bold text-[#A14B92] underline">
                      /admin
                    </Link>
                    .
                  </p>
                  <div className="mt-5 rounded-2xl bg-[#F6F8F8] p-5 text-sm leading-7">
                    <p className="font-semibold">Enlace Meet y Autogestión</p>
                    <p className="text-xs text-[#665D66]">
                      Sala asignada: <span className="font-mono">{createdAppointment.meetLink}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <Link
                        href="/gestionar"
                        className="inline-flex items-center gap-2 font-semibold text-[#8A3D7D] hover:underline"
                      >
                        Autogestionar / Cancelar cita <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 font-semibold text-[#A14B92] hover:underline"
                      >
                        Ver en Bandeja del Doctor <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStage('seleccion');
                      setSlot('');
                      setConsent(false);
                    }}
                    className="btn-cado-secondary mt-6 rounded-xl px-5 py-3 text-sm font-semibold"
                  >
                    Agendar otra orientación
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="glass-panel rounded-3xl p-6">
              <Video className="h-7 w-7 text-[#A14B92]" />
              <h2 className="mt-4 font-title text-2xl font-semibold">Antes de la llamada</h2>
              <p className="mt-2 text-sm leading-7 text-[#665D66]">
                El cuestionario previo y el test de confort se asocian automáticamente a tu reserva al confirmar tu consentimiento informado.
              </p>
              <div className="mt-5 space-y-3 text-sm font-semibold">
                <Link href="/cuestionario" className="block text-[#8A3D7D] hover:underline">
                  Completar cuestionario previo →
                </Link>
                <Link href="/test-confort" className="block text-[#8A3D7D] hover:underline">
                  Personalizar test de confort →
                </Link>
              </div>
            </div>

            <div className="clay-card rounded-3xl p-6">
              <HeartHandshake className="h-6 w-6 text-[#A14B92]" />
              <h2 className="mt-4 font-title text-2xl font-semibold">Privacidad garantizada</h2>
              <p className="mt-2 text-sm leading-7 text-[#665D66]">
                Cumplimos con la minimización de datos: solicitamos únicamente nombre, correo, teléfono y tu consentimiento explícito, sin pedir RUT.
              </p>
            </div>
            <p className="flex items-start gap-2 text-xs leading-6 text-[#665D66]">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#A14B92]" />
              Conectado a Supabase y servicio de orientaciones.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
