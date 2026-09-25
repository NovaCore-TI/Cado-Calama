'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function SiteShell({ children }: { children: ReactNode }) {
  const isIntranet = usePathname().startsWith('/admin');

  if (isIntranet) return <main className="min-h-screen">{children}</main>;

  return <><Navbar /><main className="flex-1">{children}</main><Footer /></>;
}
