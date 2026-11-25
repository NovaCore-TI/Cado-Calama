import { ArticleBody } from './ArticleBody';

export function ArticleContent({ title, category, excerpt, author, readTime, content, heading = 'h1', headingId }: {
  title: string;
  category: string;
  excerpt: string;
  author: string;
  readTime: string;
  content: string;
  heading?: 'h1' | 'h2';
  headingId?: string;
}) {
  const Heading = heading;
  return <>
    <header className="space-y-4 border-b pb-8">
      <p className="section-eyebrow">{category}</p>
      <Heading id={headingId} className="font-title text-4xl sm:text-5xl">{title}</Heading>
      {excerpt && <p>{excerpt}</p>}
      <p className="text-sm">{[author, readTime].filter(Boolean).join(' · ')}</p>
    </header>
    <div className="py-10 leading-8"><ArticleBody content={content} /></div>
  </>;
}
