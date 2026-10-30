import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

const request = () => new NextRequest("https://cado.example/api/bloques");
test("RF-10: only persisted future blocks that are free are offered", async () => {
  const db = database((s) => ({
    error: null,
    data:
      s.table === "bloques_disponibilidad"
        ? [
            {
              fecha: "2099-01-01",
              hora_inicio: "19:00:00",
              doctor_id: "doctor",
              hora_fin: "19:15:00",
            },
            {
              fecha: "2099-01-01",
              hora_inicio: "19:15:00",
              doctor_id: "doctor",
              hora_fin: "19:30:00",
            },
            {
              fecha: "2000-01-01",
              hora_inicio: "19:00:00",
              doctor_id: "doctor",
              hora_fin: "19:15:00",
            },
          ]
        : s.table === "orientaciones_citas"
          ? [{ fecha: "2099-01-01", hora: "19:00" }]
          : s.table === "doctores"
            ? [{ id: "doctor" }]
            : [],
  }));
  const api = loadTs("src/app/api/bloques/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => db },
  });
  const result = await (await api.GET(request())).json();
  assert.equal(result.slots.length, 1);
  assert.equal(result.slots[0].hora, "19:15");
});
test("RF-10: empty database does not invent availability", async () => {
  const api = loadTs("src/app/api/bloques/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () => database(() => ({ data: [], error: null })),
    },
  });
  const result = await (await api.GET(request())).json();
  assert.equal(result.slots.length, 0);
});
test("RF-11: availability fails closed on database errors", async () => {
  const api = loadTs("src/app/api/bloques/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () =>
        database(() => ({ data: null, error: { message: "fixture outage" } })),
    },
  });
  assert.equal((await api.GET(request())).status, 503);
});
