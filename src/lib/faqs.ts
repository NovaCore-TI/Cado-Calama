export interface FAQItem {
  id: number;
  category: 'miedo' | 'vespertino' | 'dentalink' | 'procedimientos';
  q: string;
  a: string;
}

export const DEFAULT_FAQS: FAQItem[] = [
  { id: 1, category: 'miedo', q: '¿Puedo contar que siento miedo o fobia al dentista?', a: 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.' },
  { id: 2, category: 'miedo', q: '¿Puedo pedir pausas durante una atención?', a: 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.' },
  { id: 3, category: 'vespertino', q: '¿Cómo funcionan los horarios de orientación en Calama?', a: 'CADO ofrece bloques de orientación virtual de 15 minutos en horario vespertino adaptado a turnos y jornadas laborales, además de coordinación presencial en Edificio Espacio Parque.' },
  { id: 4, category: 'miedo', q: '¿Cómo se vincula el cuestionario y el test de confort a mi reserva?', a: 'El flujo de reserva en Agendar está unificado: al completar el cuestionario y test de confort, tus respuestas quedan directamente enlazadas a tu cita para que el doctor las revise antes de iniciar la videollamada.' },
  { id: 5, category: 'dentalink', q: '¿Cómo se reserva una consulta presencial después de la orientación?', a: 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación asistida por WhatsApp según tu caso.' },
  { id: 6, category: 'vespertino', q: '¿Cómo accedo a mi orientación telemática por Google Meet?', a: 'Al confirmar tu reserva se genera automáticamente tu enlace seguro de Google Meet y se envía a tu correo, además de disponer de un botón directo de acceso en la pantalla de confirmación.' },
  { id: 7, category: 'procedimientos', q: '¿Dónde consulto por un tratamiento o sus costos?', a: 'Los planes de tratamiento y presupuestos clínicos se entregan tras una evaluación profesional personalizada; el sitio web y el cuestionario previo son orientativos y no emiten diagnósticos automáticos.' },
];

export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function filterFaqs(items: FAQItem[], query = "", category = "todas") {
  const term = normalizeSearch(query);
  return items.filter(item => (category === "todas" || item.category === category) &&
    (!term || normalizeSearch(item.q).includes(term) || normalizeSearch(item.a).includes(term)));
}

