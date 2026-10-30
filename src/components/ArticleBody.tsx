import { Fragment, type ReactNode } from "react";
import { parseArticleContent, safeArticleLink, type ArticleNode } from "@/lib/article-content";

function render(node: ArticleNode, key: number): ReactNode {
  const children = node.content?.map(render);
  if (node.type === "text") {
    let text: ReactNode = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === "bold") text = <strong>{text}</strong>;
      else if (mark.type === "italic") text = <em>{text}</em>;
      else if (mark.type === "strike") text = <s>{text}</s>;
      else if (mark.type === "underline") text = <u>{text}</u>;
      else if (mark.type === "link") { const href = safeArticleLink(mark.attrs?.href); if (href) text = <a href={href} rel="noopener noreferrer">{text}</a>; }
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  if (node.type === "heading") return node.attrs?.level === 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>;
  if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
  if (node.type === "orderedList") return <ol key={key} start={node.attrs?.start}>{children}</ol>;
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
  if (node.type === "hardBreak") return <br key={key} />;
  return <p key={key}>{children}</p>;
}
export function ArticleBody({ content }: { content: string }) {
  let document: ArticleNode;
  try { document = parseArticleContent(content); } catch { return <p>Este contenido requiere revisión editorial.</p>; }
  return <div className="article-body">{document.content?.map(render)}</div>;
}
