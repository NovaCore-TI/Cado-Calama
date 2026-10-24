import { NextRequest } from "next/server";
import { accessFailure, AccessError, privateJson, requireDoctor } from "@/lib/doctor-auth";
import { getServerDatabase } from "@/lib/server-db";
import { readGuides, renderGuide, guideFileName } from "@/lib/guides";

export async function GET(request: NextRequest) {
  try {
    const admin = request.nextUrl.searchParams.get("admin") === "1";
    if (admin) await requireDoctor(request);
    const guides = await readGuides(admin);
    const data = await Promise.all(guides.map(async guide => {
      const pdf = await renderGuide(guide);
      return { ...guide, fileName: guideFileName(guide), pages: pdf.pages, bytes: pdf.bytes.length };
    }));
    return privateJson({ ok: true, data });
  } catch (error) { return accessFailure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const { id, activo, confirmacionRevision } = await request.json();
    if (typeof id !== "string" || typeof activo !== "boolean" || (activo && confirmacionRevision !== true))
      throw new AccessError(400, "Confirma la revisión del documento antes de publicarlo.");
    const { data, error } = await getServerDatabase().from("guias_clinicas")
      .update(activo ? { activo, revisado_por: doctor.id, revisado_en: new Date().toISOString() } : { activo })
      .eq("id", id).not("slug", "is", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new AccessError(404, "Guía no disponible.");
    return privateJson({ ok: true });
  } catch (error) { return accessFailure(error); }
}
