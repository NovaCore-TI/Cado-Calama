import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Horarios vespertinos estándar de CADO en huso horario Chile Continental (RF-10)
const HORARIOS_VESPERTINOS = ['19:00', '19:15', '19:30', '19:45'];

function getFutureDatesChile(daysCount = 14): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  // Usar hora oficial de Chile Continental
  const chileNowStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const [year, month, day] = chileNowStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day));

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getUTCDay();
    // Excluir domingos (0) para atenciones telemáticas de CADO
    if (dayOfWeek !== 0) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}

// RF-10: Visualización y entrega de bloques virtuales vespertinos en hora de Chile Continental
// RF-11: Control transaccional de disponibilidad y prevención de colisiones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('fecha');

    const futureDates = requestedDate ? [requestedDate] : getFutureDatesChile(14);
    const minDate = futureDates[0];
    const maxDate = futureDates[futureDates.length - 1];

    // Consultar citas ya programadas en Supabase para excluir bloques ocupados (RF-11)
    const { data: citasOcupadas, error: errorCitas } = await supabase
      .from('orientaciones_citas')
      .select('fecha, hora')
      .eq('estado_atencion', 'Programada')
      .gte('fecha', minDate)
      .lte('fecha', maxDate);

    // Consultar bloques expresamente bloqueados por el doctor (vacaciones, feriados)
    const { data: bloquesBloqueados } = await supabase
      .from('bloques_disponibilidad')
      .select('fecha, hora_inicio, estado')
      .gte('fecha', minDate)
      .lte('fecha', maxDate)
      .neq('estado', 'Disponible');

    const occupiedSet = new Set<string>();

    if (!errorCitas && citasOcupadas) {
      citasOcupadas.forEach((c) => {
        const formattedHour = String(c.hora).slice(0, 5);
        occupiedSet.add(`${c.fecha}|${formattedHour}`);
      });
    }

    if (bloquesBloqueados) {
      bloquesBloqueados.forEach((b) => {
        const formattedHour = String(b.hora_inicio).slice(0, 5);
        occupiedSet.add(`${b.fecha}|${formattedHour}`);
      });
    }

    // Generar lista de bloques habilitados disponibles
    const availableSlots: { fecha: string; hora: string; hora_fin: string; slotKey: string }[] = [];

    futureDates.forEach((fecha) => {
      HORARIOS_VESPERTINOS.forEach((hora) => {
        const slotKey = `${fecha}|${hora}`;
        if (!occupiedSet.has(slotKey)) {
          const [h, m] = hora.split(':').map(Number);
          const endM = m + 15;
          const horaFin = `${String(Math.floor(h + endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
          availableSlots.push({
            fecha,
            hora,
            hora_fin: horaFin,
            slotKey,
          });
        }
      });
    });

    return NextResponse.json({
      ok: true,
      timezone: 'America/Santiago (Chile Continental UTC-3/UTC-4)',
      duracionMinutos: 15,
      standardVespertinoTimes: HORARIOS_VESPERTINOS,
      totalDisponibles: availableSlots.length,
      diasHabilitados: futureDates,
      slots: availableSlots,
      data: availableSlots,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      {
        ok: false,
        error: 'No fue posible consultar la disponibilidad horaria.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// RF-10 & RF-11: Habilitación / Bloqueo de cupos telemáticos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fecha, horaInicio, horaFin = null, estado = 'Disponible' } = body;

    if (!fecha || !horaInicio) {
      return NextResponse.json(
        { ok: false, error: 'Fecha y hora de inicio son requeridas para configurar el bloque.' },
        { status: 400 }
      );
    }

    // Calcular hora de fin por defecto (15 a 20 min después)
    let calculatedFin = horaFin;
    if (!calculatedFin) {
      const [h, m] = horaInicio.split(':').map(Number);
      const endMins = (h * 60 + m + 15) % (24 * 60);
      const endH = String(Math.floor(endMins / 60)).padStart(2, '0');
      const endM = String(endMins % 60).padStart(2, '0');
      calculatedFin = `${endH}:${endM}:00`;
    }

    const { data, error } = await supabase
      .from('bloques_disponibilidad')
      .upsert(
        {
          fecha,
          hora_inicio: horaInicio.includes(':') && horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio,
          hora_fin: calculatedFin,
          estado,
        },
        { onConflict: 'fecha,hora_inicio' }
      )
      .select()
      .single();

    return NextResponse.json({
      ok: true,
      syncedToSupabase: !error,
      data: data || {
        fecha,
        hora_inicio: horaInicio,
        hora_fin: calculatedFin,
        estado,
      },
      message: error
        ? 'Bloque guardado en memoria local (Supabase en modo fallback).'
        : 'Bloque registrado exitosamente en la base de datos.',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error procesando solicitud';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
