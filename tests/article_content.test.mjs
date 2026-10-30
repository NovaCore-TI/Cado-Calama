import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { loadTs } from "./helpers/load-ts.mjs";
const codec = loadTs("src/lib/article-content.ts");
const { ArticleBody } = loadTs("src/components/ArticleBody.tsx");
const body = content => JSON.stringify({ type: "doc", content });

test("Article formatting survives storage and shares the same safe renderer in preview and publication", () => {
  const content = body([
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Preparación" }] },
    { type: "paragraph", content: [{ type: "text", text: "Con calma", marks: [{ type: "bold" }, { type: "italic" }] }] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Paso uno" }] }] }] },
  ]);
  const normalized = codec.normalizeArticleContent(content);
  const html = renderToStaticMarkup(createElement(ArticleBody, { content: normalized }));
  assert.match(html, /<h2>Preparación<\/h2>/);
  assert.match(html, /<em><strong>Con calma<\/strong><\/em>/);
  assert.match(html, /<ul><li><p>Paso uno<\/p><\/li><\/ul>/);
  assert.equal(codec.articlePlainText(normalized), "Preparación\n\nCon calma\n\nPaso uno");
});
test("Article renderer escapes literal HTML and rejects executable links and unknown node types", () => {
  const html = renderToStaticMarkup(createElement(ArticleBody, { content: '<img src=x onerror="alert(1)"><script>evil()</script>' }));
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
  for (const href of ["javascript:alert(1)", "data:text/html,<script>x</script>", "java\nscript:alert(1)"]) {
    assert.throws(() => codec.normalizeArticleContent(body([{ type: "paragraph", content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href } }] }] }])));
  }
  assert.throws(() => codec.normalizeArticleContent(body([{ type: "script", text: "evil" }])));
  const link = body([{ type: "paragraph", content: [{ type: "text", text: "CADO", marks: [{ type: "link", attrs: { href: "https://example.invalid/" } }] }] }]);
  assert.match(renderToStaticMarkup(createElement(ArticleBody, { content: link })), /href="https:\/\/example.invalid\/"/);
});
