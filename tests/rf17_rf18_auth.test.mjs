import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs } from "./helpers/load-ts.mjs";

test("RF-18: professional session is HttpOnly, SameSite and expires in thirty minutes", async () => {
  // Use the actual NextResponse to check cookie serialization.
  const real = loadTs(
    "src/lib/doctor-auth.ts",
    {},
    { CADO_SESSION_SECRET: "x".repeat(64) },
  );
  const guarded = loadTs("src/app/api/auth/session/route.ts", {
    "@/lib/doctor-auth": {
      ...real,
      verifyDoctorToken: async () => ({ doctor: { id: "fixture" } }),
    },
  });
  const r = await guarded.POST(
    new NextRequest("https://cado.example/api/auth/session", {
      method: "POST",
      headers: { authorization: "Bearer fixture" },
    }),
  );
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=1800/);
  assert.match(cookie, /Secure/);
});
test("RF-18: server rejects expired or forged sessions even when a cookie is replayed", () => {
  const auth = loadTs(
    "src/lib/doctor-auth.ts",
    {},
    { CADO_SESSION_SECRET: "x".repeat(64) },
  );
  const value = auth.issueProfessionalSession("fixture-jwt", 1000);
  assert.equal(auth.readProfessionalSession(value, 1001), "fixture-jwt");
  assert.throws(
    () => auth.readProfessionalSession(value, 1801000),
    (error) => error.status === 401,
  );
  assert.throws(
    () => auth.readProfessionalSession(value.slice(0, -3) + "abc", 1001),
    (error) => error.status === 401,
  );
});
test("RF-18: signout removes the server session", async () => {
  const api = loadTs("src/app/api/auth/session/route.ts");
  const response = await api.DELETE(
    new NextRequest("https://cado.example/api/auth/session", {
      method: "DELETE",
    }),
  );
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
