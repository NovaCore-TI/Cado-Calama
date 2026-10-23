import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// RF-17 y RF-18: Estado y capacidades del servicio de autenticación clínica
export async function GET() {
  try {
    const { data, error } = await supabase.auth.getSession();

    return NextResponse.json({
      ok: true,
      service: 'Supabase Auth (CADO Odontología)',
      features: {
        rf17: {
          name: 'Autenticación segura con bloqueo temporal tras intentos fallidos repetidos',
          encryption: 'Bcrypt + JWT (JSON Web Tokens)',
          maxFailedAttempts: 5,
          lockoutDurationMinutes: 15,
          genericErrorMessage: 'Mensaje genérico sin revelación de existencia de cuentas',
        },
        rf18: {
          name: 'Protección de rutas administrativas, cierre voluntario y caducidad por inactividad',
          inactivityTimeoutMinutes: 30,
          voluntaryLogout: true,
          protectedRoutes: ['/admin', '/admin/*'],
        },
      },
      supabaseAuthActive: !error,
      hasActiveSession: Boolean(data?.session),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      { ok: false, error: 'No fue posible consultar el estado de autenticación', details: errorMessage },
      { status: 500 }
    );
  }
}
