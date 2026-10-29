import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("RF-03: FAQ search is accent-insensitive and combines full-catalogue text and category filters", () => {
  const {filterFaqs,DEFAULT_FAQS}=loadTs("src/lib/faqs.ts");
  assert(filterFaqs(DEFAULT_FAQS,"orientacion").length>0);
  assert(filterFaqs(DEFAULT_FAQS,"  ORIENTACIÓN  ").length>0);
  assert.equal(filterFaqs(DEFAULT_FAQS,"imposible123").length,0);
  assert(filterFaqs(DEFAULT_FAQS,"","miedo").every(item=>item.category==="miedo"));
  assert.equal(filterFaqs(DEFAULT_FAQS,"dolor","vespertino").length,0);
});

test("RF-03: API reports filtered count, preserves a valid empty catalogue and falls back only on outage", async () => {
  for(const result of [
    {data:[{id:1,categoria:"miedo",pregunta:"Ansiedad",respuesta:"Orientación sin juicios"},{id:2,categoria:"procedimientos",pregunta:"Dolor",respuesta:"Consulta profesional"}],error:null},
    {data:[],error:null}, {data:null,error:{message:"offline"}},
  ]) {
    const route=loadTs("src/app/api/faq/route.ts",{"@/lib/supabase":{supabase:database(()=>result)}});
    const response=await route.GET(new NextRequest("https://cado.example/api/faq?q=orientacion"));
    const body=await response.json();assert.equal(response.status,200);assert.equal(body.count,body.data.length);
    if(result.error)assert.equal(body.source,"fallback");else if(result.data.length===0)assert.equal(body.count,0);else assert.equal(body.count,1);
    assert.equal((await route.GET(new NextRequest("https://cado.example/api/faq?category=__proto__"))).status,400);
  }
});
