import type { Metadata } from 'next';

// Local-only articles have no server-side record to index in this prototype.
export const metadata: Metadata = { title: 'Artículo educativo · prototipo', robots: { index: false, follow: false }, alternates: {} };

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
