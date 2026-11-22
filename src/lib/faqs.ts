import 'server-only';
import { supabase } from './supabase';

export interface FaqItem {
  id: number;
  category: string;
  q: string;
  a: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  { id: 1, category: 'miedo', q: '¿Puedo contar que siento miedo o fobia al dentista?', a: 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.' },
  { id: 2, category: 'miedo', q: '¿Puedo pedir pausas durante una atención?', a: 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.' },
  { id: 3, category: 'vespertino', q: '¿Cómo funcionan los horarios vespertinos en Calama?', a: 'CADO ofrece sesiones de acercamiento virtual (SAV) de 15 minutos en horarios compatibles con jornadas laborales y turnos, además de consultas presenciales coordinadas y urgencias en Edificio Espacio Parque.' },
  { id: 4, category: 'miedo', q: '¿Qué privacidad tienen mis respuestas en el cuestionario previo?', a: 'Tus respuestas están protegidas bajo la Ley N° 19.628 y N° 20.584. Siempre puedes elegir «Prefiero no responder» en preguntas sensibles y solo se almacenan con tu consentimiento explícito.' },
  { id: 5, category: 'dentalink', q: '¿Cómo se reserva una consulta presencial después de la orientación?', a: 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación directa asistida por WhatsApp.' },
  { id: 6, category: 'procedimientos', q: '¿Qué hacer si tengo dolor dental agudo o una urgencia hoy?', a: 'Dirígete a nuestra sección de Urgencias Dentales donde encontrarás contacto telefónico directo de un toque (+56 9 4465 7815), WhatsApp prioritario y guías PDF de primeros auxilios.' },
  { id: 7, category: 'procedimientos', q: '¿Dónde consulto por un tratamiento específico o sus costos?', a: 'Los planes de tratamiento y presupuestos clínicos se entregan tras una evaluación profesional personalizada; el sitio web y el cuestionario previo son orientativos y no emiten diagnósticos automáticos.' },
];

export async function getPublicFaqs(): Promise<{ items: FaqItem[]; source: string }> {
  const { data, error } = await supabase.from('preguntas_frecuentes')
    .select('id,categoria,pregunta,respuesta')
    .eq('activo', true)
    .order('orden', { ascending: true });
  if (error || !data) return { items: DEFAULT_FAQS, source: 'backend_filtered' };
  return {
    source: 'supabase',
    items: data.map(row => ({ id: row.id, category: row.categoria, q: row.pregunta, a: row.respuesta })),
  };
}
