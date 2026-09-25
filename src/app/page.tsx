import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, CalendarDays, HeartHandshake, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

const services = [
  { title: 'Atención para quienes sienten miedo', description: 'Una conversación clara y respetuosa permite expresar dudas y avanzar al propio ritmo.', image: '/brand/photo_doctor_listening.png', alt: 'Profesional escucha con atención a una persona en CADO', label: 'Acompañamiento' },
  { title: 'Exodoncias y urgencias dentales', description: 'Información para comprender las opciones de atención y saber cómo contactar a la clínica.', image: '/brand/photo_doctor_talking.png', alt: 'Profesional conversa con un paciente en un espacio clínico tranquilo', label: 'Orientación clara' },
  { title: 'Tecnología CAD/CAM', description: 'Conoce las herramientas digitales que apoyan la planificación de la atención odontológica.', image: '/brand/photo_cad_cam.png', alt: 'Equipo de odontología digital utilizado como referencia visual de CAD/CAM', label: 'Tecnología' },
  { title: 'Trastornos temporomandibulares (TTM)', description: 'Información inicial para conversar sobre molestias en la mandíbula y conocer las opciones de evaluación.', image: '/brand/photo_doctor_listening.png', alt: 'El profesional escucha a una persona durante una conversación', label: 'Evaluación y escucha' },
];

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="overflow-hidden bg-white text-[#513D49]">
      <section className="relative isolate border-b border-[#E2E7E7] bg-[#F6F8F8]">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_7%_8%,rgba(161,75,146,.13),transparent_35%),radial-gradient(circle_at_92%_85%,rgba(179,191,191,.3),transparent_35%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white/75 px-4 py-2 text-xs font-semibold text-[#513D49] backdrop-blur-md"><MapPin className="h-4 w-4 text-[#A14B92]" />CADO Odontología · Calama</span>
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[.24em] text-[#A14B92]">Volver a confiar</p>
              <h1 className="font-title text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">Un primer paso hacia tu salud oral, <span className="text-[#A14B92]">a tu ritmo.</span></h1>
              <p className="max-w-xl text-base leading-8 text-[#605761] sm:text-lg">Si una experiencia anterior te hizo postergar una consulta, aquí puedes comenzar con información clara y una conversación sin juicios. El Dr. Javier Beiza te escucha antes de decidir juntos el siguiente paso.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/cuestionario" className="btn-cado-primary inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(81,61,73,.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A14B92]">Conocer el cuestionario <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/agendar" className="btn-cado-secondary inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A14B92]"><CalendarDays className="h-4 w-4" /> Conocer la orientación virtual</Link>
            </div>
            <p className="text-sm text-[#716772]">Una orientación inicial no reemplaza una evaluación odontológica presencial.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
            <div className="absolute -left-5 -top-5 h-36 w-36 rounded-full bg-[#B3BFBF]/60 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2.4rem] border-[7px] border-white shadow-[0_30px_70px_rgba(81,61,73,.17)]"><Image src="/brand/photo_doctor_talking.png" alt="El Dr. Javier Beiza conversa con una persona en CADO" width={900} height={700} priority className="aspect-[4/4.2] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/4.5]" /></div>
            <div className="glass-panel absolute -bottom-6 left-3 right-3 flex items-center gap-4 rounded-2xl p-4 sm:left-auto sm:right-[-1rem] sm:max-w-[300px] sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A14B92] text-white"><HeartHandshake className="h-5 w-5" /></span><div><strong className="block text-sm">Sin juicios, con tiempo para escuchar</strong><span className="text-xs leading-5 text-[#625663]">La confianza también forma parte del cuidado.</span></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
        <div className="mb-10 max-w-2xl space-y-3"><p className="section-eyebrow">Cómo acompaña CADO</p><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Una experiencia más tranquila empieza antes de la consulta.</h2><p className="leading-7 text-[#6A626A]">Cada persona llega con preguntas distintas. La información y la orientación previa ayudan a preparar una conversación que considera sus necesidades.</p></div>
        <div className="grid gap-5 md:grid-cols-3">{[
          { icon: HeartHandshake, number: '01', title: 'Se escucha tu historia', text: 'Puedes compartir el motivo de consulta y lo que te preocupa, sin sentirte juzgado.' },
          { icon: ShieldCheck, number: '02', title: 'Tú marcas el ritmo', text: 'El test de confort permite explorar preferencias prácticas para una posible atención.' },
          { icon: Sparkles, number: '03', title: 'Conoces el siguiente paso', text: 'La orientación permite aclarar dudas antes de acudir a la agenda presencial.' },
        ].map(({ icon: Icon, number, title, text }) => <div key={number} className="clay-card relative rounded-[2rem] p-7 sm:p-8"><div className="mb-12 flex items-start justify-between"><span className="clay-icon flex h-12 w-12 items-center justify-center rounded-2xl text-[#A14B92]"><Icon className="h-6 w-6" /></span><span className="font-title text-3xl text-[#B3BFBF]">{number}</span></div><h3 className="mb-3 font-title text-2xl font-semibold">{title}</h3><p className="text-sm leading-7 text-[#6A626A]">{text}</p></div>)}</div>
      </section>

      <section className="border-y border-[#E2E7E7] bg-[#F6F8F8] py-24 sm:py-28"><div className="mx-auto max-w-7xl px-6"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl space-y-3"><p className="section-eyebrow">Servicios</p><h2 className="font-title text-4xl font-semibold sm:text-5xl">Cuidado profesional con trato humano.</h2></div><Link href="/equipo" className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline">Conoce al doctor <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">{services.map((service) => <article key={service.title} className="soft-card group overflow-hidden rounded-3xl"><div className="relative h-60 overflow-hidden"><Image src={service.image} alt={service.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" /><span className="absolute bottom-4 left-4 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#513D49] backdrop-blur-lg">{service.label}</span></div><div className="space-y-3 p-7"><h3 className="font-title text-2xl font-semibold">{service.title}</h3><p className="text-sm leading-7 text-[#6A626A]">{service.description}</p></div></article>)}</div></div></section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 sm:py-28 lg:grid-cols-2"><div className="relative"><Image src="/brand/photo_doctor_listening.png" alt="El doctor escucha a un paciente durante una conversación" width={900} height={650} className="aspect-[5/4] w-full rounded-[2rem] object-cover" /><div className="glass-panel absolute -bottom-6 left-5 right-5 rounded-2xl p-5 sm:right-auto sm:max-w-xs"><span className="text-sm font-semibold">“Más que dientes, cuidamos personas.”</span><p className="mt-1 text-xs text-[#6A626A]">Propuesta de valor de CADO</p></div></div><div className="space-y-6 pt-5 lg:pl-10"><p className="section-eyebrow">Conoce al Dr. Javier Beiza</p><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">Un espacio para hablar con confianza.</h2><p className="leading-8 text-[#6A626A]">El enfoque de CADO pone la escucha, la claridad y el respeto en el centro de la atención. La orientación inicial permite compartir inquietudes y preparar una posible consulta presencial.</p><Link href="/equipo" className="inline-flex items-center gap-2 rounded-2xl border border-[#B3BFBF] px-5 py-3 text-sm font-semibold text-[#8A3D7D] transition hover:bg-[#F6F8F8]">Conocer al profesional <ArrowRight className="h-4 w-4" /></Link></div></section>

      <section className="px-6 pb-24 sm:pb-28"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#513D49] px-7 py-12 text-white sm:px-12 sm:py-16"><div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#A14B92]/60 blur-3xl" aria-hidden="true" /><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-2xl space-y-4"><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#B3BFBF]">Cuando estés preparado</p><h2 className="font-title text-4xl font-semibold leading-tight sm:text-5xl">El primer contacto puede ser sencillo.</h2><p className="leading-7 text-white/80">Conoce el cuestionario previo del doctor, explora el test de confort o comunícate directamente con CADO. La agenda presencial se gestiona a través de Dentalink.</p></div><div className="flex flex-wrap gap-3"><Link href="/cuestionario" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#513D49] transition hover:bg-[#F6F8F8]">Conocer el cuestionario</Link><Link href="/test-confort" className="rounded-2xl border border-white/50 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20">Explorar test de confort</Link><a href="https://wa.me/56944657815" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/50 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20"><MessageCircle className="h-4 w-4" /> Contactar por WhatsApp</a></div></div></div></section>
    </div>
  );
}
