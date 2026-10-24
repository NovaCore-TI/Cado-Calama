import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cadoodontologia.cl';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/gestionar', '/api/'], // Doctor portal hidden and barred from search crawlers
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
