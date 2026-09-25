import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Recursos para pacientes', description: 'Recursos y guías de cuidado oral de CADO Odontología, sujetos a validación profesional.', alternates: { canonical: '/recursos' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
