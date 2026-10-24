import "server-only";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { AccessError } from "./doctor-auth";
import { getServerDatabase } from "./server-db";
export const DRAFT_COOKIE = "cado_questionnaire_draft";
export const newSecret = () => randomBytes(32).toString("hex");
export function managementToken(
  request: NextRequest,
  bodyToken?: unknown,
): string {
  const token = request.headers.get("x-management-token") || bodyToken;
  if (typeof token !== "string" || !/^[a-f0-9]{32,64}$/.test(token))
    throw new AccessError(401, "Se requiere el enlace privado de gestión.");
  return token;
}
export async function verifyQuestionnaireDraft(
  request: NextRequest,
  id: unknown,
) {
  if (!id) return null;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))
    throw new AccessError(400, "Cuestionario inválido.");
  const [cookieId, token] = (
    request.cookies.get(DRAFT_COOKIE)?.value || ""
  ).split(":");
  if (cookieId !== id || !token)
    throw new AccessError(
      403,
      "El cuestionario no pertenece a este recorrido de reserva.",
    );
  const { data, error } = await getServerDatabase()
    .from("cuestionarios_perfilamiento")
    .select("id")
    .eq("id", id)
    .eq("draft_access_token", token)
    .eq("consentimiento_privacidad", true)
    .is("paciente_id", null)
    .gt("created_at", new Date(Date.now() - 86400000).toISOString())
    .maybeSingle();
  if (error)
    throw new AccessError(503, "No se pudo verificar el cuestionario.");
  if (!data)
    throw new AccessError(403, "El cuestionario caducó o ya fue utilizado.");
  return id;
}
export function publicAppointment(row: Record<string, unknown>) {
  const keys = [
    "id",
    "codigo",
    "nombre_paciente",
    "email_paciente",
    "telefono_paciente",
    "fecha",
    "hora",
    "estado_atencion",
    "meet_link",
    "estado_sync",
    "preferencias_confort",
  ];
  return Object.fromEntries(keys.map((key) => [key, row[key]]));
}
