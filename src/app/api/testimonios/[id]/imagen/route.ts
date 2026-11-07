import { NextRequest, NextResponse } from 'next/server';
import { AccessError, accessFailure, requireDoctor } from '@/lib/doctor-auth';
import { getServerDatabase } from '@/lib/server-db';
import { isUuid, TESTIMONIAL_BUCKET } from '@/lib/testimonials';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new AccessError(404, 'Imagen no disponible.');
    const admin = request.nextUrl.searchParams.get('admin') === '1';
    const doctor = admin ? (await requireDoctor(request)).doctor : null;
    const db = getServerDatabase();
    let query = db.from('testimonios').select('object_path,content_type').eq('id', id);
    query = doctor ? query.eq('doctor_id', doctor.id) : query.eq('publicado', true);
    const { data, error } = await query.maybeSingle();
    if (error) throw new AccessError(503, 'No se pudo cargar la imagen.');
    if (!data) throw new AccessError(404, 'Imagen no disponible.');
    const result = await db.storage.from(TESTIMONIAL_BUCKET).download(data.object_path);
    if (result.error || !result.data) throw new AccessError(503, 'No se pudo cargar la imagen.');
    return new NextResponse(await result.data.arrayBuffer(), { headers: { 'Content-Type': data.content_type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
  } catch (error) { return accessFailure(error); }
}
