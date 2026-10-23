import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import {
  createGoogleAppointmentEvent,
  generateDirectGoogleCalendarUrl,
  cancelGoogleAppointmentEvent,
  rescheduleGoogleAppointmentEvent,
} from '@/lib/google-calendar';

// RF-10 a RF-16: Endpoints y lógica de negocio telemática
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo')?.trim().toUpperCase();
  const token = searchParams.get('token')?.trim();

  // Búsqueda específica por código o token para autogestión de pacientes (RF-14 & RF-15)
  if (codigo || token) {
    let query = supabase
      .from('orientaciones_citas')
      .select('*, cuestionarios_perfilamiento (*)');
    if (codigo) query = query.eq('codigo', codigo);
    if (token) query = query.eq('token_gestion', token);

    const { data: cita, error } = await query.maybeSingle();

    if (!cita) {
      return NextResponse.json(
        { ok: false, error: 'No encontramos ninguna orientación registrada con el código proporcionado.' },
        { status: 404 }
      );
    }

    const directCalendarUrl = generateDirectGoogleCalendarUrl({
      codigo: cita.codigo,
      fecha: cita.fecha,
      hora: cita.hora,
      patientName: cita.nombre_paciente,
      meetLink: cita.meet_link || '',
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...cita,
        googleCalendarUrl: directCalendarUrl,
        icsUrl: `/api/orientaciones/calendar?codigo=${cita.codigo}`,
      },
    });
  }

  const { data, error } = await supabase
    .from('orientaciones_citas')
    .select('*, cuestionarios_perfilamiento (*)')
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
          error: `El bloque horario seleccionado acaba de ser reservado por otro paciente. Por favor selecciona otro horario disponible.`,
          colision: true,
        },
        { status: 409 }
      );
    }

    const codigo = `CADO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const tokenGestion = crypto.randomBytes(16).toString('hex');

    // RF-13 & RF-16: Sincronización automatizada con Google Calendar & Meet
    const googleSync = await createGoogleAppointmentEvent({
      codigo,
      fecha: date,
      hora: time,
      patientName: patientName.trim(),
      patientEmail: email.trim(),
      patientPhone: phone.trim(),
      comfortProfile,
    });

    const meetLink = googleSync.meetLink;
    const calendarEventId = googleSync.eventId;
    const directCalendarUrl = generateDirectGoogleCalendarUrl({
      codigo,
      fecha: date,
      hora: time,
      patientName: patientName.trim(),
      meetLink,
    });

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
        calendar_event_id: calendarEventId,
        estado_sync: googleSync.status || 'Sincronizado',
        intentos_sync: 0,
      })
      .select()
      .single();

    return NextResponse.json(
      {
        ok: true,
        syncedToSupabase: !error,
        supabaseError: error?.message || null,
        googleCalendarUrl: directCalendarUrl,
        calendarEventId: calendarEventId,
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
      action,
      motivo = '',
    } = body;

    const targetCodigo = codigo || id;
    if (!targetCodigo && !tokenGestion) {
      return NextResponse.json(
        { ok: false, error: 'Se requiere id, código de cita o token de gestión para modificar la orientación.' },
        { status: 400 }
      );
    }

    const cleanCodigo = targetCodigo ? String(targetCodigo).trim().toUpperCase() : null;

    // Obtener la cita actual
    let fetchQuery = supabase.from('orientaciones_citas').select('*');
    if (cleanCodigo) fetchQuery = fetchQuery.eq('codigo', cleanCodigo);
    else if (tokenGestion) fetchQuery = fetchQuery.eq('token_gestion', tokenGestion);

    const { data: citaActual, error: errorFetch } = await fetchQuery.maybeSingle();

    if (errorFetch || !citaActual) {
      return NextResponse.json(
        { ok: false, error: `No se encontró ninguna cita registrada con los datos proporcionados.` },
        { status: 404 }
      );
    }

    // ACCIÓN: CANCELAR (RF-14)
    if (action === 'cancelar' || nuevoEstado === 'Cancelada') {
      if (citaActual.estado_atencion === 'Cancelada') {
        return NextResponse.json(
          { ok: false, error: 'Esta cita ya se encuentra cancelada.' },
          { status: 400 }
        );
      }

      const { data: updatedCita, error: errorUpdate } = await supabase
        .from('orientaciones_citas')
        .update({
          estado_atencion: 'Cancelada',
          notas_derivacion: motivo || notas || 'Cancelada por paciente',
          updated_at: new Date().toISOString(),
        })
        .eq('id', citaActual.id)
        .select()
        .single();

      if (errorUpdate) {
        return NextResponse.json({ ok: false, error: errorUpdate.message }, { status: 500 });
      }

      // RF-13 & RF-16: Cancelar evento en Google Calendar si existe
      if (citaActual.calendar_event_id) {
        cancelGoogleAppointmentEvent({
          eventId: citaActual.calendar_event_id,
          doctorId: citaActual.doctor_id,
          reason: motivo || notas,
        }).catch((err) => console.warn('[orientaciones/cancelar] Error en Google Calendar:', err));
      }

      // Registro de auditoría
      supabase
        .from('logs_auditoria')
        .insert({
          accion: 'CANCELACION_CITA_AUTOGESTION',
          entidad: 'orientaciones_citas',
          entidad_id: citaActual.codigo,
          detalle: `Cancelación por autogestión de paciente. Motivo: ${motivo || notas || 'No especificado'}`,
          ip_origen: request.headers.get('x-forwarded-for') || '127.0.0.1',
        })
        .then(() => {}, () => {});

      return NextResponse.json({
        ok: true,
        message: 'Tu orientación ha sido cancelada exitosamente y el cupo ha sido liberado.',
        data: updatedCita,
      });
    }

    // ACCIÓN: REPROGRAMAR ATÓMICAMENTE (RF-15)
    if (action === 'reprogramar' || (nuevaFecha && nuevaHora)) {
      if (!nuevaFecha || !nuevaHora) {
        return NextResponse.json(
          { ok: false, error: 'Debes proporcionar la nueva fecha y hora para reprogramar.' },
          { status: 400 }
        );
      }

      if (citaActual.estado_atencion === 'Cancelada') {
        return NextResponse.json(
          { ok: false, error: 'No es posible reprogramar una cita que ya fue cancelada.' },
          { status: 400 }
        );
      }

      const formattedNewHour = String(nuevaHora).slice(0, 5);

      // Verificación de colisión en el nuevo bloque (RF-15: sin perder la cita vigente si colisiona)
      const { data: conflicto } = await supabase
        .from('orientaciones_citas')
        .select('id, codigo')
        .eq('fecha', nuevaFecha)
        .eq('hora', formattedNewHour)
        .eq('estado_atencion', 'Programada')
        .neq('id', citaActual.id)
        .maybeSingle();

      if (conflicto) {
        return NextResponse.json(
          {
            ok: false,
            error: `El bloque del ${nuevaFecha} a las ${formattedNewHour} ya fue tomado. Tu cita original del ${citaActual.fecha} a las ${citaActual.hora} se mantiene 100% activa.`,
          },
          { status: 409 }
        );
      }

      const { data: reprogramada, error: errorReprog } = await supabase
        .from('orientaciones_citas')
        .update({
          fecha: nuevaFecha,
          hora: formattedNewHour,
          estado_atencion: 'Programada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', citaActual.id)
        .select()
        .single();

      if (errorReprog) {
        return NextResponse.json({ ok: false, error: errorReprog.message }, { status: 500 });
      }

      // RF-13 & RF-16: Sincronizar nueva fecha y hora en Google Calendar si existe evento
      if (citaActual.calendar_event_id) {
        rescheduleGoogleAppointmentEvent({
          eventId: citaActual.calendar_event_id,
          doctorId: citaActual.doctor_id,
          nuevaFecha,
          nuevaHora: formattedNewHour,
        }).catch((err) => console.warn('[orientaciones/reprogramar] Error en Google Calendar:', err));
      }

      // Registro de auditoría
      supabase
        .from('logs_auditoria')
        .insert({
          accion: 'REPROGRAMACION_CITA_AUTOGESTION',
          entidad: 'orientaciones_citas',
          entidad_id: citaActual.codigo,
          detalle: `Reprogramada de ${citaActual.fecha} ${citaActual.hora} a ${nuevaFecha} ${formattedNewHour}`,
          ip_origen: request.headers.get('x-forwarded-for') || '127.0.0.1',
        })
        .then(() => {}, () => {});

      return NextResponse.json({
        ok: true,
        message: 'Tu orientación ha sido reprogramada exitosamente.',
        data: reprogramada,
      });
    }

    return NextResponse.json({ ok: false, error: 'Acción no soportada. Usa cancelar o reprogramar.' }, { status: 400 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error procesando modificación';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
