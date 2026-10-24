"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
interface Appointment {
  codigo: string;
  nombre_paciente: string;
  fecha: string;
  hora: string;
  estado_atencion: string;
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
    };
  }, [token]);
  async function loadSlots() {
    setError("");
    try {
      const r = await fetch("/api/bloques", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setSlots(j.slots);
      setSelection("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la disponibilidad.",
      );
    }
  }
  async function change(action: "cancelar" | "reprogramar") {
    if (!appointment) return;
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
      if (!r.ok) throw Error(j.error);
      setAppointment(j.data);
      setCancelConfirm(false);
      setSlots([]);
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
    <section className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-[#513D49]">
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
        <div className="clay-card space-y-5 rounded-3xl p-7">
          <h2 className="font-title text-2xl">{appointment.nombre_paciente}</h2>
          <p>
            {appointment.fecha} · {appointment.hora} ·{" "}
            {appointment.estado_atencion}
          </p>
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
                  disabled={busy}
                  onClick={() => void loadSlots()}
                  className="btn-cado-secondary rounded-xl p-3"
                >
                  Elegir otra fecha
                </button>
                <button
                  disabled={busy}
                  onClick={() => setCancelConfirm(true)}
                  className="rounded-xl border border-red-300 p-3 text-red-800"
                >
                  Cancelar orientación
                </button>
              </div>
              {slots.length > 0 && (
                <div className="space-y-3">
                  <label className="block">
                    Nuevo horario
                    <select
                      value={selection}
                      onChange={(e) => setSelection(e.target.value)}
                      className="mt-2 block w-full rounded-xl border p-3"
                    >
                      <option value="">Selecciona un bloque</option>
                      {slots.map((s) => (
                        <option key={s.slotKey} value={s.slotKey}>
                          {s.fecha} · {s.hora}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={busy || !selection}
                    onClick={() => void change("reprogramar")}
                    className="btn-cado-primary rounded-xl p-3"
                  >
                    Confirmar reprogramación
                  </button>
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
