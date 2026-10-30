'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  PhoneCall, 
  Clock, 
  HeartHandshake, 
  ChevronRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Conoce al Doctor', path: '/equipo' },
    { label: 'Orientación virtual', path: '/agendar' },
    { label: 'Preguntas Frecuentes', path: '/faq' },
    { label: 'Recursos', path: '/recursos' },
    { label: 'Blog', path: '/blog' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/80 bg-white/85 shadow-[0_8px_25px_rgba(81,61,73,.06)] backdrop-blur-xl">
      {/* FRANJA DE CONTACTO Y HORARIOS SUPERIOR */}
      <div className="bg-[#513D49] text-white text-[11px] py-1.5 px-4 sm:px-8 border-b border-[#3D2C37]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline font-medium">Calama • Vivar #1580 of. 203, Edificio Espacio Parque</span>
            <span className="sm:hidden font-medium">Vivar #1580 of. 203, Calama</span>
            <span className="text-gray-400">|</span>
            <span className="text-[#E2E7E7]">Consultas presenciales a las 19:00 y 20:00 hrs</span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="tel:+56944657815" 
              className="hidden sm:flex items-center gap-1.5 text-gray-200 hover:text-white font-medium transition-colors"
            >
              <PhoneCall className="w-3 h-3 text-[#B3BFBF]" />
              <span>+56 9 4465 7815</span>
            </a>
            <Link 
              href="/urgencias" 
              className="flex items-center gap-1 text-red-300 hover:text-red-200 font-bold transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
              <span>Información de urgencias</span>
            </Link>
          </div>
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* LOGO OFICIAL CADO */}
        <Link href="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#A14B92]/40 rounded-xl">
          <Image
            src="/brand/image2.png"
            alt="CADO Odontología - Dr. Javier Beiza"
            width={160}
            height={54}
            className="h-10 sm:h-11 w-auto object-contain"
            priority
          />
        </Link>

        {/* NAVEGACIÓN DESKTOP (SIN ENLACE A ADMIN) */}
        <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#513D49]">
          {navLinks.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`transition-colors py-1 relative hover:text-[#A14B92] ${
                isActive(item.path)
                  ? 'text-[#A14B92] font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
              {isActive(item.path) && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#A14B92] rounded-full"></span>
              )}
            </Link>
          ))}

          {/* BADGE URGENCIAS */}
          <Link
            href="/urgencias"
            className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Urgencias</span>
          </Link>
        </nav>

        {/* ACCIÓN PRINCIPAL (CTA DE RESERVA) */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/agendar"
            className="px-5 py-2.5 rounded-xl bg-[#A14B92] hover:bg-[#8C3C7E] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-98"
          >
            <Calendar className="w-4 h-4" />
            <span>Orientación virtual</span>
          </Link>
        </div>

        {/* BOTÓN HAMBURGUESA MOBILE */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#513D49] hover:bg-[#F6F8F8] focus:outline-none focus:ring-2 focus:ring-[#A14B92]"
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MENÚ DESPLEGABLE MOBILE */}
      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="lg:hidden bg-white border-b border-cado-silver-border px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-[#F6F8F8] text-[#A14B92] font-bold'
                    : 'text-[#513D49] hover:bg-gray-50'
                }`}
              >
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link
              href="/urgencias"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-red-600" />
              <span>Atención de Urgencias Dentales</span>
            </Link>

            <Link
              href="/agendar"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#A14B92] shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Conocer orientación virtual</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
