import Image from 'next/image';
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
  title: 'Conoce al Dr. Javier Beiza Ayala | CADO Odontología Calama',
  description:
    'Cirujano dentista en Calama especializado en atención cercana, manejo respetuoso del temor dental y odontología digital de precisión CAD/CAM.',
};

const clinicalPillars = [
  {
    icon: HeartHandshake,
    title: 'Escucha activa sin reproches ni juicios',
    description:
      'Si llevas años sin consultar por miedo, vergüenza o malas experiencias pasadas, aquí no recibirás reprimendas. Conversamos primero para entender tus tiempos y tus límites.',
  },
  {
    icon: ShieldCheck,
    title: 'Pacto de control y señal de parada en el box',
    description:
      'Tú mantienes el control durante toda la atención. Con un simple gesto de la mano nos detenemos al instante para descansar la mandíbula o tomar aire.',
  },
  {
    icon: Cpu,
    title: 'Tecnología digital y precisión CAD/CAM',
    description:
      'Diseño y fabricación digital de restauraciones para mayor ajuste, menor manipulación invasiva y procedimientos más breves y predecibles.',
  },
  {
    icon: Clock,
    title: 'Horarios vespertinos adaptados a Calama',
    description:
      'Atención pensada para quienes trabajan por turnos o jornadas extensas en minería y servicios en la Región de Antofagasta.',
  },
];

const credentials = [
  'Cirujano Dentista titulado en Chile',
  'Inscrito en el Registro Nacional de Prestadores Individuales de Salud (SIS)',
  'Enfoque clínico en Odontología Restauradora Estética y CAD/CAM',
  'Protocolos validados de atención respetuosa para fobia y ansiedad dental',
];

export default function EquipoPage() {
  return (
    <main className="bg-white text-[#513D49]">
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
              <span>Cirujano Dentista · Calama</span>
            </div>

            <h1 className="font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl lg:text-6xl text-balance">
              «Más que dientes, cuidamos a la persona que sonríe.»
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#665D66] sm:text-lg">
              Soy el <strong>Dr. Javier Beiza Ayala</strong>. Fundé CADO Odontología en Calama con una convicción clara: la salud bucal no debe vivirse desde la culpa o el dolor, sino desde el respeto mutuo, la calma y la transparencia clínica.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/agendar"
                className="btn-cado-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-semibold shadow-md active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>Agendar orientación virtual de 15 min</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <a
                href="https://wa.me/56944657815?text=Hola%20Dr.%20Javier%20Beiza,%20me%20gustar%C3%ADa%20hacerle%20una%20consulta%20directa"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cado-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold hover:border-[#A14B92]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Escribir al WhatsApp de la clínica</span>
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#766C75]">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
              <span>Registro de Prestadores Individuales de Salud (Superintendencia de Salud)</span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl">
              <Image
                src="/brand/photo_doctor_talking.png"
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
                Cirujano Dentista · Director Clínico CADO
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
            Un espacio pensado para que te sientas seguro y escuchado
          </h2>
          <p className="text-sm leading-relaxed text-[#665D66] sm:text-base">
            Sabemos que visitar al dentista puede generar tensión. Por eso diseñamos cada paso —desde la orientación telemática hasta el box presencial— para eliminar la incertidumbre.
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
              src="/brand/photo_cad_cam.png"
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
                Nuestra consulta presencial se ubica en <strong>Vivar #1580, oficina 203</strong>, en pleno centro de Calama con estacionamiento y locomoción cercana.
              </p>
              <div className="flex flex-col gap-2 pt-2 text-xs text-[#513D49]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
                  <span>Vivar #1580, Of. 203, Calama, Región de Antofagasta</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
                  <span>Orientaciones virtuales vespertinas de 15 min · Consultas presenciales coordinadas</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-[#F8EFF6] p-6 text-center">
              <h3 className="font-title text-xl font-semibold text-[#513D49]">
                ¿Quieres dar el primer paso?
              </h3>
              <p className="text-xs leading-relaxed text-[#665D66]">
                Comienza con la orientación virtual desde tu hogar para resolver dudas sin ningún compromiso quirúrgico.
              </p>
              <Link
                href="/agendar"
                className="btn-cado-primary mt-2 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-md active:scale-98"
              >
                <span>Agendar con cuestionario guiado</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
