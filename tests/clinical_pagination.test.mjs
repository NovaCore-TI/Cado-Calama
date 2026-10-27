import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { loadTs } from './helpers/load-ts.mjs';

test('Clinical gateway loads the future appointment after 200 historical records and fails visibly on a missing page', async () => {
  const offsets=[];
  const all=Array.from({length:201},(_,i)=>({id:i,date:i===200?'2099-01-01':'2020-01-01'}));
  const {readDoctorRecords}=loadTs('src/lib/doctor-records.ts',{'./server-db':{getServerDatabase:()=>({rpc:async(name,args)=>{
    assert.equal(name,'read_doctor_clinical_page');assert.equal(args.p_doctor,'own');
    offsets.push(args.p_offset);return {data:all.slice(args.p_offset,args.p_offset+args.p_limit),error:null};
  }})}});
  const result=await readDoctorRecords('own','orientaciones');
  assert.equal(result.length,201);assert.equal(result[200].date,'2099-01-01');assert.deepEqual(offsets,[0,200]);
  const failed=loadTs('src/lib/doctor-records.ts',{'./server-db':{getServerDatabase:()=>({rpc:async(_,a)=>a.p_offset?{data:null,error:{code:'outage'}}:{data:all.slice(0,200),error:null}})}});
  await assert.rejects(failed.readDoctorRecords('own','orientaciones'),/todos tus registros/);
});

test('SQL pagination retains professional isolation, validates bounds and forbids public execution',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  for(const file of ['20261024174342_harden_patient_access.sql','20261024181312_isolate_doctor_records.sql','20261030173551_paginate_clinical_records.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  const own='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333';
  await db.exec(`INSERT INTO auth.users VALUES('22222222-2222-4222-8222-222222222222');INSERT INTO public.doctores(id,nombre,email,auth_user_id) VALUES('${own}','Own','own@example.invalid','22222222-2222-4222-8222-222222222222');
   INSERT INTO public.doctores(id,nombre,email) VALUES('${other}','Other','other@example.invalid');
   INSERT INTO public.orientaciones_citas(codigo,doctor_id,nombre_paciente,email_paciente,telefono_paciente,fecha,hora)
   SELECT 'fixture-'||n,'${own}','Fixture','fixture@example.invalid','12345678',CASE WHEN n=201 THEN '2099-01-01'::date ELSE '2020-01-01'::date+n END,'19:00' FROM generate_series(1,201)n;
   INSERT INTO public.orientaciones_citas(codigo,doctor_id,nombre_paciente,email_paciente,telefono_paciente,fecha,hora) VALUES('foreign','${other}','Other','other@example.invalid','12345678','2099-01-01','19:15');SET ROLE service_role;`);
  const read=async(offset)=>(await db.query("SELECT public.read_doctor_clinical_page($1,'orientaciones',null,200,$2) data",[own,offset])).rows[0].data;
  assert.equal((await read(0)).length,200);const next=await read(200);assert.equal(next.length,1);assert.equal(next[0].codigo,'fixture-201');
  await assert.rejects(db.query("SELECT public.read_doctor_clinical_page($1,'orientaciones',null,201,0)",[own]));
  await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(read(0));
 }finally{await db.close();}
});
