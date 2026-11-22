'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { FaqItem } from '@/lib/faqs';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
import {
  Search,
  X,
  ChevronDown,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

export function FaqDirectory({ items }: { items: FaqItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [openIds, setOpenIds] = useState<number[]>([1, 2]);
  const searchInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useLiveUpdates({ resources: ['faq'], pollMs: 60_000 }, () => router.refresh());

  const toggleAccordion = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'todas' || item.category === selectedCategory;
      const matchesSearch =
        !term ||
        item.q.toLowerCase().includes(term) ||
        item.a.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [items, searchTerm, selectedCategory]);

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
            ref={searchInput}
            type="text"
            aria-label="Buscar preguntas frecuentes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Busca por palabra clave (ej: dolor, fobia, RUT, turnos, Dentalink, Meet)..."
            className="w-full p-3.5 pl-12 pr-10 rounded-2xl border border-[#B3BFBF] text-xs sm:text-sm focus:border-[#A14B92] focus:outline-none shadow-2xs text-[#513D49] bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInput.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#766C75] hover:bg-[var(--md-surface-container)]"
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
            aria-pressed={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="material-option font-medium"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. LISTA DE ACORDEONES */}
      <p role="status" className="sr-only">{filteredFaqs.length} preguntas encontradas.</p>
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
              className="material-button bg-emerald-800 text-xs font-bold text-white hover:bg-emerald-900"
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
                className="material-card rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[var(--md-surface-container)] focus-visible:-outline-offset-4"
                >
                  <span className="font-title font-bold text-base sm:text-lg text-[#513D49]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-[#A14B92] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div id={`faq-answer-${faq.id}`} hidden={!isOpen} className="material-card-tonal px-5 pb-5 pt-3 text-sm leading-relaxed">
                  <p>{faq.a}</p>
                </div>
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
