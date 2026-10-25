import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const services = [
  {
    title: 'Atención respetuosa para quienes sienten temor',
    description:
      'Una conversación previa y pausas acordadas permiten avanzar a tu propio ritmo, sin juicios.',
    image: '/brand/photo_doctor_listening.png',
    alt: 'El Dr. Javier Beiza escucha con atención las dudas de una persona en CADO',
    badge: 'Acompañamiento cercano',
  },
  {
    title: 'Exodoncias y urgencias dentales',
    description:
      'Información clara para comprender los tiempos de recuperación y recibir orientación oportuna.',
    image: '/brand/photo_doctor_talking.png',
    alt: 'Profesional odontológico conversa con un paciente en un box clínico tranquilo',
    badge: 'Orientación clara',
  },
  {
    title: 'Planificación digital con tecnología CAD/CAM',
    description:
      'Herramientas modernas que permiten planificar procedimientos con mayor precisión y comodidad.',
    image: '/brand/photo_cad_cam.png',
    alt: 'Equipo de odontología digital CAD/CAM de alta precisión',
    badge: 'Precisión clínica',
  },
  {
    title: 'Trastornos temporomandibulares y bruxismo',
    description:
      'Evaluación de molestias mandibulares y sobrecarga muscular, frecuentes en turnos laborales de Calama.',
    image: '/brand/photo_doctor_listening.png',
    alt: 'Consulta sobre molestias mandibulares y bruxismo',
    badge: 'Diagnóstico integral',
  },
];

const patientVoices = [
  {
    quote:
      'Llevaba más de cuatro años sin ir al dentista por una mala experiencia de niña. Poder conversar primero por videollamada con el doctor y saber que podíamos acordar una señal de parada con la mano me devolvió la calma.',
    author: 'Marcela P.',
    context: 'Paciente de orientación virtual en Calama',
  },
  {
    quote:
      'Por mis turnos en faena siempre postergaba las consultas. Poder tener una orientación vespertina de 15 minutos sin tener que pedir permiso laboral me permitió resolver mis dudas antes de ir a la clínica.',
    author: 'Cristóbal G.',
    context: 'Atención vespertina en Edificio Espacio Parque',
  },
];

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="home-page overflow-hidden bg-white text-[#513D49]">
      {/* 1. SECCIÓN HERO */}
      <section className="relative isolate border-b border-[#E2E7E7] bg-[#F6F8F8]">
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_7%_8%,rgba(161,75,146,.12),transparent_35%),radial-gradient(circle_at_92%_85%,rgba(179,191,191,.28),transparent_35%)]"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white/80 px-4 py-2 text-xs font-semibold text-[#513D49] shadow-sm backdrop-blur-md">
              <MapPin className="h-4 w-4 text-[#A14B92]" aria-hidden="true" />
              <span>Vivar #1580, Edificio Espacio Parque · Calama</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-title text-5xl font-semibold leading-[1.08] tracking-tight text-[#513D49] text-balance sm:text-6xl lg:text-7xl">
                Un primer paso hacia tu salud oral, a tu propio ritmo.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[#513D49] sm:text-lg">
                Si una experiencia anterior te hizo postergar una consulta, aquí encuentras un espacio de escucha genuina y sin juicios. El Dr. Javier Beiza te acompaña a conversar antes de tomar cualquier decisión clínica.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/agendar"
                className="btn-cado-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold shadow-[0_12px_28px_rgba(161,75,146,.22)] transition-all hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A14B92] focus-visible:ring-offset-2"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span>Conocer la orientación virtual</span>
              </Link>
              <Link
                href="/cuestionario"
                className="btn-cado-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all hover:bg-[#F6F8F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A14B92] focus-visible:ring-offset-2"
              >
                <span>Cuestionario previo</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Micro-píldora tranquilizadora (Heurística de ansiedad) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-[#513D49]">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                15 minutos de videollamada
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                Sin instrumental clínico
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                Desde tu hogar en Calama
              </span>
            </div>
          </div>

          {/* Fotografía principal con acabado editorial */}
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
            <div
              className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 rounded-full bg-[#B3BFBF]/40 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2.4rem] border-[6px] border-white shadow-[0_24px_60px_rgba(81,61,73,.14)]">
              <Image
                src="/brand/photo_doctor_talking.png"
                alt="El Dr. Javier Beiza conversa de forma cercana con un paciente en CADO"
                width={900}
                height={700}
                priority
                className="aspect-[4/4.2] h-auto w-full object-cover sm:aspect-[5/4] lg:aspect-[4/4.5]"
              />
            </div>

            {/* Tarjeta flotante de compromiso */}
            <div className="glass-panel absolute -bottom-7 left-3 right-3 flex items-center gap-4 rounded-2xl border border-white/80 p-4 shadow-lg backdrop-blur-xl sm:left-auto sm:right-[-1.5rem] sm:max-w-[320px] sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A14B92] text-white shadow-md">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-[#513D49]">
                  Atención humana y sin juicios
                </strong>
                <span className="text-xs leading-5 text-[#513D49]">
                  El respeto a tus tiempos es parte esencial de la salud oral.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PILARES DE ACOMPAÑAMIENTO */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="mb-12 max-w-2xl space-y-3">
          <h2 className="font-title text-4xl font-semibold leading-tight text-[#513D49] text-balance sm:text-5xl">
            Una experiencia tranquila comienza antes de entrar a la clínica.
          </h2>
          <p className="text-base leading-relaxed text-[#513D49]">
            Cada persona tiene inquietudes y tiempos diferentes. Diseñamos un camino estructurado para que retomes el cuidado dental con total sensación de control.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: HeartHandshake,
              title: 'Escuchamos tu historia',
              text: 'Puedes compartir tus motivos de consulta y vivencias previas con completa confidencialidad y sin temor a ser reprendido.',
            },
            {
              icon: ShieldCheck,
              title: 'Tú marcas el ritmo',
              text: 'Mediante el Test de Confort defines si prefieres música o silencio, pausas periódicas y una señal de mano para detenernos en cualquier momento.',
            },
            {
              icon: Sparkles,
              title: 'Claridad en el siguiente paso',
              text: 'La orientación virtual aclara tus dudas desde tu casa antes de coordinar una evaluación presencial en Edificio Espacio Parque.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="clay-card relative rounded-[2rem] p-7 transition-all duration-300 hover:-translate-y-1 sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="clay-icon flex h-12 w-12 items-center justify-center rounded-2xl text-[#A14B92]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mb-3 font-title text-2xl font-semibold text-[#513D49]">{title}</h3>
              <p className="text-sm leading-relaxed text-[#513D49]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICIOS Y ENFOQUE CLÍNICO */}
      <section className="border-y border-[#E2E7E7] bg-[#F6F8F8] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl space-y-2">
              <h2 className="font-title text-4xl font-semibold text-[#513D49] text-balance sm:text-5xl">
                Cuidado profesional con vocación humana.
              </h2>
              <p className="text-sm leading-relaxed text-[#513D49]">
                Tecnología digital moderna combinada con un trato paciente y comprensivo.
              </p>
            </div>
            <Link
              href="/equipo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline"
            >
              <span>Conocer trayectoria del doctor</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.title}
                className="soft-card group overflow-hidden rounded-3xl bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-3.5 left-3.5 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-semibold text-[#513D49] shadow-sm backdrop-blur-md">
                    {service.badge}
                  </span>
                </div>
                <div className="space-y-2.5 p-6">
                  <h3 className="font-title text-xl font-semibold leading-snug text-[#513D49]">
                    {service.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#513D49]">{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. EL DOCTOR Y SU PROPÓSITO */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2">
        <div className="relative">
          <Image
            src="/brand/photo_doctor_listening.png"
            alt="El Dr. Javier Beiza conversa con un paciente durante una sesión de orientación"
            width={900}
            height={650}
            className="aspect-[5/4] h-auto w-full rounded-[2.2rem] object-cover shadow-lg"
          />
          <blockquote className="glass-panel absolute -bottom-6 left-4 right-4 rounded-2xl border border-white/80 p-5 shadow-md backdrop-blur-md sm:right-auto sm:max-w-sm">
            <Quote className="h-5 w-5 text-[#A14B92]" aria-hidden="true" />
            <q className="mt-1 block text-sm font-semibold leading-snug text-[#513D49]">
              Más que dientes, cuidamos personas.
            </q>
            <cite className="mt-1 block text-xs not-italic text-[#513D49]">
              Dr. Javier Beiza Ayala · Cirujano Dentista
            </cite>
          </blockquote>
        </div>

        <div className="space-y-6 pt-6 lg:pl-8 lg:pt-0">
          <h2 className="font-title text-4xl font-semibold leading-tight text-[#513D49] text-balance sm:text-5xl">
            Un espacio en Calama para hablar con total confianza.
          </h2>
          <p className="leading-relaxed text-[#513D49]">
            Con más de 13 años de ejercicio en la ciudad, el Dr. Javier Beiza comprende la realidad y exigencias de los habitantes de Calama y el régimen de turnos. En CADO no existen procedimientos apresurados ni juicios por el estado actual de tu dentadura.
          </p>
          <div className="pt-2">
            <Link
              href="/equipo"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#B3BFBF] bg-white px-5 py-3 text-sm font-semibold text-[#8A3D7D] shadow-sm transition hover:bg-[#F6F8F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A14B92]"
            >
              <span>Conocer formación y enfoque clínico</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIOS (SOCIAL PROOF - PATRÓN UI/UX PRO MAX) */}
      <section className="border-t border-[#E2E7E7] bg-[#F6F8F8] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 max-w-2xl space-y-2">
            <h2 className="font-title text-4xl font-semibold text-[#513D49] text-balance sm:text-5xl">
              Experiencias de quienes volvieron a confiar.
            </h2>
            <p className="text-sm leading-relaxed text-[#513D49]">
              Testimonios de personas que superaron el temor inicial mediante un trato transparente y gradual.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {patientVoices.map((item, index) => (
              <div
                key={index}
                className="clay-card relative flex flex-col justify-between rounded-3xl p-7 sm:p-8"
              >
                <div className="space-y-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#A14B92] shadow-sm">
                    <Quote className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="font-testimonial text-sm leading-relaxed text-[#513D49] italic">
                    «{item.quote}»
                  </p>
                </div>
                <div className="mt-6 border-t border-[#E2E7E7] pt-4">
                  <strong className="block text-sm font-semibold text-[#513D49]">
                    {item.author}
                  </strong>
                  <span className="text-xs text-[#513D49]">{item.context}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. LLAMADO A LA ACCIÓN FINAL */}
      <section className="px-6 py-20 sm:py-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] bg-[#513D49] px-7 py-12 text-white shadow-xl sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#A14B92]/50 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl space-y-4">
              <h2 className="font-title text-4xl font-semibold leading-tight text-white text-balance sm:text-5xl">
                El primer contacto puede ser sencillo y sin presiones.
              </h2>
              <p className="leading-relaxed text-white/90">
                Completa el cuestionario previo para compartir tus inquietudes, explora el test de confort o agenda directamente tus 15 minutos de orientación virtual con el Dr. Javier Beiza.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/agendar"
                className="rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-[#513D49] shadow-md transition-all hover:bg-[#F6F8F8] hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Agendar orientación virtual
              </Link>
              <Link
                href="/test-confort"
                className="rounded-2xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explorar test de confort
              </Link>
              <a
                href="https://wa.me/56944657815"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp prioritario: contactar a CADO Odontología (abre en una nueva ventana)"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>WhatsApp prioritario</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
