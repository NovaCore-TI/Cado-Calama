import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";
test("Article metadata cannot terminate a JSON-LD script", () => {
  const api = loadTs("src/lib/site.ts");
  const title = "</script><script>alert(1)</script>";
  const result = api.serializeStructuredData({ title });
  assert.equal(result.includes("<"), false);
  assert.equal(JSON.parse(result).title, title);
});
const request = (url = "/api", body, headers = {}) =>
  new NextRequest("https://cado.example" + url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const routes = ["doctores", "cuestionario", "confort", "auth/status"];
for (const name of routes)
  test(`Private GET ${name} rejects a missing session`, async () => {
    const api = loadTs(`src/app/api/${name}/route.ts`);
    const response = await api.GET(request());
    assert.equal(response.status, 401);
  });
test("Article and availability writes require a session before any database call", async () => {
  for (const route of ["blog", "bloques"]) {
    const api = loadTs(`src/app/api/${route}/route.ts`);
    assert.equal(
      (
        await api.POST(
          request("/api", { titulo: "fixture", fecha: "2099-01-01" }),
        )
      ).status,
      401,
    );
  }
});
test("A valid Auth account without professional membership is forbidden", async () => {
  const db = database();
  db.auth = {
    getUser: async () => ({
      data: { user: { id: "ordinary-user" } },
      error: null,
    }),
  };
  const api = loadTs(
    "src/lib/doctor-auth.ts",
    { "@supabase/supabase-js": { createClient: () => db } },
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
    },
  );
  await assert.rejects(
    api.verifyDoctorToken("valid-user-token"),
    (error) => error.status === 403,
  );
});
test("Invalid JWT is rejected before membership lookup", async () => {
  const db = database();
  db.auth = {
    getUser: async () => ({
      data: { user: null },
      error: { message: "invalid" },
    }),
  };
  const auth = loadTs(
    "src/lib/doctor-auth.ts",
    { "@supabase/supabase-js": { createClient: () => db } },
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
    },
  );
  await assert.rejects(
    auth.verifyDoctorToken("bad"),
    (error) => error.status === 401,
  );
  assert.equal(db.calls.length, 0);
});
test("CSRF origin check rejects cross-origin mutations", () => {
  const auth = loadTs("src/lib/doctor-auth.ts");
  assert.throws(
    () =>
      auth.checkSameOrigin(
        request("/api", {}, { origin: "https://other.example" }),
      ),
    (error) => error.status === 403,
  );
});
test("Patient responses redact management and questionnaire secrets", () => {
  const api = loadTs("src/lib/patient-access.ts");
  const result = api.publicAppointment({
    codigo: "fixture",
    token_gestion: "secret",
    draft_access_token: "draft",
    calendar_event_id: "internal",
    cuestionarios_perfilamiento: { private: true },
  });
  assert.equal(result.codigo, "fixture");
  for (const key of [
    "token_gestion",
    "draft_access_token",
    "calendar_event_id",
    "cuestionarios_perfilamiento",
  ])
    assert.equal(key in result, false);
});
test("Missing consent does not reach the questionnaire database", async () => {
  const api = loadTs("src/app/api/cuestionario/route.ts", {
    "@/lib/server-db": {
      getServerDatabase() {
        throw Error("must not be called");
      },
    },
  });
  const r = await api.POST(
    request("/api/cuestionario", { reason: "fixture", feeling: "nervioso" }),
  );
  assert.equal(r.status, 400);
});
test("Missing consent does not reach comfort persistence", async () => {
  const api = loadTs("src/app/api/confort/route.ts");
  assert.equal(
    (await api.POST(request("/api/confort", { notes: "fixture" }))).status,
    400,
  );
});
test("Codes alone cannot retrieve appointments", async () => {
  const api = loadTs("src/app/api/orientaciones/route.ts");
  assert.equal(
    (await api.GET(request("/api/orientaciones?codigo=CADO-2026-100"))).status,
    401,
  );
});
test("Calendar download requires private token", async () => {
  const api = loadTs("src/app/api/orientaciones/calendar/route.ts");
  assert.equal(
    (await api.GET(request("/api/orientaciones/calendar?codigo=CADO-2026-100")))
      .status,
    401,
  );
});
test("ICS escapes injected properties and rolls over the date", () => {
  const api = loadTs("src/lib/google-calendar.ts");
  const result = api.generateIcsCalendarContent({
    codigo: "fixture",
    fecha: "2099-12-31",
    hora: "23:55",
    patientName: "Ficticio\r\nATTENDEE:mailto:other@example.invalid",
    meetLink: "",
  });
  assert.equal(result.includes("\r\nATTENDEE:"), false);
  assert.ok(result.includes("DTEND;TZID=America/Santiago:21000101T001000"));
  for (const line of result.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
test("Contact and slot validation rejects past or non-virtual blocks", () => {
  const api = loadTs("src/lib/booking-validation.ts");
  assert.equal(api.futureChileSlot("2000-01-01", "19:00"), false);
  assert.equal(api.validDate("2099-99-99"), false);
  assert.equal(api.futureChileSlot("2099-01-01", "03:00"), false);
  assert.equal(api.validContact("Fixture", "bad", "x"), false);
  assert.equal(
    api.validContact("Fixture", "a@example.invalid", "12345678"),
    true,
  );
});
