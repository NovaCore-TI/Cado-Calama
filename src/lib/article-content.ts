// Restricted Tiptap JSON, rendered as React nodes. Raw HTML is never executed.
export interface ArticleNode {
  type: string;
  text?: string;
  attrs?: { level?: number; href?: string; start?: number };
  marks?: { type: string; attrs?: { href?: string } }[];
  content?: ArticleNode[];
}
export function safeArticleLink(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2000 || /[\u0000-\u0020]/.test(value)) return;
  try { const url = new URL(value); if (["https:", "http:", "mailto:"].includes(url.protocol)) return url.href; } catch {}
}
export function parseArticleContent(value: string): ArticleNode {
  if (!value.startsWith('{"type":"doc"')) {
    return { type: "doc", content: value.split(/\n\s*\n/).map(text => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] })) };
  }
  let count = 0;
  const clean = (node: unknown, depth = 0): ArticleNode => {
    if (++count > 5000 || depth > 20 || !node || typeof node !== "object") throw Error("Contenido demasiado complejo.");
    const input = node as ArticleNode;
    if (!["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "hardBreak", "text"].includes(input.type)) throw Error("Formato de contenido no permitido.");
    const result: ArticleNode = { type: input.type };
    if (input.type === "text") {
      if (typeof input.text !== "string") throw Error("Texto inválido.");
      result.text = input.text;
      result.marks = (input.marks || []).filter(mark => ["bold", "italic", "strike", "underline", "link"].includes(mark.type)).map(mark => {
        if (mark.type !== "link") return { type: mark.type };
        const href = safeArticleLink(mark.attrs?.href);
        if (!href) throw Error("El enlace debe usar https, http o mailto.");
        return { type: "link", attrs: { href } };
      });
    }
    if (input.type === "heading") result.attrs = { level: input.attrs?.level === 3 ? 3 : 2 };
    if (input.type === "orderedList") result.attrs = { start: Math.max(1, Math.min(999, Number(input.attrs?.start) || 1)) };
    if (input.content) {
      if (!Array.isArray(input.content)) throw Error("Contenido inválido.");
      result.content = input.content.map(child => clean(child, depth + 1));
    }
    return result;
  };
  return clean(JSON.parse(value));
}
export function articlePlainText(value: string): string {
  const walk = (node: ArticleNode): string => node.text || (node.content || []).map(walk).join(node.type === "doc" ? "\n\n" : " ");
  return walk(parseArticleContent(value));
}
export function normalizeArticleContent(value: string): string {
  if (value.length > 100000) throw Error("El contenido es demasiado largo.");
  const parsed = parseArticleContent(value);
  return value.startsWith('{"type":"doc"') ? JSON.stringify(parsed) : value.trim();
}
