import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { accessFailure, AccessError, requireDoctor } from "@/lib/doctor-auth";
import { findGuide, renderGuide, guideFileName } from "@/lib/guides";
import { getServerDatabase } from "@/lib/server-db";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const admin = params.get("admin") === "1";
    if (admin) await requireDoctor(request);
    const guide = await findGuide(params.get("id") || "", admin);
    const pdf = await renderGuide(guide);
    const preview = params.get("preview") === "1";
    if (!preview && !admin) {
      const event = request.headers.get("idempotency-key") || randomUUID();
      if (!/^[a-f0-9-]{36}$/i.test(event)) throw new AccessError(400, "Identificador de descarga inválido.");
      const { error } = await getServerDatabase().from("logs_auditoria").upsert({
        event_key: "guide:" + guide.id + ":" + event, accion: "PDF_PREPARADO", entidad: "guias_clinicas", entidad_id: guide.id,
        detalle: "Archivo preparado para entrega HTTP; no acredita guardado en el dispositivo.",
      }, { onConflict: "event_key", ignoreDuplicates: true });
      if (error) throw new AccessError(503, "No pudimos preparar la descarga. Intenta nuevamente.");
    }
    return new NextResponse(new Uint8Array(pdf.bytes), { headers: {
      "Content-Type": "application/pdf", "Content-Length": String(pdf.bytes.length),
      "Content-Disposition": (preview ? "inline" : "attachment") + '; filename="' + guideFileName(guide) + '"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return accessFailure(error); }
}
