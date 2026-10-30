import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

test("RF-02: blog loading, outage and recovery are independent of availability failures",async()=>{
  const values=[];let cursor=0,blogFails=false,slotsFail=false;
  const react={createContext:()=>({Provider:"Provider"}),useContext:()=>null,useEffect(){},useCallback:fn=>fn,
    useState(initial){const index=cursor++;if(!(index in values))values[index]=typeof initial==="function"?initial():initial;return[values[index],next=>{values[index]=typeof next==="function"?next(values[index]):next;}];},
    useRef(initial){const index=cursor++;if(!(index in values))values[index]={current:initial};return values[index];}};
  const {CadoProvider}=loadTs("src/context/CadoContext.tsx",{react,"@/lib/supabase":{supabase:{}}},{},{fetch:async url=>{
    if(url==="/api/blog")return Response.json(blogFails?{ok:false,error:"offline"}:{ok:true,data:[{id:"one",titulo:"Publicado",slug:"uno",cuerpo:"Contenido",published_at:"2026-10-20",publicado:true}]},{status:blogFails?503:200});
    if(url==="/api/bloques")return Response.json(slotsFail?{ok:false,error:"offline"}:{ok:true,slots:[]},{status:slotsFail?503:200});
    throw Error("Unexpected call");
  }});
  const render=()=>{cursor=0;return CadoProvider({children:null}).props.value;};
  assert.equal(render().blogLoadState,"loading");
  slotsFail=true;await render().refreshSupabaseData();assert.equal(render().blogLoadState,"ready");assert.equal(render().blogPosts.length,1);
  slotsFail=false;blogFails=true;await render().refreshSupabaseData();assert.equal(render().blogLoadState,"error");
  blogFails=false;await render().refreshSupabaseData();assert.equal(render().blogLoadState,"ready");
});
