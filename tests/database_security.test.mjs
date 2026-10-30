import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("Postgres: migration, RLS, booking rollback and protected state transitions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
    const migration = fs.readFileSync(
      "supabase/migrations/20261024174342_harden_patient_access.sql",
      "utf8",
    );
    await db.exec(migration);
    assert.equal(
      (await db.query("select public.cado_readiness() as ready")).rows[0].ready,
      false,
    );
    // Repeat the migration: no policy loss on unrelated tables, no duplicate grants.
    await db.exec(
      `CREATE TABLE public.unrelated(id int);ALTER TABLE public.unrelated ENABLE ROW LEVEL SECURITY;CREATE POLICY keep_me ON public.unrelated FOR SELECT USING(true);`,
    );
    await db.exec(migration);
    assert.equal(
      (
        await db.query(
          `SELECT count(*)::int AS n FROM pg_policies WHERE tablename='unrelated' AND policyname='keep_me'`,
        )
      ).rows[0].n,
      1,
    );
    const doctor = "11111111-1111-4111-8111-111111111111",
      user = "22222222-2222-4222-8222-222222222222";
    await db.exec(`INSERT INTO auth.users VALUES('${user}');INSERT INTO public.doctores(id,nombre,email,auth_user_id) VALUES('${doctor}','Fixture','doctor@example.invalid','${user}');
   INSERT INTO public.doctor_google_credentials(doctor_id,email,refresh_token) VALUES('${doctor}','fixture@example.invalid','FAKE_SECRET');
   INSERT INTO public.bloques_disponibilidad(doctor_id,fecha,hora_inicio,hora_fin) VALUES('${doctor}','2099-01-01','19:00','19:15'),('${doctor}','2099-01-01','19:15','19:30');
   INSERT INTO public.articulos_blog(titulo,slug,resumen,cuerpo,publicado) VALUES('Draft','draft','fixture','fixture',false),('Public','public','fixture','fixture',true);`);
    assert.equal(
      (await db.query("select public.cado_readiness() as ready")).rows[0].ready,
      true,
    );
    await db.exec("SET ROLE anon");
    for (const table of [
      "pacientes",
      "cuestionarios_perfilamiento",
      "orientaciones_citas",
      "doctor_google_credentials",
      "logs_auditoria",
    ])
      await assert.rejects(db.query("SELECT * FROM public." + table));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM public.articulos_blog"))
        .rows[0].n,
      1,
    );
    await assert.rejects(
      db.query(
        `SELECT public.reserve_orientation('2099-01-01','19:00','Fixture','a@example.invalid','12345678','fake',repeat('a',64))`,
      ),
    );
    await db.exec(
      `RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='33333333-3333-4333-8333-333333333333'`,
    );
    await assert.rejects(
      db.query("SELECT count(*)::int n FROM public.pacientes"),
    );
    await assert.rejects(
      db.query("SELECT google_refresh_token FROM public.doctores"),
    );
    await db.exec(`RESET ROLE;SET ROLE service_role`);
    const reserve = (code, time = "19:00") =>
      db.query(
        `SELECT public.reserve_orientation('2099-01-01',$1,'Fixture','a@example.invalid','12345678',$2,repeat('a',64)) AS appointment`,
        [time, code],
      );
    await reserve("fixture-one");
    for (let n = 0; n < 19; n++)
      await assert.rejects(reserve("fixture-conflict-" + n));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM public.orientaciones_citas"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM public.pacientes")).rows[0]
        .n,
      1,
    );
    // Failure after creating a patient must roll the patient insertion back too.
    await assert.rejects(reserve("fixture-one", "19:15"));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM public.pacientes")).rows[0]
        .n,
      1,
    );
    await assert.rejects(
      db.query(
        `SELECT public.manage_orientation('fixture-one','wrong',NULL,'cancelar')`,
      ),
    );
    await db.query(
      `SELECT public.manage_orientation('fixture-one',NULL,$1,'estado',NULL,NULL,'Realizada')`,
      [doctor],
    );
    await assert.rejects(
      db.query(
        `SELECT public.manage_orientation('fixture-one',repeat('a',64),NULL,'reprogramar','2099-01-01','19:15')`,
      ),
    );
    assert.equal(
      (await db.query(`SELECT estado_atencion FROM public.orientaciones_citas`))
        .rows[0].estado_atencion,
      "Realizada",
    );
    assert.equal(
      (await db.query(`SELECT count(*)::int n FROM public.logs_auditoria`))
        .rows[0].n,
      1,
    );
    await db.query(`select public.set_date_block('2099-01-01',$1,true)`, [
      doctor,
    ]);
    await assert.rejects(reserve("blocked-new-booking", "19:15"));
    assert.equal(
      (await db.query("select count(*)::int n from public.orientaciones_citas"))
        .rows[0].n,
      1,
    );
    await db.query(`select public.set_date_block('2099-01-01',$1,false)`, [
      doctor,
    ]);
    await db.query(`select public.manage_orientation('fixture-one',NULL,$1,'derivacion',NULL,NULL,'Derivada a Dentalink')`,[doctor]);
    await db.query(`select public.manage_orientation('fixture-one',NULL,$1,'derivacion',NULL,NULL,'Sin derivación')`,[doctor]);
    const audit=(await db.query(`select detalle::jsonb as detail from public.logs_auditoria where accion='derivacion' and detalle::jsonb->>'derivation'='Sin derivación'`)).rows[0].detail;
    assert.equal(audit.previous_derivation,'Derivada a Dentalink');
    assert.ok(audit.previous_derived_at);
    assert.equal((await db.query('select estado_atencion from public.orientaciones_citas')).rows[0].estado_atencion,'Realizada');
    await db.exec(
      `RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='${user}'`,
    );
    await assert.rejects(
      db.query("SELECT count(*)::int n FROM public.orientaciones_citas"),
    );
    assert.equal(
      (await db.query("SELECT id FROM public.doctores")).rows[0].id,
      doctor,
    );
    await assert.rejects(
      db.query(
        `UPDATE public.doctores SET auth_user_id='33333333-3333-4333-8333-333333333333'`,
      ),
    );
  } finally {
    await db.close();
  }
});


test("Postgres: upgrade legacy deployed columns without losing existing records", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    const migration=fs.readFileSync("supabase/migrations/20261024174342_harden_patient_access.sql","utf8");
    const marker="-- Reproducible security rules.";
    assert.ok(migration.includes(marker));
    await db.exec(migration.slice(0,migration.indexOf(marker))+"COMMIT;");
    await db.exec(`ALTER TABLE public.doctores DROP COLUMN google_email, DROP COLUMN google_refresh_token, DROP COLUMN google_calendar_id, DROP COLUMN google_conectado;
      ALTER TABLE public.orientaciones_citas DROP COLUMN doctor_id;
      INSERT INTO public.doctores(nombre,email) VALUES('Legacy professional','legacy@example.invalid');
      INSERT INTO public.pacientes(nombre_completo,email,telefono) VALUES('Legacy fixture','fixture@example.invalid','12345678');
      INSERT INTO public.orientaciones_citas(codigo,nombre_paciente,email_paciente,telefono_paciente,fecha,hora)
      VALUES('legacy-fixture','Legacy fixture','fixture@example.invalid','12345678','2099-01-01','19:00:00');
      CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN RETURN; END $$;`);
    await db.exec(migration);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.pacientes")).rows[0].n,1);
    const row=(await db.query("SELECT codigo,hora,doctor_id FROM public.orientaciones_citas")).rows[0];
    assert.equal(row.codigo,'legacy-fixture');assert.equal(row.hora,'19:00');assert.equal(row.doctor_id,null);
    assert.equal((await db.query("SELECT google_conectado FROM public.doctores")).rows[0].google_conectado,false);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') allowed")).rows[0].allowed,false);
    assert.equal((await db.query("SELECT has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') allowed")).rows[0].allowed,false);
  } finally { await db.close(); }
});
