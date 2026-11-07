import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { CLINIC, whatsappUrl } from '@/lib/clinic';
import { DentalinkLink } from '@/components/DentalinkLink';

export function ClinicalPage({ title, eyebrow, intro, sections, image = '/brand/clinica-cado-calama.webp' }: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { title: string; text: string }[];
  image?: string;
}) {
  return <div className="bg-white text-[#513D49]">
    <section className="bg-[#F6F8F8] px-6 py-16 sm:py-24"><div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2"><div className="space-y-6"><p className="section-eyebrow">{eyebrow}</p><h1 className="font-title text-5xl font-semibold leading-tight sm:text-6xl">{title}</h1><p className="leading-8">{intro}</p><DentalinkLink label="Coordinar evaluación presencial" /></div><Image src={image} alt="Atención odontológica y tecnología de CADO en Calama" width={900} height={650} priority sizes="(max-width: 1024px) 100vw, 45vw" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lg" /></div></section>
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2">{sections.map(section => <article key={section.title} className="material-card rounded-3xl p-7"><CheckCircle2 className="h-6 w-6 text-[#A14B92]" aria-hidden="true" /><h2 className="mt-5 font-title text-3xl font-semibold">{section.title}</h2><p className="mt-4 text-sm leading-8">{section.text}</p></article>)}</section>
    <section className="mx-auto max-w-6xl px-6 pb-20"><div className="rounded-3xl bg-[#F8EFF6] p-8"><h2 className="font-title text-3xl font-semibold">Un equipo cercano, en el centro de Calama</h2><p className="mt-4 text-sm leading-7">Cada tratamiento comienza con una evaluación presencial. Conversamos sobre tus molestias, explicamos los hallazgos y acordamos contigo los siguientes pasos.</p><a href={CLINIC.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-sm font-semibold text-[#8A3D7D] underline">{CLINIC.address} · Ver ubicación</a><div className="mt-6 flex flex-wrap gap-3"><Link href="/equipo" className="btn-cado-secondary rounded-xl px-5 py-3 text-sm font-semibold">Conoce a nuestro equipo</Link><a href={whatsappUrl(`Hola CADO, quisiera consultar por ${title}.`)} target="_blank" rel="noopener noreferrer" className="btn-cado-primary rounded-xl px-5 py-3 text-sm font-semibold">Consultar por WhatsApp</a></div></div></section>
  </div>;
}
