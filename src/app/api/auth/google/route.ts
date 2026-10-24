import { NextRequest, NextResponse } from "next/server";
import { getDoctorGoogleAuthUrl } from "@/lib/google-calendar";
import { accessFailure, requireDoctor } from "@/lib/doctor-auth";
import { newSecret } from "@/lib/patient-access";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireDoctor(request);
    const state = newSecret();
    const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
      .origin;
    const url = getDoctorGoogleAuthUrl(
      state,
      origin + "/api/auth/google/callback",
    );
    if (!url)
      return NextResponse.json(
        { ok: false, error: "La integración con Google no está configurada." },
        { status: 503 },
      );
    const response = NextResponse.redirect(url);
    response.cookies.set("cado_google_state", state, {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "lax",
      maxAge: 600,
      path: "/api/auth/google/callback",
    });
    return response;
  } catch (error) {
    return accessFailure(error);
  }
}
