'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  HeartHandshake,
  PauseCircle,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCado, type ComfortProfile } from '@/context/CadoContext';

const soundOptions = [
  { id: 'musica_suave', label: 'Música suave', detail: 'Prefiero escuchar música tranquila durante la atención.', icon: Volume2 },
  { id: 'silencio', label: 'Silencio', detail: 'Prefiero un ambiente en calma y sin música de fondo.', icon: VolumeX },
] as const;

export default function TestConfortPage() {
  const { activeComfortProfile, saveComfortPreferences, activeQuestionnaire } = useCado();

  const [sound, setSound] = useState<'musica_suave' | 'silencio'>(
    activeComfortProfile.soundPreference === 'silencio' ? 'silencio' : 'musica_suave'
  );
  const [breaks, setBreaks] = useState(activeComfortProfile.jawBreaks);
  const [companion, setCompanion] = useState(activeComfortProfile.companionAllowed);
  const [stopSignal, setStopSignal] = useState(activeComfortProfile.handSignalPledge);
  const [explanation, setExplanation] = useState(true);
  const [notes, setNotes] = useState(activeComfortProfile.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedSound = soundOptions.find((option) => option.id === sound);

  async function handleSavePreferences() {
    setIsSaving(true);
    setSavedSuccess(false);

    const profile: ComfortProfile = {
      anxietyLevel: activeComfortProfile.anxietyLevel || 'nervioso',
      soundPreference: sound,
      jawBreaks: breaks,
      companionAllowed: companion,
      handSignalPledge: stopSignal,
      notes: notes.trim(),
    };

    try {
      await fetch('/api/confort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuestionarioId: activeQuestionnaire?.id || null,
          soundPreference: sound,
          jawBreaks: breaks,
          companionAllowed: companion,
          handSignalPledge: stopSignal,
          explanationStepByStep: explanation,
          notes: notes.trim(),
          consent: true,
        }),
      });
    } catch {
      // Fallback handled in context
    }

    await saveComfortPreferences(profile);
    setIsSaving(false);
    setSavedSuccess(true);
  }

  return (
    <main className="bg-white pb-24 text-[#513D49]">
      <section className="bg-[#F6F8F8] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="section-eyebrow">RF-07 · Test de Confort Ambiental Conectado a Backend</p>
          <h1 className="mt-4 max-w-3xl font-title text-5xl font-semibold leading-tight sm:text-6xl">
            Tu comodidad también importa.
          </h1>
          <p className="mt-5 max-w-2xl leading-8 text-[#665D66]">
            Personaliza el ambiente de tu futura atención en CADO: música o silencio, pausas periódicas y asistencia con acompañante. Tus elecciones se guardan en el Backend y quedan vinculadas a tu reserva para que el Dr. Javier Beiza las vea en su bandeja privada.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pt-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <fieldset className="clay-card rounded-[2rem] p-6 sm:p-8">
            <legend className="sr-only">Preferencia de sonido</legend>
            <h2 className="font-title text-3xl font-semibold">1. ¿Qué ambiente sonoro prefieres?</h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">
              Elige cómo te gustaría que esté el box clínico al momento de tu ingreso.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {soundOptions.map(({ id, label, detail, icon: Icon }) => (
                <label
                  key={id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    sound === id
                      ? 'border-[#A14B92] bg-white shadow-[0_8px_20px_rgba(81,61,73,.09)]'
                      : 'border-white bg-white/60 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="sound"
                    value={id}
                    checked={sound === id}
                    onChange={() => {
                      setSound(id);
                      setSavedSuccess(false);
                    }}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5 text-[#A14B92]" />
                  <strong className="mt-4 block text-sm">{label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#665D66]">{detail}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="clay-card rounded-[2rem] p-6 sm:p-8">
            <legend className="sr-only">Otras preferencias de confort</legend>
            <h2 className="font-title text-3xl font-semibold">
              2. Pausas, acompañamiento y comunicación
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">
              Marca todas las opciones que te ayuden a sentirte en un entorno controlado y seguro.
            </p>
            <div className="mt-6 space-y-3">
              {[
                {
                  label: 'Solicitar pausas periódicas para descansar la mandíbula',
                  checked: breaks,
                  change: setBreaks,
                  icon: PauseCircle,
                },
                {
                  label: 'Asistir con un acompañante presencial de confianza',
                  checked: companion,
                  change: setCompanion,
                  icon: Users,
                },
                {
                  label: 'Acordar una señal con la mano para detener la atención de inmediato',
                  checked: stopSignal,
                  change: setStopSignal,
                  icon: HeartHandshake,
                },
                {
                  label: 'Recibir una explicación tranquila antes de cada paso',
                  checked: explanation,
                  change: setExplanation,
                  icon: HeartHandshake,
                },
              ].map(({ label, checked, change, icon: Icon }) => (
                <label
                  key={label}
                  className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white bg-white/70 p-4 text-sm leading-6 hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      change(event.target.checked);
                      setSavedSuccess(false);
                    }}
                    className="mt-1 accent-[#A14B92]"
                  />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A14B92]" />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <label className="mt-6 block text-sm font-semibold">
              Comentario adicional de confort (opcional)
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSavedSuccess(false);
                }}
                placeholder="Ej: Me ayuda que el respaldo no esté tan inclinado al principio..."
                className="mt-2 w-full rounded-2xl border border-[#B3BFBF] bg-white p-3.5 text-sm font-normal outline-none focus:border-[#A14B92]"
              />
            </label>
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="font-title text-3xl font-semibold">Resumen de tu perfil</h2>
            <p className="mt-2 text-sm leading-7 text-[#665D66]">
              Guarda tus preferencias para asociarlas a tu reserva telemática.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              <li>
                <strong>Ambiente:</strong> {selectedSound?.label ?? 'Música suave'}
              </li>
              <li>
                <strong>Pausas periódicas:</strong> {breaks ? 'Sí, solicitadas' : 'No requeridas'}
              </li>
              <li>
                <strong>Acompañante:</strong> {companion ? 'Sí, asistiré con acompañante' : 'Sin acompañante'}
              </li>
              <li>
                <strong>Señal de parada:</strong> {stopSignal ? 'Acordada' : 'Sin preferencia'}
              </li>
              <li>
                <strong>Explicación previa:</strong> {explanation ? 'Paso a paso' : 'Estándar'}
              </li>
            </ul>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="btn-cado-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold"
            >
              {isSaving ? (
                <span>Guardando en /api/confort...</span>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Preferencias Guardadas!</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  <span>Guardar Preferencias de Confort</span>
                </>
              )}
            </button>

            {savedSuccess && (
              <div className="mt-4 rounded-2xl bg-[#F8EFF6] p-4 text-xs leading-5 text-[#513D49]">
                <strong>Sincronizado:</strong> El doctor podrá ver estas preferencias en su bandeja de orientaciones.
                <Link
                  href="/agendar"
                  className="mt-2 flex items-center gap-1 font-bold text-[#A14B92] hover:underline"
                >
                  Continuar a Reserva Telemática <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <p className="mt-6 flex items-start gap-2 border-t border-[#E2E7E7] pt-5 text-xs leading-6 text-[#665D66]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A14B92]" />
              Asociado unívocamente a tu solicitud bajo consentimiento informado (RF-07, RF-09).
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
