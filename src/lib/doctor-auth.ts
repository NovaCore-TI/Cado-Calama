import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const DOCTOR_COOKIE = "cado_doctor_session";
export const SESSION_SECONDS = 30 * 60;
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function sessionKey() {
  const key =
    process.env.CADO_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 32)
    throw new AccessError(503, "La sesión del servidor no está configurada.");
  return key;
}
export function issueProfessionalSession(token: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ token, expiresAt: now + SESSION_SECONDS * 1000 }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", sessionKey()).update(payload).digest("base64url")
  );
}
export function readProfessionalSession(
  value: string | undefined,
  now = Date.now(),
): string {
  if (!value || value.length > 8192)
    throw new AccessError(401, "Debes iniciar sesión.");
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length)
    throw new AccessError(401, "Sesión inválida.");
  const expected = createHmac("sha256", sessionKey()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new AccessError(401, "Sesión inválida.");
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof data.token !== "string" ||
      typeof data.expiresAt !== "number" ||
      data.expiresAt <= now
    )
      throw new Error();
    return data.token;
  } catch {
    throw new AccessError(401, "Sesión inválida o caducada.");
  }
}
export function checkSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
    .origin;
  if (origin && origin !== expected)
    throw new AccessError(403, "Origen de solicitud no permitido.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new AccessError(403, "Solicitud no permitida.");
}
export async function verifyDoctorToken(
  token?: string,
  authenticatedUser?: { id: string } | null,
) {
  if (!token) throw new AccessError(401, "Debes iniciar sesión.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AccessError(503, "Autenticación no configurada.");
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  let user = authenticatedUser || null;
  if (!user) {
    const { data: identity, error } = await db.auth.getUser(token);
    if (error || !identity.user)
      throw new AccessError(401, "Sesión inválida o caducada.");
    user = identity.user;
  }
  // Membership is provisioned by an administrator, never from user_metadata/email.
  const { data: doctor, error: membershipError } = await db
    .from("doctores")
    .select("id,nombre,email,rol,auth_user_id")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (membershipError)
    throw new AccessError(503, "No se pudo verificar el acceso profesional.");
  if (!doctor)
    throw new AccessError(
      403,
      "Esta cuenta no tiene acceso profesional autorizado.",
    );
  return { doctor, db, user, token };
}
export async function requireDoctor(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
    checkSameOrigin(request);
  return verifyDoctorToken(
    readProfessionalSession(request.cookies.get(DOCTOR_COOKIE)?.value),
  );
}
export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
export function accessFailure(error: unknown) {
  return privateJson(
    {
      ok: false,
      error:
        error instanceof AccessError
          ? error.message
          : "No fue posible completar la operación.",
    },
    error instanceof AccessError ? error.status : 503,
  );
}
