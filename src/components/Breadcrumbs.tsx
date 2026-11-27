import Link from 'next/link';
import { serializeStructuredData } from '@/lib/site';

type Crumb = { href: string; label: string };

export function Breadcrumbs({ items, siteUrl, className }: {
  items: Crumb[];
  siteUrl: string;
  className?: string;
}) {
  const trail = [{ href: '/', label: 'Inicio' }, ...items];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(({ href, label }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: label,
      item: siteUrl + href,
    })),
  };
  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(schema) }} />
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-[#513D49]">
        {trail.map(({ href, label }, index) => (
          <li key={href} className="flex min-w-0 items-baseline gap-2">
            {index > 0 && <span aria-hidden="true">›</span>}
            {index === trail.length - 1
              ? <span aria-current="page" className="font-semibold">{label}</span>
              : <Link href={href} className="text-[#8A3D7D] underline underline-offset-4">{label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
