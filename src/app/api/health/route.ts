import { NextResponse } from 'next/server';
import { checkSupabaseConnection } from '@/lib/supabase';

export async function GET() {
  const status = await checkSupabaseConnection();

  return NextResponse.json({
    ok: true,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zccvmxtaxbigyqopqftd.supabase.co',
    connection: status,
    endpoints: [
      { endpoint: '/api/perfil', methods: ['GET'], description: 'Perfil profesional, ubicación, servicios y canales CADO' },
      { endpoint: '/api/blog', methods: ['GET', 'POST'], description: 'Publicación cronológica y lectura de artículos del blog en Supabase' },
      { endpoint: '/api/faq', methods: ['GET'], description: 'Motor de filtrado y búsqueda predictiva de FAQ por palabra clave y categoría' },
      { endpoint: '/api/recursos', methods: ['GET', 'POST'], description: 'Catálogo de guías clínicas PDF y auditoría de descargas' },
      { endpoint: '/api/urgencias', methods: ['GET', 'POST'], description: 'Triaje de urgencias dentales y auditoría de derivación prioritaria' },
      { endpoint: '/api/cuestionario', methods: ['GET', 'POST'], description: 'Cuestionario de perfilamiento, opción Prefiero no responder y consentimiento Ley 19.628' },
      { endpoint: '/api/confort', methods: ['GET', 'POST'], description: 'Preferencias de confort ambiental (música, pausas, acompañante)' },
      { endpoint: '/api/orientaciones', methods: ['GET', 'POST'], description: 'Vinculación relacional de consentimiento y perfil de confort con reserva telemática (sin RUT)' },
    ],
  });
}
