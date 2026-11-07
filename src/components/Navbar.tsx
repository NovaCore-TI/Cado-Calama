'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, MapPin } from 'lucide-react';
import { CLINIC, TES_URL, whatsappUrl } from '@/lib/clinic';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

const links = [
  { label: 'Inicio', path: '/' },
  { label: 'Conoce a nuestro equipo', path: '/equipo' },
  { label: 'Información adicional', path: '/recursos' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contacto', path: '/contacto' },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="relative z-40 xl:sticky xl:top-0 border-b border-white/80 bg-white/95 shadow-sm backdrop-blur-xl">
    <div className="bg-[#513D49] px-4 py-2 text-white sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[11px]">
        <a href={CLINIC.directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1.5 hover:underline focus-visible:outline-white"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>Vivar #1580, Of. 203 · Calama</span><span className="sr-only"> (Google Maps, abre otra pestaña)</span></a>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{CLINIC.phones.map(phone => <a key={phone.number} href={whatsappUrl(undefined, phone.number)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${phone.name}, ${phone.display} (abre otra pestaña)`} className="inline-flex min-h-6 items-center gap-1.5 hover:underline focus-visible:outline-white"><WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-300" /><span>{phone.name} · {phone.display}</span></a>)}</div>
      </div>
    </div>
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
      <Link href="/" aria-label="CADO · Inicio" className="shrink-0 rounded-xl"><Image src="/brand/image2.png" alt="CADO Centro Avanzado de Dolor Orofacial Calama" width={220} height={74} priority className="h-10 w-auto object-contain sm:h-16" /></Link>
      <nav aria-label="Navegación principal" className="hidden items-center gap-4 text-xs font-medium text-[#513D49] xl:flex">
        {links.map(item => <Link key={item.path} href={item.path} aria-current={pathname === item.path ? 'page' : undefined} className={`hover:text-[#8A3D7D] ${pathname === item.path ? 'font-bold text-[#8A3D7D]' : ''}`}>{item.label}</Link>)}
      </nav>
      <div className="flex items-center gap-2"><Link href={TES_URL} className="btn-cado-primary rounded-xl px-3 py-3 text-center text-xs font-bold shadow-sm sm:px-5">¿Temor al dentista?</Link><button type="button" onClick={() => setOpen(!open)} className="rounded-xl p-2 text-[#513D49] hover:bg-[#F6F8F8] xl:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button></div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Navegación móvil" className="max-h-[65dvh] overflow-y-auto border-t border-[#E2E7E7] bg-white px-5 py-4 xl:hidden"><div className="grid gap-1">{[...links, { label: 'Preguntas frecuentes', path: '/faq' }].map(item => <Link key={item.path} href={item.path} onClick={() => setOpen(false)} aria-current={pathname === item.path ? 'page' : undefined} className="rounded-xl px-4 py-3 text-sm font-medium text-[#513D49] hover:bg-[#F8EFF6]">{item.label}</Link>)}</div></nav>}
  </header>;
};
