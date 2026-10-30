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
  const { data, error } = await getServerDatabase().rpc(
    "read_doctor_clinical",
    {
      p_doctor: doctorId,
      p_resource: resource,
      p_code: code,
    },
  );
  if (error)
    throw new AccessError(503, "No se pudieron cargar tus registros clínicos.");
  return data || [];
}
