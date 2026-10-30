import "server-only";
import { getServerDatabase } from "./server-db";
export interface DoctorGoogleCredentials {
  doctorId: string;
  doctorName?: string;
  email: string;
  refreshToken: string;
  connectedAt: string;
}
export async function getDoctorGoogleCredentials(
  doctorId: string,
): Promise<DoctorGoogleCredentials | null> {
  const { data, error } = await getServerDatabase()
    .from("doctor_google_credentials")
    .select("doctor_id,email,refresh_token,updated_at,doctores(nombre)")
    .eq("doctor_id", doctorId)
    .maybeSingle();
  if (error) throw new Error("No se pudo consultar la conexión de Google.");
  return data
    ? {
        doctorId: data.doctor_id,
        doctorName: (data.doctores as unknown as { nombre?: string } | null)
          ?.nombre,
        email: data.email,
        refreshToken: data.refresh_token,
        connectedAt: data.updated_at,
      }
    : null;
}
export async function saveDoctorGoogleCredentials(
  doctorId: string,
  credentials: { email: string; refreshToken?: string; doctorName?: string },
) {
  const previous = await getDoctorGoogleCredentials(doctorId);
  const refreshToken = credentials.refreshToken || previous?.refreshToken;
  if (!refreshToken)
    throw new Error(
      "Google no entregó una credencial renovable. Vuelve a vincular la cuenta.",
    );
  const { error } = await getServerDatabase()
    .from("doctor_google_credentials")
    .upsert(
      {
        doctor_id: doctorId,
        email: credentials.email,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "doctor_id" },
    );
  if (error) throw new Error("No se pudo guardar la conexión de Google.");
}
export async function removeDoctorGoogleCredentials(doctorId: string) {
  const { error } = await getServerDatabase()
    .from("doctor_google_credentials")
    .delete()
    .eq("doctor_id", doctorId);
  if (error) throw new Error("No se pudo desvincular Google.");
}
