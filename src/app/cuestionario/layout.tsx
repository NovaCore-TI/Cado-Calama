import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Cuestionario previo', description: 'Conoce el cuestionario previo que ayudará al doctor a preparar una orientación respetuosa.', alternates: { canonical: '/cuestionario' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
