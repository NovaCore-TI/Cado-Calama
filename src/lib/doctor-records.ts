import "server-only";
import { getServerDatabase } from "./server-db";
import { AccessError } from "./doctor-auth";

// The doctor ID comes exclusively from requireDoctor, never from request input.
// PostgreSQL executes this gateway as a read-only role subject to ownership RLS.
export async function readDoctorRecords(
  doctorId: string,
  resource: "orientaciones" | "cuestionarios" | "confort" | "pacientes",
  code: string | null = null,
) {
  const records: Record<string, unknown>[] = [];
  const db = getServerDatabase();
  for (let offset = 0; offset < 20000; offset += 200) {
    const { data, error } = await db.rpc("read_doctor_clinical_page", {
      p_doctor: doctorId, p_resource: resource, p_code: code,
      p_limit: 200, p_offset: offset,
    });
    if (error || !Array.isArray(data))
      throw new AccessError(503, "No se pudieron cargar todos tus registros clínicos.");
    records.push(...data);
    if (data.length < 200) return records;
  }
  // Never silently show a truncated history as a complete clinical record.
  throw new AccessError(503, "El historial supera el límite de consulta. Solicita una consulta filtrada.");
}
