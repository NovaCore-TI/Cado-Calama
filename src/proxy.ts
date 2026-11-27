import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { CLINIC } from "@/lib/clinic";
import { requireDoctor } from "@/lib/doctor-auth";

function supabaseConnections() {
  const url = URL.parse(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!url || url.username || url.password) return [];
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "https:") return [url.origin, `wss://${url.host}`];
  return local && url.protocol === "http:" ? [url.origin, `ws://${url.host}`] : [];
}

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const connections = ["'self'", ...supabaseConnections()];
  if (development) connections.push("ws://localhost:*", "ws://127.0.0.1:*");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // Next Image and the rich-text editor emit inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: blob:",
    `connect-src ${connections.join(" ")}`,
    `frame-src ${new URL(CLINIC.mapEmbedUrl).origin} https://www.google.com`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const path = request.nextUrl.pathname;
  if ((path === "/admin" || path.startsWith("/admin/")) && path !== "/admin/login") {
    try {
      await requireDoctor(request);
    } catch {
      response = NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|brand(?:/|$)|fonts(?:/|$)|favicon\\.ico$|[^/]+\\.png$|robots\\.txt$|sitemap\\.xml$).*)",
  ],
};
