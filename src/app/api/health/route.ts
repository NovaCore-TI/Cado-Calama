import { NextResponse } from "next/server";
import { getServerDatabase } from "@/lib/server-db";
export async function GET() {
  try {
    const { data, error } = await getServerDatabase().rpc("cado_readiness");
    if (error || data !== true)
      return NextResponse.json(
        {
          ok: false,
          error: "El servicio no está listo para recibir reservas.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Servicio no configurado o no disponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
