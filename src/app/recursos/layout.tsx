import { publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata({ path: '/recursos', title: 'Información adicional para pacientes', description: 'Recursos y guías de cuidado oral de CADO Odontología, sujetos a validación profesional.' });
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
