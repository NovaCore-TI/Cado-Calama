'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { CLINIC } from '@/lib/clinic';
import { MAX_TESTIMONIAL_BYTES, type Testimonial } from '@/lib/testimonials';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
import { useCado } from '@/context/CadoContext';

export default function TestimonialManager() {
  const { doctorUser } = useCado();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [message, setMessage] = useState('Cargando testimonios…');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const loadSequence = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const request = ++loadSequence.current;
    const response = await fetch('/api/testimonios?admin=1', { cache: 'no-store', signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los testimonios.');
    if (signal?.aborted || request !== loadSequence.current) return;
    setItems(result.data);
    setMessage('');
  }, []);
  useLiveUpdates({ scope: 'doctor', doctorId: doctorUser?.id, authUserId: doctorUser?.auth_user_id, resources: ['testimonials'] }, async () => {
    try { await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar.'); }
  });
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(error => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo cargar.');
    });
    return () => controller.abort();
  }, [load]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch('/api/testimonios', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo subir el testimonio.');
      await load();
      formRef.current?.reset();
      setPreview('');
      setMessage('Imagen guardada como borrador. Revísala y publícala cuando esté lista.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  async function mutate(item: Testimonial, remove = false) {
    if (remove && !window.confirm(`¿Eliminar el testimonio «${item.titulo}»?`)) return;
    setBusy(true);
    try {
      const response = await fetch('/api/testimonios', { method: remove ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, publicado: !item.publicado }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar.');
      await load();
      setMessage(remove ? 'Testimonio eliminado.' : item.publicado ? 'Testimonio retirado de la portada.' : 'Testimonio publicado en la portada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-7">
    <form ref={formRef} onSubmit={upload} className="soft-card rounded-3xl p-6 sm:p-8">
      <h2 className="font-title text-3xl font-semibold">Agregar una reseña como imagen</h2>
      <p className="mt-3 text-sm leading-7">Sube la captura de una reseña de Google, revisa cómo se ve y publícala en la portada. Cada profesional administra las imágenes que incorpora.</p>
      <fieldset disabled={busy} className="mt-6 space-y-5">
        <label className="block text-sm font-semibold">Título o referencia<input name="titulo" required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-[#B3BFBF] p-3 font-normal" placeholder="Ej.: Experiencia compartida en Google" /></label>
        <label className="block text-sm font-semibold">Captura de la reseña (PNG, JPG o WebP · hasta 2 MB)<input name="imagen" type="file" accept="image/png,image/jpeg,image/webp" required className="mt-2 block w-full text-sm" onChange={event => {
          const file = event.target.files?.[0];
          if (file && file.size > MAX_TESTIMONIAL_BYTES) { setMessage('La imagen debe pesar como máximo 2 MB.'); event.target.value = ''; setPreview(''); return; }
          setPreview(file ? URL.createObjectURL(file) : '');
        }} /></label>
        {preview && <div><p className="mb-2 text-xs font-semibold">Vista previa</p><Image src={preview} alt="Vista previa de la reseña seleccionada" width={800} height={600} unoptimized className="max-h-80 w-auto max-w-full rounded-xl object-contain" /></div>}
        <label className="block text-sm font-semibold">Transcripción de la reseña<textarea name="texto_alternativo" required minLength={10} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-[#B3BFBF] p-3 font-normal" placeholder="Copia el texto de la reseña para que también pueda leerse sin la imagen." /></label>
        <label className="block text-sm font-semibold">Enlace de la reseña o ficha de Google<input name="source_url" type="url" required maxLength={2048} defaultValue={CLINIC.mapsUrl} className="mt-2 w-full rounded-xl border border-[#B3BFBF] p-3 font-normal" /></label>
        <button type="submit" className="btn-cado-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar imagen como borrador'}</button>
      </fieldset>
    </form>
    <p role="status" aria-live="polite" className="text-sm leading-7">{message}</p>
    <div className="grid items-start gap-6 lg:grid-cols-2">{items.map(item => <article key={item.id} className="soft-card rounded-3xl p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{item.titulo}</h2><span className="rounded-full bg-[#F8EFF6] px-3 py-1 text-xs font-semibold">{item.publicado ? 'Publicado' : 'Borrador'}</span></div><Image src={`/api/testimonios/${item.id}/imagen?admin=1`} alt={item.texto_alternativo} width={800} height={600} unoptimized className="h-auto max-h-96 w-full rounded-xl object-contain" /><p className="mt-4 whitespace-pre-wrap text-xs leading-6">{item.texto_alternativo}</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void mutate(item)} className="btn-cado-primary rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50">{item.publicado ? 'Retirar de la portada' : 'Publicar en la portada'}</button><button type="button" disabled={busy} onClick={() => void mutate(item, true)} className="btn-cado-secondary rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50">Eliminar</button><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="px-2 py-2.5 text-xs font-semibold text-[#8A3D7D] underline">Ver fuente en Google</a></div></article>)}</div>
    {!items.length && !message && <p className="text-sm">Aún no has agregado testimonios. La portada ofrece acceso directo a las reseñas de Google mientras incorporas las imágenes.</p>}
  </div>;
}
