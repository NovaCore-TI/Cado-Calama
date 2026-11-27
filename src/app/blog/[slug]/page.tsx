import { Breadcrumbs } from '@/components/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';
import { ArticleContent } from "@/components/ArticleContent";
import { LiveArticleRefresh } from '@/components/LiveArticleRefresh';
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticle } from "@/lib/articles";
import { SITE_URL, serializeStructuredData } from "@/lib/site";
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article)
    return {
      title: "Artículo no encontrado",
      robots: { index: false, follow: false },
    };
  return publicMetadata({
    path: '/blog/' + article.slug,
    title: article.titulo,
    description: article.resumen?.trim() || article.titulo,
    article: { publishedTime: article.published_at || undefined, author: article.autor_nombre },
  });
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const medical = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: article.titulo,
    description: article.resumen,
    url: SITE_URL + "/blog/" + article.slug,
    datePublished: article.published_at,
  };
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-[#513D49]">
      <LiveArticleRefresh />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(medical) }}
      />
      <Breadcrumbs siteUrl={SITE_URL} items={[
        { href: '/blog', label: 'Blog' },
        { href: '/blog/' + article.slug, label: article.titulo },
      ]} />
      <div className="mt-8">
        <ArticleContent title={article.titulo} category={article.categoria} excerpt={article.resumen}
          author={article.autor_nombre} readTime={article.tiempo_lectura} content={article.cuerpo} />
      </div>
      <Link
        href="/agendar"
        className="btn-cado-primary inline-block rounded-xl p-4"
      >
        Agendar una orientación
      </Link>
    </article>
  );
}
