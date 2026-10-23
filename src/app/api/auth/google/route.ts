import { NextRequest, NextResponse } from 'next/server';
import { getDoctorGoogleAuthUrl } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctorId') || 'default';

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const redirectUri = `${origin}/api/auth/google/callback`;

  const authUrl = getDoctorGoogleAuthUrl(doctorId, redirectUri);

  if (!authUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Las credenciales GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no están configuradas en las variables de entorno.',
        instrucciones:
          'Crea un proyecto en Google Cloud Console, habilita Google Calendar API, genera credenciales OAuth Web y colócalas en tu archivo .env.local.',
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(authUrl);
}
