// Run with npm run test:concurrency against an EMPTY, disposable local database:
// CADO_TEST_DATABASE_URL=postgres://postgres:password@127.0.0.1:5432/cado_rf11_ci
// This executes the real POST handler and SQL migrations. Only the RPC transport
// is adapted from Supabase to pg; Google callbacks are captured, never executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { NextRequest, NextResponse } from 'next/server.js';
import { loadTs } from '../helpers/load-ts.mjs';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
test('RF-11: twenty overlapping HTTP reservations yield one booking and nineteen conflicts in PostgreSQL', { timeout: 60000 }, async t => {
  assert.ok(process.env.CADO_TEST_DATABASE_URL, 'Set CADO_TEST_DATABASE_URL to a disposable local database; this test never skips silently');
  const url = new URL(process.env.CADO_TEST_DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only local PostgreSQL is allowed');
  assert.match(url.pathname, /^\/cado_rf11_[a-z0-9_]+$/, 'Use a dedicated cado_rf11_ database');
  const prefix = 'cado-rf11-' + randomUUID();
  const config = { connectionString: url.toString(), connectionTimeoutMillis: 5000, statement_timeout: 30000 };
  const monitor = new pg.Client(config), gate = new pg.Client(config), workers = [];
  let server, resultsPromise, gateConnected = false;
  try {
    await monitor.connect();
    assert.equal((await monitor.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n, 0, 'Database must be empty');
    // Match Supabase roles and auth contracts without contacting a real project.
    await monitor.query(`DO $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin; END IF;
    END $$;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
    const migrationFiles = (await fs.readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
    for (const file of migrationFiles) await monitor.query(await fs.readFile('supabase/migrations/' + file, 'utf8'));
    const doctor = '11111111-1111-4111-8111-111111111111';
    await monitor.query(`INSERT INTO auth.users VALUES('22222222-2222-4222-8222-222222222222');
      INSERT INTO public.doctores(id,nombre,email,auth_user_id) VALUES('${doctor}','Fixture RF11','doctor@example.invalid','22222222-2222-4222-8222-222222222222');
      INSERT INTO public.bloques_disponibilidad(doctor_id,fecha,hora_inicio,hora_fin) VALUES('${doctor}','2099-01-01','19:00','19:15');`);
    for (let i = 0; i < 20; i++) {
      const client = new pg.Client({ ...config, application_name: prefix });
      workers.push(client);
      await client.connect();
      await client.query('SET ROLE service_role');
    }
    let calls = 0;
    const scheduled = [];
    const rpc = async (name, args) => {
      assert.equal(name, 'reserve_orientation');
      const client = workers[calls++];
      assert.ok(client, 'No extra database booking call');
      try {
        const result = await client.query('SELECT public.reserve_orientation($1::date,$2::time,$3,$4,$5,$6,$7,$8::uuid,$9::jsonb) AS appointment',
          [args.p_date,args.p_time,args.p_name,args.p_email,args.p_phone,args.p_code,args.p_token,args.p_questionnaire,JSON.stringify(args.p_comfort)]);
        return { data: result.rows[0].appointment, error: null };
      } catch (error) { return { data: null, error: { code: error.code } }; }
    };
    const { POST } = loadTs('src/app/api/orientaciones/route.ts', {
      '@/lib/server-db': { getServerDatabase: () => ({ rpc }) },
      'next/server': { NextRequest, NextResponse, after: callback => scheduled.push(callback) },
      '@/lib/calendar-sync': { synchronizeAppointment: () => { throw Error('Google must not run in this test'); } },
    });
    server = createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const response = await POST(new NextRequest(`http://127.0.0.1:${server.address().port}/api/orientaciones`, {
          method: 'POST', headers: req.headers, body: Buffer.concat(chunks).toString('utf8'),
        }));
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      } catch { res.writeHead(500); res.end('Test bridge failed'); }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    await gate.connect();
    gateConnected = true;
    await gate.query('BEGIN');
    await gate.query("SELECT pg_advisory_xact_lock(hashtext('2099-01-01'))");
    const start = performance.now();
    resultsPromise = Promise.all(Array.from({ length: 20 }, (_, i) => fetch(`http://127.0.0.1:${server.address().port}/api/orientaciones`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ patientName: 'Fixture RF11 ' + i, email: `fixture-${i}@example.invalid`, phone: '12345678', consent: true, date: '2099-01-01', time: '19:00' }),
    }).then(async response => ({ status: response.status, body: await response.json() }))));
    // Observe the twenty independent database sessions simultaneously waiting on
    // the same lock BEFORE releasing them. Promise.all alone is not evidence.
    resultsPromise.catch(() => {});
    let simultaneous = 0;
    const deadline = Date.now() + 20000;
    do {
      simultaneous = (await monitor.query("SELECT count(*)::int n FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND wait_event='advisory'", [prefix])).rows[0].n;
      if (simultaneous === 20) break;
      await pause(50);
    } while (Date.now() < deadline);
    assert.equal(simultaneous, 20, 'All twenty SQL sessions must overlap before releasing the gate');
    await gate.query('COMMIT');
    const results = await resultsPromise;
    assert.equal(calls, 20);
    assert.equal(results.filter(r => r.status === 201).length, 1);
    assert.equal(results.filter(r => r.status === 409).length, 19);
    assert.ok(results.filter(r => r.status === 409).every(r => r.body.ok === false));
    const winner = results.find(r => r.status === 201).body.data;
    assert.equal(winner.estado_atencion, 'Programada');
    assert.equal(winner.estado_sync, 'Pendiente_Reintento');
    assert.match(winner.token_gestion, /^[a-f0-9]{64}$/);
    const counts = (await monitor.query(`SELECT
      (SELECT count(*)::int FROM public.orientaciones_citas) AS appointments,
      (SELECT count(*)::int FROM public.pacientes) AS patients,
      (SELECT count(*)::int FROM public.orientaciones_citas WHERE estado_atencion='Programada' AND fecha='2099-01-01' AND hora::time='19:00'::time) AS active_bookings`)).rows[0];
    assert.deepEqual(counts, { appointments: 1, patients: 1, active_bookings: 1 });
    assert.equal(scheduled.length, 1, 'Only the committed booking may schedule external work');
    t.diagnostic(JSON.stringify({ sessions: simultaneous, http201: 1, http409: 19, ...counts, googleCalls: 0, elapsedMs: Math.round(performance.now() - start), migrations: migrationFiles.length }));
  } finally {
    if (gateConnected) await gate.query('ROLLBACK').catch(() => {});
    await gate.end().catch(() => {});
    if (resultsPromise) await resultsPromise.catch(() => {});
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await Promise.all(workers.map(c => c.end().catch(() => {})));
    await monitor.end().catch(() => {});
  }
});
