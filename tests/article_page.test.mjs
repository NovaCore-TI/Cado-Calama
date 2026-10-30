import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("RF-02: individual article reads published content only, renders rich text safely and rejects a missing article",async()=>{
  const db=database(()=>({data:null,error:null}));
  const reader=loadTs("src/lib/articles.ts",{"./supabase":{supabase:db},react:{cache:fn=>fn}});
  await reader.getPublishedArticle("prueba");
  assert(db.calls[0].filters.some(([op,key,value])=>op==="eq"&&key==="publicado"&&value===true));
  let available=true;
  const article={titulo:"Artículo de prueba",slug:"prueba",resumen:"Contenido educativo",categoria:"Cuidados",autor_nombre:"Profesional de prueba",published_at:"2026-10-20",tiempo_lectura:"2 min",cuerpo:JSON.stringify({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Texto clínico con formato",marks:[{type:"bold"}]}]}]})};
  const page=loadTs("src/app/blog/[slug]/page.tsx",{"@/lib/articles":{getPublishedArticle:async()=>available?article:null},"next/navigation":{notFound(){throw Error("NOT_FOUND");}}});
  const props={params:Promise.resolve({slug:"prueba"})};
  const html=renderToStaticMarkup(await page.default(props));
  assert.match(html,/<strong>Texto clínico con formato<\/strong>/);assert.match(html,/Artículo de prueba/);assert.match(html,/href="\/agendar"/);
  assert.equal((await page.generateMetadata(props)).openGraph.publishedTime,"2026-10-20");
  available=false;await assert.rejects(page.default(props),/NOT_FOUND/);assert.equal((await page.generateMetadata(props)).robots.index,false);
});
