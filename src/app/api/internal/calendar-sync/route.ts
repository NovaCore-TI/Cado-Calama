import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { accessFailure, privateJson, requireDoctor } from "@/lib/doctor-auth";
import { getServerDatabase } from "@/lib/server-db";
import { synchronizeAppointment } from "@/lib/calendar-sync";
export async function POST(request: NextRequest) {
  try {
    const supplied =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const expected = process.env.CRON_SECRET || "";
    const scheduler =
      expected &&
      supplied.length === expected.length &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    const doctor = scheduler ? null : (await requireDoctor(request)).doctor;
    let query = getServerDatabase()
      .from("orientaciones_citas")
      .select("id")
      .eq("estado_sync", "Pendiente_Reintento")
      .order("updated_at")
      .limit(10);
    if (doctor) query = query.eq("doctor_id", doctor.id);
    else query = query.not("doctor_id", "is", null);
    const { data, error } = await query;
    if (error) throw error;
    const results = await Promise.allSettled(
      (data || []).map((row) => synchronizeAppointment(row.id)),
    );
    return privateJson({
      ok: true,
      attempted: results.length,
      failed: results.filter((r) => r.status === "rejected").length,
    });
  } catch (error) {
    return accessFailure(error);
  }
}
