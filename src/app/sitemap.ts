import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/equipo",
    "/equipo/dr-javier-beiza",
    "/equipo/dr-juan-cruz-mandiola",
    "/equipo/dr-oscar-albanes-hidalgo",
    "/dolor-orofacial",
    "/endodoncia-calama",
    "/trastornos-ttm-bruxismo",
    "/contacto",
    "/urgencias",
    "/agendar",
    "/faq",
    "/recursos",
    "/blog",
  ];
  const { data, error } = await supabase
    .from("articulos_blog")
    .select("slug,published_at")
    .eq("publicado", true);
  if (error) console.warn("Article sitemap unavailable; serving known public pages.");
  return [
    ...routes.map((route) => ({ url: SITE_URL + route })),
    ...(error ? [] : data || []).map((article) => ({
      url: SITE_URL + "/blog/" + article.slug,
      lastModified: article.published_at,
    })),
  ];
}
