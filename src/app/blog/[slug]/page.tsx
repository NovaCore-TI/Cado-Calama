'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useCado } from '@/context/CadoContext';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { blogPosts } = useCado();
  const post = blogPosts.find(item => item.slug === slug && item.published);

  if (!post) return <main className="bg-[#F6F8F8] px-6 py-20 text-[#513D49]"><div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm sm:p-12"><p className="section-eyebrow">Contenido no disponible</p><h1 className="mt-3 font-title text-4xl font-semibold">Este artículo no está publicado.</h1><p className="mt-4 text-sm leading-7 text-[#665D66]">Puede ser un borrador, haber sido retirado o no existir en este navegador de demostración.</p><div className="mt-7 flex flex-wrap gap-4"><Link href="/blog" className="btn-cado-primary rounded-xl px-5 py-3 text-sm font-semibold">Volver al blog</Link><Link href="/" className="btn-cado-secondary rounded-xl px-5 py-3 text-sm font-semibold">Ir al inicio</Link></div></div></main>;

  return <main className="bg-white px-6 py-14 text-[#513D49] sm:py-20"><article className="mx-auto max-w-3xl"><nav aria-label="Ruta de navegación" className="text-xs text-[#665D66]"><Link href="/" className="hover:underline">Inicio</Link> › <Link href="/blog" className="hover:underline">Blog</Link> › <span aria-current="page">{post.title}</span></nav><div className="mt-9 border-b border-[#E2E7E7] pb-9"><p className="section-eyebrow">{post.category} · contenido local de demostración</p><h1 className="mt-4 font-title text-5xl font-semibold leading-tight">{post.title}</h1><p className="mt-5 text-base leading-8 text-[#665D66]">{post.excerpt}</p><p className="mt-5 text-xs text-[#766C75]">{post.author} · {post.date} · {post.readTime}</p></div><div className="whitespace-pre-wrap py-9 text-base leading-9 text-[#513D49]">{post.content}</div><div className="clay-card mt-8 rounded-3xl p-7"><BookOpen className="h-6 w-6 text-[#A14B92]" /><h2 className="mt-4 font-title text-2xl font-semibold">¿Te gustaría conversar con el doctor?</h2><p className="mt-2 text-sm leading-7 text-[#665D66]">El contenido educativo no reemplaza una evaluación odontológica.</p><Link href="/agendar" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D]">Conocer la orientación virtual <ArrowRight className="h-4 w-4" /></Link></div><Link href="/blog" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-[#8A3D7D]"><ArrowLeft className="h-4 w-4" /> Volver a artículos</Link></article></main>;
}
