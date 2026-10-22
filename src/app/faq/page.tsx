'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  X, 
  ChevronDown, 
  HelpCircle, 
  MessageCircle, 
  ShieldCheck, 
  PhoneCall, 
  Clock,
  Sparkles
} from 'lucide-react';

interface FAQItem {
  id: number;
  category: 'miedo' | 'vespertino' | 'dentalink' | 'procedimientos';
  q: string;
  a: string;
}

const FAQS_DATA: FAQItem[] = [
  { id: 1, category: 'miedo', q: '¿Puedo contar que siento miedo o fobia al dentista?', a: 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.' },
  { id: 2, category: 'miedo', q: '¿Puedo pedir pausas durante una atención?', a: 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.' },
  { id: 3, category: 'vespertino', q: '¿Cómo funcionan los horarios de orientación en Calama?', a: 'CADO ofrece bloques de orientación virtual de 15 minutos en horario vespertino adaptado a turnos y jornadas laborales, además de coordinación presencial en Edificio Espacio Parque.' },
  { id: 4, category: 'miedo', q: '¿Cómo se vincula el cuestionario y el test de confort a mi reserva?', a: 'El flujo de reserva en Agendar está unificado: al completar el cuestionario y test de confort, tus respuestas quedan directamente enlazadas a tu cita para que el doctor las revise antes de iniciar la videollamada.' },
  { id: 5, category: 'dentalink', q: '¿Cómo se reserva una consulta presencial después de la orientación?', a: 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación asistida por WhatsApp según tu caso.' },
  { id: 6, category: 'vespertino', q: '¿Cómo accedo a mi orientación telemática por Google Meet?', a: 'Al confirmar tu reserva se genera automáticamente tu enlace seguro de Google Meet y se envía a tu correo, además de disponer de un botón directo de acceso en la pantalla de confirmación.' },
  { id: 7, category: 'procedimientos', q: '¿Dónde consulto por un tratamiento o sus costos?', a: 'Los planes de tratamiento y presupuestos clínicos se entregan tras una evaluación profesional personalizada; el sitio web y el cuestionario previo son orientativos y no emiten diagnósticos automáticos.' },
];

export default function FaqPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [openIds, setOpenIds] = useState<number[]>([1, 2]);
  const [backendFaqs, setBackendFaqs] = useState<FAQItem[]>(FAQS_DATA);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (selectedCategory !== 'todas') params.set('category', selectedCategory);

    fetch(`/api/faq?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.data)) {
          setBackendFaqs(json.data);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [searchTerm, selectedCategory]);

  const toggleAccordion = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return backendFaqs.filter((item) => {
      const matchesCategory = selectedCategory === 'todas' || item.category === selectedCategory;
      const matchesSearch =
        !term ||
        item.q.toLowerCase().includes(term) ||
        item.a.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [backendFaqs, searchTerm, selectedCategory]);

  return (
    <div className="bg-white text-gray-800 space-y-10 sm:space-y-14 pb-24 max-w-4xl mx-auto px-6 pt-10 sm:pt-14">
      
      {/* 1. HEADER */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F8F8] border border-[#B3BFBF] text-xs font-semibold text-[#513D49]">
          <HelpCircle className="w-3.5 h-3.5 text-[#A14B92]" />
          <span>Claridad y Confianza Bioética</span>
        </div>
        
        <div className="space-y-1">
          <span className="font-script text-2xl sm:text-3xl text-[#A14B92] block">
            Despeja tus Dudas
          </span>
          <h1 className="font-title font-bold text-3xl sm:text-4xl text-[#513D49]">
            Preguntas Frecuentes
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-sans">
          Respuestas transparentes sobre dolor, fobia dental, horarios vespertinos, anestesia y privacidad de tus datos en Calama.
        </p>
      </div>

      {/* 2. BUSCADOR INTERACTIVO EN TIEMPO REAL */}
      <div className="relative max-w-2xl mx-auto font-sans">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Busca por palabra clave (ej: dolor, fobia, RUT, turnos, Dentalink, Meet)..."
            className="w-full p-3.5 pl-12 pr-10 rounded-2xl border border-[#B3BFBF] text-xs sm:text-sm focus:border-[#A14B92] focus:outline-none shadow-2xs text-[#513D49] bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3.5 p-1 rounded-full text-gray-400 hover:text-[#513D49]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTROS POR CATEGORÍA */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-sans">
        {[
          { id: 'todas', label: 'Todas las Preguntas' },
          { id: 'miedo', label: 'Miedo y Ansiedad Dental' },
          { id: 'vespertino', label: 'Horarios Vespertinos' },
          { id: 'dentalink', label: 'Dentalink y Pagos' },
          { id: 'procedimientos', label: 'Tratamientos y Anestesia' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#A14B92] text-white shadow-2xs font-bold'
                : 'bg-white text-gray-600 border border-[#B3BFBF] hover:bg-[#F8FAFA]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. LISTA DE ACORDEONES */}
      <div className="space-y-3 font-sans">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-[#F8FAFA] rounded-2xl border border-[#E2E7E7] space-y-4">
            <p className="text-xs text-gray-600">
              No encontramos preguntas que coincidan con <strong>«{searchTerm}»</strong>.
            </p>
            <a
              href="https://wa.me/56944657815?text=Hola%20Dr.%20Beiza,%20tengo%20una%20pregunta%20espec%C3%ADfica%20sobre..."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Preguntarle directamente al Dr. Beiza por WhatsApp (+56 9 4465 7815)</span>
            </a>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="bg-white rounded-2xl border border-[#E2E7E7] overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#F6F8F8]/50 transition-colors"
                >
                  <span className="font-title font-bold text-base sm:text-lg text-[#513D49]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#A14B92] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-[13px] text-gray-600 leading-relaxed border-t border-gray-100 bg-[#F6F8F8]/30">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. BANNER DE SOPORTE POR WHATSAPP */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#513D49] to-[#3B2935] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5 text-center sm:text-left">
          <span className="font-script text-xl text-[#E2E7E7] block">
            Atención Personalizada en Calama
          </span>
          <h3 className="font-title font-bold text-xl sm:text-2xl text-white">
            ¿Tienes alguna consulta especial que no aparece aquí?
          </h3>
          <p className="text-xs text-gray-300 max-w-md font-sans">
            El Dr. Javier Beiza responde personalmente dudas previas para que asistas con total tranquilidad.
          </p>
        </div>

        <a
          href="https://wa.me/56944657815?text=Hola%20Dr.%20Beiza,%20estuve%20revisando%20las%20preguntas%20frecuentes%20y%20tengo%20una%20duda%20sobre..."
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-sm transition-colors font-sans"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Escribir por WhatsApp</span>
        </a>
      </div>

    </div>
  );
}
