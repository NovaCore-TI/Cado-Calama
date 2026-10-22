import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Compass,
  Home,
  MessageCircle,
  PhoneCall,
  Search,
} from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[75vh] flex items-center justify-center bg-[#F6F8F8] px-6 py-20 text-[#513D49]">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        <span className="clay-icon mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-[#A14B92] shadow-inner">
          <Compass className="h-10 w-10" aria-hidden="true" />
        </span>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#513D49]">
            <span>Error 404 · Enlace no encontrado</span>
          </div>

          <h1 className="font-title text-4xl font-semibold sm:text-5xl text-[#513D49] text-balance">
            Volvamos a un camino conocido
          </h1>

          <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#665D66] sm:text-base">
            La página que buscas no existe o ha sido trasladada a una nueva sección. Puedes explorar los accesos directos principales de CADO Odontología en Calama:
          </p>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="grid gap-3 sm:grid-cols-2 text-left">
          <Link
            href="/"
            className="flex items-center gap-3.5 rounded-2xl border border-[#E2E7E7] bg-white p-4 transition hover:border-[#A14B92] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A14B92]/10 text-[#A14B92]">
              <Home className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-sm font-semibold text-[#513D49]">Página de Inicio</strong>
              <span className="text-xs text-[#766C75]">Conoce nuestra propuesta clínica</span>
            </div>
          </Link>

          <Link
            href="/agendar"
            className="flex items-center gap-3.5 rounded-2xl border border-[#E2E7E7] bg-white p-4 transition hover:border-[#A14B92] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A14B92]/10 text-[#A14B92]">
              <Calendar className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-sm font-semibold text-[#513D49]">Orientación Virtual</strong>
              <span className="text-xs text-[#766C75]">Cuestionario y reserva telemática</span>
            </div>
          </Link>

          <Link
            href="/urgencias"
            className="flex items-center gap-3.5 rounded-2xl border border-red-200 bg-red-50/50 p-4 transition hover:border-red-400 hover:shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-sm font-semibold text-red-900">Urgencias Dentales</strong>
              <span className="text-xs text-red-700">Triage y contacto prioritario</span>
            </div>
          </Link>

          <a
            href="https://wa.me/56944657815?text=Hola%20Dr.%20Javier%20Beiza,%20estaba%20navegando%20por%20la%20web%20y%20necesito%20ayuda"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-2xl border border-[#E2E7E7] bg-white p-4 transition hover:border-[#A14B92] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-sm font-semibold text-[#513D49]">WhatsApp Directo</strong>
              <span className="text-xs text-[#766C75]">+56 9 4465 7815</span>
            </div>
          </a>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="btn-cado-secondary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
          >
            <span>Volver a la portada principal</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
