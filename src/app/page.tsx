import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Activity, ArrowRight, CheckCircle2, HeartHandshake, MapPin, Quote, ShieldCheck, Users } from 'lucide-react';
import { CLINIC, JAVIER_PROFILE, TES_URL, whatsappUrl } from '@/lib/clinic';
import { DentalinkLink } from '@/components/DentalinkLink';
import { Testimonials } from '@/components/Testimonials';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

export const metadata: Metadata = {
  title: { absolute: 'CADO | Dolor Orofacial y Urgencias Dentales en Calama' },
  description: 'Centro odontológico en Calama dedicado al dolor orofacial, urgencias dentales, endodoncia y TTM. Atención especializada con un trato cercano y humano.',
  alternates: { canonical: '/' },
  openGraph: { title: 'CADO · Centro Avanzado de Dolor Orofacial en Calama', description: 'Diagnóstico de precisión, especialidades coordinadas y atención humana en Calama.', url: '/' },
};

const services = [
  { badge: 'Alivio oportuno', title: 'Urgencias Dentales y Dolor Severo', description: 'Atención prioritaria para pulpitis agudas, infecciones, inflamación facial o fracturas imprevistas. Cortamos el dolor de raíz con resolución clínica definitiva.', image: '/brand/atencion-dental-cado-calama.webp', alt: 'Conversación entre un profesional y un paciente en CADO', href: '/urgencias', link: 'Ver protocolo de urgencias' },
  { badge: 'Preservación dental', title: 'Endodoncia y Dolor Dental Complejo', description: 'Tratamiento especializado del tejido pulpar infectado o inflamado para eliminar infecciones internas profundas y preservar tus dientes naturales sin molestias.', image: '/brand/tecnologia-digital-cado-calama.webp', alt: 'Tecnología digital utilizada en la atención odontológica de CADO', href: '/endodoncia-calama', link: 'Conoce el área de Endodoncia' },
  { badge: 'Función articular y bienestar orofacial', title: 'Trastornos Temporomandibulares (TTM) y Bruxismo', description: 'Diagnóstico y tratamiento del dolor en mandíbula, chasquidos articulares, contracturas de cuello, cefaleas tensionales y desgaste por apretamiento diurno o nocturno.', image: '/brand/escucha-clinica-cado-calama.webp', alt: 'Atención y escucha de las molestias de un paciente en CADO', href: '/trastornos-ttm-bruxismo', link: 'Saber más sobre TTM y articulación' },
  { badge: 'Acompañamiento emocional', title: 'Atención Especializada a Pacientes con Miedo', description: 'Para quienes postergan su salud por ansiedad o malas experiencias. Citas extendidas, pausas activas, videollamada previa (SAV) y el Pacto de la Mano Levantada.', image: '/brand/atencion-dental-cado-calama.webp', alt: 'El Dr. Javier Beiza conversa con un paciente en un ambiente tranquilo', href: JAVIER_PROFILE, link: 'Conoce al Dr. Javier Beiza y el método sin juicios' },
];

export default function HomePage() {
  preload('/fonts/cormorant-home-title.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  return <div className="home-page bg-white text-[#513D49]">
    <section className="relative border-b border-[#E2E7E7] bg-[#F6F8F8]">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-24">
        <div className="space-y-6">
          <a href={CLINIC.directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-xs font-semibold hover:text-[#8A3D7D]">
            <MapPin className="h-4 w-4 shrink-0 text-[#A14B92]" aria-hidden="true" />{CLINIC.address}<span className="sr-only"> (ver en Google Maps, abre otra pestaña)</span>
          </a>
          <p className="section-eyebrow">Diagnóstico, alivio y cuidado humano en Calama</p>
          <h1 className="home-hero-title font-title text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl lg:text-7xl">CADO: Centro Avanzado de Dolor Orofacial</h1>
          <p className="max-w-xl text-base leading-8 sm:text-lg">En CADO entendemos el impacto que el dolor genera en tu calidad de vida. Contamos con un equipo clínico especializado en diagnosticar y tratar el dolor dental, muscular, articular y neurálgico. Un espacio en Calama diseñado para brindarte un alivio seguro, oportuno y con un trato profundamente humano.</p>
          <ul className="space-y-3 pt-2 text-sm font-medium">{['Enfoque multidisciplinario del dolor', 'Atención sin juicios ni prisas', 'Tecnología diagnóstica y resolución oportuna'].map(text => <li key={text} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{text}</li>)}</ul>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <Image src="/brand/atencion-dental-cado-calama.webp" alt="Conversación cercana durante una atención en CADO Odontología en Calama" width={900} height={700} priority sizes="(max-width: 1024px) 100vw, 45vw" className="aspect-[5/4] w-full rounded-[2.4rem] border-[6px] border-white object-cover shadow-xl lg:aspect-[4/5]" />
          <div className="material-card-tonal absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl p-4 sm:left-auto sm:max-w-xs"><HeartHandshake className="h-7 w-7 shrink-0 text-[#A14B92]" aria-hidden="true" /><p className="text-sm font-semibold">Más que dientes, cuidamos personas.</p></div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
      <div className="mb-12 max-w-3xl space-y-4"><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Un enfoque integral para aliviar y proteger tu bienestar</h2><p className="leading-8">Cada molestia requiere un origen claro y una solución precisa. Abordamos tu salud desde la raíz del problema con empatía y tecnología.</p></div>
      <div className="grid gap-6 md:grid-cols-3">{[
        { icon: Activity, title: 'Identificamos la causa de tu dolor', text: 'Diferenciamos el dolor de origen dental, muscular, articular o neurálgico para aplicar el tratamiento exacto sin improvisaciones ni soluciones temporales.' },
        { icon: Users, title: 'Tratamientos de alta precisión', text: 'Desde endodoncias y manejo de trastornos temporomandibulares (TTM) hasta urgencias agudas, cubiertos por profesionales dedicados a cada área.' },
        { icon: ShieldCheck, title: 'Atención a tu propio ritmo', text: 'Si sientes aprensión o llevas tiempo postergando tu visita, te recibimos en un entorno libre de reproches, con tiempos amplios de escucha y contención.' },
      ].map(({ icon: Icon, title, text }) => <article key={title} className="material-card-tonal rounded-[2rem] p-7 sm:p-8"><span className="bg-[var(--md-primary-container)] mb-6 inline-flex rounded-2xl p-3 text-[#A14B92]"><Icon className="h-6 w-6" aria-hidden="true" /></span><h3 className="font-title text-2xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7">{text}</p></article>)}</div>
    </section>
    <section id="especialidades" className="scroll-mt-36 border-y border-[#E2E7E7] bg-[#F6F8F8] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6"><div className="mb-12 max-w-3xl space-y-4"><p className="section-eyebrow">Especialidades y servicios clínicos</p><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Soluciones clínicas avanzadas para cada tipo de dolor</h2><p className="leading-8">Diagnóstico de precisión y tratamientos especializados combinados con calidez humana.</p></div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">{services.map(service => <article key={service.href} className="material-card flex flex-col overflow-hidden rounded-3xl bg-white"><div className="relative h-52"><Image src={service.image} alt={service.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover" /></div><div className="flex flex-1 flex-col p-6"><p className="text-xs font-semibold text-[#8A3D7D]">{service.badge}</p><h3 className="mt-3 font-title text-2xl font-semibold leading-tight">{service.title}</h3><p className="mt-4 flex-1 text-sm leading-7">{service.description}</p><Link href={service.href} className="mt-5 inline-flex items-center gap-2 min-h-6 text-sm font-semibold text-[#8A3D7D] underline underline-offset-4">{service.link}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link></div></article>)}</div>
      </div>
    </section>
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2">
      <div className="relative mb-8"><Image src="/brand/escucha-clinica-cado-calama.webp" alt="Escucha y acompañamiento durante una consulta en CADO" width={900} height={650} sizes="(max-width: 1024px) 100vw, 45vw" className="aspect-[5/4] w-full rounded-[2.2rem] object-cover shadow-lg" /><blockquote className="material-card-tonal absolute -bottom-8 left-4 right-4 rounded-2xl p-5"><Quote className="h-5 w-5 text-[#A14B92]" aria-hidden="true" /><p className="mt-2 text-sm font-semibold">Más que dientes, cuidamos personas. Aliviar tu dolor es devolverte el bienestar.</p></blockquote></div>
      <div className="space-y-6"><p className="section-eyebrow">Nuestro equipo en Calama</p><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Un centro especializado en Calama para recuperar tu calidad de vida</h2><p className="leading-8">Vivir con dolor dental, articular o neural no es normal ni debe volverse parte de tu rutina. En CADO combinamos más de una década de experiencia clínica con tecnología digital y un equipo multidisciplinario que comprende las exigencias y ritmos de Calama. Aquí no existen diagnósticos apresurados ni juicios por el estado actual de tu boca: encontramos el origen exacto de tu molestia y te acompañamos paso a paso.</p><Link href="/equipo" className="btn-cado-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold">Conoce a nuestro equipo<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </section>
    <Testimonials />
    <section className="px-6 py-16"><div className="mx-auto material-card-tonal max-w-7xl rounded-[2rem] px-5 py-12 sm:px-12 sm:py-16"><div className="max-w-3xl space-y-5"><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Dar el primer paso hacia tu alivio no tiene por qué ser difícil</h2><p className="leading-8">Si necesitas atención de urgencia, resolver un dolor orofacial persistente o deseas conocer cómo trabajamos antes de acudir a la clínica, estamos aquí para ayudarte.</p></div><div className="mt-8 flex flex-wrap items-start gap-4"><DentalinkLink label="Agendar Evaluación Presencial" compact primary /><Link href={TES_URL} className="btn-cado-secondary material-button text-sm font-semibold">Encuesta de Confort y SAV (Pacientes con Temor)</Link><a href={whatsappUrl('Hola CADO, necesito coordinar atención por una urgencia dental.')} target="_blank" rel="noopener noreferrer" className="material-button bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900"><WhatsAppIcon className="h-5 w-5" />WhatsApp Urgencias CADO</a></div></div></section>
  </div>;
}
