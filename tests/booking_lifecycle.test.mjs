import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest, NextResponse } from "next/server.js";
import { loadTs } from "./helpers/load-ts.mjs";

// Only the PostgREST transport is adapted. Route validation and production SQL
// functions run unchanged against an isolated PostgreSQL-compatible database.
function transport(sql) {
  return {
    async rpc(name, args) {
      try {
        const values = name === "reserve_orientation"
          ? [args.p_date,args.p_time,args.p_name,args.p_email,args.p_phone,args.p_code,args.p_token,args.p_questionnaire,JSON.stringify(args.p_comfort)]
          : [args.p_code,args.p_token,args.p_doctor,args.p_action,args.p_date,args.p_time,args.p_state,args.p_note];
        assert(["reserve_orientation", "manage_orientation"].includes(name));
        const result = await sql.query(`SELECT public.${name}(${values.map((_,i)=>`$${i+1}`).join(",")}) AS value`, values);
        return { data: result.rows[0].value, error: null };
      } catch(error) { return { data: null, error: { code:error.code } }; }
    },
    from(table) {
      assert(["orientaciones_citas","bloques_disponibilidad","fechas_bloqueadas","doctores","cuestionarios_perfilamiento"].includes(table));
      const filters=[],values=[]; let columns="*",single=false;
      const field = name => { assert.match(name,/^[a-z_]+$/); return `"${name}"`; };
      const compare = (key,operator,value) => { filters.push(`${field(key)} ${operator} $${values.push(value)}`); return query; };
      const query = {
        select(value) { assert.match(value,/^(\*|[a-z_,]+)$/); columns=value; return query; },
        eq:(key,value)=>compare(key,"=",value), gte:(key,value)=>compare(key,">=",value), lte:(key,value)=>compare(key,"<=",value),
        not(key,operator,value) { assert.equal(operator,"is");assert.equal(value,null);filters.push(`${field(key)} IS NOT NULL`);return query; },
        maybeSingle() { single=true;return query; },
        then(resolve,reject) { return sql.query(`SELECT ${columns} FROM public.${field(table)}${filters.length?" WHERE "+filters.join(" AND "):""}`,values)
          .then(result=>{
            // PostgREST serializes date columns; the native driver returns Date.
            const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?(key==="fecha"?value.toISOString().slice(0,10):value.toISOString()):value])));
            return {data:single?rows[0]||null:rows,error:null};
          },error=>({data:null,error:{code:error.code}})).then(resolve,reject); },
      };
      return query;
    },
  };
}

test("Sprint 2: reserve, collision, atomic reschedule and cancellation preserve data and release availability", async () => {
  const sql=new PGlite();
  try {
    await sql.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE ROLE supabase_auth_admin;
      CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
    for(const file of (await fs.readdir("supabase/migrations")).filter(file=>file.endsWith(".sql")).sort())
      await sql.exec(await fs.readFile("supabase/migrations/"+file,"utf8"));
    const doctor="11111111-1111-4111-8111-111111111111";
    await sql.exec(`INSERT INTO auth.users VALUES('22222222-2222-4222-8222-222222222222');
      INSERT INTO public.doctores(id,nombre,email,auth_user_id) VALUES('${doctor}','Fixture Sprint 2','doctor@example.invalid','22222222-2222-4222-8222-222222222222');
      INSERT INTO public.bloques_disponibilidad(doctor_id,fecha,hora_inicio,hora_fin) VALUES
      ('${doctor}','2099-01-01','19:00','19:15'),('${doctor}','2099-01-01','19:15','19:30'),('${doctor}','2099-01-01','19:30','19:45');SET ROLE service_role;`);
    const scheduled=[];
    const mocks={"@/lib/server-db":{getServerDatabase:()=>transport(sql)},"next/server":{NextRequest,NextResponse,after:callback=>scheduled.push(callback)}};
    const api=loadTs("src/app/api/orientaciones/route.ts",mocks);
    const blocks=loadTs("src/app/api/bloques/route.ts",mocks);
    const request=(method,body,token)=>new NextRequest("https://cado.example/api/orientaciones",{method,headers:{"content-type":"application/json",...(token?{"x-management-token":token}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const available=async()=>{const r=await blocks.GET(new NextRequest("https://cado.example/api/bloques?fecha=2099-01-01"));assert.equal(r.status,200);return (await r.json()).slots.map(slot=>slot.hora);};
    const reserve=async time=>{const r=await api.POST(request("POST",{patientName:"Fixture Sprint 2",email:"patient@example.invalid",phone:"12345678",consent:true,date:"2099-01-01",time,comfortProfile:{notes:"Conservar mis preferencias",jawBreaks:true}}));return {status:r.status,...await r.json()};};
    assert.deepEqual(await available(),["19:00","19:15","19:30"]);
    const first=await reserve("19:00");assert.equal(first.status,201);
    const token=first.data.token_gestion,code=first.data.codigo;
    assert.equal(first.data.estado_sync,"Pendiente_Reintento");
    assert.equal((await reserve("19:00")).status,409);
    assert.equal((await sql.query("SELECT count(*)::int AS n FROM public.pacientes")).rows[0].n,1);
    assert.deepEqual(await available(),["19:15","19:30"]);
    const second=await reserve("19:15");assert.equal(second.status,201);
    const conflict=await api.PATCH(request("PATCH",{codigo:code,action:"reprogramar",nuevaFecha:"2099-01-01",nuevaHora:"19:15"},token));
    assert.equal(conflict.status,409);
    let read=await api.GET(request("GET",null,token));let saved=(await read.json()).data;
    assert.equal(saved.hora,"19:00");assert.equal(saved.token_gestion,undefined);
    assert.equal(saved.preferencias_confort.notes,"Conservar mis preferencias");
    assert.equal((await api.PATCH(request("PATCH",{codigo:code,action:"reprogramar",nuevaFecha:"2099-01-01",nuevaHora:"19:30"},"f".repeat(64)))).status,404);
    assert.equal((await api.PATCH(request("PATCH",{codigo:code,action:"reprogramar",nuevaFecha:"2099-01-01",nuevaHora:"19:30"},token))).status,200);
    assert.deepEqual(await available(),["19:00"]);
    read=await api.GET(request("GET",null,token));saved=(await read.json()).data;
    assert.equal(saved.hora,"19:30");assert.equal(saved.preferencias_confort.notes,"Conservar mis preferencias");
    assert.equal((await api.PATCH(request("PATCH",{codigo:code,action:"cancelar"},token))).status,200);
    assert.deepEqual(await available(),["19:00","19:30"]);
    assert.equal((await reserve("19:30")).status,201);
    assert.equal((await sql.query("SELECT count(*)::int AS n FROM public.orientaciones_citas WHERE estado_atencion='Programada' AND hora='19:30'")).rows[0].n,1);
    assert.equal((await api.PATCH(request("PATCH",{codigo:code,action:"reprogramar",nuevaFecha:"2099-01-01",nuevaHora:"19:00"},token))).status,409);
    assert.equal(scheduled.length,5,"Only committed bookings, reschedule and cancellation schedule Google");
  } finally {await sql.close();}
});
