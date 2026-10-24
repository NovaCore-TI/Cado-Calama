import { normalizeArticleContent, articlePlainText } from "@/lib/article-content";
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerDatabase } from "@/lib/server-db";
import {
  accessFailure,
  AccessError,
  privateJson,
  requireDoctor,
} from "@/lib/doctor-auth";
function article(body: Record<string, unknown>) {
  const title = body.titulo,
    content = body.cuerpo;
  if (
    typeof title !== "string" ||
    title.trim().length < 3 ||
    title.length > 180 ||
    typeof content !== "string" ||
    !content.trim() ||
    content.length > 100000
  )
    throw new AccessError(400, "Revisa el título y contenido.");
  let safeContent: string;
  try { safeContent = normalizeArticleContent(content); if (!articlePlainText(safeContent).trim()) throw Error(); }
  catch { throw new AccessError(400, "Revisa el formato del contenido y sus enlaces."); }
  if (!["Miedo Dental", "Cuidados", "Bruxismo", "Urgencias"].includes(String(body.categoria))) throw new AccessError(400, "Categoría inválida.");
  const slug =
    typeof body.slug === "string"
      ? body.slug
      : title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160)
    throw new AccessError(400, "La URL del artículo no es válida.");
  return {
    titulo: title.trim(),
    slug,
    cuerpo: safeContent,
    tiempo_lectura: Math.max(1, Math.ceil(articlePlainText(safeContent).split(/\s+/).length / 180)) + " min de lectura",
    resumen:
      typeof body.resumen === "string"
        ? body.resumen.slice(0, 500)
        : articlePlainText(safeContent).slice(0, 140),
    categoria: typeof body.categoria === "string" ? body.categoria : "Cuidados",
    publicado: body.publicado === true,
    estado_publicacion: body.publicado === true ? "Publicado" : "Borrador",
  };
}
export async function GET(request: NextRequest) {
  try {
    const admin = request.nextUrl.searchParams.get("admin") === "1";
    const doctor = admin ? (await requireDoctor(request)).doctor : null;
    const db = admin ? getServerDatabase() : supabase;
    let query = db
      .from("articulos_blog")
      .select("*")
      .order("created_at", { ascending: false });
    if (!admin) query = query.eq("publicado", true);
    else query = query.eq("autor_id", doctor!.id);
    const slug = request.nextUrl.searchParams.get("slug");
    if (slug) query = query.eq("slug", slug);
    const { data, error } = await query;
    if (error?.code === "23505") throw new AccessError(409, "La URL del artículo ya está en uso. Elige otra.");
    if (error) throw error;
    return privateJson({
      ok: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const payload = article(await request.json());
    const { data, error } = await getServerDatabase()
      .from("articulos_blog")
      .insert({ ...payload, autor_id: doctor.id, autor_nombre: doctor.nombre })
      .select()
      .single();
    if (error?.code === "23505") throw new AccessError(409, "La URL del artículo ya está en uso. Elige otra.");
    if (error) throw error;
    return privateJson({ ok: true, data, syncedToSupabase: true }, 201);
  } catch (error) {
    return accessFailure(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const body = await request.json();
    if (typeof body.id !== "string")
      throw new AccessError(400, "Artículo inválido.");
    const { data, error } = await getServerDatabase()
      .from("articulos_blog")
      .update(article(body))
      .eq("id", body.id)
      .eq("autor_id", doctor.id)
      .select()
      .maybeSingle();
    if (error?.code === "23505") throw new AccessError(409, "La URL del artículo ya está en uso. Elige otra.");
    if (error) throw error;
    if (!data) throw new AccessError(404, "Artículo no disponible.");
    return privateJson({ ok: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const { id } = await request.json();
    if (typeof id !== "string")
      throw new AccessError(400, "Artículo inválido.");
    const { data, error } = await getServerDatabase()
      .from("articulos_blog")
      .delete()
      .eq("id", id)
      .eq("autor_id", doctor.id)
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") throw new AccessError(409, "La URL del artículo ya está en uso. Elige otra.");
    if (error) throw error;
    if (!data) throw new AccessError(404, "Artículo no disponible.");
    return privateJson({ ok: true });
  } catch (error) {
    return accessFailure(error);
  }
}
