import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NextRequest } from "next/server.js";
import { PGlite } from "@electric-sql/pglite";
import { loadTs } from "./helpers/load-ts.mjs";

test("Professional login atomically admits five attempts, blocks fifteen minutes, resets on success and denies public RPC access", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE supabase_auth_admin; CREATE TABLE public.doctores(id uuid PRIMARY KEY); CREATE TABLE public.guias_clinicas(id uuid,revisado_por uuid REFERENCES doctores(id));");
    const file = fs.readdirSync("supabase/migrations").find(name => name.endsWith("_enforce_professional_login_limits.sql"));
    await db.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
    await db.exec("SET ROLE service_role");
    const begin = () => db.query("SELECT public.begin_professional_login(ARRAY['account-fixture','network-fixture']) result");
    const parallel = await Promise.all(Array.from({ length: 20 }, begin));
    assert.equal(parallel.filter(result => result.rows[0].result.allowed).length, 5);
    const blocked = (await begin()).rows[0].result;
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retry_after > 890 && blocked.retry_after <= 900);
    await db.exec("RESET ROLE; UPDATE cado_security.login_attempts SET blocked_until=now()-interval '1 second'; SET ROLE service_role");
    assert.equal((await begin()).rows[0].result.allowed, true);
    await db.exec("SELECT public.complete_professional_login(ARRAY['account-fixture','network-fixture'])");
    assert.equal((await begin()).rows[0].result.allowed, true);
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(begin());
    await assert.rejects(db.query("SELECT * FROM cado_security.login_attempts"));
    await db.exec("RESET ROLE; SET ROLE supabase_auth_admin");
    const hook = valid => db.query("SELECT cado_security.password_verification_hook(jsonb_build_object('user_id','11111111-1111-4111-8111-111111111111','valid',$1::boolean)) result", [valid]);
    for (let i = 0; i < 5; i++) assert.equal((await hook(false)).rows[0].result.decision, "continue");
    assert.equal((await hook(true)).rows[0].result.decision, "reject");
    await db.exec("RESET ROLE; UPDATE cado_security.login_attempts SET blocked_until=now()-interval '1 second'; SET ROLE supabase_auth_admin");
    assert.equal((await hook(true)).rows[0].result.decision, "continue");
  } finally { await db.close(); }
});
test("A Supabase token alone cannot establish a session outside the limited login endpoint", async () => {
  const route = loadTs("src/app/api/auth/session/route.ts");
  const response = await route.POST(new NextRequest("https://cado.example/api/auth/session", { method: "POST", headers: { authorization: "Bearer direct-provider-token" } }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});
test("A blocked login never sends the password to Auth and returns Retry-After", async () => {
  let contacted = false;
  const route = loadTs("src/app/api/auth/login/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => ({ rpc: async () => ({ data: { allowed: false, retry_after: 899 } }) }) },
    "@supabase/supabase-js": { createClient: () => { contacted = true; throw Error("Must not contact Auth"); } },
  }, { CADO_SESSION_SECRET: "x".repeat(64) });
  const response = await route.POST(new NextRequest("https://cado.example/api/auth/login", { method: "POST", body: JSON.stringify({ email: "fixture@example.invalid", password: "fake-password" }) }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "899");
  assert.equal(contacted, false);
});
test("Login counters use opaque account keys and do not trust arbitrary forwarded IP headers", () => {
  const { loginLimitKeys } = loadTs("src/lib/login-limits.ts", {}, { CADO_SESSION_SECRET: "x".repeat(64) });
  const first = loginLimitKeys(new NextRequest("https://cado.example", { headers: { "x-forwarded-for": "spoof-one" } }), "FIXTURE@example.invalid");
  const second = loginLimitKeys(new NextRequest("https://cado.example", { headers: { "x-forwarded-for": "spoof-two" } }), "fixture@example.invalid");
  assert.deepEqual(first, second);
  assert.match(first[0], /^[a-f0-9]{64}$/);
});
