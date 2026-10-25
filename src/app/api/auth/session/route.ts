import { NextRequest } from "next/server";
import {
  accessFailure,
  checkSameOrigin,
  DOCTOR_COOKIE,
  privateJson,
  requireDoctor,
  SESSION_SECONDS,
  verifyDoctorToken,
  issueProfessionalSession,
} from "@/lib/doctor-auth";

export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    return privateJson({ ok: true, doctor });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkSameOrigin(request);
    // A raw Supabase token cannot bypass the application's login gate.
    // This endpoint renews an existing professional session only.
    const existing = await requireDoctor(request);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    const { doctor } = await verifyDoctorToken(token);
    if (doctor.id !== existing.doctor.id) return privateJson({ ok: false, error: "La sesión pertenece a otra cuenta." }, 403);
    const response = privateJson({ ok: true, doctor });
    response.cookies.set(DOCTOR_COOKIE, issueProfessionalSession(token!), {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return accessFailure(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const response = privateJson({ ok: true });
    response.cookies.set(DOCTOR_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return accessFailure(error);
  }
}
