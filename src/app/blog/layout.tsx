import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Blog de salud oral', description: 'Artículos educativos de salud oral revisados por CADO Odontología.', alternates: { canonical: '/blog' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
