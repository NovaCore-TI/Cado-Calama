import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

const payload = {
  patientName: "Ficticio",
  email: "a@example.invalid",
  phone: "12345678",
  date: "2099-01-01",
  time: "19:00",
  consent: true,
};
const request = (body) =>
  new NextRequest("https://cado.example/api/orientaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("RF-12: RUT and missing consent are rejected before persistence", async () => {
  const api = loadTs("src/app/api/orientaciones/route.ts");
  for (const body of [
    { ...payload, rut: "fake" },
    { ...payload, consent: false },
    { ...payload, phone: "--------" },
  ])
    assert.equal((await api.POST(request(body))).status, 400);
});

test("A saved reservation can be recovered and replayed by its own attempt, with one write", async () => {
  const attempt = randomBytes(32).toString("hex");
  const inbox = new Map();
  const jobs = [];
  let inserts = 0;
  const db = database((query) => ({
    data: inbox.get(query.filters.find((filter) => filter[1] === "token_gestion")?.[2]) ?? null,
    error: null,
  }));
  db.rpc = async (_name, args) => {
    if (inbox.has(args.p_token)) return { data: null, error: { code: "23505" } };
    const data = { id: "fixture", codigo: args.p_code, nombre_paciente: args.p_name, token_gestion: args.p_token };
    inserts++;
    inbox.set(args.p_token, data);
    return { data, error: null };
  };
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "next/server": { NextResponse, after: (job) => jobs.push(job) },
    "@/lib/server-db": { getServerDatabase: () => db },
  }, { CADO_SESSION_SECRET: "fixture-session-key-with-at-least-32-characters" });
  const url = "https://cado.example/api/orientaciones";
  const post = () => api.POST(new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-booking-attempt": attempt },
    body: JSON.stringify(payload),
  }));
  const lookup = (key) => api.GET(new NextRequest(url, { headers: { "x-booking-attempt": key } }));

  const [first, second] = await Promise.all([post(), post()]);
  assert.deepEqual([first.status, second.status].sort(), [200, 201]);
  const original = (await first.json()).data;
  assert.deepEqual((await second.json()).data, original);
  assert.equal(inserts, 1);
  assert.equal(jobs.length, 1);
  assert.notEqual(original.token_gestion, attempt);
  assert.deepEqual((await (await lookup(attempt)).json()).data, original);
  assert.equal((await lookup(randomBytes(32).toString("hex"))).status, 404);
});
test("RF-11/12: database collision yields 409 and creates no Google event", async () => {
  let syncs = 0;
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async () => ({ data: null, error: { code: "23505" } }),
      }),
    },
    "@/lib/calendar-sync": {
      synchronizeAppointment: async () => {
        syncs++;
      },
    },
  });
  assert.equal((await api.POST(request(payload))).status, 409);
  assert.equal(syncs, 0);
});
test("RF-12: unavailable database never confirms a booking", async () => {
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async () => ({ data: null, error: { code: "08006" } }),
      }),
    },
  });
  const response = await api.POST(request(payload));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test("TES preserves validated preferences through the booking RPC", async () => {
  const { TES_QUESTIONS } = loadTs("src/lib/tes-preferences.ts");
  const answers = Object.fromEntries(TES_QUESTIONS.map(({ key, options }) => [key, options[0]]));
  answers.music = "Elección musical propia";
  answers.artists = "  Artista de prueba  ";
  answers.message = "  Mensaje personal de prueba  ";
  let persisted;
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "next/server": { NextResponse, after: () => {} },
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async (_name, args) => {
          persisted = args.p_comfort;
          return { data: { id: "fixture", codigo: "fixture" }, error: null };
        },
      }),
    },
  });
  const response = await api.POST(request({
    ...payload,
    comfortProfile: { tes: { ...answers, unexpected: "discarded" } },
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(structuredClone(persisted.tes), {
    ...answers, artists: answers.artists.trim(), message: answers.message.trim(),
  });
});
test("RF-16: confirmation is returned before any external calendar work", async () => {
  const jobs = [];
  let calendarCalls = 0;
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "next/server": { NextResponse, after: (job) => jobs.push(job) },
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async () => ({
          data: {
            id: "fixture",
            codigo: "fixture",
            estado_atencion: "Programada",
            estado_sync: "Pendiente_Reintento",
          },
          error: null,
        }),
      }),
    },
    "@/lib/calendar-sync": {
      synchronizeAppointment: async () => {
        calendarCalls++;
        throw Error("fixture Google outage");
      },
    },
  });
  const response = await api.POST(request(payload));
  assert.equal(response.status, 201);
  assert.equal(calendarCalls, 0);
  assert.equal(jobs.length, 1);
  await jobs[0]();
  assert.equal(calendarCalls, 1);
  const result = await response.json();
  assert.equal(result.data.estado_sync, "Pendiente_Reintento");
  assert.equal(result.syncedToSupabase, true);
});
