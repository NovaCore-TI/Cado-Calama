'use client';

import React, { useState } from 'react';
import { 
  Hand, 
  Volume2, 
  VolumeX, 
  Clock, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';

interface ConfortLiveCardProps {
  soundPreference?: 'musica_suave' | 'silencio' | 'explicacion_paso_a_paso' | string;
  jawBreaks?: boolean;
  companionAllowed?: boolean;
  handSignalPledge?: boolean;
  compact?: boolean;
}

export function ConfortLiveCard({
  soundPreference = 'musica_suave',
  jawBreaks = true,
  companionAllowed = false,
  handSignalPledge = true,
  compact = false,
}: ConfortLiveCardProps) {
  const [activeTab, setActiveTab] = useState<'pacto' | 'ambiente' | 'garantias'>('pacto');

  // Cálculo de índice de personalización de confort (0 a 100%)
  const score = [
    soundPreference ? 25 : 0,
    jawBreaks ? 25 : 0,
    companionAllowed ? 25 : 15,
    handSignalPledge ? 25 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="clay-card relative overflow-hidden rounded-[2rem] border border-white/80 p-6 sm:p-7 shadow-[0_20px_50px_rgba(81,61,73,.1)] transition-all duration-300">
      {/* Resplandor sutil decorativo en la esquina */}
      <div 
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#A14B92]/10 blur-2xl" 
        aria-hidden="true" 
      />

      {/* Cabecera del componente */}
      <div className="flex items-center justify-between border-b border-[#E2E7E7] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#A14B92] text-white shadow-[0_6px_16px_rgba(161,75,146,.3)]">
            <Hand className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <h3 className="font-title text-xl font-semibold text-[#513D49]">
              Pacto de Control & Confort CADO
            </h3>
            <p className="text-xs text-[#766C75]">
              Compromiso clínico antes de cualquier procedimiento
            </p>
          </div>
        </div>

        {/* Indicador visual de preparación */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A14B92]">
            Nivel de Control
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-[#E2E7E7]">
              <div 
                className="h-full bg-gradient-to-r from-[#B3BFBF] to-[#A14B92] transition-all duration-500 ease-out"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#513D49]">{score}%</span>
          </div>
        </div>
      </div>

      {/* Selector de pestañas interactivas */}
      <div className="mt-4 flex gap-1 rounded-xl bg-[#F6F8F8] p-1 text-xs">
        {[
          { id: 'pacto', label: 'Señal de parada', icon: Hand },
          { id: 'ambiente', label: 'Ambiente Box', icon: soundPreference === 'silencio' ? VolumeX : Volume2 },
          { id: 'garantias', label: 'Pausas & Trato', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#513D49] shadow-sm'
                  : 'text-[#766C75] hover:text-[#513D49]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-[#A14B92]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido interactivo según pestaña */}
      <div className="mt-5 min-h-[95px] text-sm leading-relaxed text-[#605761]">
        {activeTab === 'pacto' && (
          <div className="rounded-2xl bg-white/70 p-4 border border-[#E2E7E7]/60">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F6F8F8] text-[#A14B92]">
                <Hand className="h-4 w-4" />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-[#513D49]">
                  Señal de mano acordada (Stop Signal)
                </strong>
                <p className="mt-1 text-xs leading-5 text-[#665D66]">
                  Si levantas la mano izquierda durante cualquier momento de la atención, el Dr. Javier Beiza detiene el instrumental de inmediato. Tú tienes el control en todo momento.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-[#A14B92]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8A3D7D]">
                  <Sparkles className="h-3 w-3" /> Compromiso firmado por protocolo
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ambiente' && (
          <div className="rounded-2xl bg-white/70 p-4 border border-[#E2E7E7]/60">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F6F8F8] text-[#A14B92]">
                {soundPreference === 'silencio' ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </span>
              <div>
                <strong className="block text-sm font-semibold text-[#513D49]">
                  Ambiente sonoro:{' '}
                  <span className="text-[#A14B92]">
                    {soundPreference === 'silencio' ? 'Silencio y calma total' : 'Música suave relajante'}
                  </span>
                </strong>
                <p className="mt-1 text-xs leading-5 text-[#665D66]">
                  El box se acondiciona antes de tu ingreso. Sin ruidos bruscos de instrumental metálico en espera ni música invasiva.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'garantias' && (
          <div className="rounded-2xl bg-white/70 p-4 border border-[#E2E7E7]/60">
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#A14B92]" />
                <span>
                  <strong>Pausas mandibulares:</strong> {jawBreaks ? 'Solicitadas y programadas cada 5-7 min' : 'A demanda del paciente'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#A14B92]" />
                <span>
                  <strong>Acompañante en box:</strong> {companionAllowed ? 'Permitido en todo momento' : 'Opcional si decides venir solo'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#A14B92]" />
                <span>
                  <strong>Explicación paso a paso:</strong> Se explica qué se siente antes de cada acción.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Pie interactivo */}
      {!compact && (
        <div className="mt-4 flex items-center justify-between border-t border-[#E2E7E7]/70 pt-3 text-[11px] text-[#766C75]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
            Protegido bajo protocolo CADO Dental Care
          </span>
          <span className="font-semibold text-[#A14B92]">Dr. Javier Beiza A.</span>
        </div>
      )}
    </div>
  );
}
