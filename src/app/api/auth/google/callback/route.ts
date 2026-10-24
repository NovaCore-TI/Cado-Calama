import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndSaveDoctorTokens } from "@/lib/google-calendar";
import { accessFailure, AccessError, requireDoctor } from "@/lib/doctor-auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  try {
    const { doctor } = await requireDoctor(request);
    const state = request.nextUrl.searchParams.get("state") || "";
    const expected = request.cookies.get("cado_google_state")?.value || "";
    if (
      !expected ||
      state.length !== expected.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expected))
    )
      throw new AccessError(
        403,
        "La vinculación de Google caducó o no es válida.",
      );
    const code = request.nextUrl.searchParams.get("code");
    if (!code || request.nextUrl.searchParams.has("error"))
      throw new AccessError(400, "Google no autorizó la vinculación.");
    await exchangeCodeAndSaveDoctorTokens(
      code,
      doctor.id,
      origin + "/api/auth/google/callback",
    );
    const response = NextResponse.redirect(
      origin + "/admin?google_success=true",
    );
    response.cookies.set("cado_google_state", "", {
      path: "/api/auth/google/callback",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const response = accessFailure(error);
    response.cookies.set("cado_google_state", "", {
      path: "/api/auth/google/callback",
      maxAge: 0,
    });
    return response;
  }
}
