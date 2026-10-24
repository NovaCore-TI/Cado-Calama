import test from "node:test";
import assert from "node:assert/strict";
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
  ])
    assert.equal((await api.POST(request(body))).status, 400);
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
