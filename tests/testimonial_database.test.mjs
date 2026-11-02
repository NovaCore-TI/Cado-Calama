import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('testimonial SQL keeps images private and denies direct anonymous or authenticated access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.doctores (id uuid primary key);
      insert into public.doctores values ('11111111-1111-4111-8111-111111111111');
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      insert into storage.buckets (id, name, public) values ('cado-testimonios', 'cado-testimonios', true);
    `);
    const sql = fs.readFileSync('supabase/testimonials.sql', 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const bucket = (await db.query("select public, file_size_limit from storage.buckets where id = 'cado-testimonios'")).rows[0];
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 2097152);
    const rls = (await db.query("select relrowsecurity from pg_class where oid = 'public.testimonios'::regclass")).rows[0];
    assert.equal(rls.relrowsecurity, true);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.testimonios'), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    await db.query(`insert into public.testimonios (doctor_id, titulo, texto_alternativo, source_url, object_path, content_type)
      values ('11111111-1111-4111-8111-111111111111', 'Prueba local', 'Reseña ficticia de prueba local.', 'https://share.google/example', 'fixture/review.webp', 'image/webp')`);
    assert.equal((await db.query('select * from public.testimonios where publicado')).rows.length, 0);
    await db.exec('update public.testimonios set publicado = true');
    assert.equal((await db.query('select * from public.testimonios where publicado')).rows.length, 1);
  } finally { await db.close(); }
});
