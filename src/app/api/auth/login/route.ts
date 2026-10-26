import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { AccessError, accessFailure, checkSameOrigin, DOCTOR_COOKIE, privateJson, verifyDoctorToken, issueProfessionalSession, SESSION_SECONDS } from "@/lib/doctor-auth";
import { getServerDatabase } from "@/lib/server-db";
import { loginLimitKeys } from "@/lib/login-limits";

export async function POST(request: NextRequest) {
  try {
    checkSameOrigin(request);
    const body = await request.json();
    if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.password !== "string" || !body.password || body.password.length > 1024)
      throw new AccessError(400, "Revisa el correo y contraseña.");
    const email = body.email.trim().toLowerCase();
    const keys = loginLimitKeys(request, email);
    const db = getServerDatabase();
    const limit = await db.rpc("begin_professional_login", { p_keys: keys });
    if (limit.error || !limit.data) throw new AccessError(503, "No se pudo verificar el límite de acceso.");
    if (!limit.data.allowed) {
      const response = privateJson({ ok: false, locked: true, error: "Acceso temporalmente limitado. Intenta nuevamente en quince minutos." }, 429);
      response.headers.set("Retry-After", String(limit.data.retry_after || 900));
      return response;
    }
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password: body.password });
    if (error || !data.session) throw new AccessError(401, "Credenciales no válidas o acceso temporalmente limitado.");
    const { doctor } = await verifyDoctorToken(data.session.access_token, data.user);
    const completed = await db.rpc("complete_professional_login", { p_keys: keys });
    if (completed.error) throw new AccessError(503, "No se pudo completar el acceso.");
    const response = privateJson({ ok: true, doctor, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
    response.cookies.set(DOCTOR_COOKIE, issueProfessionalSession(data.session.access_token), {
      httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) { return accessFailure(error); }
}
