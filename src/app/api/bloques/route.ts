import { NextRequest } from "next/server";
import { getServerDatabase } from "@/lib/server-db";
import {
  accessFailure,
  AccessError,
  privateJson,
  requireDoctor,
} from "@/lib/doctor-auth";
import {
  futureChileSlot,
  validDate,
  VIRTUAL_TIMES,
} from "@/lib/booking-validation";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const db = getServerDatabase();
    const date = request.nextUrl.searchParams.get("fecha");
    const admin = request.nextUrl.searchParams.get("admin") === "1";
    const doctor = admin ? (await requireDoctor(request)).doctor : null;
    if (date && !validDate(date)) throw new AccessError(400, "Fecha inválida.");
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Santiago",
    });
    const until = new Date(
      new Date(today + "T12:00:00Z").getTime() + 30 * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    const [blocks, appointments, blocked, doctors] = await Promise.all([
      db
        .from("bloques_disponibilidad")
        .select("fecha,hora_inicio,hora_fin,estado,doctor_id")
        .gte("fecha", date || today)
        .lte("fecha", date || until)
        .eq("estado", "Disponible")
        .not("doctor_id", "is", null),
      db
        .from("orientaciones_citas")
        .select("fecha,hora")
        .gte("fecha", date || today)
        .lte("fecha", date || until)
        .eq("estado_atencion", "Programada"),
      db
        .from("fechas_bloqueadas")
        .select("fecha,doctor_id")
        .gte("fecha", date || today)
        .lte("fecha", date || until),
      db
        .from("doctores")
        .select("id")
        .eq("activo", true)
        .not("auth_user_id", "is", null),
    ]);
    if (blocks.error || appointments.error || blocked.error || doctors.error)
      throw new AccessError(503, "No se pudo comprobar la disponibilidad.");
    const occupied = new Set(
      (appointments.data || []).map(
        (a) => a.fecha + "|" + String(a.hora).slice(0, 5),
      ),
    );
    const blockedByDoctor = new Set(
      (blocked.data || []).map((b) => b.doctor_id + "|" + b.fecha),
    );
    const blockedDates = new Set(
      (blocked.data || [])
        .filter((b) => b.doctor_id === doctor?.id)
        .map((b) => b.fecha),
    );
    const activeDoctors = new Set((doctors.data || []).map((d) => d.id));
    const slots = (blocks.data || [])
      .filter(
        (b) =>
          (!doctor || b.doctor_id === doctor.id) &&
          activeDoctors.has(b.doctor_id) &&
          futureChileSlot(b.fecha, String(b.hora_inicio).slice(0, 5)) &&
          !blockedByDoctor.has(b.doctor_id + "|" + b.fecha) &&
          !occupied.has(b.fecha + "|" + String(b.hora_inicio).slice(0, 5)),
      )
      .map((b) => ({
        fecha: b.fecha,
        hora: String(b.hora_inicio).slice(0, 5),
        hora_fin: String(b.hora_fin).slice(0, 5),
        slotKey: b.fecha + "|" + String(b.hora_inicio).slice(0, 5),
      }))
      .sort((a, b) => a.slotKey.localeCompare(b.slotKey));
    return privateJson({
      ok: true,
      timezone: "America/Santiago",
      duracionMinutos: 15,
      standardVespertinoTimes: VIRTUAL_TIMES,
      slots,
      data: slots,
      totalDisponibles: slots.length,
      ...(admin ? { blockedDates: [...blockedDates] } : {}),
    });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const db = getServerDatabase();
    const { fecha, horaInicio, estado = "Disponible" } = await request.json();
    if (
      !futureChileSlot(fecha, horaInicio) ||
      !["Disponible", "Bloqueado"].includes(estado)
    )
      throw new AccessError(
        400,
        "Selecciona un bloque virtual futuro entre 19:00 y 20:00.",
      );
    const { data, error } = await db.rpc("upsert_doctor_block", {
      p_doctor: doctor.id,
      p_date: fecha,
      p_time: horaInicio,
      p_state: estado,
    });
    if (error?.code === "23505")
      throw new AccessError(409, "Ese bloque pertenece a otro profesional.");
    if (error) throw error;
    return privateJson({ ok: true, syncedToSupabase: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const db = getServerDatabase();
    const { fecha, bloqueada } = await request.json();
    if (!validDate(fecha) || typeof bloqueada !== "boolean")
      throw new AccessError(400, "Fecha o acción inválida.");
    const result = await db.rpc("set_date_block", {
      p_date: fecha,
      p_doctor: doctor.id,
      p_blocked: bloqueada,
    });
    if (result.error) throw result.error;
    return privateJson({ ok: true });
  } catch (error) {
    return accessFailure(error);
  }
}
