import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {loadTs} from './helpers/load-ts.mjs';
test('RNF-06: private pages preserve 401/403, keep login public, and distinguish an unavailable service',async()=>{
 const auth=loadTs('src/lib/doctor-auth.ts');
 for(const status of [401,403,503]){
  const {proxy}=loadTs('src/proxy.ts',{'@/lib/doctor-auth':{...auth,requireDoctor:async()=>{throw new auth.AccessError(status,'Fixture');}}});
  const result=await proxy(new NextRequest('https://cado.example/admin'));
  assert.equal(result.status,status);assert.match(await result.text(),/href="\/admin\/login"/);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal((await proxy(new NextRequest('https://cado.example/admin/login'))).status,200);
 }
 const {proxy}=loadTs('src/proxy.ts',{'@/lib/doctor-auth':{...auth,requireDoctor:async()=>({doctor:{id:'own'}})}});
 assert.equal((await proxy(new NextRequest('https://cado.example/admin'))).headers.get('x-middleware-next'),'1');
});
