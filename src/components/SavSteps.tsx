import Link from 'next/link';
import { SAV_URL, TES_URL } from '@/lib/clinic';

export function SavSteps() {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div className="rounded-3xl border border-[#E2E7E7] bg-white p-6">
      <p className="section-eyebrow">Paso 1 · Tu Espacio Seguro</p>
      <h3 className="mt-3 font-title text-2xl font-semibold">Encuesta TES</h3>
      <p className="mt-3 text-sm leading-7">Seis preguntas para indicarnos cómo prefieres ser atendido: música, pausas, acompañamiento y comunicación. Tus tiempos importan.</p>
      <Link href={TES_URL} className="btn-cado-secondary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">Completar Encuesta TES</Link>
    </div>
    <div className="rounded-3xl border border-[#A14B92]/20 bg-[#F8EFF6] p-6">
      <p className="section-eyebrow">Paso 2 · Sesión de Acercamiento Virtual</p>
      <h3 className="mt-3 font-title text-2xl font-semibold">SAV de 15 minutos</h3>
      <p className="mt-3 text-sm leading-7">Una videollamada en Google Meet para conocernos y resolver tus dudas desde casa, sin sillón dental. Encuesta y reserva en la misma página.</p>
      <Link href={SAV_URL} className="btn-cado-primary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">Reservar mi SAV de 15 min</Link>
    </div>
  </div>;
}
