import type { Metadata } from 'next';
import { SITE_URL } from './site';

export function publicMetadata({
  path, title, description, absolute = false, article,
}: {
  path: string;
  title: string;
  description: string;
  absolute?: boolean;
  article?: { publishedTime?: string; author?: string };
}): Metadata {
  const url = SITE_URL + path;
  const image = {
    url: SITE_URL + '/brand/cado-calama-social.jpg',
    width: 1200,
    height: 630,
    alt: 'Centro CADO Odontología en Calama',
  };
  const social = { title, description, images: [image] };
  const graph = { ...social, url, locale: 'es_CL', siteName: 'CADO Odontología Calama' };
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: article
      ? { ...graph, type: 'article', publishedTime: article.publishedTime, authors: article.author ? [article.author] : undefined }
      : { ...graph, type: 'website' },
    twitter: { ...social, card: 'summary_large_image' },
  };
}
