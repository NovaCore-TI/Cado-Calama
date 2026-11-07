import type { Metadata } from 'next';
import { CheckCircle2, ImageIcon } from 'lucide-react';
import { CLINIC, whatsappUrl } from '@/lib/clinic';
import { DentalinkLink } from './DentalinkLink';
import { WhatsAppIcon } from './WhatsAppIcon';

export const profiles = {
  juan: {
    path: "/equipo/dr-juan-cruz-mandiola",
    contact: CLINIC.phones[1],
    initials: "JC",
    eyebrow: "CADO Odontología · Especialista en Trastornos Temporomandibulares y Dolor Orofacial",
    title: "Alivio preciso para el dolor mandibular, articular y muscular",
    introduction: "El dolor orofacial crónico, el apretamiento dentario y la tensión en la mandíbula afectan profundamente tu descanso y tu calidad de vida. Como especialista en TTM y Dolor Orofacial, me dedico a identificar el origen neuromuscular y articular exacto de tu molestia, ofreciéndote un tratamiento basado en evidencia científica, sin improvisaciones y diseñado para devolverle el equilibrio funcional a tu rostro.",
    seoTitle: "Dr. Juan Cruz Mandiola | Especialista en Dolor Orofacial y TTM en Calama",
    description: "Diagnóstico y tratamiento avanzado del dolor mandibular, bruxismo, cefaleas tensionales y trastornos de la ATM en CADO Calama con el Dr. Juan Cruz Mandiola.",
    bookingLabel: "1. Agendar Evaluación de Dolor Orofacial / TTM",
    whatsappLabel: "2. Consultar dudas por WhatsApp",
    assurances: [
      "Especialista certificado con registro en la Superintendencia de Salud (SIS)",
      "Diagnóstico diferencial clínico y articular de la ATM",
      "Terapias conservadoras y manejo integral del bruxismo",
    ],
    badgeSpecialty: "Especialista en TTM y Dolor Orofacial",
    badgeCaption: "Atención especializada en Calama",
    pillarsTitle: "Un diagnóstico certero para un dolor que no tiene por qué ser crónico",
    pillarsIntro: "Abordamos los trastornos de la articulación temporomandibular y las sobrecargas musculares desde la raíz, descartando confusiones diagnósticas comunes como jaquecas o molestias de oído.",
    pillars: [
      ["Evaluación integral de la ATM", "Examen minucioso de la dinámica mandibular, ruidos articulares (chasquidos o crepitaciones), desvíos y limitaciones en la apertura bucal para un diagnóstico claro."],
      ["Manejo de bruxismo y tensión muscular", "Tratamiento del apretamiento y rechinamiento diurno o nocturno, aliviando la fatiga de los músculos masticatorios, contracturas cervicales y cefaleas tensionales."],
      ["Terapias conservadoras y personalizadas", "Diseño de planos de estabilización oclusal (férulas) de alta precisión, farmacoterapia adaptada y pautas de autocuidado fisioterapéutico neuromuscular."],
      ["Tiempos de consulta dedicados", "Citas sin apuro para escuchar la evolución de tu dolor, revisar antecedentes y coordinar revisiones periódicas compatibles con los turnos de trabajo en Calama."],
    ],
    technologyTitle: "Tecnología avanzada para evaluar tu función mandibular",
    technology: "Utilizamos herramientas de palpación clínica estandarizada, análisis oclusal digital y apoyo de imágenes radiográficas y tomográficas para diseñar planos de relajación que se ajustan al milímetro, protegiendo tus dientes y estabilizando la articulación.",
    technologyChecks: [
      "Cirujano Dentista y Especialista en TTM y Dolor Orofacial (Reg. SIS)",
      "Diagnóstico diferencial en cefaleas y dolores faciales atípicos",
      "Planos de desprogramación oclusal confeccionados a medida",
      "Enfoque multidisciplinario coordinado con el equipo CADO",
    ],
  },
  oscar: {
    path: "/equipo/dr-oscar-albanes-hidalgo",
    contact: CLINIC.phones[2],
    initials: "OA",
    eyebrow: "CADO Odontología · Especialista en Endodoncia (Tratamientos de Conducto)",
    title: "Precisión microscópica para salvar tus dientes y eliminar el dolor",
    introduction: "El dolor dental agudo provocado por una inflamación o infección en el nervio del diente requiere una intervención rápida, exacta y sin dolor. Como especialista en Endodoncia, empleo magnificación y tecnología rotatoria moderna para desinfectar y sellar los conductos radiculares, cortando la molestia de raíz y permitiéndote conservar tu diente natural con total seguridad y confort.",
    seoTitle: "Dr. Óscar Albanés Hidalgo | Especialista en Endodoncia en Calama",
    description: "Tratamiento de conducto avanzado y alivio del dolor dental agudo en Calama con el Dr. Óscar Albanés Hidalgo. Especialista en Endodoncia en CADO Odontología.",
    bookingLabel: "1. Agendar Tratamiento de Endodoncia / Conducto",
    whatsappLabel: "2. Consultar Urgencia de Dolor Dental por WhatsApp",
    assurances: [
      "Especialista certificado en Endodoncia inscrito en el Registro SIS",
      "Instrumentación rotatoria y localizadores apicales de alta precisión",
      "Enfoque en preservación del diente natural",
    ],
    badgeSpecialty: "Especialista en Endodoncia",
    badgeCaption: "Preservación dental avanzada en Calama",
    pillarsTitle: "Tratamientos de conducto indoloros, predecibles y en menos sesiones",
    pillarsIntro: "Dejamos atrás los tratamientos de conducto largos e incómodos del pasado gracias a protocolos contemporáneos de mínima invasión y máximo confort.",
    pillars: [
      ["Alivio inmediato de pulpitis e infecciones", "Control eficaz del dolor punzante e invalidante causado por caries profundas, traumatismos o abscesos, eliminando la infección desde el primer momento."],
      ["Tecnología mecanizada de conductos", "Uso de limas rotatorias de níquel-titanio que limpian los conductos con extrema rapidez y anatomía precisa, reduciendo drásticamente el tiempo de sillón."],
      ["Medición digital milimétrica", "Localizadores electrónicos de ápice que calculan la longitud exacta de la raíz del diente sin necesidad de exponer al paciente a exceso de radiografías."],
      ["Enfoque conservador y biológico", "Nuestro objetivo primordial es salvar tu diente natural, evitando la extracción y dejándolo listo para su rehabilitación estética y funcional duradera."],
    ],
    technologyTitle: "Tecnología que cuida tu diente y agiliza tu recuperación",
    technology: "Contamos con radiología digitalizada inmediata y sistemas de irrigación y obturación termoplástica tridimensional que sellan herméticamente el interior del diente. Esto garantiza tratamientos limpios, predecibles y con un postoperatorio prácticamente libre de molestias.",
    technologyChecks: [
      "Cirujano Dentista y Especialista en Endodoncia (Reg. SIS)",
      "Sistemas rotatorios de última generación para procedimientos ágiles",
      "Localizadores electrónicos foraminales para precisión milimétrica",
      "Resolución coordinada de urgencias dentales agudas en CADO",
    ],
  },
} as const;

type Profile = typeof profiles[keyof typeof profiles];

export function doctorMetadata(profile: Profile): Metadata {
  return {
    title: { absolute: profile.seoTitle },
    description: profile.description,
    alternates: { canonical: profile.path },
  };
}

export function DoctorProfile({ profile }: { profile: Profile }) {
  return <div className="space-y-12 px-5 py-12 sm:px-8 sm:py-16">
    <section className="material-card-tonal mx-auto grid max-w-6xl gap-8 rounded-3xl p-6 sm:p-10 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <p className="section-eyebrow">{profile.eyebrow}</p>
        <h1 className="font-title text-4xl font-semibold sm:text-5xl">{profile.title}</h1>
        <p className="leading-7">{profile.introduction}</p>
        <div className="flex flex-wrap items-start gap-3">
          <DentalinkLink compact primary label={profile.bookingLabel} phone={profile.contact.number} />
          <a className="btn-cado-secondary material-button text-sm font-semibold"
            href={whatsappUrl('Hola, quisiera consultar por una evaluación en CADO.', profile.contact.number)}
            target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            {profile.whatsappLabel}<span className="sr-only"> con {profile.contact.name} (abre otra pestaña)</span>
          </a>
        </div>
        <ProfileChecklist items={profile.assurances} />
      </div>
      <div className="self-start rounded-3xl bg-[var(--md-primary-container)] p-4">
        <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center pb-8">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white font-title text-4xl font-semibold">{profile.initials}</span>
        </div>
        <div className="material-card relative -mt-8 space-y-1 rounded-2xl p-4">
          <p className="font-title text-2xl font-semibold">{profile.contact.name}</p>
          <p className="text-sm">{profile.badgeSpecialty}</p>
          <p className="text-sm font-semibold text-[#8A3D7D]">{profile.badgeCaption}</p>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl space-y-5">
      <h2 className="font-title text-3xl font-semibold">{profile.pillarsTitle}</h2>
      <p className="max-w-3xl leading-7">{profile.pillarsIntro}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {profile.pillars.map(([title, description]) => <article key={title} className="material-card rounded-2xl p-5">
          <h3 className="font-title text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-7">{description}</p>
        </article>)}
      </div>
    </section>
    <section className="material-card-tonal mx-auto grid max-w-6xl gap-6 rounded-3xl p-6 md:grid-cols-[1fr_1.2fr] md:items-center">
      <div className="space-y-4 md:col-start-2 md:row-start-1">
        <h2 className="font-title text-3xl font-semibold">{profile.technologyTitle}</h2>
        <p className="leading-7">{profile.technology}</p>
        <ProfileChecklist items={profile.technologyChecks} />
        <a className="inline-block underline" href={CLINIC.directionsUrl}>{CLINIC.address}</a>
      </div>
      <div className="material-card flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center md:col-start-1 md:row-start-1 md:aspect-[4/3]">
        <ImageIcon className="h-8 w-8" aria-hidden="true" />
        <p className="text-sm">Fotografía clínica próximamente</p>
      </div>
    </section>
  </div>;
}

function ProfileChecklist({ items }: { items: readonly string[] }) {
  return <ul className="space-y-2 text-sm leading-6">
    {items.map(item => <li key={item} className="flex items-start gap-2">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8A3D7D]" aria-hidden="true" />
      <span>{item}</span>
    </li>)}
  </ul>;
}
