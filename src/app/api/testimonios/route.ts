import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { AccessError, accessFailure, privateJson, requireDoctor } from '@/lib/doctor-auth';
import { getServerDatabase } from '@/lib/server-db';
import { CLINIC } from '@/lib/clinic';
import { googleReviewUrl, isUuid, MAX_TESTIMONIAL_BYTES, TESTIMONIAL_BUCKET, TESTIMONIAL_FIELDS, testimonialImageType } from '@/lib/testimonials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = request.nextUrl.searchParams.get('admin') === '1';
    const doctor = admin ? (await requireDoctor(request)).doctor : null;
    let query = getServerDatabase().from('testimonios').select(TESTIMONIAL_FIELDS).order('created_at', { ascending: false }).limit(60);
    query = doctor ? query.eq('doctor_id', doctor.id) : query.eq('publicado', true);
    const { data, error } = await query;
    if (error) throw new AccessError(503, 'No se pudieron cargar los testimonios. Revisa la conexión del servicio.');
    return privateJson({ ok: true, data: data || [] });
  } catch (error) { return accessFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    if (Number(request.headers.get('content-length')) > MAX_TESTIMONIAL_BYTES + 32_768) throw new AccessError(413, 'La imagen debe pesar como máximo 2 MB.');
    const form = await request.formData();
    const file = form.get('imagen');
    const titulo = String(form.get('titulo') || '').trim();
    const texto = String(form.get('texto_alternativo') || '').trim();
    const sourceUrl = googleReviewUrl(String(form.get('source_url') || CLINIC.mapsUrl));
    if (!(file instanceof File) || !file.size || file.size > MAX_TESTIMONIAL_BYTES || titulo.length < 2 || titulo.length > 120 || texto.length < 10 || texto.length > 2000 || !sourceUrl) throw new AccessError(400, 'Completa el título, la transcripción y un enlace de Google válido. Usa una imagen PNG, JPG o WebP de hasta 2 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = testimonialImageType(bytes);
    if (!type) throw new AccessError(400, 'El archivo debe ser una imagen PNG, JPG o WebP.');
    const id = randomUUID();
    const path = `${doctor.id}/${id}.${type.extension}`;
    const db = getServerDatabase();
    const { error: uploadError } = await db.storage.from(TESTIMONIAL_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false });
    if (uploadError) throw new AccessError(503, 'No se pudo subir la imagen. Revisa la conexión del servicio.');
    const { data, error } = await db.from('testimonios').insert({ id, doctor_id: doctor.id, titulo, texto_alternativo: texto, source_url: sourceUrl, object_path: path, content_type: type.mime, publicado: false }).select(TESTIMONIAL_FIELDS).single();
    if (error) {
      await db.storage.from(TESTIMONIAL_BUCKET).remove([path]);
      throw new AccessError(503, 'No se pudo guardar el testimonio.');
    }
    return privateJson({ ok: true, data }, 201);
  } catch (error) { return accessFailure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const { id, publicado } = await request.json();
    if (!isUuid(id) || typeof publicado !== 'boolean') throw new AccessError(400, 'Acción inválida.');
    const { data, error } = await getServerDatabase().from('testimonios').update({ publicado }).eq('id', id).eq('doctor_id', doctor.id).select(TESTIMONIAL_FIELDS).maybeSingle();
    if (error) throw new AccessError(503, 'No se pudo actualizar el testimonio.');
    if (!data) throw new AccessError(404, 'Testimonio no disponible.');
    return privateJson({ ok: true, data });
  } catch (error) { return accessFailure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const { id } = await request.json();
    if (!isUuid(id)) throw new AccessError(400, 'Referencia inválida.');
    const db = getServerDatabase();
    const { data, error } = await db.from('testimonios').delete().eq('id', id).eq('doctor_id', doctor.id).select('object_path').maybeSingle();
    if (error) throw new AccessError(503, 'No se pudo eliminar el testimonio.');
    if (!data) throw new AccessError(404, 'Testimonio no disponible.');
    const { error: cleanupError } = await db.storage.from(TESTIMONIAL_BUCKET).remove([data.object_path]);
    if (cleanupError) console.warn('Testimonial removed; private image cleanup pending.');
    return privateJson({ ok: true });
  } catch (error) { return accessFailure(error); }
}
