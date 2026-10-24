'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  HeartHandshake, 
  FileCheck2,
  Instagram
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#513D49] text-white border-t border-[#3D2C37] mt-auto">
      {/* SECCIÓN PRINCIPAL DEL FOOTER */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* COLUMNA 1: IDENTIDAD Y MARCA */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/brand/image4.png"
                alt="CADO Odontología"
                width={180}
                height={60}
                className="h-11 w-auto object-contain brightness-105"
              />
            </Link>
            
            <p className="font-script text-lg text-[#E2E7E7] tracking-wide">
              «Confianza que transforma sonrisas»
            </p>

            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              Consulta del <strong>Dr. Javier Beiza Ayala</strong> en CADO Odontología. Un espacio de atención humana para personas que buscan conversar sobre su salud oral sin juicios.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Información clara y trato respetuoso</span>
            </div>
          </div>

          {/* COLUMNA 2: UBICACIÓN Y CONTACTO */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-[#B3BFBF] uppercase tracking-wider text-[11px] block">
              Ubicación y Contacto
            </span>
            <ul className="space-y-2.5 text-gray-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#A14B92] shrink-0 mt-0.5" />
                <span>Vivar #1580, Oficina 203, Edificio Espacio Parque, Calama, Chile.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#A14B92] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Consultas presenciales:</span>
                  <span>Bloques de 19:00 y 20:00 hrs. Orientación virtual según disponibilidad.</span>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#A14B92] shrink-0" />
                <a href="tel:+56944657815" className="hover:text-white transition-colors">
                  +56 9 4465 7815
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#A14B92] shrink-0" />
                <a href="mailto:javierbeizaayala@gmail.com" className="hover:text-white transition-colors">
                  javierbeizaayala@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-[#A14B92] shrink-0" />
                <a href="https://instagram.com/drjavierbeiza" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  @drjavierbeiza
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: ACCESOS DIRECTOS */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-[#B3BFBF] uppercase tracking-wider text-[11px] block">
              Accesos Rápidos
            </span>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/cuestionario" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#B3BFBF]" />
                  <span>Cuestionario previo</span>
                </Link>
              </li>
              <li>
                <Link href="/test-confort" className="hover:text-white transition-colors">
                  Test de confort
                </Link>
              </li>
              <li>
                <Link href="/agendar" className="hover:text-white transition-colors">
                  Conocer la orientación virtual
                </Link>
              </li>
              <li>
                <Link href="/equipo" className="hover:text-white transition-colors">
                  Conoce al Dr. Javier Beiza
                </Link>
              </li>
              <li>
                <Link href="/recursos" className="hover:text-white transition-colors">
                  Recursos prácticos
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog de Salud Oral
                </Link>
              </li>
              <li>
                <Link href="/urgencias" className="text-red-200 hover:text-red-100 font-bold">
                  Urgencias Dentales Calama
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4: PILARES Y PRINCIPIOS */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-[#B3BFBF] uppercase tracking-wider text-[11px] block">
              Pilares de Marca CADO
            </span>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-200">Confianza</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-200">Acompañamiento</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-200">Transformación</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-200">Excelencia</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed pt-2">
              Tus preferencias de confort se incorporan a la reserva cuando la confirmas. El cuestionario previo solicita tu consentimiento antes de guardar las respuestas.
            </p>
          </div>
        </div>

        {/* ADVERTENCIA MÉDICO-LEGAL */}
        <div className="bg-[#43323D] p-4 rounded-2xl text-[11px] text-gray-300 border border-[#5E4655] leading-relaxed">
          <p>
            <strong className="text-white">Aviso Legal:</strong> La orientación telemática y los cuestionarios web de CADO Odontología tienen carácter informativo y de acompañamiento previo. No constituyen diagnóstico definitivo ni prescripción de fármacos. Las atenciones y tratamientos definitivos se coordinan presencialmente vía agenda oficial Dentalink.
          </p>
        </div>

        {/* PIE DE PÁGINA INFERIOR */}
        <div className="pt-6 border-t border-[#664E5D]/60 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-300 gap-3">
          <p>© 2026 CADO Odontología — Calama. Dr. Javier Beiza Ayala. Todos los derechos reservados.</p>
          <p>
            Desarrollado por <strong className="text-gray-300">NovaCore</strong> · Proyecto de Integración INACAP Calama
          </p>
        </div>
      </div>
    </footer>
  );
};
