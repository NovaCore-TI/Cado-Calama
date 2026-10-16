import { NextResponse } from 'next/server';
import { checkSupabaseConnection } from '@/lib/supabase';

export async function GET() {
  const status = await checkSupabaseConnection();

  return NextResponse.json({
    ok: true,
    sprint: 'Sprint 1: Contenido y Perfil',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zccvmxtaxbigyqopqftd.supabase.co',
    connection: status,
    endpointsSprint1: [
      { rf: 'RF-01', subtask: 'SCRUM-36', endpoint: '/api/perfil', methods: ['GET'], description: 'Perfil profesional, ubicación, servicios y canales CADO' },
      { rf: 'RF-02', subtask: 'SCRUM-39', endpoint: '/api/blog', methods: ['GET', 'POST'], description: 'Publicación cronológica y lectura de artículos del blog en Supabase' },
      { rf: 'RF-03', subtask: 'SCRUM-42', endpoint: '/api/faq', methods: ['GET'], description: 'Motor de filtrado y búsqueda predictiva de FAQ por palabra clave y categoría' },
      { rf: 'RF-04', subtask: 'SCRUM-45', endpoint: '/api/recursos', methods: ['GET', 'POST'], description: 'Catálogo de guías clínicas PDF y auditoría de descargas' },
      { rf: 'RF-05', subtask: 'SCRUM-48', endpoint: '/api/urgencias', methods: ['GET', 'POST'], description: 'Triaje de urgencias dentales y auditoría de derivación prioritaria' },
      { rf: 'RF-06 / RF-08 / RF-09', subtask: 'SCRUM-51 / SCRUM-57 / SCRUM-60', endpoint: '/api/cuestionario', methods: ['GET', 'POST'], description: 'Cuestionario de perfilamiento, opción Prefiero no responder y consentimiento Ley 19.628' },
      { rf: 'RF-07', subtask: 'SCRUM-54', endpoint: '/api/confort', methods: ['GET', 'POST'], description: 'Preferencias de confort ambiental (música, pausas, acompañante)' },
      { rf: 'RF-09 / RF-12', subtask: 'SCRUM-60', endpoint: '/api/orientaciones', methods: ['GET', 'POST'], description: 'Vinculación relacional de consentimiento y perfil de confort con reserva telemática (sin RUT)' },
    ],
  });
}
