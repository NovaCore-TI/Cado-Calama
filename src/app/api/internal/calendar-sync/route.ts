import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { AccessError, accessFailure, privateJson, requireDoctor } from "@/lib/doctor-auth";
import { getServerDatabase } from "@/lib/server-db";
import { synchronizeAppointment } from "@/lib/calendar-sync";
async function synchronize(request: NextRequest, cronOnly = false) {
  try {
    const supplied =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const expected = process.env.CRON_SECRET || "";
    const scheduler =
      expected &&
      Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (cronOnly && !scheduler) throw new AccessError(401, "Acceso no autorizado.");
    const doctor = scheduler ? null : (await requireDoctor(request)).doctor;
    let query = getServerDatabase()
      .from("orientaciones_citas")
      .select("id")
      .eq("estado_sync", "Pendiente_Reintento")
      .or("sync_lock_until.is.null,sync_lock_until.lt." + new Date().toISOString())
      .order("updated_at")
      .limit(10);
    if (doctor) query = query.eq("doctor_id", doctor.id);
    else query = query.not("doctor_id", "is", null);
    const { data, error } = await query;
    if (error) throw error;
    const results = await Promise.allSettled(
      (data || []).map((row) => synchronizeAppointment(row.id)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const count = (status: "synced" | "pending" | "skipped") => results.filter(
      (r) => r.status === "fulfilled" && r.value.status === status,
    ).length;
    return privateJson({
      ok: failed === 0,
      attempted: results.length,
      synced: count("synced"),
      pending: count("pending"),
      skipped: count("skipped"),
      failed,
    }, failed ? 503 : 200);
  } catch (error) {
    return accessFailure(error);
  }
}
export const POST = (request: NextRequest) => synchronize(request);
// Vercel Cron authenticates GET requests using CRON_SECRET.
export const GET = (request: NextRequest) => synchronize(request, true);
