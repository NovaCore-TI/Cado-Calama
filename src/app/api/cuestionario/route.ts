import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NIVELES_VALIDOS = [
  'Me siento tranquilo/a',
  'Tengo algunas inquietudes',
  'Me cuesta dar este paso',
  'Prefiero no responder',
];

// SCRUM-51 (RF-06), SCRUM-57 (RF-08), SCRUM-60 (RF-09):
// Backend Cuestionario de perfilamiento, validación de campos sensibles ("Prefiero no responder") y consentimiento obligatorio Ley 19.628
export async function GET() {
  const { data, error } = await supabase
    .from('cuestionarios_perfilamiento')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    ok: true,
    rfs: ['RF-06', 'RF-08', 'RF-09'],
    jiraKeys: ['SCRUM-51', 'SCRUM-57', 'SCRUM-60'],
    source: !error && data ? 'supabase' : 'empty_or_pending_schema',
    supabaseStatus: error?.message || 'OK',
    data: data || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reason,
      feeling,
      previousExperience = 'Prefiero no responder',
      painSensitivity = 'Prefiero no responder',
      communicationPreference = 'Explicación paso a paso con lenguaje sencillo',
      consent,
    } = body;

    // RF-08 (SCRUM-57): Validación estricta de campos obligatorios sin bloquear "Prefiero no responder" en sensibles
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json(
        {
          ok: false,
          rf: 'RF-08',
          field: 'reason',
          error: 'El motivo general de consulta es obligatorio (mínimo 3 caracteres).',
        },
        { status: 400 }
      );
    }

    if (!feeling || !NIVELES_VALIDOS.includes(feeling)) {
      return NextResponse.json(
        {
          ok: false,
          rf: 'RF-08',
          field: 'feeling',
          error: 'Debes seleccionar una opción válida o «Prefiero no responder».',
        },
        { status: 400 }
      );
    }

    // RF-09 (SCRUM-60): Exigir aceptación explícita de consentimiento informado de privacidad (Ley 19.628 y 20.584)
    if (consent !== true) {
      return NextResponse.json(
        {
          ok: false,
          rf: 'RF-09',
          field: 'consent',
          error: 'Debes aceptar explícitamente el consentimiento informado de privacidad para almacenar tus respuestas.',
        },
        { status: 400 }
      );
    }

    const payload = {
      motivo_consulta: reason.trim().slice(0, 255),
      nivel_temor: feeling,
      respuestas_adicionales: {
        previousExperience: previousExperience || 'Prefiero no responder',
        painSensitivity: painSensitivity || 'Prefiero no responder',
        communicationPreference: communicationPreference || 'Prefiero no responder',
        alcanceAviso: 'Este cuestionario es orientativo y no constituye un diagnóstico médico ni presupuesto clínico.',
      },
      consentimiento_privacidad: true,
    };

    const { data, error } = await supabase
      .from('cuestionarios_perfilamiento')
      .insert(payload)
      .select()
      .single();

    return NextResponse.json(
      {
        ok: true,
        rfs: ['RF-06', 'RF-08', 'RF-09'],
        jiraKeys: ['SCRUM-51', 'SCRUM-57', 'SCRUM-60'],
        syncedToSupabase: !error,
        supabaseError: error?.message || null,
        disclaimer: 'El cuestionario no entrega diagnósticos ni presupuestos clínicos.',
        data: data || {
          id: `Q-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          ...payload,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Formato JSON inválido.' }, { status: 400 });
  }
}
