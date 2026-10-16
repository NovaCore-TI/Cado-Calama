import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Backend de vinculación de reserva telemática con cuestionario y confort (sin RUT)
export async function GET() {
  const { data, error } = await supabase
    .from('orientaciones_citas')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    ok: true,
    source: !error && data ? 'supabase' : 'local_fallback',
    supabaseStatus: error?.message || 'OK',
    data: data || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientName,
      email,
      phone,
      date,
      time,
      consent,
      cuestionarioId = null,
      comfortProfile = {},
    } = body;

    // Rechazar estrictamente si se intenta enviar RUT por política de minimización de datos
    if ('rut' in body || 'RUT' in body) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Por política de minimización de datos, no se solicita ni almacena el RUT en reservas telemáticas.',
        },
        { status: 400 }
      );
    }

    if (!patientName?.trim() || !email?.trim() || !phone?.trim() || !date || !time) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Nombre completo, correo electrónico, teléfono, fecha y bloque horario son obligatorios.',
        },
        { status: 400 }
      );
    }

    if (consent !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Debe aceptar el consentimiento informado de privacidad para vincular sus respuestas a la reserva.',
        },
        { status: 400 }
      );
    }

    const codigo = `CADO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const { data: paciente } = await supabase
      .from('pacientes')
      .insert({
        nombre_completo: patientName.trim(),
        email: email.trim(),
        telefono: phone.trim(),
      })
      .select('id')
      .single();

    const { data: cita, error } = await supabase
      .from('orientaciones_citas')
      .insert({
        codigo,
        paciente_id: paciente?.id || null,
        cuestionario_id: cuestionarioId,
        nombre_paciente: patientName.trim(),
        email_paciente: email.trim(),
        telefono_paciente: phone.trim(),
        fecha: date,
        hora: time,
        preferencias_confort: comfortProfile,
        estado_atencion: 'Programada',
        estado_derivacion: 'Sin derivación',
        meet_link: `https://meet.google.com/cado-${codigo.toLowerCase()}`,
        estado_sync: 'Sincronizado',
      })
      .select()
      .single();

    return NextResponse.json(
      {
        ok: true,
        syncedToSupabase: !error,
        supabaseError: error?.message || null,
        data: cita || {
          codigo,
          nombre_paciente: patientName.trim(),
          email_paciente: email.trim(),
          telefono_paciente: phone.trim(),
          fecha: date,
          hora: time,
          preferencias_confort: comfortProfile,
          estado_atencion: 'Programada',
          meet_link: `https://meet.google.com/cado-${codigo.toLowerCase()}`,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }
}
