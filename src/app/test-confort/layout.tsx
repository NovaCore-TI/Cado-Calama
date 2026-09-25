import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Test de confort', description: 'Explora preferencias de música, pausas y acompañamiento para conversar sobre una posible atención en CADO.', alternates: { canonical: '/test-confort' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
