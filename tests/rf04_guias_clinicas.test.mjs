import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { PDFDocument, PDFName } from "pdf-lib";
import { PGlite } from "@electric-sql/pglite";
import { loadTs, database } from "./helpers/load-ts.mjs";
const seed = JSON.parse(fs.readFileSync("content/guides.json"));
const guide = { ...seed[0], id: "11111111-1111-4111-8111-111111111111", activo: true, revisado_en: "2026-10-24T00:00:00Z" };
const request = (query = "") => new NextRequest("https://cado.example/api/recursos" + query);

test("Resource catalogue distinguishes a valid empty list from a database outage", async () => {
  for (const error of [null, { message: "offline" }]) {
    const db = database(() => ({ data: [], error }));
    const api = loadTs("src/app/api/recursos/route.ts", { "@/lib/server-db": { getServerDatabase: () => db }, "./server-db": { getServerDatabase: () => db } });
    const response = await api.GET(request());
    assert.equal(response.status, error ? 503 : 200);
    if (!error) assert.deepEqual((await response.json()).data, []);
  }
});
test("Resource download rejects inherited object keys and traversal without touching the database", async () => {
  const db = database(() => { throw Error("Must not query invalid slugs"); });
  const api = loadTs("src/app/api/recursos/download/route.ts", { "@/lib/server-db": { getServerDatabase: () => db }, "./server-db": { getServerDatabase: () => db } });
  for (const id of ["__proto__", "../../.env.local", ""]) {
    assert.equal((await api.GET(request("/download?id=" + encodeURIComponent(id)))).status, 404);
  }
  assert.equal(db.calls.length, 0);
  const healthy = database(() => ({ data: [], error: null }));
  const controlled = loadTs("src/app/api/recursos/download/route.ts", { "@/lib/server-db": { getServerDatabase: () => healthy }, "./server-db": { getServerDatabase: () => healthy } });
  assert.equal((await controlled.GET(request("/download?id=constructor"))).status, 404);
});
test("Withdrawn guides are not downloadable, and admin preview requires a verified doctor", async () => {
  const db = database(() => ({ data: [], error: null }));
  const api = loadTs("src/app/api/recursos/download/route.ts", { "@/lib/server-db": { getServerDatabase: () => db }, "./server-db": { getServerDatabase: () => db } });
  assert.equal((await api.GET(request("/download?id=" + guide.slug))).status, 404);
  assert.ok(db.calls[0].filters.some(f => f[0] === "eq" && f[1] === "activo" && f[2] === true));
  assert.equal((await api.GET(request("/download?id=" + guide.slug + "&admin=1"))).status, 401);
});
test("PDF metadata and download describe the generated file, with Spanish language and tagged structure", async () => {
  const db = database(({ table }) => ({ data: table === "guias_clinicas" ? [guide] : null, error: null }));
  const mocks = { "@/lib/server-db": { getServerDatabase: () => db }, "./server-db": { getServerDatabase: () => db } };
  const download = loadTs("src/app/api/recursos/download/route.ts", mocks);
  const response = await download.GET(request("/download?id=" + guide.slug));
  assert.equal(response.status, 200);
  const bytes = await response.arrayBuffer();
  assert.equal(Number(response.headers.get("content-length")), bytes.byteLength);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.catalog.lookup(PDFName.of("Lang")).decodeText(), "es-CL");
  assert.ok(pdf.catalog.has(PDFName.of("StructTreeRoot")));
  assert.equal(db.calls.filter(call => call.table === "logs_auditoria").length, 1);
  const catalogue = loadTs("src/app/api/recursos/route.ts", mocks);
  const metadata = (await (await catalogue.GET(request())).json()).data[0];
  assert.equal(metadata.bytes, bytes.byteLength);
  assert.equal(metadata.pages, pdf.getPageCount());
});
test("Resource migration keeps drafts private, permits withdrawal and deduplicates delivery events", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;");
    await db.exec(fs.readFileSync("supabase/migrations/20261024174342_harden_patient_access.sql", "utf8"));
    const migration = fs.readdirSync("supabase/migrations").find(name => name.endsWith("_unify_resource_catalog.sql"));
    await db.exec(fs.readFileSync("supabase/migrations/" + migration, "utf8"));
    await db.exec("SET ROLE anon");
    assert.equal((await db.query("SELECT count(*)::int n FROM guias_clinicas")).rows[0].n, 0);
    await assert.rejects(db.query("UPDATE guias_clinicas SET activo=true"));
    await db.exec("RESET ROLE; UPDATE guias_clinicas SET activo=true,revisado_en=now(); SET ROLE anon");
    assert.equal((await db.query("SELECT count(*)::int n FROM guias_clinicas")).rows[0].n, 3);
    await db.exec("RESET ROLE; UPDATE guias_clinicas SET activo=false; SET ROLE anon");
    assert.equal((await db.query("SELECT count(*)::int n FROM guias_clinicas")).rows[0].n, 0);
    await assert.rejects(db.query("INSERT INTO logs_auditoria(accion,entidad) VALUES('x','x')"));
    await db.exec("RESET ROLE");
    for (let i=0;i<2;i++) await db.exec("INSERT INTO logs_auditoria(accion,entidad,event_key) VALUES('PDF_PREPARADO','guias_clinicas','fixture-delivery') ON CONFLICT(event_key) DO NOTHING");
    assert.equal((await db.query("SELECT count(*)::int n FROM logs_auditoria")).rows[0].n, 1);
  } finally { await db.close(); }
});
