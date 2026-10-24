import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
export const getPublishedArticle = cache(async (slug: string) => {
  const { data, error } = await supabase
    .from("articulos_blog")
    .select(
      "titulo,slug,resumen,cuerpo,categoria,autor_nombre,published_at,tiempo_lectura",
    )
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el artículo.");
  return data;
});
