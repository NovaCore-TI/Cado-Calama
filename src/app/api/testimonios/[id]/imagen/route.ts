import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { AccessError, accessFailure, requireDoctor } from '@/lib/doctor-auth';
import { getServerDatabase } from '@/lib/server-db';
import { isUuid, TESTIMONIAL_BUCKET, TESTIMONIAL_IMAGE_WIDTHS, MAX_TESTIMONIAL_BYTES } from '@/lib/testimonials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new AccessError(404, 'Imagen no disponible.');
    const admin = request.nextUrl.searchParams.get('admin') === '1';
    const requestedWidth = request.nextUrl.searchParams.get('w');
    const width = requestedWidth === null ? 960 : TESTIMONIAL_IMAGE_WIDTHS.find(value => String(value) === requestedWidth);
    if (!admin && width === undefined) throw new AccessError(400, 'Tamaño de imagen no disponible.');
    const doctor = admin ? (await requireDoctor(request)).doctor : null;
    const db = getServerDatabase();
    let query = db.from('testimonios').select('object_path,content_type').eq('id', id);
    query = doctor ? query.eq('doctor_id', doctor.id) : query.eq('publicado', true);
    const { data, error } = await query.maybeSingle();
    if (error) throw new AccessError(503, 'No se pudo cargar la imagen.');
    if (!data) throw new AccessError(404, 'Imagen no disponible.');
    const result = await db.storage.from(TESTIMONIAL_BUCKET).download(data.object_path);
    if (result.error || !result.data || result.data.size > MAX_TESTIMONIAL_BYTES) {
      throw new AccessError(503, 'No se pudo cargar la imagen.');
    }
    const original = await result.data.arrayBuffer();
    // Every public variant checks publication above. A shared image cache could keep withdrawn images accessible.
    const body = admin ? original : new Uint8Array(await sharp(Buffer.from(original), { limitInputPixels: 24_000_000 })
      .autoOrient()
      .resize({ width, height: 4096, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer());
    return new NextResponse(body, {
      headers: {
        'Content-Type': admin ? data.content_type : 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) { return accessFailure(error); }
}
