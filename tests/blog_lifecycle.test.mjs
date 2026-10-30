import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("Blog lifecycle keeps drafts private, persists slug/format, blocks another author and withdraws publication", async () => {
  let rows = [];
  const db = database(state => {
    const matching = rows.filter(row => state.filters.filter(filter => filter[0] === "eq").every(([, key, value]) => row[key] === value));
    if (state.operation === "insert") { const row = { id: "fixture-post", ...state.payload }; rows.push(row); return { data: row, error: null }; }
    if (state.operation === "update") { matching.forEach(row => Object.assign(row, state.payload)); return { data: matching[0] || null, error: null }; }
    if (state.operation === "delete") { rows = rows.filter(row => !matching.includes(row)); return { data: matching[0] || null, error: null }; }
    return { data: matching, error: null };
  });
  const actor = id => loadTs("src/app/api/blog/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => db },
    "@/lib/supabase": { supabase: db },
    "@/lib/doctor-auth": { ...loadTs("src/lib/doctor-auth.ts"), requireDoctor: async () => ({ doctor: { id, nombre: "Fixture " + id } }) },
  });
  const request = (method, body) => new NextRequest("https://cado.example/api/blog", { method, body: JSON.stringify(body) });
  const a = actor("a"), b = actor("b");
  const content = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Contenido de prueba", marks: [{ type: "bold" }] }] }] });
  const draft = { titulo: "Artículo de prueba", slug: "articulo-de-prueba", cuerpo: content, categoria: "Cuidados", publicado: false };
  assert.equal((await a.POST(request("POST", draft))).status, 201);
  const publicList = async () => (await (await a.GET(new NextRequest("https://cado.example/api/blog"))).json()).data;
  assert.equal((await publicList()).length, 0);
  assert.equal((await b.PATCH(request("PATCH", { ...draft, id: "fixture-post", publicado: true }))).status, 404);
  assert.equal((await a.PATCH(request("PATCH", { ...draft, id: "fixture-post", slug: "url-editada", publicado: true }))).status, 200);
  const published = await publicList();
  assert.equal(published.length, 1);
  assert.equal(published[0].slug, "url-editada");
  assert.deepEqual(JSON.parse(published[0].cuerpo).content[0].content[0].marks, [{ type: "bold" }]);
  assert.equal((await a.PATCH(request("PATCH", { ...draft, id: "fixture-post", publicado: false }))).status, 200);
  assert.equal((await publicList()).length, 0);
  assert.equal((await a.DELETE(request("DELETE", { id: "fixture-post" }))).status, 200);
  assert.equal(rows.length, 0);
});
