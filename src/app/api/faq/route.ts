import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_FAQS, filterFaqs, type FAQItem } from '@/lib/faqs';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const category = request.nextUrl.searchParams.get('category')?.toLowerCase().trim() || 'todas';
  if (q.length > 160 || !['todas', 'miedo', 'vespertino', 'dentalink', 'procedimientos'].includes(category))
    return NextResponse.json({ ok: false, error: 'Revisa la búsqueda o categoría.' }, { status: 400 });
  let items = DEFAULT_FAQS;
  let source = 'fallback';
  try {
    const { data, error } = await supabase.from('preguntas_frecuentes')
      .select('id,categoria,pregunta,respuesta').eq('activo', true).order('orden', { ascending: true });
    if (!error && Array.isArray(data)) {
      items = data.map(row => ({ id: row.id, category: row.categoria, q: row.pregunta, a: row.respuesta })) as FAQItem[];
      source = 'supabase';
    }
  } catch { /* The same general catalogue remains searchable during an outage. */ }
  const data = filterFaqs(items, q, category);
  return NextResponse.json({ ok: true, source, count: data.length, data });
}
