import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SEED_ARTICLES = [
  {
    id: 'b-seed-1',
    titulo: 'Cómo superar el miedo al dentista paso a paso en Calama',
    slug: 'como-superar-miedo-al-dentista-calama',
    categoria: 'Miedo Dental',
    resumen: 'Descubre cómo las pausas acordadas, el control del ambiente y una orientación telemática previa ayudan a recuperar la tranquilidad antes de ir a consulta.',
    cuerpo: 'Sentir ansiedad o temor antes de asistir a una consulta odontológica es mucho más común de lo que imaginas. En CADO Odontología entendemos que cada persona vive sus tiempos de manera diferente.\n\n1. Conversar antes de abrir la boca: La orientación virtual de 15 minutos permite conocer al Dr. Javier Beiza desde un lugar seguro.\n2. Señal de parada en todo momento: Acordamos un gesto con tu mano para detener cualquier procedimiento.\n3. Ambiente adaptado a ti: Música suave, silencio o explicación paso a paso.',
    autor_nombre: 'Dr. Javier Beiza Ayala',
    tiempo_lectura: '3 min de lectura',
    publicado: true,
    created_at: '2026-10-14T12:00:00Z',
  },
  {
    id: 'b-seed-2',
    titulo: 'Bruxismo y tensión mandibular: señales de alerta y alivio inicial',
    slug: 'bruxismo-tension-mandibular-senales-alivio',
    categoria: 'Bruxismo',
    resumen: '¿Despiertas con dolor en la mandíbula o sensibilidad dental? Conoce las causas frecuentes de los trastornos temporomandibulares (TTM) y qué medidas suaves puedes aplicar.',
    cuerpo: 'El bruxismo y los Trastornos Temporomandibulares (TTM) suelen intensificarse en períodos de alto estrés o turnos laborales exigentes como ocurre frecuentemente en Calama.\n\nLas principales señales incluyen rigidez al despertar, dolor cerca del oído al masticar y desgaste dental progresivo.',
    autor_nombre: 'Dr. Javier Beiza Ayala',
    tiempo_lectura: '4 min de lectura',
    publicado: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'b-seed-3',
    titulo: 'Cuidados esenciales después de una extracción dental (Exodoncia)',
    slug: 'cuidados-despues-de-extraccion-dental',
    categoria: 'Cuidados',
    resumen: 'Guía práctica para las primeras 48 horas tras una exodoncia: alimentación, higiene segura y cuándo comunicarte con la clínica.',
    cuerpo: 'Las primeras 24 a 48 horas posteriores a una extracción dental son clave para proteger el coágulo sanguíneo y asegurar una cicatrización cómoda.\n\nMantén la gasa presionada suavemente por 30-45 minutos, evita escupir con fuerza o usar bombillas y prefiere alimentos blandos y tibios o fríos.',
    autor_nombre: 'Dr. Javier Beiza Ayala',
    tiempo_lectura: '3 min de lectura',
    publicado: true,
    created_at: '2026-10-10T12:00:00Z',
  },
];

// Backend de publicación cronológica y lectura individual de artículos del blog
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const categoria = searchParams.get('categoria');

  let query = supabase
    .from('articulos_blog')
    .select('*')
    .eq('publicado', true)
    .order('created_at', { ascending: false });

  if (slug) {
    query = query.eq('slug', slug);
  }
  if (categoria && categoria !== 'Todos') {
    query = query.eq('categoria', categoria);
  }

  const { data, error } = await query;

  if (!error && data && data.length > 0) {
    return NextResponse.json({
      ok: true,
      source: 'supabase',
      count: data.length,
      data,
    });
  }

  let fallback = [...SEED_ARTICLES];
  if (slug) fallback = fallback.filter((a) => a.slug === slug);
  if (categoria && categoria !== 'Todos') fallback = fallback.filter((a) => a.categoria === categoria);

  return NextResponse.json({
    ok: true,
    source: error ? 'supabase_fallback_seed' : 'supabase_empty_seed',
    supabaseStatus: error?.message || 'OK',
    count: fallback.length,
    data: fallback,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { titulo, categoria = 'Cuidados', resumen, cuerpo, publicado = false } = body;

    if (!titulo || !cuerpo) {
      return NextResponse.json(
        { ok: false, error: 'El título y el cuerpo del artículo son obligatorios.' },
        { status: 400 }
      );
    }

    const slug = titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const payload = {
      titulo: titulo.trim(),
      slug,
      categoria,
      resumen: resumen?.trim() || `${cuerpo.trim().slice(0, 140)}...`,
      cuerpo: cuerpo.trim(),
      autor_nombre: 'Dr. Javier Beiza Ayala',
      tiempo_lectura: `${Math.max(2, Math.ceil(cuerpo.trim().split(/\s+/).length / 180))} min de lectura`,
      publicado: Boolean(publicado),
      estado_publicacion: publicado ? 'Publicado' : 'Borrador',
    };

    const { data, error } = await supabase.from('articulos_blog').insert(payload).select().single();

    return NextResponse.json(
      {
        ok: true,
        syncedToSupabase: !error,
        supabaseError: error?.message || null,
        data: data || { id: `local-${Date.now()}`, ...payload, created_at: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud JSON inválida.' }, { status: 400 });
  }
}
