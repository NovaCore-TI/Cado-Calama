import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const GUIAS_CLINICAS = [
  {
    id: 'guia-post-exodoncia',
    titulo: 'Cuidados Posteriores a una Extracción Dental (Exodoncia)',
    categoria: 'Postoperatorio',
    descripcion: 'Indicaciones paso a paso para las primeras 48 horas: control del sangrado, alimentación recomendada, higiene suave y señales de alerta.',
    fileName: 'CADO_Guia_Cuidados_Post_Exodoncia.pdf',
    tamano_kb: 145,
  },
  {
    id: 'guia-primeros-auxilios-urgencias',
    titulo: 'Primeros Auxilios ante Urgencias Dentales y Dolor Agudo',
    categoria: 'Urgencias y Dolor',
    descripcion: 'Qué hacer de inmediato en casa ante fracturas dentales, golpes (traumatismos), dolor nocturno o inflamación antes de llegar a la consulta.',
    fileName: 'CADO_Guia_Primeros_Auxilios_Urgencias.pdf',
    tamano_kb: 138,
  },
  {
    id: 'guia-preparacion-ansiedad-bruxismo',
    titulo: 'Guía de Preparación sin Ansiedad y Alivio Mandibular (TTM)',
    categoria: 'Bienestar y Confort',
    descripcion: 'Ejercicios de respiración, autocuidado para el bruxismo y cómo aprovechar tu orientación virtual y preferencias de confort en CADO.',
    fileName: 'CADO_Guia_Preparacion_y_Confort_Dental.pdf',
    tamano_kb: 152,
  },
];

// Backend de catálogo y registro de descarga de guías clínicas PDF
export async function GET() {
  const { data, error } = await supabase
    .from('guias_clinicas')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    ok: true,
    source: !error && data && data.length > 0 ? 'supabase' : 'backend_catalog',
    data: !error && data && data.length > 0 ? data : GUIAS_CLINICAS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guiaId } = body;

    if (!guiaId) {
      return NextResponse.json({ ok: false, error: 'Se requiere guiaId' }, { status: 400 });
    }

    const { error } = await supabase.from('logs_auditoria').insert({
      accion: 'DESCARGA_GUIA_PDF',
      entidad: 'guias_clinicas',
      entidad_id: guiaId,
      detalle: `Descarga de guía clínica PDF (${guiaId})`,
    });

    return NextResponse.json({
      ok: true,
      guiaId,
      loggedInSupabase: !error,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
  }
}
