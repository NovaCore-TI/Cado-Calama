import type { Metadata } from 'next';
import { SITE_URL, serializeStructuredData } from '@/lib/site';
import { CLINIC } from '@/lib/clinic';
import './globals.css';
import { SiteShell } from '@/components/SiteShell';
import { CadoBoundary } from '@/context/CadoBoundary';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CADO | Centro Avanzado de Dolor Orofacial en Calama',
    template: '%s | CADO Odontología Calama',
  },
  description:
    'Centro Avanzado de Dolor Orofacial en Calama. Urgencias dentales, endodoncia, TTM y atención humana. Vivar #1500, Oficina 205, Edificio Espacio Parque.',
  keywords: [
    'Dentista Calama',
    'Clínica dental Calama',
    'Miedo al dentista Calama',
    'Fobia dental Calama',
    'Dr. Javier Beiza',
    'Urgencias dentales Calama',
    'Dolor orofacial Calama',
    'Endodoncia Calama',
    'Tratamiento de conducto Calama',
    'TTM y bruxismo Calama',
    'Edificio Espacio Parque Calama',
    'Bruxismo turnos mineros Calama',
    'CADO Odontología',
  ],
  authors: [{ name: 'Dr. Javier Beiza Ayala' }, { name: 'NovaCore INACAP' }],
  creator: 'NovaCore — Proyecto de Integración INACAP Calama',
  publisher: 'CADO Odontología',
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: SITE_URL,
    siteName: 'CADO Odontología Calama',
    title: 'CADO | Centro Avanzado de Dolor Orofacial en Calama',
    description:
      'Atención del dolor orofacial, endodoncia, urgencias y TTM con un trato cercano y humano en Calama.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CADO | Centro Avanzado de Dolor Orofacial en Calama',
    description:
      'Información y orientación inicial para cuidar tu salud oral a tu ritmo en Calama.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/icon.png',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Dentist', 'MedicalClinic', 'LocalBusiness'],
    '@id': `${SITE_URL}/#clinica`,
    name: 'CADO - Centro Avanzado de Dolor Orofacial',
    alternateName: 'CADO Odontología',
    sameAs: [CLINIC.mapsUrl],
    hasMap: CLINIC.mapsUrl,
    image: `${SITE_URL}/brand/clinica-cado-calama.webp`,
    logo: `${SITE_URL}/brand/image2.png`,
    telephone: '+56944657815',
    email: 'javierbeizaayala@gmail.com',
    url: SITE_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Vivar #1500, Oficina 205, Edificio Espacio Parque',
      addressLocality: 'Calama',
      addressRegion: 'Antofagasta',
      postalCode: '1390000',
      addressCountry: 'CL',
    },
    medicalSpecialty: 'Dentistry',
    contactPoint: CLINIC.phones.map(phone => ({ '@type': 'ContactPoint', telephone: `+${phone.number}`, contactType: 'Atención al paciente', availableLanguage: 'Spanish' })),
    founder: {
      '@type': 'Person',
      name: 'Dr. Javier Beiza Ayala',
      jobTitle: 'Cirujano Dentista',
      description:
        'Cirujano dentista cuyo enfoque de atención en CADO prioriza la escucha, la claridad y el respeto.',
    },
  };

  return (
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        <link rel="preload" href="/fonts/montserrat-normal-100-900.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredData(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-cado-light text-cado-text antialiased selection:bg-cado-purple/20 selection:text-cado-dark">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-[#A14B92] focus:px-4 focus:py-2.5 focus:text-white focus:text-xs focus:font-semibold focus:shadow-xl focus:outline-none"
        >
          Saltar al contenido principal
        </a>
        <SiteShell footer={<Footer />}><CadoBoundary>{children}</CadoBoundary></SiteShell>
      </body>
    </html>
  );
}
