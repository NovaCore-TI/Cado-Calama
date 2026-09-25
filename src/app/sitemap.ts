import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cadoodontologia.cl';
  const currentDate = new Date().toISOString();

  const routes = [
    { url: `${baseUrl}`, lastModified: currentDate, changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${baseUrl}/equipo`, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${baseUrl}/urgencias`, lastModified: currentDate, changeFrequency: 'daily' as const, priority: 0.95 },
    { url: `${baseUrl}/cuestionario`, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.85 },
    { url: `${baseUrl}/test-confort`, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/agendar`, lastModified: currentDate, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: currentDate, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/recursos`, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: `${baseUrl}/blog`, lastModified: currentDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  ];

  return routes;
}
