'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  HeartHandshake,
  Share2,
  Sparkles,
  User,
} from 'lucide-react';
import { useCado } from '@/context/CadoContext';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { blogPosts } = useCado();
  const post = blogPosts.find((item) => item.slug === slug && item.published);

  if (!post) {
    return (
      <main className="bg-[#F6F8F8] px-6 py-20 text-[#513D49]">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
          <p className="section-eyebrow">Contenido no disponible</p>
          <h1 className="mt-3 font-title text-4xl font-semibold">
            Este artículo no se encuentra publicado.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#665D66]">
            Puede haber sido retirado o el enlace puede no ser correcto. Puedes explorar los otros artículos de salud bucal disponibles.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href="/blog" className="btn-cado-primary rounded-xl px-5 py-3 text-sm font-semibold">
              Volver al blog
            </Link>
            <Link href="/" className="btn-cado-secondary rounded-xl px-5 py-3 text-sm font-semibold">
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white px-6 py-14 text-[#513D49] sm:py-20">
      <article className="mx-auto max-w-3xl">
        {/* BREADCRUMB */}
        <nav aria-label="Ruta de navegación" className="text-xs text-[#766C75]">
          <Link href="/" className="hover:text-[#A14B92]">
            Inicio
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <Link href="/blog" className="hover:text-[#A14B92]">
            Blog
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <span aria-current="page" className="font-semibold text-[#513D49]">
            {post.title}
          </span>
        </nav>

        {/* CABECERA DEL ARTÍCULO */}
        <header className="mt-8 border-b border-[#E2E7E7] pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F8F8] px-3.5 py-1 text-xs font-semibold text-[#A14B92]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{post.category}</span>
          </div>

          <h1 className="mt-4 font-title text-4xl font-semibold leading-tight text-[#513D49] sm:text-5xl text-balance">
            {post.title}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-[#665D66] sm:text-lg">
            {post.excerpt}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#766C75]">
            <span className="flex items-center gap-1.5 font-semibold text-[#513D49]">
              <User className="h-3.5 w-3.5 text-[#A14B92]" aria-hidden="true" />
              {post.author}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {post.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readTime}
            </span>
          </div>
        </header>

        {/* CUERPO DEL ARTÍCULO */}
        <div className="whitespace-pre-wrap py-10 text-base leading-8 text-[#513D49]">
          {post.content}
        </div>

        {/* CARD CTA DE ORIENTACIÓN VIRTUAL */}
        <div className="clay-card rounded-[2rem] p-7 sm:p-9 space-y-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A14B92]/10 text-[#A14B92]">
              <HeartHandshake className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h2 className="font-title text-2xl font-semibold text-[#513D49]">
                ¿Te gustaría resolver tus dudas con el Dr. Javier Beiza?
              </h2>
              <p className="text-sm leading-relaxed text-[#665D66]">
                El contenido educativo es orientativo y no reemplaza una evaluación odontológica. En una sesión telemática de 15 minutos puedes conversar con tranquilidad desde tu casa.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/agendar"
              className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white shadow-md active:scale-98"
            >
              <span>Agendar orientación virtual de 15 min</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/blog"
              className="btn-cado-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ver más artículos del blog</span>
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
