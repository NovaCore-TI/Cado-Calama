// Read-only characterization of pending defects; no requests to real patient services.
import fs from 'node:fs';
import { NextRequest } from 'next/server.js';
import { loadTs, database } from '../tests/helpers/load-ts.mjs';

const results=[];
const request=(path,body)=>new NextRequest('https://fixture.invalid'+path,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
for(const [name,reply] of [['empty',{data:[],error:null}],['outage',{data:null,error:{code:'OUTAGE'}}]]){
 const db=database(()=>reply);
 const route=loadTs('src/app/api/recursos/route.ts',{'@/lib/supabase':{supabase:db}});
 const response=await route.GET();const body=await response.json();
 results.push({probe:'resources_catalog_'+name,status:response.status,source:body.source,advertisedGuides:body.data.length});
}
const denied=database(()=>({data:null,error:{code:'42501',message:'fixture denied'}}));
for(const [routeName,payload] of [['recursos',{guiaId:'not-a-real-guide'}],['urgencias',{canal:'whatsapp',motivo:'fixture'}]]){
 const route=loadTs(`src/app/api/${routeName}/route.ts`,{'@/lib/supabase':{supabase:denied}});
 const response=await route.POST(request('/api/'+routeName,payload));
 results.push({probe:routeName+'_logging_denied',status:response.status,...await response.json()});
}
const download=loadTs('src/app/api/recursos/download/route.ts',{'@/lib/supabase':{supabase:denied}});
for(const id of ['guia-post-exodoncia','../../.env.local','__proto__','constructor']){
 try{const response=await download.GET(request('/api/recursos/download?id='+encodeURIComponent(id)));results.push({probe:'download_allowlist',input:id,status:response.status,contentType:response.headers.get('content-type')});}
 catch(error){results.push({probe:'download_allowlist',input:id,unhandledError:error.name,message:error.message});}
}
const colors=[['muted_public_text','#9ca3af','#ffffff'],['footer_note','#9ca3af','#513d49'],['primary_button','#ffffff','#a14b92']];
const workerDb=database(state=>({error:null,data:state.payload?.sync_lease_id?{
 id:'fixture',doctor_id:'doctor',codigo:'fixture',fecha:'2099-01-01',hora:'19:00',estado_atencion:'Programada',
 estado_sync:'Pendiente_Reintento',calendar_event_id:null,meet_link:'',nombre_paciente:'Fixture',
 email_paciente:'fixture@example.invalid',telefono_paciente:'12345678',intentos_sync:0,
}:null}));
const worker=loadTs('src/lib/calendar-sync.ts',{
 './server-db':{getServerDatabase:()=>workerDb},
 './google-calendar':{googleEventId:()=> 'fixture',createGoogleAppointmentEvent:async()=>({ok:true,status:'Pendiente_Reintento',eventId:null,meetLink:''})}
});
const processor=loadTs('src/app/api/internal/calendar-sync/route.ts',{
 '@/lib/server-db':{getServerDatabase:()=>database(()=>({data:[{id:'fixture'}],error:null}))},
 '@/lib/calendar-sync':worker,
 '@/lib/doctor-auth':{requireDoctor:async()=>({doctor:{id:'doctor'}}),privateJson:v=>Response.json(v),accessFailure:()=>new Response(null,{status:503})}
});
const retryResponse=await processor.POST(request('/api/internal/calendar-sync',{}));
results.push({probe:'retry_processor_pending_result',response:await retryResponse.json(),persistedState:workerDb.calls.find(c=>c.payload?.estado_sync)?.payload.estado_sync});
const lum=hex=>{const x=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return x[0]*.2126+x[1]*.7152+x[2]*.0722;};
for(const [name,foreground,background]of colors){const a=lum(foreground),b=lum(background);results.push({probe:'contrast',name,foreground,background,ratio:Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(3))});}
fs.mkdirSync('audit/pending-2026-10-24',{recursive:true});
fs.writeFileSync('audit/pending-2026-10-24/handler-probes.json',JSON.stringify({date:'2026-10-24',mode:'local handlers with isolated database peers; no real writes',results},null,2));
console.log(JSON.stringify(results,null,2));
