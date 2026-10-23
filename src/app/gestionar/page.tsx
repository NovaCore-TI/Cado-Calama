'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldAlert,
  Video,
  X,
} from 'lucide-react';

interface CitaDetails {
  id: string;
  codigo: string;
  nombre_paciente: string;
  email_paciente: string;
  telefono_paciente: string;
  fecha: string;
  hora: string;
  estado_atencion: 'Programada' | 'Cancelada' | 'Realizada' | 'No asistió';
  meet_link: string;
  googleCalendarUrl?: string;
  icsUrl?: string;
  preferencias_confort?: {
    soundPreference?: string;
    jawBreaks?: boolean;
    companionAllowed?: boolean;
    handSignalPledge?: boolean;
    notes?: string;
  };
}

interface AvailableSlot {
  fecha: string;
  hora: string;
  hora_fin: string;
  slotKey: string;
}

function GestionarContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('codigo') || '';

  const [codigoInput, setCodigoInput] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [cita, setCita] = useState<CitaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para modal de cancelación (RF-14)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Cambio de planes');
  const [isCancelling, setIsCancelling] = useState(false);

  // Estados para modal de reprogramación (RF-15)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedNewDate, setSelectedNewDate] = useState('');
  const [selectedNewTime, setSelectedNewTime] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cargar cita por código
  async function fetchCita(codeToFetch: string) {
    if (!codeToFetch.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/orientaciones?codigo=${encodeURIComponent(codeToFetch.trim().toUpperCase())}`);
      const json = await res.json();

      if (res.ok && json.ok && json.data) {
        setCita(json.data);
        setActiveCode(codeToFetch.trim().toUpperCase());
      } else {
        setCita(null);
        setErrorMsg(json.error || 'No encontramos ninguna orientación con el código indicado. Revisa el código o consulta por WhatsApp.');
      }
    } catch {
      setErrorMsg('Error de conexión al buscar la orientación. Inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (initialCode) {
      fetchCita(initialCode);
    }
  }, [initialCode]);

  // Cargar bloques disponibles para reprogramar (RF-10 & RF-11)
  async function loadAvailableSlots() {
    setIsLoadingSlots(true);
    try {
      const res = await fetch('/api/bloques');
      const json = await res.json();
      if (res.ok && json.ok && json.slots) {
        setAvailableSlots(json.slots);
        if (json.slots.length > 0) {
          setSelectedNewDate(json.slots[0].fecha);
        }
      }
    } catch {
      // Manejo silencioso de fallback
    } finally {
      setIsLoadingSlots(false);
    }
  }

  // Ejecutar Cancelación (RF-14)
  async function handleConfirmCancel() {
    if (!cita) return;
    setIsCancelling(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/orientaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancelar',
          codigo: cita.codigo,
          motivo: cancelReason,
        }),
      });
      const json = await res.json();

      if (res.ok && json.ok) {
        setCita({ ...cita, estado_atencion: 'Cancelada' });
        setShowCancelModal(false);
        setSuccessMsg('Tu orientación telemática ha sido cancelada exitosamente y el cupo ha sido liberado.');
      } else {
        setErrorMsg(json.error || 'No se pudo cancelar la orientación.');
      }
    } catch {
      setErrorMsg('Error de red al procesar la cancelación.');
    } finally {
      setIsCancelling(false);
    }
  }

  // Ejecutar Reprogramación Atómica (RF-15)
  async function handleConfirmReschedule() {
    if (!cita || !selectedNewDate || !selectedNewTime) return;
    setIsRescheduling(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/orientaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reprogramar',
          codigo: cita.codigo,
          nuevaFecha: selectedNewDate,
          nuevaHora: selectedNewTime,
        }),
      });
      const json = await res.json();

      if (res.ok && json.ok) {
        setCita({
          ...cita,
          fecha: selectedNewDate,
          hora: selectedNewTime,
          estado_atencion: 'Programada',
        });
        setShowRescheduleModal(false);
        setSuccessMsg(`¡Reprogramación exitosa! Tu nueva fecha es el ${selectedNewDate} a las ${selectedNewTime} hrs.`);
      } else {
        setErrorMsg(json.error || 'No se pudo reprogramar la cita en este horario.');
      }
    } catch {
      setErrorMsg('Error de comunicación con el servidor al reprogramar.');
    } finally {
      setIsRescheduling(false);
    }
  }

  const uniqueDates = Array.from(new Set(availableSlots.map((s) => s.fecha)));
  const slotsForSelectedDate = availableSlots.filter((s) => s.fecha === selectedNewDate);

  return (
    <main className="min-h-screen bg-[#F6F8F8] px-6 py-16 text-[#513D49] sm:py-24">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Cabecera */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#513D49]">
            <Clock3 className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
            <span>Autogestión de Citas Telemáticas</span>
          </div>

          <h1 className="font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl text-balance">
            Tu orientación, bajo tu control.
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-[#665D66]">
            Revisa los detalles de tu cita telemática con el Dr. Javier Beiza, accede a la videollamada en Google Meet o gestiona cambios de horario y cancelaciones con liberación inmediata.
          </p>
        </div>

        {/* Buscador de Cita */}
        <div className="clay-card rounded-3xl p-6 sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchCita(codigoInput);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#A14B92]" />
              <input
                type="text"
                placeholder="Ingresa tu código de orientación (ej: CADO-2026-384)"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                className="w-full rounded-2xl border border-[#B3BFBF] bg-white py-3 pl-11 pr-4 text-xs font-semibold uppercase tracking-wider text-[#513D49] outline-none focus:border-[#A14B92] focus:ring-1 focus:ring-[#A14B92]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !codigoInput.trim()}
              className="btn-cado-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-xs font-semibold disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Consultar cita</span>
            </button>
          </form>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs leading-6 text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Tarjeta de Detalle de Cita */}
        {cita ? (
          <div className="clay-card space-y-6 rounded-3xl p-7 sm:p-9">
            {/* Encabezado de la cita */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E7E7] pb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A14B92]">
                  Código Oficial: {cita.codigo}
                </span>
                <h2 className="mt-1 font-title text-2xl font-semibold sm:text-3xl text-[#513D49]">
                  {cita.nombre_paciente}
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  cita.estado_atencion === 'Programada'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : cita.estado_atencion === 'Cancelada'
                    ? 'border border-gray-200 bg-gray-100 text-gray-600'
                    : 'border border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {cita.estado_atencion === 'Programada' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {cita.estado_atencion === 'Cancelada' && <CalendarX2 className="h-3.5 w-3.5" />}
                <span>Estado: {cita.estado_atencion}</span>
              </span>
            </div>

            {/* Grid de Información */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#F6F8F8] p-4 border border-[#E2E7E7]">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#766C75]">
                  <CalendarDays className="h-4 w-4 text-[#A14B92]" /> Fecha Agendada
                </span>
                <p className="mt-1 text-base font-semibold text-[#513D49]">{cita.fecha}</p>
                <span className="text-[11px] text-[#766C75]">Franja vespertina</span>
              </div>

              <div className="rounded-2xl bg-[#F6F8F8] p-4 border border-[#E2E7E7]">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#766C75]">
                  <Clock3 className="h-4 w-4 text-[#A14B92]" /> Horario de Atención
                </span>
                <p className="mt-1 text-base font-semibold text-[#513D49]">
                  {String(cita.hora).slice(0, 5)} hrs (15 min)
                </p>
                <span className="text-[11px] text-[#766C75]">Hora oficial de Chile Continental</span>
              </div>
            </div>

            {/* Acceso a Google Meet & Calendarios (Si está activa) */}
            {cita.estado_atencion === 'Programada' && (
              <div className="rounded-2xl border border-[#A14B92]/20 bg-[#F8EFF6] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Video className="mt-1 h-5 w-5 text-[#A14B92]" />
                    <div>
                      <h3 className="font-semibold text-[#513D49]">Sala Virtual Google Meet</h3>
                      <p className="text-xs text-[#766C75]">
                        Ingresa a la hora de tu cita desde tu celular o computador sin instalar programas adicionales.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cita.meet_link && (
                      <a
                        href={cita.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Unirse a videollamada</span>
                      </a>
                    )}
                    {cita.googleCalendarUrl && (
                      <a
                        href={cita.googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#513D49] hover:bg-[#F6F8F8] transition"
                      >
                        <CalendarDays className="h-3.5 w-3.5 text-[#A14B92]" />
                        <span>Google Calendar</span>
                      </a>
                    )}
                    <a
                      href={`/api/orientaciones/calendar?codigo=${cita.codigo}`}
                      download={`CADO_Orientacion_${cita.codigo}.ics`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#513D49] hover:bg-[#F6F8F8] transition"
                    >
                      <CalendarCheck2 className="h-3.5 w-3.5 text-[#A14B92]" />
                      <span>Archivo .ics</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Preferencias de Confort */}
            {cita.preferencias_confort && (
              <div className="rounded-2xl border border-[#E2E7E7] bg-white p-4">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#A14B92]">
                  <HeartHandshake className="h-4 w-4" /> Preferencias de Confort Registradas
                </span>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {cita.preferencias_confort.soundPreference && (
                    <span className="rounded-full bg-[#F6F8F8] px-3 py-1 font-medium text-[#513D49]">
                      ✓ {cita.preferencias_confort.soundPreference === 'silencio' ? 'Silencio total' : 'Música relajante'}
                    </span>
                  )}
                  {cita.preferencias_confort.jawBreaks && (
                    <span className="rounded-full bg-[#F6F8F8] px-3 py-1 font-medium text-[#513D49]">
                      ✓ Pausas para descansar mandíbula
                    </span>
                  )}
                  {cita.preferencias_confort.handSignalPledge && (
                    <span className="rounded-full bg-[#F6F8F8] px-3 py-1 font-medium text-[#513D49]">
                      ✓ Señal de parada con la mano pactada
                    </span>
                  )}
                  {cita.preferencias_confort.companionAllowed && (
                    <span className="rounded-full bg-[#F6F8F8] px-3 py-1 font-medium text-[#513D49]">
                      ✓ Asistencia con acompañante
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Botones de Acción (RF-14 & RF-15) */}
            {cita.estado_atencion === 'Programada' && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E7E7] pt-5">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <CalendarX2 className="h-4 w-4" />
                  <span>Cancelar orientación</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loadAvailableSlots();
                    setShowRescheduleModal(true);
                  }}
                  className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm"
                >
                  <CalendarClock className="h-4 w-4" />
                  <span>Reprogramar cita</span>
                </button>
              </div>
            )}

            {cita.estado_atencion === 'Cancelada' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 text-xs text-[#766C75]">
                <p>Esta orientación fue cancelada. El cupo fue reintegrado a la agenda pública.</p>
                <Link
                  href="/agendar"
                  className="inline-flex items-center gap-1 font-semibold text-[#A14B92] hover:underline"
                >
                  Agendar una nueva orientación <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Cards informativas cuando aún no se consulta una cita */
          <div className="grid gap-6 md:grid-cols-2">
            <article className="clay-card rounded-3xl p-7 sm:p-9 space-y-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                <Clock3 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                  Reprogramar horario
                </h2>
                <p className="text-sm leading-relaxed text-[#665D66]">
                  Elige un nuevo bloque vespertino libre. Tu cita previa se mantiene activa hasta que confirmes la nueva fecha, actualizando el enlace de Google Meet sin duplicar registros.
                </p>
              </div>
              <p className="text-xs text-[#766C75]">
                Ingresa tu código arriba para ver los bloques vespertinos disponibles y cambiar tu cita.
              </p>
            </article>

            <article className="clay-card rounded-3xl p-7 sm:p-9 space-y-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                <CalendarX2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                  Cancelar orientación
                </h2>
                <p className="text-sm leading-relaxed text-[#665D66]">
                  Si ya no necesitas la cita, anúlala con al menos 2 horas de anticipación para que otra persona que esté esperando atención pueda tomar el bloque libre.
                </p>
              </div>
              <a
                href="https://wa.me/56944657815?text=Hola%20Dr.%20Javier%20Beiza,%20necesito%20cancelar%20mi%20orientaci%C3%B3n%20virtual."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cado-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
                <span>Avisar cancelación por WhatsApp</span>
              </a>
            </article>
          </div>
        )}

        {/* Modal de Cancelación (RF-14) */}
        {showCancelModal && cita && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#E2E7E7] pb-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="font-title text-xl font-semibold">Cancelar Orientación</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-lg p-1 text-[#766C75] hover:bg-[#F6F8F8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-xs leading-6 text-[#665D66]">
                ¿Estás seguro de cancelar tu orientación telemática del{' '}
                <strong className="text-[#513D49]">
                  {cita.fecha} a las {String(cita.hora).slice(0, 5)} hrs
                </strong>
                ? El horario quedará liberado inmediatamente para que otro paciente pueda utilizarlo.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#513D49]">
                  Motivo de cancelación (opcional):
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#B3BFBF] bg-white px-3 py-2 text-xs font-medium text-[#513D49] outline-none focus:border-[#A14B92]"
                >
                  <option value="Cambio de planes">Cambio de planes o imprevisto personal</option>
                  <option value="Horario incompatible">Horario incompatible con mi jornada laboral</option>
                  <option value="Atención en urgencia física">Fui atendido en urgencia física</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E2E7E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="rounded-xl border border-[#B3BFBF] bg-white px-4 py-2 text-xs font-semibold hover:bg-[#F6F8F8]"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarX2 className="h-3.5 w-3.5" />}
                  <span>Confirmar cancelación</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reprogramación Atómica (RF-15) */}
        {showRescheduleModal && cita && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#E2E7E7] pb-4">
                <div className="flex items-center gap-2 text-[#A14B92]">
                  <CalendarClock className="h-5 w-5" />
                  <h3 className="font-title text-xl font-semibold">Reprogramar Orientación</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="rounded-lg p-1 text-[#766C75] hover:bg-[#F6F8F8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mensaje de Seguridad Atómica (RF-15) */}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <strong className="block font-semibold">Garantía de Cita Vigente:</strong>
                Tu horario actual del <strong className="underline">{cita.fecha} a las {String(cita.hora).slice(0, 5)} hrs</strong> se mantendrá 100% asegurado hasta que confirmes un nuevo horario disponible.
              </div>

              {isLoadingSlots ? (
                <div className="flex flex-col items-center justify-center py-10 text-xs text-[#766C75]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#A14B92]" />
                  <span className="mt-2">Cargando disponibilidad en tiempo real...</span>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {/* Selector de Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-[#513D49]">
                      1. Selecciona la nueva fecha:
                    </label>
                    <select
                      value={selectedNewDate}
                      onChange={(e) => {
                        setSelectedNewDate(e.target.value);
                        setSelectedNewTime('');
                      }}
                      className="mt-1 w-full rounded-xl border border-[#B3BFBF] bg-white px-3 py-2.5 text-xs font-medium text-[#513D49] outline-none focus:border-[#A14B92]"
                    >
                      {uniqueDates.map((d) => (
                        <option key={d} value={d}>
                          {d} (Vespertino CADO)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Hora */}
                  <div>
                    <label className="block text-xs font-semibold text-[#513D49]">
                      2. Selecciona el nuevo bloque horario disponible:
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {slotsForSelectedDate.length === 0 ? (
                        <p className="col-span-full py-2 text-xs text-[#766C75]">
                          No hay bloques disponibles para esta fecha. Elige otro día.
                        </p>
                      ) : (
                        slotsForSelectedDate.map((s) => (
                          <button
                            key={s.hora}
                            type="button"
                            onClick={() => setSelectedNewTime(s.hora)}
                            className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                              selectedNewTime === s.hora
                                ? 'border-[#A14B92] bg-[#A14B92] text-white shadow-sm'
                                : 'border-[#B3BFBF] bg-white text-[#513D49] hover:border-[#A14B92]'
                            }`}
                          >
                            {s.hora} hrs
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E2E7E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={isRescheduling}
                  className="rounded-xl border border-[#B3BFBF] bg-white px-4 py-2 text-xs font-semibold hover:bg-[#F6F8F8]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={isRescheduling || !selectedNewDate || !selectedNewTime}
                  className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {isRescheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck2 className="h-3.5 w-3.5" />}
                  <span>Confirmar reprogramación</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTA DE PRIVACIDAD */}
        <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[#A14B92]" aria-hidden="true" />
            <p className="max-w-2xl text-xs leading-relaxed text-[#665D66]">
              Por estricto cumplimiento de la Ley N° 19.628 de protección de datos personales, ninguna cita ni historial clínico se muestra públicamente en esta pantalla sin el enlace seguro o código verificado de orientación.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#8A3D7D] hover:underline"
          >
            <span>Volver a la portada</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function GestionarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F8F8] p-12 text-[#513D49]">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#A14B92] border-t-transparent" />
            <span>Cargando portal de autogestión...</span>
          </div>
        </div>
      }
    >
      <GestionarContent />
    </Suspense>
  );
}
