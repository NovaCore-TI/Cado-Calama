import { articlePlainText, normalizeArticleContent } from '@/lib/article-content';
import { articleVersion, type OfflineArticle, type OfflineDerivation } from '@/lib/doctor-offline';

export type OfflineSyncResult = 'confirmed' | 'review' | 'retry';

export async function syncOfflineArticle(draft: OfflineArticle, headers: Record<string, string>, signal: AbortSignal, stillPending: () => boolean): Promise<OfflineSyncResult> {
  const title = draft.title.trim();
  const text = articlePlainText(draft.content).trim();
  const slug = draft.slug.trim() || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (title.length < 3 || !text || !slug) return 'review';

  let content: string;
  try { content = normalizeArticleContent(draft.content); }
  catch { return 'review'; }
  const excerpt = (draft.excerpt.trim() || text.slice(0, 140)).slice(0, 500);
  const version = articleVersion({ title, slug, excerpt, content, category: draft.category, published: false });
  async function readCurrent() {
    const response = await fetch('/api/blog?admin=1', { cache: 'no-store', signal });
    if (!response.ok) throw Error('No se pudo consultar el borrador.');
    const { data } = await response.json();
    const current = Array.isArray(data) && data.find(row => draft.id ? row.id === draft.id : row.slug === slug);
    return current ? {
      published: current.publicado,
      version: articleVersion({
        title: current.titulo, slug: current.slug, excerpt: current.resumen,
        content: current.cuerpo, category: current.categoria, published: current.publicado,
      }),
    } : null;
  }

  const current = await readCurrent();
  if (current) {
    if (current.version === version) return 'confirmed';
    if (!draft.id || current.published || current.version !== draft.baseline) return 'review';
  } else if (draft.id) return 'review';

  if (!stillPending()) return 'retry';
  const saved = await fetch('/api/blog', {
    method: draft.id ? 'PATCH' : 'POST',
    headers, signal,
    body: JSON.stringify({
      id: draft.id, titulo: title, slug, resumen: excerpt, cuerpo: content,
      categoria: draft.category, publicado: false,
    }),
  });
  if (saved.ok) return 'confirmed';
  if (saved.status === 409) return (await readCurrent())?.version === version ? 'confirmed' : 'review';
  return saved.status === 400 || saved.status === 404 ? 'review' : 'retry';
}

export async function syncOfflineDerivation(id: string, pending: OfflineDerivation, headers: Record<string, string>, signal: AbortSignal, stillPending: () => boolean): Promise<OfflineSyncResult> {
  const response = await fetch(`/api/orientaciones?codigo=${encodeURIComponent(id)}`, { cache: 'no-store', signal });
  if (!response.ok) return 'retry';
  const { data } = await response.json();
  const current = Array.isArray(data) && data.find(row => row.codigo === id);
  if (!current) return 'review';
  const actual = current.estado_derivacion ?? 'Sin derivación';
  if (actual === pending.next) return 'confirmed';
  if (actual !== pending.previous) return 'review';
  if (!stillPending()) return 'retry';
  const saved = await fetch('/api/orientaciones', {
    method: 'PATCH', headers, signal,
    body: JSON.stringify({ codigo: id, action: 'derivacion', nuevoEstado: pending.next }),
  });
  return saved.ok ? 'confirmed' : [400, 404, 409].includes(saved.status) ? 'review' : 'retry';
}
