import BlogListing from '@/components/BlogListing';
import type { BlogPost } from '@/context/CadoContext';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const { data, error } = await supabase.from('articulos_blog')
    .select('id,titulo,slug,resumen,cuerpo,categoria,autor_nombre,tiempo_lectura,published_at')
    .eq('publicado', true).order('published_at', { ascending: false }).order('id', { ascending: false });
  const posts: BlogPost[] = error ? [] : (data || []).map(row => ({
    id: row.id, title: row.titulo, slug: row.slug, excerpt: row.resumen, content: row.cuerpo,
    category: row.categoria, author: row.autor_nombre, readTime: row.tiempo_lectura,
    date: row.published_at || '', published: true,
  }));
  return <BlogListing initialPosts={posts} />;
}
