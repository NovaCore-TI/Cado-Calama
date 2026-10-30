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
import { verifyQuestionnaireDraft } from "@/lib/patient-access";
export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const data = await readDoctorRecords(doctor.id, "confort");
    return privateJson({ ok: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const body = await request.json();
    if (body.consent !== true || !body.cuestionarioId)
      throw new AccessError(
        400,
        "Se requiere cuestionario y consentimiento explícito.",
      );
    await verifyQuestionnaireDraft(request, body.cuestionarioId);
    const db = getServerDatabase();
    const existing = await db
      .from("preferencias_confort")
      .select("id")
      .eq("cuestionario_id", body.cuestionarioId)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const payload = {
      cuestionario_id: body.cuestionarioId,
      ambiente_preferido:
        body.soundPreference === "silencio" ? "silencio" : "musica_suave",
      solicita_pausas: body.jawBreaks === true,
      desea_acompanante: body.companionAllowed === true,
      senal_pausa: body.handSignalPledge === true,
      explicacion_paso_a_paso: body.explanationStepByStep === true,
      notas: typeof body.notes === "string" ? body.notes.slice(0, 500) : "",
      consent_datos: true,
    };
    const query = existing.data
      ? db
          .from("preferencias_confort")
          .update(payload)
          .eq("id", existing.data.id)
      : db.from("preferencias_confort").insert(payload);
    const { data, error } = await query.select("id").single();
    if (error) throw error;
    return privateJson({ ok: true, syncedToSupabase: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
