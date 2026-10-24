import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("RF-13/16: a disconnected professional produces no fabricated meeting", async () => {
  const api = loadTs("src/lib/google-calendar.ts", {
    "@/lib/google-tokens-store": {
      getDoctorGoogleCredentials: async () => null,
      getAllConnectedDoctorTokens: async () => ({}),
    },
  });
  const result = await api.createGoogleAppointmentEvent({
    codigo: "fixture",
    fecha: "2099-01-01",
    hora: "19:00",
    patientName: "Ficticio",
    doctorId: "doctor",
  });
  assert.equal(result.eventId, null);
  assert.equal(result.meetLink, "");
  assert.equal(result.status, "Pendiente_Reintento");
});
test("RF-13: deterministic Google IDs make booking retries idempotent", () => {
  const api = loadTs("src/lib/google-calendar.ts");
  assert.equal(api.googleEventId("fixture"), api.googleEventId("fixture"));
  assert.notEqual(api.googleEventId("fixture"), api.googleEventId("other"));
  assert.match(api.googleEventId("fixture"), /^[a-f0-9]{64}$/);
});
