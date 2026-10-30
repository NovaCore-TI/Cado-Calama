import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest, NextResponse } from "next/server.js";
import { loadTs } from "./helpers/load-ts.mjs";
import { transport } from "./helpers/pglite-rest.mjs";

test("RF-06/07/08/09: consent, optional answers and private draft bind exactly once to the patient booking", async () => {
  const sql=new PGlite();
  try {
    await sql.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE ROLE supabase_auth_admin;
      CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
    for(const file of (await fs.readdir("supabase/migrations")).filter(file=>file.endsWith(".sql")).sort())await sql.exec(await fs.readFile("supabase/migrations/"+file,"utf8"));
    await sql.exec(`INSERT INTO auth.users VALUES('22222222-2222-4222-8222-222222222222');
      INSERT INTO public.doctores(id,nombre,email,auth_user_id) VALUES('11111111-1111-4111-8111-111111111111','Fixture','doctor@example.invalid','22222222-2222-4222-8222-222222222222');
      INSERT INTO public.bloques_disponibilidad(doctor_id,fecha,hora_inicio,hora_fin) VALUES
      ('11111111-1111-4111-8111-111111111111','2099-01-01','19:00','19:15'),('11111111-1111-4111-8111-111111111111','2099-01-01','19:15','19:30');SET ROLE service_role;`);
    const mocks={"@/lib/server-db":{getServerDatabase:()=>transport(sql)},"next/server":{NextRequest,NextResponse,after(){}}};
    mocks["./server-db"]=mocks["@/lib/server-db"];
    const questionnaire=loadTs("src/app/api/cuestionario/route.ts",mocks),comfort=loadTs("src/app/api/confort/route.ts",mocks),booking=loadTs("src/app/api/orientaciones/route.ts",mocks);
    const request=(path,body,cookie="")=>new NextRequest("https://cado.example/api/"+path,{method:"POST",headers:{"content-type":"application/json",cookie},body:JSON.stringify(body)});
    const answers={reason:"Quiero conversar con calma",feeling:"Prefiero no responder",consent:true};
    assert.equal((await questionnaire.POST(request("cuestionario",{...answers,consent:false}))).status,400);
    assert.equal((await sql.query("SELECT count(*)::int n FROM public.cuestionarios_perfilamiento")).rows[0].n,0);
    const saved=await questionnaire.POST(request("cuestionario",answers));assert.equal(saved.status,201);
    const body=await saved.json(),id=body.data.id;
    assert.equal(body.data.draft_access_token,undefined);
    const cookie="cado_questionnaire_draft="+saved.cookies.get("cado_questionnaire_draft").value;
    assert.match(saved.headers.get("set-cookie"),/HttpOnly/i);
    assert.match(saved.headers.get("set-cookie"),/SameSite=strict/i);
    let row=(await sql.query("SELECT * FROM public.cuestionarios_perfilamiento WHERE id=$1",[id])).rows[0];
    assert.equal(row.nivel_temor,"no_responde");assert.equal(row.respuestas_adicionales.previousExperience,"Prefiero no responder");
    assert.equal((await comfort.POST(request("confort",{cuestionarioId:id,consent:false},cookie))).status,400);
    assert.equal((await comfort.POST(request("confort",{cuestionarioId:id,consent:true},""))).status,403);
    assert.equal((await comfort.POST(request("confort",{cuestionarioId:id,consent:true,soundPreference:"silencio",jawBreaks:true,companionAllowed:true,explanationStepByStep:false,notes:"Pausas breves"},cookie))).status,200);
    const data={patientName:"Paciente de prueba",email:"patient@example.invalid",phone:"12345678",consent:true,date:"2099-01-01",time:"19:00",cuestionarioId:id,comfortProfile:{anxietyLevel:"no_responde",soundPreference:"silencio",jawBreaks:true,companionAllowed:true,explanationStepByStep:false}};
    assert.equal((await booking.POST(request("orientaciones",data))).status,403);
    assert.equal((await booking.POST(request("orientaciones",{...data,consent:false},cookie))).status,400);
    const reserved=await booking.POST(request("orientaciones",data,cookie));assert.equal(reserved.status,201);
    const appointment=(await sql.query("SELECT * FROM public.orientaciones_citas")).rows[0];
    row=(await sql.query("SELECT * FROM public.cuestionarios_perfilamiento WHERE id=$1",[id])).rows[0];
    assert.equal(row.paciente_id,appointment.paciente_id);assert.equal(appointment.cuestionario_id,id);assert.equal(row.draft_access_token,null);
    assert.equal(appointment.preferencias_confort.explanationStepByStep,false);assert.equal(appointment.preferencias_confort.soundPreference,"silencio");
    assert.equal((await booking.POST(request("orientaciones",{...data,time:"19:15"},cookie))).status,403);
    assert.equal((await sql.query("SELECT count(*)::int n FROM public.pacientes")).rows[0].n,1);
    const expired=await questionnaire.POST(request("cuestionario",answers));const expiredId=(await expired.json()).data.id;
    await sql.query("UPDATE public.cuestionarios_perfilamiento SET created_at=now()-interval '2 days' WHERE id=$1",[expiredId]);
    const expiredCookie="cado_questionnaire_draft="+expired.cookies.get("cado_questionnaire_draft").value;
    assert.equal((await booking.POST(request("orientaciones",{...data,time:"19:15",cuestionarioId:expiredId},expiredCookie))).status,403);
    assert.equal((await questionnaire.GET(new NextRequest("https://cado.example/api/cuestionario"))).status,401);
    assert.equal((await comfort.GET(new NextRequest("https://cado.example/api/confort"))).status,401);
  } finally {await sql.close();}
});
