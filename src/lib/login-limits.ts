import "server-only";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { AccessError } from "./doctor-auth";

export function loginLimitKeys(request: NextRequest, email: string) {
  const key = process.env.CADO_SESSION_SECRET;
  if (!key || key.length < 32) throw new AccessError(503, "Acceso profesional no configurado.");
  // Vercel overwrites this header. Other deployments use a shared network bucket
  // until their trusted proxy is explicitly configured; never trust a client IP.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown" : "local";
  return ["account:" + email.trim().toLowerCase(), "network:" + ip].map(value =>
    createHmac("sha256", key).update(value).digest("hex"),
  );
}
