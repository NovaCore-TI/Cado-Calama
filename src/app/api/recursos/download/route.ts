import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

// Allowlist estricto de guías clínicas oficiales para prevenir Path Traversal
const ALLOWED_FILES: Record<string, { id: string; title: string; fileName: string }> = {
  'cado_guia_cuidados_post_exodoncia.pdf': {
    id: 'guia-post-exodoncia',
    title: 'Cuidados Posteriores a una Extracción Dental (Exodoncia)',
    fileName: 'CADO_Guia_Cuidados_Post_Exodoncia.pdf',
  },
  'cado_guia_primeros_auxilios_urgencias.pdf': {
    id: 'guia-primeros-auxilios-urgencias',
    title: 'Primeros Auxilios ante Urgencias Dentales y Dolor Agudo',
    fileName: 'CADO_Guia_Primeros_Auxilios_Urgencias.pdf',
  },
  'cado_guia_preparacion_y_confort_dental.pdf': {
    id: 'guia-preparacion-ansiedad-bruxismo',
    title: 'Guía de Preparación sin Ansiedad y Alivio Mandibular (TTM)',
    fileName: 'CADO_Guia_Preparacion_y_Confort_Dental.pdf',
  },
  'guia-post-exodoncia': {
    id: 'guia-post-exodoncia',
    title: 'Cuidados Posteriores a una Extracción Dental (Exodoncia)',
    fileName: 'CADO_Guia_Cuidados_Post_Exodoncia.pdf',
  },
  'guia-primeros-auxilios-urgencias': {
    id: 'guia-primeros-auxilios-urgencias',
    title: 'Primeros Auxilios ante Urgencias Dentales y Dolor Agudo',
    fileName: 'CADO_Guia_Primeros_Auxilios_Urgencias.pdf',
  },
  'guia-preparacion-ansiedad-bruxismo': {
    id: 'guia-preparacion-ansiedad-bruxismo',
    title: 'Guía de Preparación sin Ansiedad y Alivio Mandibular (TTM)',
    fileName: 'CADO_Guia_Preparacion_y_Confort_Dental.pdf',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileKey = (searchParams.get('file') || searchParams.get('id') || '').toLowerCase().trim();

  const guide = ALLOWED_FILES[fileKey];
  if (!guide) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Guía clínica no encontrada o parámetro inválido.',
        guías_disponibles: Object.values(ALLOWED_FILES).map((g) => g.fileName),
      },
      { status: 404 }
    );
  }

  const filePath = path.join(process.cwd(), 'public', 'guias', guide.fileName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: 'El archivo físico PDF no se encuentra en el servidor.' },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Registro asíncrono de auditoría en Supabase
    Promise.resolve(
      supabase.from('logs_auditoria').insert({
        accion: 'DESCARGA_GUIA_PDF_DIRECTA',
        entidad: 'guias_clinicas',
        entidad_id: guide.id,
        detalle: `Descarga de guía oficial: ${guide.fileName}`,
        ip_origen: request.headers.get('x-forwarded-for') || '127.0.0.1',
      })
    ).catch(() => {});

    // Retornar archivo binario con headers de descarga forzada para móviles y escritorios
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${guide.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Error interno al procesar el archivo PDF.' },
      { status: 500 }
    );
  }
}
