import { publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata({ path: '/faq', title: 'Preguntas frecuentes', description: 'Respuestas a preguntas frecuentes sobre CADO Odontología, orientación y atención presencial en Calama.' });
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
