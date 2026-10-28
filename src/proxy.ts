import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireDoctor } from "@/lib/doctor-auth";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  try {
    await requireDoctor(request);
    return NextResponse.next();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    const message = status === 401 ? "Inicia sesión para ingresar al panel."
      : status === 403 ? "Tu cuenta no tiene acceso a este panel."
      : "El acceso no está disponible temporalmente. Inténtalo nuevamente.";
    // A rewrite can lose its status while Next renders the destination page.
    // Return a complete response so private URLs really reject with 401/403.
    return new NextResponse(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso profesional · CADO</title></head><body style="margin:0;background:#F6F8F8;color:#513D49;font:1rem/1.6 system-ui,sans-serif"><main style="max-width:32rem;margin:12vh auto;padding:1.5rem"><h1>Acceso profesional</h1><p>${message}</p><a href="/admin/login" style="display:inline-block;padding:.75rem 1rem;border-radius:.75rem;background:#A14B92;color:white">Ir al acceso profesional</a></main></body></html>`, {
      status,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
}
export const config = { matcher: ["/admin/:path*"] };
