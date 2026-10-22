import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CalendarX2,
  Clock3,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Gestión y Reprogramación de Orientación | CADO Odontología',
  robots: { index: false, follow: false },
};

export default function GestionarPage() {
  return (
    <main className="min-h-screen bg-[#F6F8F8] px-6 py-16 text-[#513D49] sm:py-24">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#513D49]">
            <Clock3 className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
            <span>Autogestión de Citas Telemáticas</span>
          </div>

          <h1 className="font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl text-balance">
            Tu orientación, bajo tu control.
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-[#665D66]">
            Si necesitas modificar tu horario de orientación virtual o cancelarlo por imprevistos laborales, puedes hacerlo de forma simple respetando el tiempo del doctor y de otros pacientes de Calama.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* TARJETA REPROGRAMAR */}
          <article className="clay-card rounded-3xl p-7 sm:p-9 space-y-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
              <Clock3 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                Reprogramar horario
              </h2>
              <p className="text-sm leading-relaxed text-[#665D66]">
                Elige un nuevo bloque vespertino libre. Tu cita previa se mantiene activa hasta que confirmes la nueva fecha, actualizando el enlace de Google Meet sin duplicar registros.
              </p>
            </div>
            <Link
              href="/agendar"
              className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white shadow-sm"
            >
              <span>Ver bloques disponibles para reagendar</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </article>

          {/* TARJETA CANCELAR */}
          <article className="clay-card rounded-3xl p-7 sm:p-9 space-y-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
              <CalendarX2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                Cancelar orientación
              </h2>
              <p className="text-sm leading-relaxed text-[#665D66]">
                Si ya no necesitas la cita, avísanos con al menos 2 horas de anticipación para que otra persona que esté esperando atención pueda tomar el bloque.
              </p>
            </div>
            <a
              href="https://wa.me/56944657815?text=Hola%20Dr.%20Javier%20Beiza,%20necesito%20cancelar%20mi%20orientaci%C3%B3n%20virtual."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cado-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
              <span>Avisar cancelación por WhatsApp</span>
            </a>
          </article>
        </div>

        {/* NOTA DE PRIVACIDAD */}
        <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[#A14B92]" aria-hidden="true" />
            <p className="max-w-2xl text-xs leading-relaxed text-[#665D66]">
              Por estricto cumplimiento de la Ley N° 19.628 de protección de datos personales, ninguna cita ni historial clínico se muestra públicamente en esta pantalla sin el enlace seguro enviado a tu correo.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#8A3D7D] hover:underline"
          >
            <span>Volver a la portada</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
