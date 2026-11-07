export const TES_QUESTIONS = [
  {
    key: 'environment',
    title: 'El entorno ideal',
    prompt: 'Durante tu atención en la clínica, ¿cuál de estos elementos te ayudaría a sentir mayor tranquilidad?',
    options: [
      'Escuchar música relajante o usar audífonos propios.',
      'Que me expliquen detalladamente cada paso antes de avanzar.',
      'Mantener un ambiente en silencio y avanzar de forma pausada.',
    ],
  },
  {
    key: 'pace',
    title: 'Ritmo y control',
    prompt: '¿Cómo prefieres que manejemos el ritmo de tu sesión?',
    options: [
      'Me da tranquilidad saber que puedo levantar la mano y pausar la atención en cualquier momento.',
      'Prefiero sesiones cortas y enfocadas en avanzar un paso a la vez.',
      'Prefiero optimizar el tiempo y realizar todo lo posible en una sola sesión.',
    ],
  },
  {
    key: 'wellbeing',
    title: 'Bienestar actual',
    prompt: 'Pensando en tu bienestar general al visitar al dentista, ¿en qué punto te encuentras hoy?',
    options: ['1', '2', '3', '4', '5'],
  },
  {
    key: 'communication',
    title: 'Comunicación y cercanía',
    prompt: '¿Qué tipo de comunicación te hace sentir más seguro/a por parte del profesional?',
    options: [
      'Que use un lenguaje sencillo, cercano y me hable con total transparencia.',
      'Que sea muy técnico y detallista con los procedimientos.',
      'Prefiero hablar lo justo y necesario para mantenerme enfocado/a.',
    ],
  },
  {
    key: 'goal',
    title: 'Tu meta principal',
    prompt: 'Al finalizar este proceso con nosotros, ¿cuál es el mayor beneficio que deseas alcanzar?',
    options: [
      'Recuperar la total libertad de sonreír y comer con comodidad.',
      'Solucionar una molestia específica que interrumpe mi tranquilidad actual.',
      'Lograr atender la salud de mi boca sintiéndome en un entorno de total confianza.',
    ],
  },
  {
    key: 'music',
    title: 'Preferencia de música',
    prompt: '¿Qué prefieres escuchar durante la atención?',
    options: ['Música suave relajante', 'Silencio y calma total', 'Llevaré mi propia música (audífonos)', 'Elección musical propia'],
  },
] as const;

export type TesPreferences = Partial<Record<(typeof TES_QUESTIONS)[number]['key'] | 'artists' | 'message', string>>;

export function parseTesPreferences(input: unknown): TesPreferences | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const raw = input as Record<string, unknown>;
  const answers: TesPreferences = {};
  for (const { key, options } of TES_QUESTIONS) {
    const choice = options.find(option => option === raw[key]);
    if (choice) answers[key] = choice;
  }
  if (answers.music === 'Elección musical propia' && typeof raw.artists === 'string') {
    answers.artists = raw.artists.trim().slice(0, 150);
  }
  if (typeof raw.message === 'string') answers.message = raw.message.trim().slice(0, 500);
  return answers;
}
