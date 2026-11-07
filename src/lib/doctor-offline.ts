import type { Appointment, BlogPost } from '@/context/CadoContext';

export type OfflineArticle = Pick<BlogPost, 'title' | 'slug' | 'excerpt' | 'content' | 'category'> & {
  id: string | null;
  baseline: string | null;
};

export type DerivationStatus = NonNullable<Appointment['derivationStatus']>;
export type OfflineDerivation = { previous: DerivationStatus; next: DerivationStatus };
export type OfflineChanges = { article?: OfflineArticle; derivations?: Record<string, OfflineDerivation> };

export function readDoctorOffline(key: string): OfflineChanges {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function saveDoctorOffline(key: string, update: (current: OfflineChanges) => OfflineChanges) {
  try {
    const changes = update(readDoctorOffline(key));
    if (changes.article || Object.keys(changes.derivations ?? {}).length) {
      localStorage.setItem(key, JSON.stringify(changes));
    } else {
      localStorage.removeItem(key);
    }
    return changes;
  } catch {
    return null;
  }
}

export function articleVersion(post: Pick<BlogPost, 'title' | 'slug' | 'excerpt' | 'content' | 'category' | 'published'>) {
  return JSON.stringify([post.title, post.slug, post.excerpt, post.content, post.category, post.published]);
}

export function clearSyncedArticle(changes: OfflineChanges, synced: OfflineArticle) {
  if (JSON.stringify(changes.article) !== JSON.stringify(synced)) return changes;
  return { ...changes, article: undefined };
}

export function clearSyncedDerivation(changes: OfflineChanges, id: string, synced: OfflineDerivation) {
  const pending = changes.derivations?.[id];
  if (pending?.previous !== synced.previous || pending?.next !== synced.next) return changes;
  const derivations = { ...changes.derivations };
  delete derivations[id];
  return { ...changes, derivations };
}
