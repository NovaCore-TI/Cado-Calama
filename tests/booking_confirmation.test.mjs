import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("RF-13/16: only a synchronized video with a link can be presented as ready", () => {
  const { isVideoReady } = loadTs("src/lib/appointment-sync-status.ts");
  assert.equal(isVideoReady("Sincronizado", "https://meet.google.com/fixture"), true);
  assert.equal(isVideoReady("Sincronizado", ""), false);
  assert.equal(isVideoReady("Pendiente_Reintento", "https://meet.google.com/old"), false);
  assert.equal(isVideoReady(undefined, undefined), false);
});

test("RF-13/16: calendar download cannot export a confirmed meeting while synchronization is pending", async () => {
  for (const [state, link, expected] of [
    ["Pendiente_Reintento", "", 409],
    ["Pendiente_Reintento", "https://meet.google.com/old", 409],
    ["Sincronizado", "", 409],
    ["Sincronizado", "https://meet.google.com/fixture", 200],
  ]) {
    const db = database(() => ({ data: { codigo: "fixture", fecha: "2026-10-29", hora: "19:00", nombre_paciente: "Prueba", estado_atencion: "Programada", estado_sync: state, meet_link: link }, error: null }));
    const route = loadTs("src/app/api/orientaciones/calendar/route.ts", { "@/lib/server-db": { getServerDatabase: () => db } });
    const response = await route.GET(new NextRequest("https://cado.example/api/orientaciones/calendar", { headers: { "x-management-token": "a".repeat(64) } }));
    assert.equal(response.status, expected);
    if (expected === 200) assert.match(await response.text(), /STATUS:CONFIRMED/);
    else assert.equal((await response.json()).ok, false);
  }
});
