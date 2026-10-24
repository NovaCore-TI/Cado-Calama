import { readDoctorRecords } from "@/lib/doctor-records";
import { NextRequest } from "next/server";
import { getServerDatabase } from "@/lib/server-db";
import {
  accessFailure,
  AccessError,
  checkSameOrigin,
  privateJson,
  requireDoctor,
} from "@/lib/doctor-auth";
import { DRAFT_COOKIE, newSecret } from "@/lib/patient-access";
const feelings = [
  "tranquilo",
  "nervioso",
  "fobia",
  "no_responde",
  "Me siento tranquilo/a",
  "Tengo algunas inquietudes",
  "Me cuesta dar este paso",
  "Prefiero no responder",
];
export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const data = await readDoctorRecords(doctor.id, "cuestionarios");
    return privateJson({ ok: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const body = await request.json();
    if (body.consent !== true)
      throw new AccessError(
        400,
        "Debes aceptar el consentimiento de privacidad.",
      );
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 3 ||
      body.reason.length > 500 ||
      !feelings.includes(body.feeling)
    )
      throw new AccessError(400, "Revisa el motivo y la opción de percepción.");
    const extras: Record<string, string> = {};
    for (const key of [
      "previousExperience",
      "painSensitivity",
      "communicationPreference",
    ]) {
      if (body[key] !== undefined && typeof body[key] !== "string")
        throw new AccessError(400, "Respuesta inválida.");
      extras[key] = (body[key] || "Prefiero no responder").slice(0, 500);
    }
    const secret = newSecret();
    const { data, error } = await getServerDatabase()
      .from("cuestionarios_perfilamiento")
      .insert({
        motivo_consulta: body.reason.trim(),
        nivel_temor: body.feeling,
        respuestas_adicionales: extras,
        consentimiento_privacidad: true,
        draft_access_token: secret,
      })
      .select("id,created_at")
      .single();
    if (error || !data)
      throw new AccessError(503, "No se pudo guardar el cuestionario.");
    const response = privateJson(
      { ok: true, syncedToSupabase: true, data },
      201,
    );
    response.cookies.set(DRAFT_COOKIE, data.id + ":" + secret, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    return accessFailure(error);
  }
}
