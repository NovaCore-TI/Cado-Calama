'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Breadcrumbs } from './Breadcrumbs';
import { publicPageLabels } from '@/lib/public-pages';

export function SiteShell({ children, footer, siteUrl }: { children: ReactNode; footer: ReactNode; siteUrl: string }) {
  const path = usePathname();
  const isIntranet = path.startsWith('/admin');

  if (isIntranet) return <main id="main-content" tabIndex={-1} className="min-h-screen">{children}</main>;

  const label = Object.hasOwn(publicPageLabels, path) ? publicPageLabels[path] : undefined;
  const current = label && path !== '/' ? { href: path, label } : null;
  const parents = path.startsWith('/equipo/') ? [{ href: '/equipo', label: publicPageLabels['/equipo'] }] : [];

  return <>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="flex-1">
      {current && <Breadcrumbs items={[...parents, current]} siteUrl={siteUrl} className="mx-auto max-w-7xl px-6 pt-4 sm:px-8" />}
      {children}
    </main>
    {footer}
  </>;
}
