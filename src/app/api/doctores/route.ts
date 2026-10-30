import { NextRequest } from "next/server";
import {
  accessFailure,
  AccessError,
  privateJson,
  requireDoctor,
} from "@/lib/doctor-auth";
import {
  getDoctorGoogleCredentials,
  removeDoctorGoogleCredentials,
} from "@/lib/google-tokens-store";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const credentials = await getDoctorGoogleCredentials(doctor.id);
    return privateJson({
      ok: true,
      data: [
        {
          ...doctor,
          google_conectado: !!credentials,
          google_email: credentials?.email || null,
        },
      ],
      count: 1,
    });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const body = await request.json();
    if (
      body.action !== "desconectar" ||
      (body.doctorId && body.doctorId !== doctor.id)
    )
      throw new AccessError(403, "Operación no autorizada.");
    await removeDoctorGoogleCredentials(doctor.id);
    return privateJson({ ok: true });
  } catch (error) {
    return accessFailure(error);
  }
}
