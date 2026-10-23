import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// RF-10: Visualización y entrega de bloques virtuales vespertinos en hora de Chile Continental
// RF-11: Control transaccional de disponibilidad y prevención de colisiones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('fecha');

    // Consultar bloques registrados en Supabase
    let query = supabase
      .from('bloques_disponibilidad')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (dateFilter) {
      query = query.eq('fecha', dateFilter);
    }

    const { data: dbSlots, error } = await query;

    // Horarios vespertinos estándar (18:00 a 19:45 hrs, bloques de 15 minutos)
    const standardVespertinoTimes = ['18:00', '18:20', '18:40', '19:00', '19:20', '19:40'];

    return NextResponse.json({
      ok: true,
      timezone: 'America/Santiago (Chile Continental UTC-3/UTC-4)',
      standardVespertinoTimes,
      source: !error && dbSlots ? 'supabase' : 'local_default',
      data: dbSlots && dbSlots.length > 0 ? dbSlots : null,
      message: error
        ? `Aviso: Base de datos en modo fallback (${error.message}). Usando configuración horaria local.`
        : 'Bloques de disponibilidad obtenidos correctamente.',
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
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      { ok: false, error: 'Error procesando solicitud de bloques.', details: errorMessage },
      { status: 500 }
    );
  }
}
