import { NextRequest, NextResponse } from 'next/server';
import { getPublicFaqs } from '@/lib/faqs';

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase().trim();
  const category = (request.nextUrl.searchParams.get('category') || 'todas').toLowerCase().trim();
  const { items, source } = await getPublicFaqs();
  const data = items.filter(item =>
    (category === 'todas' || item.category === category) &&
    (!q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)));
  return NextResponse.json({ ok: true, source, count: data.length, data });
}
