"use client";

import { useId, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

export interface RescheduleSlot { fecha: string; hora: string; slotKey: string }
const weekdays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const localDate = (date: string) => new Date(date + "T12:00:00Z");
export function appointmentDateLabel(date: string) {
  return localDate(date).toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export function RescheduleCalendar({ slots, value, onChange, disabled = false, loading = false, onRefresh }: {
  slots: RescheduleSlot[]; value: string; onChange: (value: string) => void;
  disabled?: boolean; loading?: boolean; onRefresh: () => void;
}) {
  const headingId = useId();
  const dates = [...new Set(slots.map(slot => slot.fecha))].sort();
  const [chosenDate, setChosenDate] = useState("");
  const [chosenMonth, setChosenMonth] = useState("");
  const selected = slots.find(slot => slot.slotKey === value);
  const firstMonth = dates[0]?.slice(0, 7) || "";
  const lastMonth = dates.at(-1)?.slice(0, 7) || "";
  const month = chosenMonth >= firstMonth && chosenMonth <= lastMonth ? chosenMonth : selected?.fecha.slice(0, 7) || firstMonth;
  const activeDate = dates.includes(chosenDate) && chosenDate.startsWith(month) ? chosenDate
    : selected?.fecha.startsWith(month) ? selected.fecha : dates.find(date => date.startsWith(month)) || "";
  const hours = slots.filter(slot => slot.fecha === activeDate).sort((a, b) => a.hora.localeCompare(b.hora));
  const inactive = disabled || loading;
  function moveMonth(delta: number) {
    const next = localDate(month + "-01");
    next.setUTCMonth(next.getUTCMonth() + delta);
    const key = next.toISOString().slice(0, 7);
    setChosenMonth(key);
    setChosenDate(dates.find(date => date.startsWith(key)) || "");
    onChange("");
  }
  const first = month ? localDate(month + "-01") : null;
  const offset = first ? (first.getUTCDay() + 6) % 7 : 0;
  const days = first ? new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate() : 0;
  return <section aria-labelledby={headingId} aria-busy={loading} className="min-w-0 rounded-3xl border border-[#E2D6E1] bg-white p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id={headingId} className="flex items-center gap-2 text-base font-semibold"><CalendarDays size={19} aria-hidden="true" />Elige tu nuevo horario</h3>
        <p className="mt-1 text-sm text-[#766C75]">Primero selecciona un día y luego una hora.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F8F8] px-3 py-1.5 text-xs font-semibold"><Clock3 size={14} aria-hidden="true" />Hora de Chile · 15 min</span>
    </div>
    {loading && <p role="status" className="mb-4 rounded-xl bg-[#F8EFF6] p-3 text-sm">Buscando horarios disponibles…</p>}
    {!loading && !dates.length ? <div className="rounded-2xl bg-[#F6F8F8] p-5 text-sm">
      <p className="font-semibold">No hay horarios disponibles por ahora.</p>
      <p className="mt-2 leading-6 text-[#766C75]">Tu reserva actual se mantiene. Puedes volver a consultar más adelante.</p>
      <button type="button" disabled={disabled} onClick={onRefresh} className="btn-cado-secondary mt-4 min-h-11 rounded-xl px-4 py-2 text-sm">Volver a consultar</button>
    </div> : dates.length > 0 && <div className="grid min-w-0 gap-6 md:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" disabled={inactive || month <= firstMonth} onClick={() => moveMonth(-1)} aria-label="Mes anterior" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2D6E1] disabled:opacity-30"><ChevronLeft size={18} aria-hidden="true" /></button>
          <p aria-live="polite" className="text-center text-sm font-semibold capitalize">{first?.toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <button type="button" disabled={inactive || month >= lastMonth} onClick={() => moveMonth(1)} aria-label="Mes siguiente" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2D6E1] disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label="Días disponibles">
          {weekdays.map(day => <span key={day} aria-hidden="true" className="py-2 text-xs font-semibold text-[#766C75]">{day}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const available = dates.includes(date);
            const current = date === activeDate;
            return <button key={date} type="button" disabled={inactive || !available} aria-pressed={current && available}
              aria-label={`${appointmentDateLabel(date)}${available ? ", con horarios disponibles" : ", sin horarios disponibles"}`}
              onClick={() => { setChosenDate(date); onChange(""); }}
              className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A3D7D] ${current && available ? "bg-[#8A3D7D] text-white shadow-sm" : available ? "bg-[#F8EFF6] text-[#8A3D7D] hover:bg-[#EEDCEE]" : "text-[#B3ADB3]"}`}>
              {i + 1}{available && <span aria-hidden="true" className={`mt-0.5 h-1 w-1 rounded-full ${current ? "bg-white" : "bg-[#8A3D7D]"}`} />}
            </button>;
          })}
        </div>
        <p className="mt-3 text-xs text-[#766C75]">Los días resaltados tienen horarios disponibles.</p>
      </div>
      <div className="min-w-0 border-t border-[#EEE6ED] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A3D7D]">Horarios disponibles</p>
        <p className="mt-2 text-sm font-semibold capitalize">{activeDate && appointmentDateLabel(activeDate)}</p>
        {!activeDate && <p className="mt-3 text-sm text-[#766C75]">No hay horarios en este mes. Consulta el siguiente.</p>}
        <div role="group" aria-label="Selecciona una hora" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
          {hours.map(slot => <button key={slot.slotKey} type="button" disabled={inactive} aria-pressed={slot.slotKey === value}
            onClick={() => onChange(slot.slotKey)}
            className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A3D7D] ${slot.slotKey === value ? "border-[#8A3D7D] bg-[#8A3D7D] text-white" : "border-[#E2D6E1] bg-white hover:bg-[#F8EFF6]"}`}>
            {slot.hora.slice(0, 5)}<span className="sr-only"> horas, hora de Chile</span>
          </button>)}
        </div>
        <div role="status" aria-live="polite" className="mt-5 rounded-2xl bg-[#F6F8F8] p-4 text-sm leading-6">
          {selected ? <><p className="font-semibold">Nuevo horario seleccionado</p><p className="mt-1 capitalize">{appointmentDateLabel(selected.fecha)}</p><p className="font-semibold text-[#8A3D7D]">{selected.hora.slice(0, 5)} hrs · Hora de Chile</p></> : <p>Selecciona una hora para continuar.</p>}
          <p className="mt-2 text-xs text-[#766C75]">Tu cita actual se conserva hasta confirmar el cambio.</p>
        </div>
      </div>
    </div>}
  </section>;
}
