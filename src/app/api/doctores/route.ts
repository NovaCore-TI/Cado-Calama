import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OFFICIAL_CADO_DOCTORS, type Doctor } from '@/lib/doctors-catalog';
import { getAllConnectedDoctorTokens, removeDoctorGoogleCredentials } from '@/lib/google-tokens-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connectedTokens = getAllConnectedDoctorTokens();

  // 1. Intentar leer doctores desde Supabase
  let dbDoctors: Partial<Doctor>[] = [];
  try {
    const { data } = await supabase
      .from('doctores')
      .select('*')
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      dbDoctors = data;
    }
  } catch {
    // Si falla Supabase, usamos el catálogo oficial
  }

  // 2. Fusionar catálogo base, datos de Supabase y tokens locales conectados
  const mergedDoctors: Doctor[] = OFFICIAL_CADO_DOCTORS.map((official) => {
    const fromDb = dbDoctors.find(
      (d) => d.id === official.id || d.email?.toLowerCase() === official.email.toLowerCase()
    );
    const tokenData = connectedTokens[official.id] || (fromDb?.id ? connectedTokens[fromDb.id] : null);

    const isConnected = Boolean(
      tokenData?.refreshToken || fromDb?.google_conectado || official.google_conectado
    );
    const googleEmail = tokenData?.email || fromDb?.google_email || null;

    return {
      ...official,
      id: official.id,
      nombre: official.nombre,
      email: official.email,
      rol: official.rol,
      google_conectado: isConnected,
      google_email: googleEmail,
      ultimo_acceso: tokenData?.connectedAt || fromDb?.ultimo_acceso || official.ultimo_acceso,
    };
  });

  return NextResponse.json({
    ok: true,
    data: mergedDoctors,
    count: mergedDoctors.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, doctorId } = body;

    if (action === 'desconectar' && doctorId) {
      await removeDoctorGoogleCredentials(doctorId);
      return NextResponse.json({
        ok: true,
        message: 'Cuenta de Google desvinculada exitosamente.',
      });
    }

    return NextResponse.json({ ok: false, error: 'Acción no soportada.' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }
}
