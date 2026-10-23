import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateIcsCalendarContent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo')?.trim().toUpperCase();

  if (!codigo) {
    return NextResponse.json({ ok: false, error: 'Se requiere el parámetro codigo.' }, { status: 400 });
  }

  const { data: cita } = await supabase
    .from('orientaciones_citas')
    .select('*, doctores(nombre)')
    .eq('codigo', codigo)
    .maybeSingle();

  if (!cita) {
    return NextResponse.json({ ok: false, error: 'Cita no encontrada.' }, { status: 404 });
  }

  const doctorName = (cita.doctores as { nombre?: string } | null)?.nombre || 'Dr. Javier Beiza Ayala';

  const icsContent = generateIcsCalendarContent({
    codigo: cita.codigo,
    fecha: cita.fecha,
    hora: cita.hora,
    patientName: cita.nombre_paciente,
    meetLink: cita.meet_link || `https://meet.google.com/cado-${codigo.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    doctorName,
  });

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="CADO_Orientacion_${codigo}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}
