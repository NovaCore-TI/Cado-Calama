import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

const request = (body) =>
  new NextRequest("https://cado.example/api/orientaciones", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("RF-14: short code without private token cannot modify an appointment", async () => {
  const api = loadTs("src/app/api/orientaciones/route.ts");
  assert.equal(
    (await api.PATCH(request({ codigo: "CADO-2026-100", action: "cancelar" })))
      .status,
    401,
  );
});
test("RF-14: wrong private token yields no appointment", async () => {
  const api = loadTs("src/app/api/orientaciones/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async () => ({ data: null, error: { code: "P0002" } }),
      }),
    },
  });
  assert.equal(
    (
      await api.PATCH(
        request({
          codigo: "fixture",
          tokenGestion: "a".repeat(64),
          action: "cancelar",
        }),
      )
    ).status,
    404,
  );
});
test("RF-15: occupied replacement yields conflict without syncing Google", async () => {
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
  assert.equal(
    (
      await api.PATCH(
        request({
          codigo: "fixture",
          tokenGestion: "a".repeat(64),
          action: "reprogramar",
          nuevaFecha: "2099-01-01",
          nuevaHora: "19:00",
        }),
      )
    ).status,
    409,
  );
  assert.equal(syncs, 0);
});
