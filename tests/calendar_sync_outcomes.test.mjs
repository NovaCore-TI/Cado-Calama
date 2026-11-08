import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

for (const status of ["Sincronizado", "Pendiente_Reintento"]) {
  test(`Calendar worker reports ${status} rather than treating all resolutions as success`, async () => {
    const db = database(({ payload }) => ({ data: payload.sync_lease_id ? {
      id: "fixture", codigo: "fixture", estado_atencion: "Programada", fecha: "2099-01-01", hora: "19:00",
    } : { id: "fixture" }, error: null }));
    const { synchronizeAppointment } = loadTs("src/lib/calendar-sync.ts", {
      "./server-db": { getServerDatabase: () => db },
      "./google-calendar": { createGoogleAppointmentEvent: async () => ({ ok: status === "Sincronizado", status, eventId: "event", meetLink: "https://meet.google.com/fixture" }) },
    });
    assert.equal((await synchronizeAppointment("fixture")).status, status === "Sincronizado" ? "synced" : "pending");
    assert.equal(db.calls[1].payload.estado_sync, status);
    assert.equal(db.calls.at(-1).payload.sync_lease_id, null);
  });
}
test("Calendar scheduler counts pending, skipped and failed results separately", async () => {
  const db = database(() => ({ data: ["synced", "pending", "skipped", "failed"].map(id => ({ id })), error: null }));
  const route = loadTs("src/app/api/internal/calendar-sync/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => db },
    "@/lib/calendar-sync": { synchronizeAppointment: async (id) => { if (id === "failed") throw Error("provider unavailable"); return { status: id }; } },
  }, { CRON_SECRET: "fixture-secret" });
  const response = await route.GET(new NextRequest("https://cado.example/api/internal/calendar-sync", { headers: { authorization: "Bearer fixture-secret" } }));
  assert.deepEqual(await response.json(), { ok: false, attempted: 4, synced: 1, pending: 1, skipped: 1, failed: 1 });
  assert.equal((await route.GET(new NextRequest("https://cado.example/api/internal/calendar-sync"))).status, 401);
});
