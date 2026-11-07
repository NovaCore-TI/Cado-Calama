'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function SiteShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const isIntranet = usePathname().startsWith('/admin');

  if (isIntranet) return <main id="main-content" tabIndex={-1} className="min-h-screen">{children}</main>;

  return <><Navbar /><main id="main-content" tabIndex={-1} className="flex-1">{children}</main>{footer}</>;
}
