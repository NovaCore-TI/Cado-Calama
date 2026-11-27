import { FaqDirectory } from '@/components/FaqDirectory';
import { getPublicFaqs } from '@/lib/faqs';
import { SITE_URL, serializeStructuredData } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function FaqPage() {
  const { items } = await getPublicFaqs();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: SITE_URL + '/faq',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return <>
    {items.length > 0 && <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(schema) }} />}
    <FaqDirectory items={items} />
  </>;
}
