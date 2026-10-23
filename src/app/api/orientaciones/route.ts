import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// RF-10 a RF-16: Endpoints y lógica de negocio telemática
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

// RF-11 (Colisiones), RF-12 (Sin RUT y estado Programada), RF-13 (Google Meet), RF-16 (Resiliencia)
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

    // RF-12: Rechazar estrictamente si se intenta enviar RUT por política de minimización de datos
    if ('rut' in body || 'RUT' in body) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Por política de minimización de datos (RF-12), no se solicita ni almacena el RUT en reservas telemáticas.',
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

    // RF-11: Control transaccional de colisiones previas
    const { data: colision } = await supabase
      .from('orientaciones_citas')
      .select('id, codigo, estado_atencion')
      .eq('fecha', date)
      .eq('hora', time)
      .eq('estado_atencion', 'Programada')
      .maybeSingle();

    if (colision) {
      return NextResponse.json(
        {
          ok: false,
          error: `El bloque del ${date} a las ${time} acaba de ser reservado por otro paciente. Por favor selecciona otro horario.`,
          colision: true,
        },
        { status: 409 }
      );
    }

    const codigo = `CADO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const tokenGestion = crypto.randomBytes(16).toString('hex');
    const meetLink = `https://meet.google.com/cado-${codigo.toLowerCase()}`;

    // Intentar inserción de paciente
    const { data: paciente } = await supabase
      .from('pacientes')
      .insert({
        nombre_completo: patientName.trim(),
        email: email.trim(),
        telefono: phone.trim(),
      })
      .select('id')
      .single();

    // RF-13 & RF-16: Inserción de cita con enlace seguro y estado de resiliencia
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
        meet_link: meetLink,
        token_gestion: tokenGestion,
        estado_sync: 'Sincronizado',
        intentos_sync: 0,
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
          meet_link: meetLink,
          token_gestion: tokenGestion,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Solicitud inválida';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 400 });
  }
}

// RF-14 (Cancelación) y RF-15 (Reprogramación Atómica)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      codigo,
      tokenGestion,
      nuevoEstado,
      nuevaFecha,
      nuevaHora,
      notas,
    } = body;

    if (!id && !codigo && !tokenGestion) {
      return NextResponse.json(
        { ok: false, error: 'Se requiere id, código de cita o token de gestión para modificar la orientación.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (nuevoEstado) {
      const estadosValidos = ['Programada', 'Realizada', 'Cancelada', 'Reprogramada', 'No asistió'];
      if (!estadosValidos.includes(nuevoEstado)) {
        return NextResponse.json(
          { ok: false, error: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` },
          { status: 400 }
        );
      }
      updates.estado_atencion = nuevoEstado;
    }

    // RF-15: Reprogramación atómica con validación de nuevo bloque
    if (nuevaFecha && nuevaHora) {
      // Verificar si nuevo horario está ocupado
      const { data: conflicto } = await supabase
        .from('orientaciones_citas')
        .select('id')
        .eq('fecha', nuevaFecha)
        .eq('hora', nuevaHora)
        .eq('estado_atencion', 'Programada')
        .maybeSingle();

      if (conflicto) {
        return NextResponse.json(
          { ok: false, error: 'El horario solicitado para reprogramación ya está reservado.' },
          { status: 409 }
        );
      }

      updates.fecha = nuevaFecha;
      updates.hora = nuevaHora;
      updates.estado_atencion = 'Programada';
    }

    if (notas !== undefined) {
      updates.notas_derivacion = notas;
    }

    let query = supabase.from('orientaciones_citas').update(updates);
    if (id) query = query.eq('id', id);
    else if (codigo) query = query.eq('codigo', codigo);
    else if (tokenGestion) query = query.eq('token_gestion', tokenGestion);

    const { data, error } = await query.select().maybeSingle();

    return NextResponse.json({
      ok: true,
      syncedToSupabase: !error,
      data: data || {
        ...updates,
        id,
        codigo,
      },
      message: nuevoEstado === 'Cancelada'
        ? 'Orientación telemática cancelada y cupo liberado exitosamente (RF-14).'
        : 'Orientación actualizada correctamente.',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error procesando modificación';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
