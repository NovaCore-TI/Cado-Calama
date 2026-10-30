import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/equipo",
    "/urgencias",
    "/cuestionario",
    "/test-confort",
    "/agendar",
    "/faq",
    "/recursos",
    "/blog",
  ];
  const { data, error } = await supabase
    .from("articulos_blog")
    .select("slug,published_at")
    .eq("publicado", true);
  if (error) throw new Error("No se pudo generar el sitemap de publicaciones.");
  return [
    ...routes.map((route) => ({ url: SITE_URL + route })),
    ...(data || []).map((article) => ({
      url: SITE_URL + "/blog/" + article.slug,
      lastModified: article.published_at,
    })),
  ];
}
