import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_FAQS = [
  { id: 1, category: 'miedo', q: '¿Puedo contar que siento miedo o fobia al dentista?', a: 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.' },
  { id: 2, category: 'miedo', q: '¿Puedo pedir pausas durante una atención?', a: 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.' },
  { id: 3, category: 'vespertino', q: '¿Cómo funcionan los horarios vespertinos en Calama?', a: 'CADO ofrece bloques de orientación virtual de 15 minutos en horario compatible con jornadas laborales y turnos, además de coordinación presencial vespertina (19:00 y 20:00 hrs) en Edificio Espacio Parque.' },
  { id: 4, category: 'miedo', q: '¿Qué privacidad tienen mis respuestas en el cuestionario previo?', a: 'Tus respuestas están protegidas bajo la Ley N° 19.628 y N° 20.584. Siempre puedes elegir «Prefiero no responder» en preguntas sensibles y solo se almacenan con tu consentimiento explícito.' },
  { id: 5, category: 'dentalink', q: '¿Cómo se reserva una consulta presencial después de la orientación?', a: 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación directa asistida por WhatsApp.' },
  { id: 6, category: 'procedimientos', q: '¿Qué hacer si tengo dolor dental agudo o una urgencia hoy?', a: 'Dirígete a nuestra sección de Urgencias Dentales donde encontrarás contacto telefónico directo de un toque (+56 9 4465 7815), WhatsApp prioritario y guías PDF de primeros auxilios.' },
  { id: 7, category: 'procedimientos', q: '¿Dónde consulto por un tratamiento específico o sus costos?', a: 'Los planes de tratamiento y presupuestos clínicos se entregan tras una evaluación profesional personalizada; el sitio web y el cuestionario previo son orientativos y no emiten diagnósticos automáticos.' },
];

// Backend de buscador interactivo de preguntas frecuentes (FAQ)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const category = (searchParams.get('category') || 'todas').toLowerCase().trim();

  let dbQuery = supabase
    .from('preguntas_frecuentes')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (category && category !== 'todas') {
    dbQuery = dbQuery.eq('categoria', category);
  }


  const { data: sbFaqs, error } = await dbQuery;

  if (!error && sbFaqs) {
    return NextResponse.json({
      ok: true,
      source: 'supabase',
      count: sbFaqs.length,
      data: sbFaqs.filter((row: Record<string, unknown>) => !q || String(row.pregunta).toLowerCase().includes(q) || String(row.respuesta).toLowerCase().includes(q)).map((row: Record<string, unknown>) => ({
        id: row.id,
        category: row.categoria,
        q: row.pregunta,
        a: row.respuesta,
      })),
    });
  }

  const filtered = DEFAULT_FAQS.filter((item) => {
    const matchCat = category === 'todas' || item.category === category;
    const matchQ = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return NextResponse.json({
    ok: true,
    source: 'backend_filtered',
    query: { q, category },
    count: filtered.length,
    data: filtered,
  });
}
