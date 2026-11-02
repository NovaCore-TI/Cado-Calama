import Image from 'next/image';
import { CLINIC, TES_URL, SAV_URL, whatsappUrl } from '@/lib/clinic';
import { SavSteps } from '@/components/SavSteps';
import { SITE_URL, serializeStructuredData } from '@/lib/site';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const metadata = {
  alternates: { canonical: '/equipo/dr-javier-beiza' },
  title: { absolute: 'Dr. Javier Beiza | Dentista para Pacientes con Miedo en Calama' },
  description:
    'Atención odontológica cercana, sin juicios y a tu ritmo en Calama. Videollamada previa de 15 min (SAV), cuestionario TES y más de 13 años de experiencia clínica.',
};

const clinicalPillars = [
  {
    icon: HeartHandshake,
    title: 'Escucha activa sin reproches ni juicios',
    description:
      'Si llevas años sin consultar por miedo, vergüenza o malas experiencias pasadas, aquí no recibirás reprimendas ni culpas. Tu historia es bienvenida y conversamos primero para entender tus tiempos.',
  },
  {
    icon: ShieldCheck,
    title: 'El «Pacto de la Mano Levantada»',
    description:
      'Tú tienes el control absoluto durante toda la atención. Con una simple señal de tu mano nos detenemos al instante para descansar la mandíbula, respirar o resolver cualquier duda antes de continuar.',
  },
  {
    icon: Cpu,
    title: 'Tecnología digital y precisión CAD/CAM',
    description:
      'Planificación digital y escaneo 3D para evitar pastas molestas que provocan náuseas. Procedimientos más breves, predecibles y conservadores.',
  },
  {
    icon: Clock,
    title: 'Citas extendidas y horarios adaptados a Calama',
    description:
      'Privilegiamos la calidad sobre el volumen con sesiones largas y sin apuros. Horarios vespertinos coordinados pensando en los turnos laborales y faenas de la región.',
  },
];

const credentials = [
  'Cirujano Dentista titulado en Chile (Reg. SIS)',
  'Más de 13 años de trayectoria en urgencias complejas y exodoncias atraumáticas',
  'Enfoque clínico en Odontología Restauradora y Conservadora',
  'Protocolo TES: atención personalizada para pacientes con miedo o fobia dental',
];

export default function JavierPage() {
  return (
    <div className="bg-white text-[#513D49]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData({
        '@context': 'https://schema.org', '@type': 'Person', '@id': `${SITE_URL}/equipo/dr-javier-beiza#persona`,
        name: 'Dr. Javier Beiza Ayala', jobTitle: 'Cirujano Dentista', url: `${SITE_URL}/equipo/dr-javier-beiza`,
        image: `${SITE_URL}/brand/atencion-dental-cado-calama.webp`,
        description: 'Más de 13 años de trayectoria clínica. Atención a pacientes con miedo dental, urgencias y exodoncias en Calama.',
        worksFor: { '@id': `${SITE_URL}/#clinica` },
        address: { '@type': 'PostalAddress', streetAddress: CLINIC.streetAddress, addressLocality: 'Calama', addressRegion: 'Antofagasta', addressCountry: 'CL' },
        telephone: '+56944657815',
      }) }} />
      {/* SECCIÓN HERO: PERFIL DEL PROFESIONAL */}
      <section className="relative overflow-hidden bg-[#F6F8F8] px-6 py-16 sm:py-24">
        <div
          className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#A14B92]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#513D49]">
              <Award className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
              <span>CADO Odontología · Atención con Acompañamiento Emocional en Calama</span>
            </div>

            <h1 className="font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl lg:text-6xl text-balance">
              Transformamos el miedo dental en confianza
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#665D66] sm:text-lg">
              Más que dientes, cuido personas. Transformo el miedo dental en confianza, acompañándote con paciencia, sin juicios y a tu propio ritmo para que vuelvas a sonreír con total tranquilidad. Cuento con más de 13 años de trayectoria clínica resolviendo exodoncias, diagnosticando y solucionando urgencias en Calama. Diseñamos este espacio para que recuperes tu salud oral a tu paso, con el control siempre en tus manos.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={TES_URL}
                className="btn-cado-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-semibold shadow-md active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>1. Diseñar mi atención en Encuesta TES</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link href={SAV_URL} className="btn-cado-primary inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold">2. Agendar SAV (Videollamada de 15 min)</Link>
              <a
                href={whatsappUrl('Hola Dr. Javier Beiza, me gustaría hacerle una consulta directa.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cado-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold hover:border-[#A14B92]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Escribir al WhatsApp del Doctor</span>
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#766C75]">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
              <span>Registro de Prestadores Individuales de Salud (Superintendencia de Salud) · Citas extendidas sin prisas · Pacto de la mano levantada</span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl">
              <Image
                src="/brand/atencion-dental-cado-calama.webp"
                alt="El Dr. Javier Beiza conversando amablemente con un paciente en el box de CADO"
                width={800}
                height={650}
                priority
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
            <div className="glass-panel absolute -bottom-6 left-6 right-6 rounded-2xl p-4 shadow-lg sm:left-auto sm:right-6 sm:max-w-xs">
              <strong className="block text-sm font-semibold text-[#513D49]">
                Dr. Javier Beiza Ayala
              </strong>
              <p className="mt-0.5 text-xs text-[#665D66]">
                Cirujano Dentista · Más de 13 años de experiencia
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Atención presencial en Calama
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN FILOSOFÍA Y PILARES */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl space-y-3">
          <p className="section-eyebrow">Nuestra forma de atender</p>
          <h2 className="font-title text-3xl font-semibold text-[#513D49] sm:text-4xl text-balance">
            Una experiencia odontológica donde tú mantienes el control
          </h2>
          <p className="text-sm leading-relaxed text-[#665D66] sm:text-base">
            Sabemos que visitar al dentista puede generar tensión si viviste malas experiencias. Por eso diseñamos cada paso —desde la videollamada previa desde tu hogar hasta la atención en box— para eliminar la incertidumbre y darte tranquilidad.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {clinicalPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="clay-card rounded-[2rem] p-7 transition hover:shadow-lg sm:p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-title text-2xl font-semibold text-[#513D49]">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#665D66]">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN TECNOLOGÍA DIGITAL Y BOX */}
      <section className="border-y border-[#E2E7E7] bg-[#F6F8F8] px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="relative order-2 overflow-hidden rounded-[2.5rem] border-4 border-white shadow-xl lg:order-1">
            <Image
              src="/brand/tecnologia-digital-cado-calama.webp"
              alt="Tecnología digital CAD/CAM utilizada en la clínica CADO para impresiones y coronas de alta precisión"
              width={700}
              height={500}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <div className="order-1 space-y-5 lg:order-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#A14B92] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Odontología de Precisión
            </span>
            <h2 className="font-title text-3xl font-semibold text-[#513D49] sm:text-4xl text-balance">
              Tecnología que cuida tu tiempo y reduce la incomodidad
            </h2>
            <p className="text-sm leading-relaxed text-[#665D66] sm:text-base">
              Trabajamos con flujos digitales y equipamiento CAD/CAM para tomar registros sin pastas desagradables en la boca y diseñar piezas de ajuste milimétrico. Menos tiempo sentado, menor manipulación y resultados duraderos.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm text-[#513D49]">
              {credentials.map((cred) => (
                <li key={cred} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                  <span>{cred}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* UBICACIÓN Y HORARIOS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="clay-card rounded-[2.5rem] p-8 sm:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div className="space-y-4">
              <span className="section-eyebrow">Visítanos en Calama</span>
              <h2 className="font-title text-3xl font-semibold text-[#513D49] sm:text-4xl">
                Edificio Espacio Parque, Calama
              </h2>
              <p className="text-sm leading-relaxed text-[#665D66]">
                Nuestra consulta presencial se ubica en <strong>Vivar #1500, oficina 205</strong>, en pleno centro de Calama con estacionamiento y locomoción cercana.
              </p>
              <div className="flex flex-col gap-2 pt-2 text-xs text-[#513D49]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
                  <a href={CLINIC.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{CLINIC.address} · Ver en Google Maps</a>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
                  <span>Orientaciones virtuales vespertinas de 15 min · Consultas presenciales coordinadas</span>
                </div>
              </div>
            </div>

            <SavSteps />
          </div>
        </div>
      </section>
    </div>
  );
}
