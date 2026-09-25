'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, PauseCircle, ShieldCheck, Users, Volume2, VolumeX } from 'lucide-react';

type SoundPreference = 'musica' | 'silencio';

const soundOptions = [
  { id: 'musica', label: 'Música suave', detail: 'Prefiero escuchar música tranquila.', icon: Volume2 },
  { id: 'silencio', label: 'Silencio', detail: 'Prefiero un ambiente sin música.', icon: VolumeX },
] as const;

export default function TestConfortPage() {
  const [sound, setSound] = useState<SoundPreference | null>(null);
  const [breaks, setBreaks] = useState(false);
  const [companion, setCompanion] = useState(false);
  const [stopSignal, setStopSignal] = useState(false);
  const [explanation, setExplanation] = useState(false);

  const selectedSound = soundOptions.find((option) => option.id === sound);

  return (
    <main className="bg-white pb-24 text-[#513D49]">
      <section className="bg-[#F6F8F8] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="section-eyebrow">Test de confort</p>
          <h1 className="mt-4 max-w-3xl font-title text-5xl font-semibold leading-tight sm:text-6xl">Tu comodidad también importa.</h1>
          <p className="mt-5 max-w-2xl leading-8 text-[#665D66]">Explora las preferencias que te gustaría conversar antes de una posible atención presencial. Este test es distinto del <Link href="/cuestionario" className="font-semibold text-[#8A3D7D] underline underline-offset-4">cuestionario previo del doctor</Link>, que busca conocer mejor al paciente para orientar la conversación.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pt-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <fieldset className="clay-card rounded-[2rem] p-6 sm:p-8">
            <legend className="sr-only">Preferencia de sonido</legend>
            <h2 className="font-title text-3xl font-semibold">¿Qué ambiente prefieres?</h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">Puedes elegir una alternativa o dejarla sin responder.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {soundOptions.map(({ id, label, detail, icon: Icon }) => (
                <label key={id} className={`cursor-pointer rounded-2xl border p-4 transition ${sound === id ? 'border-[#A14B92] bg-white shadow-[0_8px_20px_rgba(81,61,73,.09)]' : 'border-white bg-white/60 hover:bg-white'}`}>
                  <input type="radio" name="sound" value={id} checked={sound === id} onChange={() => setSound(id)} className="sr-only" />
                  <Icon className="h-5 w-5 text-[#A14B92]" />
                  <strong className="mt-4 block text-sm">{label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#665D66]">{detail}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="clay-card rounded-[2rem] p-6 sm:p-8">
            <legend className="sr-only">Otras preferencias de confort</legend>
            <h2 className="font-title text-3xl font-semibold">¿Qué te ayudaría a sentirte cómodo?</h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">Marca solo las opciones que te representen.</p>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Poder pedir pausas para descansar la mandíbula', checked: breaks, change: setBreaks, icon: PauseCircle },
                { label: 'Consultar si puede acompañarme una persona cercana', checked: companion, change: setCompanion, icon: Users },
                { label: 'Acordar una señal con la mano para detenerse', checked: stopSignal, change: setStopSignal, icon: HeartHandshake },
                { label: 'Recibir una explicación antes de cada paso', checked: explanation, change: setExplanation, icon: HeartHandshake },
              ].map(({ label, checked, change, icon: Icon }) => (
                <label key={label} className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white bg-white/70 p-4 text-sm leading-6 hover:bg-white">
                  <input type="checkbox" checked={checked} onChange={(event) => change(event.target.checked)} className="mt-1 accent-[#A14B92]" />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A14B92]" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="font-title text-3xl font-semibold">Tus preferencias</h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">Este resumen se actualiza solo en esta pantalla para mostrar cómo funcionaría el test.</p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              <li><strong>Ambiente:</strong> {selectedSound?.label ?? 'Sin preferencia indicada'}</li>
              <li><strong>Pausas:</strong> {breaks ? 'Sí' : 'Sin preferencia indicada'}</li>
              <li><strong>Acompañante:</strong> {companion ? 'Deseo consultarlo' : 'Sin preferencia indicada'}</li>
              <li><strong>Señal de parada:</strong> {stopSignal ? 'Deseo acordarla' : 'Sin preferencia indicada'}</li>
              <li><strong>Explicación previa:</strong> {explanation ? 'Sí' : 'Sin preferencia indicada'}</li>
            </ul>
            <p className="mt-7 flex items-start gap-2 border-t border-[#E2E7E7] pt-5 text-xs leading-6 text-[#665D66]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A14B92]" />Este prototipo no guarda ni envía tus elecciones, no agenda una cita y no entrega un diagnóstico.</p>
            <Link href="/cuestionario" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline">Conocer el cuestionario previo <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
