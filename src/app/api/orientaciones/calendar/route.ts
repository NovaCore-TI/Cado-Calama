import { NextRequest, NextResponse } from "next/server";
import { getServerDatabase } from "@/lib/server-db";
import { managementToken } from "@/lib/patient-access";
import { accessFailure, AccessError } from "@/lib/doctor-auth";
import { generateIcsCalendarContent } from "@/lib/google-calendar";
import { isVideoReady } from "@/lib/appointment-sync-status";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const token = managementToken(request);
    const { data, error } = await getServerDatabase()
      .from("orientaciones_citas")
      .select(
        "codigo,fecha,hora,nombre_paciente,meet_link,estado_atencion,estado_sync,doctor_id",
      )
      .eq("token_gestion", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AccessError(404, "Enlace no válido.");
    if (data.estado_atencion !== "Programada")
      throw new AccessError(409, "La orientación ya no está programada.");
    if (!isVideoReady(data.estado_sync, data.meet_link))
      throw new AccessError(409, "La videollamada sigue pendiente. Tu reserva está guardada; consulta nuevamente más tarde.");
    const profile = data.doctor_id
      ? await getServerDatabase()
          .from("doctores")
          .select("nombre")
          .eq("id", data.doctor_id)
          .maybeSingle()
      : null;
    if (profile?.error) throw profile.error;
    return new NextResponse(
      generateIcsCalendarContent({
        codigo: data.codigo,
        fecha: data.fecha,
        hora: data.hora,
        patientName: data.nombre_paciente,
        meetLink: data.meet_link || "",
        doctorName: profile?.data?.nombre || "Profesional CADO",
      }),
      {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="CADO_Orientacion.ics"',
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (error) {
    return accessFailure(error);
  }
}
