import { randomUUID } from "node:crypto";
import { NextRequest, after } from "next/server";
import { getServerDatabase } from "@/lib/server-db";
import {
  accessFailure,
  AccessError,
  checkSameOrigin,
  privateJson,
  requireDoctor,
} from "@/lib/doctor-auth";
import {
  DRAFT_COOKIE,
  managementToken,
  newSecret,
  publicAppointment,
  verifyQuestionnaireDraft,
} from "@/lib/patient-access";
import { futureChileSlot, validContact } from "@/lib/booking-validation";
import { synchronizeAppointment } from "@/lib/calendar-sync";
import { readDoctorRecords } from "@/lib/doctor-records";
function scheduleSync(id: string) {
  // Pending work is durable in PostgreSQL even if the immediate attempt cannot run.
  try {
    after(async () => {
      await synchronizeAppointment(id).catch(() => {});
    });
  } catch {
    console.warn("Calendar sync remains pending for the retry processor.");
  }
}
function databaseFailure(error: { code?: string } | null): never {
  if (error?.code === "23505" || error?.code === "P0001")
    throw new AccessError(
      409,
      "El bloque ya no está disponible. Tu reserva anterior se conserva.",
    );
  if (error?.code === "P0002")
    throw new AccessError(
      404,
      "No se encontró la orientación con el enlace proporcionado.",
    );
  if (error?.code === "22023")
    throw new AccessError(400, "Los datos no son válidos.");
  throw new AccessError(
    503,
    "No se pudo guardar. No se ha confirmado ningún cambio.",
  );
}
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("codigo");
    if (request.headers.has("x-management-token")) {
      const token = managementToken(request);
      let query = getServerDatabase()
        .from("orientaciones_citas")
        .select("*")
        .eq("token_gestion", token);
      if (code) query = query.eq("codigo", code);
      const { data, error } = await query.maybeSingle();
      if (error) databaseFailure(error);
      if (!data) throw new AccessError(404, "Enlace inválido o caducado.");
      return privateJson({ ok: true, data: publicAppointment(data) });
    }
    // A short code is a display reference, never an authorization credential.
    const { doctor } = await requireDoctor(request);
    const data = await readDoctorRecords(doctor.id, "orientaciones", code);
    return privateJson({ ok: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const body = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      "rut" in body ||
      "RUT" in body
    )
      throw new AccessError(400, "La reserva no solicita RUT.");
    if (body.consent !== true)
      throw new AccessError(
        400,
        "Debes aceptar el consentimiento de privacidad.",
      );
    if (
      !validContact(body.patientName, body.email, body.phone) ||
      !futureChileSlot(body.date, body.time)
    )
      throw new AccessError(
        400,
        "Revisa tus datos y selecciona un bloque virtual futuro.",
      );
    const questionnaire = await verifyQuestionnaireDraft(
      request,
      body.cuestionarioId,
    );
    const rawComfort = body.comfortProfile || {};
    if (
      typeof rawComfort !== "object" ||
      Array.isArray(rawComfort) ||
      JSON.stringify(rawComfort).length > 3000
    )
      throw new AccessError(400, "Preferencias inválidas.");
    const comfort = {
      anxietyLevel: ["tranquilo", "nervioso", "fobia", "no_responde"].includes(
        rawComfort.anxietyLevel,
      )
        ? rawComfort.anxietyLevel
        : "no_responde",
      soundPreference:
        rawComfort.soundPreference === "silencio" ? "silencio" : "musica_suave",
      jawBreaks: rawComfort.jawBreaks === true,
      companionAllowed: rawComfort.companionAllowed === true,
      handSignalPledge: rawComfort.handSignalPledge === true,
      explanationStepByStep: rawComfort.explanationStepByStep === true,
      notes:
        typeof rawComfort.notes === "string"
          ? rawComfort.notes.slice(0, 500)
          : "",
    };
    const token = newSecret();
    const code = "CADO-" + randomUUID();
    const { data, error } = await getServerDatabase().rpc(
      "reserve_orientation",
      {
        p_date: body.date,
        p_time: body.time,
        p_name: body.patientName,
        p_email: body.email,
        p_phone: body.phone,
        p_code: code,
        p_token: token,
        p_questionnaire: questionnaire,
        p_comfort: comfort,
      },
    );
    if (error || !data) databaseFailure(error);
    // External availability cannot delay or turn a committed reservation into an error.
    scheduleSync(data.id);
    const response = privateJson(
      {
        ok: true,
        syncedToSupabase: true,
        data: { ...publicAppointment(data), token_gestion: token },
      },
      201,
    );
    response.cookies.set(DRAFT_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return accessFailure(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const body = await request.json();
    let token: string | null = null;
    let doctorId: string | null = null;
    if (body.tokenGestion || request.headers.has("x-management-token"))
      token = managementToken(request, body.tokenGestion);
    else doctorId = (await requireDoctor(request)).doctor.id;
    if (typeof body.codigo !== "string" || body.codigo.length > 80)
      throw new AccessError(400, "Referencia inválida.");
    if (
      body.action === "reprogramar" &&
      !futureChileSlot(body.nuevaFecha, body.nuevaHora)
    )
      throw new AccessError(400, "Selecciona un bloque virtual futuro.");
    if (!doctorId && !["cancelar", "reprogramar"].includes(body.action))
      throw new AccessError(403, "Acción no autorizada.");
    const { data, error } = await getServerDatabase().rpc(
      "manage_orientation",
      {
        p_code: body.codigo,
        p_token: token,
        p_doctor: doctorId,
        p_action: body.action,
        p_date: body.nuevaFecha || null,
        p_time: body.nuevaHora || null,
        p_state: body.nuevoEstado || null,
        p_note:
          typeof body.motivo === "string" ? body.motivo.slice(0, 500) : "",
      },
    );
    if (error || !data) databaseFailure(error);
    scheduleSync(data.id);
    return privateJson({ ok: true, data: publicAppointment(data) });
  } catch (error) {
    return accessFailure(error);
  }
}
