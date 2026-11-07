import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { NextRequest } from 'next/server.js';
import { loadTs } from './helpers/load-ts.mjs';

test('Blog publication date: legacy migration, delayed publication, edits and republication preserve chronology', async () => {
  const db = new PGlite();
  try {
    await db.exec(`SET TIME ZONE 'UTC'; CREATE TABLE public.articulos_blog (
      id text PRIMARY KEY, titulo text, publicado boolean NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz NOT NULL DEFAULT now());
      INSERT INTO public.articulos_blog VALUES
      ('old-draft','Draft',false,'2020-01-01','2020-01-01'),
      ('existing','Existing',true,'2021-01-01','2021-06-01');`);
    const migration = fs.readFileSync('supabase/migrations/20261030012410_fix_blog_publication_date.sql', 'utf8');
    await db.exec(migration);
    const row = async id => (await db.query('SELECT * FROM public.articulos_blog WHERE id=$1',[id])).rows[0];
    assert.equal((await row('old-draft')).published_at, null);
    assert.equal(new Date((await row('existing')).published_at).toISOString(), '2021-06-01T00:00:00.000Z');
    const before = Date.now();
    await db.exec("UPDATE public.articulos_blog SET publicado=true WHERE id='old-draft'");
    const publishedAt = new Date((await row('old-draft')).published_at).getTime();
    assert.ok(publishedAt >= before && publishedAt <= Date.now());
    assert.deepEqual((await db.query('SELECT id FROM public.articulos_blog WHERE publicado ORDER BY published_at DESC, id DESC')).rows.map(r=>r.id),['old-draft','existing']);
    await db.exec("UPDATE public.articulos_blog SET titulo='Edited',published_at='2099-01-01' WHERE id='old-draft'; UPDATE public.articulos_blog SET publicado=false WHERE id='old-draft'; UPDATE public.articulos_blog SET publicado=true WHERE id='old-draft'");
    assert.equal(new Date((await row('old-draft')).published_at).getTime(), publishedAt);
    await db.exec("INSERT INTO public.articulos_blog(id,publicado,published_at) VALUES('new-draft',false,'2099-01-01'),('direct-publication',true,'2020-01-01')");
    assert.equal((await row('new-draft')).published_at, null);
    assert.ok(new Date((await row('direct-publication')).published_at).getTime() >= publishedAt);
    // Run as an ordinary table writer: the trigger does not need definer privileges.
    await db.exec("CREATE ROLE writer; GRANT USAGE ON SCHEMA public TO writer; GRANT SELECT,UPDATE ON public.articulos_blog TO writer; SET ROLE writer; UPDATE public.articulos_blog SET publicado=true WHERE id='new-draft'; RESET ROLE");
    assert.ok((await row('new-draft')).published_at);
    await db.exec("UPDATE public.articulos_blog SET publicado=false WHERE id='old-draft'");
    await db.exec(migration);
    assert.equal(new Date((await row('old-draft')).published_at).getTime(), publishedAt);
  } finally { await db.close(); }
});

test('Public blog API sorts by publication while admin keeps draft creation order', async () => {
  const calls=[];
  const { database }=await import('./helpers/load-ts.mjs');
  const db=database(state=>{calls.push(state);return {data:[],error:null};});
  const api=loadTs('src/app/api/blog/route.ts',{
    '@/lib/supabase':{supabase:db}, '@/lib/server-db':{getServerDatabase:()=>db},
    '@/lib/doctor-auth':{...loadTs('src/lib/doctor-auth.ts'),requireDoctor:async()=>({doctor:{id:'fixture'}})},
  });
  assert.equal((await api.GET(new NextRequest('https://cado.example/api/blog'))).status,200);
  assert.equal((await api.GET(new NextRequest('https://cado.example/api/blog?admin=1'))).status,200);
  assert.deepEqual(calls[0].filters.filter(f=>f[0]==='order').map(f=>f[1]),['published_at','id']);
  assert.deepEqual(calls[1].filters.filter(f=>f[0]==='order').map(f=>f[1]),['created_at','id']);
});
