import "server-only";
import { getServerDatabase } from "./server-db";
import { AccessError } from "./doctor-auth";
import { generateGuidePdf, type GuideDocument } from "./guide-pdf";
import { createHash } from "node:crypto";

const rendered = new Map<string, Awaited<ReturnType<typeof generateGuidePdf>>>();
export async function renderGuide(guide: GuideDocument) {
  const key = createHash("sha256").update(JSON.stringify(guide)).digest("hex");
  if (rendered.has(key)) return rendered.get(key)!;
  const result = await generateGuidePdf(guide);
  if (rendered.size >= 12) rendered.delete(rendered.keys().next().value!);
  rendered.set(key, result);
  return result;
}
export async function readGuides(admin = false): Promise<GuideDocument[]> {
  let query = getServerDatabase().from("guias_clinicas")
    .select("id,slug,titulo,categoria,descripcion,contenido,activo,revisado_en").order("created_at");
  if (!admin) query = query.eq("activo", true).not("revisado_en", "is", null);
  const { data, error } = await query;
  if (error) throw new AccessError(503, "No se pudo cargar la biblioteca. Intenta de nuevo.");
  return (data || []).filter((row): row is GuideDocument =>
    typeof row.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) && Array.isArray(row.contenido),
  );
}
export async function findGuide(slug: string, admin = false) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120)
    throw new AccessError(404, "Guía no disponible.");
  const guide = (await readGuides(admin)).find(row => row.slug === slug);
  if (!guide) throw new AccessError(404, "Guía no disponible.");
  return guide;
}
export function guideFileName(guide: GuideDocument) { return `CADO_${guide.slug}.pdf`; }
