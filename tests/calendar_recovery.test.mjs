import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

const booking = { codigo: "fixture", fecha: "2026-10-29", hora: "19:00", patientName: "Prueba", patientEmail: "test@example.com", patientPhone: "000000000", doctorId: "doctor" };
function googleApi(events) {
  return loadTs("src/lib/google-calendar.ts", {
    googleapis: { google: { auth: { OAuth2: class { setCredentials() {} } }, calendar: () => ({ events }) } },
    "@/lib/google-tokens-store": { getDoctorGoogleCredentials: async () => ({ refreshToken: "fixture", email: "doctor@example.com" }) },
  }, { GOOGLE_CLIENT_ID: "fixture", GOOGLE_CLIENT_SECRET: "fixture" });
}
const conflict = async () => { throw { code: 409 }; };
const event = (status = "pending") => ({
  id: "existing", start: { dateTime: "2026-10-29T19:00:00-03:00" }, end: { dateTime: "2026-10-29T19:15:00-03:00" },
  conferenceData: { createRequest: { requestId: "original", status: { statusCode: status } } },
});

test("RF-13/16: retry reuses the event and waits for a pending Meet without recreating it", async () => {
  let patches = 0;
  const api = googleApi({ insert: conflict, get: async () => ({ data: event() }), patch: async () => { patches++; } });
  const result = await api.createGoogleAppointmentEvent(booking);
  assert.equal(result.eventId, "existing");
  assert.equal(result.status, "Pendiente_Reintento");
  assert.equal(patches, 0);
});

test("RF-15/16: retry moves an existing event to the current booking time even while Meet is pending", async () => {
  let patch;
  const api = googleApi({ insert: conflict, get: async () => ({ data: event() }), patch: async (args) => {
    patch = args;
    return { data: { ...event(), hangoutLink: "https://meet.google.com/fixture" } };
  } });
  const result = await api.createGoogleAppointmentEvent({ ...booking, hora: "19:30" });
  assert.equal(patch.requestBody.start.dateTime, "2026-10-29T19:30:00");
  assert.equal(patch.requestBody.end.dateTime, "2026-10-29T19:45:00");
  assert.equal(patch.requestBody.conferenceData, undefined);
  assert.equal(patch.sendUpdates, "all");
  assert.equal(result.status, "Sincronizado");
});

test("RF-16: failed Meet generation gets a new request ID on the same event", async () => {
  let patch;
  const api = googleApi({ insert: conflict, get: async () => ({ data: event("failure") }), patch: async (args) => {
    patch = args; return { data: event() };
  } });
  const result = await api.createGoogleAppointmentEvent(booking);
  assert.notEqual(patch.requestBody.conferenceData.createRequest.requestId, "original");
  assert.equal(patch.eventId, api.googleEventId(booking.codigo));
  assert.equal(patch.conferenceDataVersion, 1);
  assert.equal(result.status, "Pendiente_Reintento");
});

test("RF-16: Calendar insert, recovery and patch use bounded network timeouts", async () => {
  const timeouts=[];
  const api=googleApi({
    insert:async (_,options)=>{timeouts.push(options.timeout);throw {code:409};},
    get:async (_,options)=>{timeouts.push(options.timeout);return {data:event("failure")};},
    patch:async (_,options)=>{timeouts.push(options.timeout);return {data:event()};},
    delete:async (_,options)=>{timeouts.push(options.timeout);},
  });
  await api.createGoogleAppointmentEvent(booking);
  await api.rescheduleGoogleAppointmentEvent({eventId:"existing",doctorId:"doctor",nuevaFecha:booking.fecha,nuevaHora:booking.hora});
  await api.cancelGoogleAppointmentEvent({eventId:"existing",doctorId:"doctor"});
  assert.deepEqual(timeouts,[15000,15000,15000,15000,15000]);
});

test("RF-15/16: rescheduling without a returned Meet stays pending instead of confirming an old link", async () => {
  const api = googleApi({ patch: async () => ({ data: { id: "existing" } }) });
  const result = await api.rescheduleGoogleAppointmentEvent({ eventId: "existing", doctorId: "doctor", nuevaFecha: booking.fecha, nuevaHora: "19:30" });
  assert.equal(result.status, "Pendiente_Reintento");
  assert.equal(result.meetLink, "");
});

test("RF-16: worker never confirms a programmed appointment without both event and Meet", async () => {
  for (const missing of ["eventId", "meetLink"]) {
    const db = database(({ payload }) => ({ data: payload.sync_lease_id ? { id: "fixture", codigo: "fixture", estado_atencion: "Programada", fecha: booking.fecha, hora: booking.hora } : { id: "fixture" }, error: null }));
    const result = { ok: true, status: "Sincronizado", eventId: "event", meetLink: "https://meet.google.com/fixture", [missing]: "" };
    const worker = loadTs("src/lib/calendar-sync.ts", {
      "./server-db": { getServerDatabase: () => db }, "./google-calendar": { createGoogleAppointmentEvent: async () => result },
    });
    assert.equal((await worker.synchronizeAppointment("fixture")).status, "pending");
    assert.equal(db.calls[1].payload.estado_sync, "Pendiente_Reintento");
  }
});

test("RF-16: scheduler excludes active leases before selecting its batch and rejects cross-site retries", async () => {
  const db = database(() => ({ data: [], error: null }));
  const route = loadTs("src/app/api/internal/calendar-sync/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => db },
  }, { CRON_SECRET: "fixture" });
  const response = await route.GET(new NextRequest("https://cado.example/api/internal/calendar-sync", { headers: { authorization: "Bearer fixture" } }));
  assert.equal(response.status, 200);
  assert.match(db.calls[0].filters.find(([key]) => key === "or")[1], /^sync_lock_until.is.null,sync_lock_until.lt\./);
  assert.equal((await route.POST(new NextRequest("https://cado.example/api/internal/calendar-sync", { method: "POST", headers: { origin: "https://other.example" } }))).status, 403);
});
