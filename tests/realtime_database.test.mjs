import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Realtime revisions isolate professionals, hide drafts and contain no clinical records', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const file of fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('supabase/migrations/' + file, 'utf8'));
    const doctors = [];
    for (let i = 1; i <= 3; i++) {
      const user = (await db.query('insert into auth.users values(gen_random_uuid()) returning id')).rows[0].id;
      const doctor = (await db.query('insert into public.doctores(nombre,email,auth_user_id) values($1,$2,$3) returning id', [`Fixture ${i}`, `fixture${i}@example.invalid`, user])).rows[0].id;
      doctors.push({ user, doctor });
    }
    const a = doctors[0], b = doctors[1];
    const revision = async (audience, resource, doctor) => Number((await db.query('select revision from public.app_live_revisions where audience=$1 and resource=$2 and doctor_id is not distinct from $3::uuid', [audience, resource, doctor || null])).rows[0]?.revision || 0);
    const article = (await db.query("insert into public.articulos_blog(autor_id,titulo,slug,resumen,cuerpo,publicado) values($1,'Private draft','private-fixture','Fixture','PRIVATE_CLINICAL_TEXT',false) returning id", [a.doctor])).rows[0].id;
    assert.equal(await revision('doctor','blog',a.doctor), 1);
    assert.equal(await revision('public','blog'), 0);
    await db.query('update public.articulos_blog set publicado=true where id=$1', [article]);
    assert.equal(await revision('public','blog'), 1);
    await db.query('update public.articulos_blog set publicado=false where id=$1', [article]);
    assert.equal(await revision('public','blog'), 2);
    await db.query('update public.articulos_blog set autor_id=$1 where id=$2', [b.doctor,article]);
    assert.ok(await revision('doctor','blog',b.doctor));

    const testimonial = (await db.query("insert into public.testimonios(doctor_id,titulo,texto_alternativo,source_url,object_path,content_type) values($1,'Private image','PRIVATE_CLINICAL_TEXT','https://share.google/fixture','fixture/image.webp','image/webp') returning id", [a.doctor])).rows[0].id;
    assert.equal(await revision('public','testimonials'), 0);
    await db.query('update public.testimonios set publicado=true where id=$1', [testimonial]);
    await db.query('delete from public.testimonios where id=$1', [testimonial]);
    assert.equal(await revision('public','testimonials'), 2);

    const guide = (await db.query("insert into public.guias_clinicas(titulo,categoria,descripcion,slug,url_descarga,contenido,activo) values('Fixture','Cuidados','Fixture','realtime-fixture','/api/recursos/download?id=realtime-fixture','[]',false) returning id")).rows[0].id;
    const beforeGuide = await revision('staff','guides');
    await db.query('update public.guias_clinicas set descargas=coalesce(descargas,0)+1 where id=$1', [guide]);
    assert.equal(await revision('staff','guides'), beforeGuide, 'downloads must not cause refresh/download loops');
    await db.query('update public.guias_clinicas set activo=true,revisado_por=$1,revisado_en=now() where id=$2', [a.doctor, guide]);
    assert.ok(await revision('public','guides'));
    await db.query('update public.guias_clinicas set activo=false where id=$1', [guide]);
    assert.equal(await revision('public','guides'), 2);

    await db.query("select public.upsert_doctor_block($1,'2099-01-01','19:00','Disponible')", [a.doctor]);
    await db.query("select public.upsert_doctor_block($1,'2099-01-01','19:15','Disponible')", [a.doctor]);
    const q = (await db.query("insert into public.cuestionarios_perfilamiento(motivo_consulta,nivel_temor,consentimiento_privacidad,draft_access_token) values('PRIVATE_CLINICAL_TEXT','tranquilo',true,'PRIVATE_SECRET') returning id")).rows[0].id;
    const beforeAvailability = await revision('public','availability');
    await db.query("select public.reserve_orientation('2099-01-01','19:00','PRIVATE_PATIENT','patient@example.invalid','12345678','realtime-fixture',repeat('a',64),$1)", [q]);
    assert.ok(await revision('public','availability') > beforeAvailability);
    assert.equal(await revision('doctor','appointments',a.doctor), 1);
    assert.equal(await revision('doctor','appointments',b.doctor), 0);
    await db.query("update public.cuestionarios_perfilamiento set motivo_consulta='PRIVATE_UPDATED_TEXT' where id=$1", [q]);
    assert.equal(await revision('doctor','appointments',a.doctor), 2);
    await db.query("select public.manage_orientation('realtime-fixture',null,$1,'reprogramar','2099-01-01','19:15')", [a.doctor]);
    await db.query("select public.manage_orientation('realtime-fixture',null,$1,'cancelar')", [a.doctor]);
    assert.ok(await revision('doctor','appointments',a.doctor) >= 4);
    const allRows = (await db.query('select * from public.app_live_revisions')).rows;
    assert.equal(/PRIVATE_|patient@example|token_gestion|draft_access_token/.test(JSON.stringify(allRows)), false);

    await db.exec('set role anon');
    assert.ok((await db.query('select * from public.app_live_revisions')).rows.every(row => row.audience === 'public'));
    await assert.rejects(db.query("update public.app_live_revisions set revision=999"), /permission denied/);
    await assert.rejects(db.query("select cado_private.touch_live_revision('public','blog')"), /permission denied/);
    await db.exec('reset role');
    for (const current of doctors) {
      await db.exec(`set role authenticated; set request.jwt.claim.sub='${current.user}'`);
      const rows = (await db.query('select * from public.app_live_revisions')).rows;
      assert.ok(rows.every(row => row.audience !== 'doctor' || row.doctor_id === current.doctor));
      assert.ok(rows.some(row => row.audience === 'staff'));
      await assert.rejects(db.query("insert into public.app_live_revisions(key,audience,resource) values('public:faq','public','faq')"), /permission denied/);
      await db.exec('reset role');
    }
    await db.query('update public.doctores set activo=false where id=$1', [a.doctor]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a.user}'`);
    assert.ok((await db.query('select * from public.app_live_revisions')).rows.every(row => row.audience === 'public'));
  } finally { await db.close(); }
});
