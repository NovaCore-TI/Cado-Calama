import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, Mail, Instagram } from 'lucide-react';
import { CLINIC, JAVIER_PROFILE, TES_URL, SAV_URL, whatsappUrl } from '@/lib/clinic';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

export const Footer = () => <footer className="mt-auto border-t border-[#3D2C37] bg-[#513D49] text-white">
  <div className="mx-auto max-w-7xl space-y-10 px-6 py-12 sm:px-8">
    <div className="grid gap-9 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-4"><Link href="/"><Image src="/brand/image4.png" alt="CADO Centro Avanzado de Dolor Orofacial" width={220} height={74} className="h-16 w-auto object-contain" /></Link><p className="font-title text-2xl font-semibold">CADO · Centro Avanzado de Dolor Orofacial</p><p className="text-xs leading-6 text-gray-200">Espacio clínico integral en Calama dedicado al tratamiento del dolor orofacial, urgencias, endodoncia, TTM y rehabilitación con vocación humana.</p></div>
      <div className="space-y-4 text-xs">
        <h2 className="font-bold uppercase tracking-wider text-[#E2E7E7]">Ubicación y atención</h2>
        <a href={CLINIC.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 leading-6 hover:underline"><MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />{CLINIC.address}<span className="sr-only"> (Google Maps, abre otra pestaña)</span></a>
        <div className="space-y-2">
          <iframe
            title="Mini mapa de CADO en Vivar 1500, Calama"
            src={CLINIC.mapEmbedUrl}
            width="320"
            height="160"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-40 w-full rounded-2xl border border-white/20 bg-white"
          />
          <a href={CLINIC.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold underline underline-offset-4">Ver en Google Maps<span className="sr-only"> (abre otra pestaña)</span></a>
        </div>
        <p className="flex items-start gap-2 leading-6"><Clock className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />Consultas presenciales coordinadas y urgencias.</p>
        <ul className="space-y-3">{CLINIC.phones.map((phone, i) => <li key={phone.number}><a href={whatsappUrl(undefined, phone.number)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline"><WhatsAppIcon className="h-4 w-4" />{phone.display}{i === 0 && <span className="sr-only"> · Contacto prioritario</span>}</a></li>)}</ul>
        <a href={`mailto:${CLINIC.email}`} className="flex items-start gap-2 break-all hover:underline"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{CLINIC.email}</a>
        <a href="https://instagram.com/drjavierbeiza" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline"><Instagram className="h-4 w-4" aria-hidden="true" />@drjavierbeiza</a>
      </div>
      <div className="space-y-4 text-xs"><h2 className="font-bold uppercase tracking-wider text-[#E2E7E7]">Especialidades</h2><ul className="space-y-3 leading-6">{[
        ['Trastornos Temporomandibulares (TTM) y Bruxismo', '/trastornos-ttm-bruxismo'],
        ['Endodoncia (Tratamientos de conducto)', '/endodoncia-calama'],
        ['Urgencias Dentales y Dolor Agudo', '/urgencias'],
        ['Atención con Acompañamiento a Pacientes con Miedo (Dr. Javier Beiza)', JAVIER_PROFILE],
        ['Dolor orofacial', '/dolor-orofacial'],
      ].map(([label, href]) => <li key={href}><Link href={href} className="hover:underline">{label}</Link></li>)}</ul></div>
      <div className="space-y-4 text-xs"><h2 className="font-bold uppercase tracking-wider text-[#E2E7E7]">Enlaces del paciente</h2><ul className="space-y-3 leading-6">{[
        ['Conoce a nuestros 3 Dentistas', '/equipo'],
        ['Encuesta TES (Tu Espacio Seguro)', TES_URL],
        ['Sesión de Acercamiento Virtual (SAV)', SAV_URL],
        ['Blog de Salud Oral y Dolor Orofacial', '/blog'],
        ['Información adicional', '/recursos'],
        ['Preguntas frecuentes', '/faq'],
        ['Contacto y ubicación', '/contacto'],
      ].map(([label, href]) => <li key={href}><Link href={href} className="hover:underline">{label}</Link></li>)}</ul></div>
    </div>
    <p className="rounded-2xl border border-white/15 bg-black/10 p-4 text-[11px] leading-6 text-gray-200"><strong className="text-white">Información para pacientes:</strong> La Sesión de Acercamiento Virtual (SAV) y la encuesta TES permiten conocerte y preparar tu atención. No constituyen un diagnóstico definitivo ni una prescripción de fármacos. Los tratamientos requieren evaluación presencial.</p>
    <div className="flex flex-col justify-between gap-3 border-t border-white/15 pt-6 text-[11px] text-gray-200 sm:flex-row"><p>© 2026 CADO · Centro Avanzado de Dolor Orofacial · Calama.</p><p>Desarrollado por NovaCore · Proyecto de Integración INACAP Calama</p></div>
  </div>
</footer>;
