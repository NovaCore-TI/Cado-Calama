import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeAndSaveDoctorTokens } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const doctorId = searchParams.get('state') || '';
  const error = searchParams.get('error');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (error) {
    return NextResponse.redirect(`${appUrl}/admin?google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !doctorId) {
    return NextResponse.redirect(`${appUrl}/admin?google_error=missing_code_or_doctor`);
  }

  try {
    const { googleEmail } = await exchangeCodeAndSaveDoctorTokens(code, doctorId, redirectUri);
    return NextResponse.redirect(
      `${appUrl}/admin?google_success=true&email=${encodeURIComponent(googleEmail)}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `${appUrl}/admin?google_error=${encodeURIComponent(message)}`
    );
  }
}
