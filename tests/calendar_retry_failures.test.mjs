import test from "node:test";
import assert from "node:assert/strict";
import { loadTs, database } from "./helpers/load-ts.mjs";

for (const state of ["Programada", "Cancelada"]) {
  test(`RF-16: a thrown provider error preserves ${state}, counts the attempt and releases the lease`, async () => {
    const row = { id: "fixture", doctor_id: "doctor", codigo: "code", fecha: "2099-01-01", hora: "19:00", estado_atencion: state, intentos_sync: 2 };
    const db = database(({ table, payload }) => ({ data: table === "logs_auditoria" ? null : payload.sync_lease_id ? row : { id: row.id }, error: null }));
    const providerFailure = async () => { throw Error("PRIVATE_TOKEN_AND_PATIENT_EMAIL"); };
    const worker = loadTs("src/lib/calendar-sync.ts", {
      "./server-db": { getServerDatabase: () => db },
      "./google-calendar": { createGoogleAppointmentEvent: providerFailure, cancelGoogleAppointmentEvent: providerFailure, googleEventId: () => "event" },
    });
    assert.equal((await worker.synchronizeAppointment(row.id)).status, "pending");
    const update = db.calls.find(call => call.payload?.estado_sync);
    assert.equal(update.payload.estado_sync, "Pendiente_Reintento");
    assert.equal(update.payload.intentos_sync, 3);
    assert.equal(update.payload.estado_atencion, undefined);
    const audit = db.calls.find(call => call.table === "logs_auditoria");
    assert.equal(audit.payload.entidad_id, row.id);
    assert.equal(JSON.parse(audit.payload.detalle).motivo, "proveedor_no_disponible");
    assert.equal(JSON.stringify(db.calls).includes("PRIVATE_TOKEN_AND_PATIENT_EMAIL"), false);
    assert.equal(db.calls.at(-1).payload.sync_lease_id, null);
  });
}

test("RF-16: a missing audit service cannot prevent a durable retry or lease release", async () => {
  const db = database(({ table, payload }) => {
    if (table === "logs_auditoria") throw Error("audit offline");
    return { data: payload.sync_lease_id ? { id: "fixture", estado_atencion: "Programada", intentos_sync: 0 } : { id: "fixture" }, error: null };
  });
  const worker = loadTs("src/lib/calendar-sync.ts", {
    "./server-db": { getServerDatabase: () => db },
    "./google-calendar": { createGoogleAppointmentEvent: async () => ({ ok: false }) },
  }, {}, { console: { warn() {} } });
  assert.equal((await worker.synchronizeAppointment("fixture")).status, "pending");
  assert.equal(db.calls.at(-1).payload.sync_lease_id, null);
});

test("RF-16: stale or leased work cannot record completion or an unrelated failure", async () => {
  let providerCalls = 0;
  const db = database(() => ({ data: null, error: null }));
  const worker = loadTs("src/lib/calendar-sync.ts", {
    "./server-db": { getServerDatabase: () => db },
    "./google-calendar": { createGoogleAppointmentEvent: async () => { providerCalls++; } },
  });
  assert.equal((await worker.synchronizeAppointment("fixture")).status, "skipped");
  assert.equal(providerCalls, 0);
  assert.equal(db.calls.length, 1);
});
