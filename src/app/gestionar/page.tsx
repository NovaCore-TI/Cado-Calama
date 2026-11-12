"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DentalinkLink } from "@/components/DentalinkLink";
import { RescheduleCalendar, appointmentDateLabel } from "@/components/RescheduleCalendar";
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
interface Appointment {
  codigo: string;
  nombre_paciente: string;
  fecha: string;
  hora: string;
  estado_atencion: string;
  estado_derivacion?: string;
  meet_link: string;
}
interface Slot {
  fecha: string;
  hora: string;
  slotKey: string;
}
export default function ManageAppointment() {
  const [token, setToken] = useState("");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const changeRunning = useRef(false);
  const revision = useRef(0);
  const slotRevision = useRef(0);
  useLiveUpdates({ resources: ['availability'], enabled: Boolean(appointment) && /^[a-f0-9]{32,64}$/.test(token), pollMs: 15_000 }, async () => {
    if (busy) return;
    const request = ++revision.current;
    const response = await fetch('/api/orientaciones', { headers: { 'x-management-token': token }, cache: 'no-store' });
    const result = await response.json();
    if (request !== revision.current) return;
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) setAppointment(null);
      return;
    }
    setAppointment(result.data);
    if (showSlots) await loadSlots(true);
  });
  useEffect(() => {
    const secret = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (secret) setToken(secret);
  }, []);
  useEffect(() => {
    if (!/^[a-f0-9]{32,64}$/.test(token)) return;
    let active = true;
    setBusy(true);
    setError("");
    void fetch("/api/orientaciones", {
      headers: { "x-management-token": token },
      cache: "no-store",
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw Error(j.error);
        if (active) setAppointment(j.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      revision.current++;
      slotRevision.current++;
    };
  }, [token]);
  async function loadSlots(preserveSelection = false) {
    const request = ++slotRevision.current;
    setError("");
    setShowSlots(true);
    setCancelConfirm(false);
    setSlotsLoading(true);
    try {
      const r = await fetch("/api/bloques", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      if (request !== slotRevision.current) return;
      if (!Array.isArray(j.slots)) throw Error('No se pudo comprobar la disponibilidad.');
      setSlots(j.slots);
      setShowSlots(true);
      setSelection(previous => preserveSelection && j.slots.some((slot: Slot) => slot.slotKey === previous) ? previous : '');
    } catch (e) {
      if (request !== slotRevision.current) return;
      setSlots([]);
      setSelection('');
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la disponibilidad.",
      );
    } finally {
      if (request === slotRevision.current) setSlotsLoading(false);
    }
  }
  async function change(action: "cancelar" | "reprogramar") {
    if (!appointment || busy || changeRunning.current) return;
    if (action === 'reprogramar' && !slots.some(slot => slot.slotKey === selection)) {
      setError('Selecciona un horario disponible antes de confirmar.');
      return;
    }
    changeRunning.current = true;
    revision.current++;
    slotRevision.current++;
    setSlotsLoading(false);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const [nuevaFecha, nuevaHora] = selection.split("|");
      const r = await fetch("/api/orientaciones", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-management-token": token,
        },
        body: JSON.stringify({
          codigo: appointment.codigo,
          action,
          nuevaFecha: action === "reprogramar" ? nuevaFecha : undefined,
          nuevaHora: action === "reprogramar" ? nuevaHora : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 409 && action === 'reprogramar') await loadSlots(true);
        throw Error(j.error || 'No se pudo guardar el cambio.');
      }
      setAppointment(j.data);
      setCancelConfirm(false);
      setSlots([]);
      setShowSlots(false);
      setSelection('');
      setMessage(
        action === "cancelar"
          ? "Tu orientación fue cancelada."
          : "Tu orientación fue reprogramada.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cambio.",
      );
    } finally {
      changeRunning.current = false;
      setBusy(false);
    }
  }
  async function download() {
    setError("");
    try {
      const r = await fetch("/api/orientaciones/calendar", {
        headers: { "x-management-token": token },
      });
      if (!r.ok) throw Error("No se pudo descargar el calendario.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "CADO_Orientacion.ics";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de descarga.");
    }
  }
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-[#513D49] sm:px-6 sm:py-16">
      <h1 className="font-title text-4xl">Gestionar mi orientación</h1>
      <p>
        Usa el enlace privado que recibiste al confirmar tu reserva. El código
        de cita por sí solo no permite consultar ni modificar tus datos.
      </p>
      {!token && (
        <p className="rounded-xl border p-4">
          Abre tu enlace privado de gestión. Si lo perdiste, comunícate con CADO
          por los canales oficiales.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">
          {message}
        </p>
      )}
      {busy && <p role="status">Procesando…</p>}
      {appointment && (
        <div className="material-card-tonal min-w-0 space-y-5 rounded-3xl p-4 sm:p-7">
          <h2 className="font-title text-2xl">{appointment.nombre_paciente}</h2>
          <div className="rounded-2xl border border-[#E2D6E1] bg-white p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#766C75]">Tu horario actual</p>
            <p className="mt-2 font-semibold capitalize">{appointmentDateLabel(appointment.fecha)}</p>
            <p className="mt-1">{appointment.hora.slice(0, 5)} hrs · Hora de Chile · {appointment.estado_atencion}</p>
          </div>
          {(appointment.estado_derivacion === "Derivada a Dentalink" || appointment.estado_atencion === "Derivada a Dentalink") && <DentalinkLink />}
          {appointment.estado_atencion === "Programada" && (
            <>
              {appointment.meet_link && (
                <a
                  href={appointment.meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block underline"
                >
                  Abrir Google Meet
                </a>
              )}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => void download()}
                  className="btn-cado-secondary rounded-xl p-3"
                >
                  Descargar calendario
                </button>
                <button
                  disabled={busy || slotsLoading}
                  onClick={() => void loadSlots()}
                  className="btn-cado-secondary rounded-xl p-3"
                >
                  Elegir otra fecha
                </button>
                <button
                  disabled={busy}
                  onClick={() => { slotRevision.current++; setSlotsLoading(false); setShowSlots(false); setCancelConfirm(true); }}
                  className="rounded-xl border border-red-300 p-3 text-red-800"
                >
                  Cancelar orientación
                </button>
              </div>
              {showSlots && (
                <div className="space-y-3">
                  <RescheduleCalendar slots={slots} value={selection} onChange={setSelection}
                    disabled={busy} loading={slotsLoading} onRefresh={() => void loadSlots()} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    disabled={busy || slotsLoading || !selection || !slots.some(slot => slot.slotKey === selection)}
                    onClick={() => void change("reprogramar")}
                    className="btn-cado-primary min-h-12 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Confirmar reprogramación
                  </button>
                  <button type="button" disabled={busy} onClick={() => {
                    slotRevision.current++; setSlotsLoading(false); setShowSlots(false); setSelection('');
                  }} className="btn-cado-secondary min-h-12 rounded-xl px-5 py-3 text-sm font-semibold">Conservar horario actual</button>
                  </div>
                </div>
              )}
              {cancelConfirm && (
                <div className="space-y-3 rounded-xl border border-red-300 p-4">
                  <p>¿Confirmas que deseas cancelar tu orientación?</p>
                  <button
                    disabled={busy}
                    onClick={() => void change("cancelar")}
                    className="mr-4 rounded-xl bg-red-700 p-3 text-white"
                  >
                    Sí, cancelar
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="underline"
                  >
                    Conservar mi reserva
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <Link href="/" className="inline-block underline">
        Volver al inicio
      </Link>
    </section>
  );
}
