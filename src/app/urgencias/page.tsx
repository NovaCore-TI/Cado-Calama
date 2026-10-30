import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  HeartHandshake,
  LifeBuoy,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const metadata = {
  title: 'Atención de Urgencias Dentales en Calama | CADO Odontología',
  description:
    'Guía de primeros auxilios y contacto rápido para dolor de muelas intenso, traumatismos dentales, flemones o sangrado en Calama.',
};

const emergencyProtocols = [
  {
    icon: Zap,
    title: 'Dolor dental agudo e insoportable (Pulpitis)',
    subtitle: 'Dolor punzante que empeora con el calor o al acostarse',
    steps: [
      'Mantén la cabeza elevada con dos almohadas para reducir la presión en la zona.',
      'Aplica frío local en la mejilla (paño con hielo 10 min por lado). Nunca apliques calor.',
      'No coloques aspirinas ni alcohol directamente sobre la encía o el diente: queman el tejido.',
      'Comunícate de inmediato con el doctor para coordinar atención o prescripción segura.',
    ],
    tag: 'Frecuente',
  },
  {
    icon: AlertTriangle,
    title: 'Diente desprendido por golpe (Avulsión)',
    subtitle: 'El tiempo es crítico: los primeros 60 minutos son determinantes',
    steps: [
      'Toma el diente únicamente por la corona (la parte blanca), nunca toques la raíz.',
      'Si está sucio, enjuágalo brevemente con leche o suero fisiológico (sin frotar).',
      'Si es un diente definitivo, puedes intentar recolocarlo suavemente sin forzarlo; si no es posible, consérvalo en leche o saliva en un recipiente.',
      'Si es un diente de leche, no intentes recolocarlo: podrías dañar el diente definitivo que se está formando.',
      'Acude de inmediato a consulta odontológica urgente.',
    ],
    tag: 'Crítico (< 60 min)',
  },
  {
    icon: HeartHandshake,
    title: 'Sangrado continuo tras una extracción',
    subtitle: 'Pequeñas filtraciones son normales las primeras horas',
    steps: [
      'Coloca una gasa estéril doblada sobre el sitio y muerde con presión suave y firme durante 30 a 45 minutos seguidos.',
      'No escupas ni hagas buches de agua: la succión desprende el coágulo y reactiva el sangrado.',
      'Mantente en reposo sentado, sin realizar esfuerzos físicos ni inclinarte hacia adelante.',
      'Si tras 2 horas de compresión el sangrado no disminuye, avísanos de inmediato.',
    ],
    tag: 'Postquirúrgico',
  },
];

export default function UrgenciasPage() {
  return (
    <main className="min-h-screen bg-white text-[#513D49]">
      {/* SECCIÓN HERO DE ACCIÓN INMEDIATA */}
      <section className="border-b border-[#E2E7E7] bg-[#FFF5F5] px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3.5 py-1 text-xs font-bold text-red-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            <span>Asistencia Rápida y Triage de Urgencias · Calama</span>
          </div>

          <h1 className="font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl lg:text-6xl text-balance">
            ¿Dolor intenso o un imprevisto dental hoy?
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-[#665D66] sm:text-lg">
            Si presentas dolor agudo, hinchazón facial o un diente golpeado, comunícate con nosotros para coordinar la evaluación más oportuna en Calama o sigue las pautas de primeros auxilios mientras nos contactas.
          </p>

          {/* BOTONES DE UN TOQUE */}
          <div className="flex flex-wrap gap-3.5 pt-2">
            <a
              href="tel:+56944657815"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700 active:scale-[0.98]"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Llamar a CADO (+56 9 4465 7815)</span>
            </a>

            <a
              href="https://wa.me/56944657815?text=URGENCIA%20DENTAL:%20Tengo%20un%20dolor%20agudo%20y%20necesito%20asistencia%20en%20Calama."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cado-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-800 hover:bg-red-50"
            >
              <MessageCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <span>WhatsApp Prioritario Urgencias</span>
            </a>
          </div>

          <p className="text-xs text-[#766C75]">
            * CADO no es un servicio de guardia hospitalaria permanente 24/7. Si no logras comunicarte de inmediato en horario inhábil y presentas riesgo vital, consulta los canales de salud pública indicados más abajo.
          </p>
        </div>
      </section>

      {/* SECCIÓN TRIAGE Y PRIMEROS AUXILIOS */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20 space-y-12">
        <div className="space-y-3">
          <p className="section-eyebrow">Triage Odontológico</p>
          <h2 className="font-title text-3xl font-semibold text-[#513D49] sm:text-4xl text-balance">
            ¿Qué debes hacer mientras logras atención clínica?
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[#665D66]">
            Estas recomendaciones te permitirán proteger tu pieza dental y evitar complicaciones mientras te trasladas o conversas con el doctor.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {emergencyProtocols.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="clay-card flex flex-col justify-between rounded-3xl p-6 sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-[#F6F8F8] px-3 py-1 text-[11px] font-bold text-[#A14B92]">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 font-title text-xl font-semibold text-[#513D49]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#766C75]">
                    {item.subtitle}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-[#E2E7E7] pt-4 text-xs leading-relaxed text-[#513D49]">
                    {item.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-bold text-[#A14B92]">{i + 1}.</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                  {item.title.includes('Avulsión') && <p className="mt-4 text-xs"><a href="https://www.nhs.uk/conditions/knocked-out-tooth/" target="_blank" rel="noopener noreferrer" className="underline">Referencia de primeros auxilios: NHS (en inglés)</a></p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ALERTA DE BANDERA ROJA (HOSPITAL / SAMU) */}
        <div className="rounded-3xl border-2 border-red-200 bg-red-50/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h3 className="font-title text-2xl font-semibold text-red-950">
                Señales de alarma que requieren acudir a un Servicio de Urgencia Hospitalaria
              </h3>
              <p className="text-sm leading-relaxed text-red-900">
                Si la hinchazón facial compromete la apertura ocular, dificulta tragar o respirar, o si va acompañada de fiebre alta y decaimiento severo, <strong>no esperes una cita ambulatoria</strong>.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-red-800">
                <span>• Hospital de Calama Dr. Carlos Cisternas (Urgencias 24/7)</span>
                <span>• SAMU Emergencias Vitales: <a href="tel:131" className="underline font-bold">131</a></span>
                <span>• Salud Responde MINSAL: <a href="tel:6003607777" className="underline font-bold">600 360 7777</a></span>
              </div>
            </div>
          </div>
        </div>

        {/* UBICACIÓN CLÍNICA CADO */}
        <div className="clay-card flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <MapPin className="mt-1 h-6 w-6 shrink-0 text-[#A14B92]" aria-hidden="true" />
            <div>
              <strong className="block text-sm font-semibold text-[#513D49]">
                CADO Odontología en Calama
              </strong>
              <p className="mt-0.5 text-xs text-[#665D66]">
                Vivar #1580, Edificio Espacio Parque, oficina 203. Coordinación previa de box por llamada o WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/recursos"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#B3BFBF] bg-white px-4 py-2.5 text-xs font-semibold text-[#513D49] hover:bg-[#F6F8F8]"
            >
              <span>Descargar guías clínicas PDF</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/agendar"
              className="btn-cado-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm"
            >
              <span>Orientación virtual programada</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
