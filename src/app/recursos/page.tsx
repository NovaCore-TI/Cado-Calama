import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { GuideLibrary } from '@/components/GuideLibrary';

export default function RecursosPage() {
  return (
    <div className="min-h-[70vh] bg-[#F6F8F8] px-6 py-16 text-[#513D49] sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#513D49]">
            <Sparkles className="h-3.5 w-3.5 text-[#A14B92]" />
            <span>Biblioteca Pública de Guías Clínicas PDF</span>
          </div>
          <h1 className="font-title text-5xl font-semibold leading-tight sm:text-6xl">
            Información clara para acompañarte.
          </h1>
          <p className="leading-8 text-[#665D66]">
            Descarga gratuitamente nuestras guías clínicas en formato PDF optimizadas para lectura en celular y computador sobre cuidados postoperatorios, manejo de urgencias y preparación sin ansiedad.
          </p>
        </div>

        <div className="mt-12"><GuideLibrary /></div>

        <div className="glass-panel mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl p-7 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-6 w-6 shrink-0 text-[#A14B92]" />
            <div>
              <h2 className="font-semibold">¿Buscas orientación personalizada ahora?</h2>
              <p className="mt-1 text-sm leading-6 text-[#665D66]">
                Puedes consultar nuestras preguntas frecuentes interactivas o completar el cuestionario de perfilamiento previo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/faq"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline"
            >
              Ver preguntas frecuentes <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/agendar"
              className="btn-cado-primary inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Orientación virtual guiada <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
