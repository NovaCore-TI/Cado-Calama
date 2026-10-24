import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticle } from "@/lib/articles";
import { SITE_URL, serializeStructuredData } from "@/lib/site";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article)
    return {
      title: "Artículo no encontrado",
      robots: { index: false, follow: false },
    };
  return {
    title: article.titulo,
    description: article.resumen,
    alternates: { canonical: SITE_URL + "/blog/" + article.slug },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: article.titulo,
      description: article.resumen,
      url: SITE_URL + "/blog/" + article.slug,
      publishedTime: article.published_at,
      authors: [article.autor_nombre],
    },
  };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: SITE_URL + "/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.titulo,
        item: SITE_URL + "/blog/" + article.slug,
      },
    ],
  };
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(medical) }}
      />
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link href="/" className="underline">
          Inicio
        </Link>{" "}
        /{" "}
        <Link href="/blog" className="underline">
          Blog
        </Link>{" "}
        / <span aria-current="page">{article.titulo}</span>
      </nav>
      <header className="mt-8 space-y-4 border-b pb-8">
        <p className="section-eyebrow">{article.categoria}</p>
        <h1 className="font-title text-4xl sm:text-5xl">{article.titulo}</h1>
        <p>{article.resumen}</p>
        <p className="text-sm">
          {article.autor_nombre} · {article.tiempo_lectura}
        </p>
      </header>
      <div className="whitespace-pre-wrap py-10 leading-8">
        {article.cuerpo}
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
