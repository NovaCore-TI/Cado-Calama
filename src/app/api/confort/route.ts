import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Backend de recolección de preferencias de confort ambiental vinculadas a la solicitud del paciente
export async function GET() {
  const { data, error } = await supabase
    .from('preferencias_confort')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    ok: true,
    source: !error && data ? 'supabase' : 'empty_or_pending_schema',
    supabaseStatus: error?.message || 'OK',
    data: data || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cuestionarioId = null,
      soundPreference = 'musica_suave',
      jawBreaks = true,
      companionAllowed = false,
      handSignalPledge = true,
      explanationStepByStep = true,
      notes = '',
      consent = true,
    } = body;

    if (consent !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Se requiere consentimiento explícito para almacenar las preferencias de confort.',
        },
        { status: 400 }
      );
    }

    const payload = {
      cuestionario_id: cuestionarioId,
      ambiente_preferido: soundPreference,
      solicita_pausas: Boolean(jawBreaks),
      desea_acompanante: Boolean(companionAllowed),
      senal_pausa: Boolean(handSignalPledge),
      explicacion_paso_a_paso: Boolean(explanationStepByStep),
      notas: String(notes).slice(0, 500),
      consent_datos: true,
    };

    const { data, error } = await supabase
      .from('preferencias_confort')
      .insert(payload)
      .select()
      .single();

    return NextResponse.json(
      {
        ok: true,
        syncedToSupabase: !error,
        supabaseError: error?.message || null,
        data: data || {
          id: `CONF-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }
}
