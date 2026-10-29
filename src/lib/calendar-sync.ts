import "server-only";
import { randomUUID } from "node:crypto";
import { getServerDatabase } from "./server-db";
import {
  createGoogleAppointmentEvent,
  cancelGoogleAppointmentEvent,
  rescheduleGoogleAppointmentEvent,
  googleEventId,
} from "./google-calendar";

// Durable pending state + lease: a failed/terminated request can be retried safely.
export type SyncOutcome = { status: "synced" | "pending" | "skipped" };
export async function synchronizeAppointment(id: string): Promise<SyncOutcome> {
  const db = getServerDatabase();
  const lease = randomUUID();
  const now = new Date();
  const { data: row, error } = await db
    .from("orientaciones_citas")
    .update({
      sync_lease_id: lease,
      sync_lock_until: new Date(now.getTime() + 300_000).toISOString(),
    })
    .eq("id", id)
    .eq("estado_sync", "Pendiente_Reintento")
    .or("sync_lock_until.is.null,sync_lock_until.lt." + now.toISOString())
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!row) return { status: "skipped" };
  try {
    let result: {
      ok?: boolean;
      eventId?: string | null;
      meetLink?: string;
      status?: string;
    };
    if (row.estado_atencion === "Cancelada")
      result = await cancelGoogleAppointmentEvent({
        eventId: row.calendar_event_id || googleEventId(row.codigo),
        doctorId: row.doctor_id,
      });
    else if (row.estado_atencion !== "Programada") result = { ok: true };
    else if (row.calendar_event_id && row.meet_link)
      result = await rescheduleGoogleAppointmentEvent({
        eventId: row.calendar_event_id,
        doctorId: row.doctor_id,
        nuevaFecha: row.fecha,
        nuevaHora: row.hora,
      });
    else
      result = await createGoogleAppointmentEvent({
        codigo: row.codigo,
        fecha: row.fecha,
        hora: row.hora,
        patientName: row.nombre_paciente,
        patientEmail: row.email_paciente,
        patientPhone: row.telefono_paciente,
        doctorId: row.doctor_id,
        comfortProfile: row.preferencias_confort,
        managementToken: row.token_gestion,
      });
    const success = Boolean(result.ok &&
      (!("status" in result) || result.status === "Sincronizado") &&
      (row.estado_atencion !== "Programada" || (result.eventId && result.meetLink)));
    const { data: updated, error: updateError } = await db
      .from("orientaciones_citas")
      .update({
        estado_sync: success ? "Sincronizado" : "Pendiente_Reintento",
        calendar_event_id: result.eventId || row.calendar_event_id,
        meet_link: result.meetLink ?? row.meet_link ?? "",
        intentos_sync: (row.intentos_sync || 0) + 1,
      })
      .eq("id", id)
      .eq("sync_lease_id", lease)
      .eq("fecha", row.fecha)
      .eq("hora", row.hora)
      .eq("estado_atencion", row.estado_atencion)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return { status: "skipped" };
    return { status: success ? "synced" : "pending" };
  } finally {
    await db
      .from("orientaciones_citas")
      .update({ sync_lock_until: null, sync_lease_id: null })
      .eq("id", id)
      .eq("sync_lease_id", lease);
  }
}
