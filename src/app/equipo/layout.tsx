import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Conoce a nuestro equipo', description: 'Conoce a Javier Beiza, Juan y Oscar, el equipo de CADO en Calama.', alternates: { canonical: '/equipo' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
