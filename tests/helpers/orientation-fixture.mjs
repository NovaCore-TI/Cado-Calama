import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { NextRequest, NextResponse } from 'next/server.js';
import { loadTs } from './load-ts.mjs';

export async function orientationFixture() {
  const sql = new PGlite();
  try {
    await sql.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    for (const file of ['20261024174342_harden_patient_access.sql', '20261024181312_isolate_doctor_records.sql', '20261030173551_paginate_clinical_records.sql'])
      await sql.exec(fs.readFileSync('supabase/migrations/' + file, 'utf8'));
    const users = [], doctors = [];
    for (let n = 0; n < 2; n++) {
      const user = (await sql.query('INSERT INTO auth.users VALUES(gen_random_uuid()) RETURNING id')).rows[0].id;
      users.push(user);
      doctors.push((await sql.query('INSERT INTO public.doctores(nombre,email,auth_user_id) VALUES($1,$2,$3) RETURNING id',
        ['Fixture ' + n, `doctor${n}@example.invalid`, user])).rows[0].id);
      await sql.query(`INSERT INTO public.orientaciones_citas(codigo,doctor_id,nombre_paciente,email_paciente,telefono_paciente,fecha,hora)
        VALUES($1,$2,'Fixture','fixture@example.invalid','12345678','2099-01-01',$3)`, [n ? 'foreign' : 'own', doctors[n], n ? '19:15' : '19:00']);
    }
    await sql.exec('SET ROLE service_role');
    const db = { async rpc(name, args) {
      const values = name === 'manage_orientation'
        ? [args.p_code,args.p_token,args.p_doctor,args.p_action,args.p_date,args.p_time,args.p_state,args.p_note]
        : [args.p_doctor,args.p_resource,args.p_code,args.p_limit,args.p_offset];
      if (!['manage_orientation','read_doctor_clinical_page'].includes(name)) throw Error('Unexpected RPC');
      try {
        return { data: (await sql.query(`SELECT public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) value`, values)).rows[0].value, error: null };
      } catch (error) { return { data: null, error: { code: error.code } }; }
    } };
    const route = loadTs('src/app/api/orientaciones/route.ts', {
      'next/server': { NextResponse, after() {} },
      '@/lib/server-db': { getServerDatabase: () => db },
      './server-db': { getServerDatabase: () => db },
      '@/lib/calendar-sync': { synchronizeAppointment: async () => ({ status: 'skipped' }) },
      '@/lib/doctor-auth': { ...loadTs('src/lib/doctor-auth.ts'), requireDoctor: async () => ({ doctor: { id: doctors[0] } }) },
    });
    return {
      sql, doctor: doctors[0],
      patch: body => route.PATCH(new NextRequest('https://cado.example/api/orientaciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: 'own', ...body }),
      })),
      list: () => route.GET(new NextRequest('https://cado.example/api/orientaciones')),
      row: async (code = 'own') => (await sql.query('SELECT estado_atencion,estado_derivacion,fecha_derivacion,notas_derivacion FROM public.orientaciones_citas WHERE codigo=$1', [code])).rows[0],
      close: () => sql.close(),
    };
  } catch (error) { await sql.close(); throw error; }
}
