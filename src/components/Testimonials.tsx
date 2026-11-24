'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CLINIC } from '@/lib/clinic';
import { TESTIMONIAL_IMAGE_WIDTHS, type Testimonial } from '@/lib/testimonials';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';

function TestimonialImage({ item }: { item: Testimonial }) {
  const src = '/api/testimonios/' + item.id + '/imagen';
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#F6F8F8]">
      {/* Use the publication-aware variants so withdrawing a review takes effect immediately. */}
      <img src={src + '?w=640'}
        srcSet={TESTIMONIAL_IMAGE_WIDTHS.map(width => src + '?w=' + width + ' ' + width + 'w').join(', ')}
        sizes="(min-width: 1280px) 360px, (min-width: 1024px) 30vw, (min-width: 768px) 44vw, 90vw"
        alt={item.texto_alternativo} width={800} height={600} loading="lazy" decoding="async"
        className="h-full w-full object-contain" />
    </div>
  );
}

export function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [revision, setRevision] = useState(0);
  useLiveUpdates({ resources: ['testimonials'] }, () => setRevision(value => value + 1));
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/testimonios', { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      if (!controller.signal.aborted && Array.isArray(result.data)) setItems(result.data);
    }).catch(() => {});
    return () => controller.abort();
  }, [revision]);
  return <section className="border-y border-[#E2E7E7] bg-[#F6F8F8] py-16 sm:py-20"><div className="mx-auto max-w-7xl px-6"><div data-reveal className="mb-8 max-w-3xl space-y-4"><p className="section-eyebrow">Experiencias de nuestros pacientes</p><h2 className="font-title text-4xl font-semibold sm:text-5xl">La confianza también se comparte</h2><p className="text-sm leading-7">Conoce las experiencias compartidas por pacientes en la ficha de Google de CADO.</p><a href={CLINIC.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-[#8A3D7D] underline">Leer reseñas de CADO en Google</a></div>{items.length > 0 && <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} data-reveal className="cado-hover-card material-card overflow-hidden rounded-3xl p-5"><h3 className="mb-4 text-sm font-semibold">{item.titulo}</h3><TestimonialImage item={item} /><details className="mt-4 text-xs leading-6"><summary className="cursor-pointer font-semibold text-[#8A3D7D]">Leer transcripción</summary><p className="mt-2 whitespace-pre-wrap">{item.texto_alternativo}</p></details><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-semibold text-[#8A3D7D] underline">Ver en Google</a></article>)}</div>}</div></section>;
}
