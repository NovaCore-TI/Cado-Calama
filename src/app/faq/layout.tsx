import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Preguntas frecuentes', description: 'Respuestas a preguntas frecuentes sobre CADO Odontología, orientación y atención presencial en Calama.', alternates: { canonical: '/faq' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
