import { NextResponse } from 'next/server';
import { savPaymentConfiguration } from '@/lib/sav-payment';

export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ ok: true, ...savPaymentConfiguration() }, { headers: { 'Cache-Control': 'no-store' } });
}
