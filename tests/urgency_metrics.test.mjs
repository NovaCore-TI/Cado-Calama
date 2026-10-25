import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";

test("Urgency metrics validate the channel, omit clinical text and do not acknowledge a failed write", async () => {
  for (const error of [null, { message: "database unavailable" }]) {
    const db = database(() => ({ data: null, error }));
    const route = loadTs("src/app/api/urgencias/route.ts", { "@/lib/server-db": { getServerDatabase: () => db } });
    const request = canal => new NextRequest("https://cado.example/api/urgencias", { method: "POST", body: JSON.stringify({ canal, motivo: "PRIVATE CLINICAL TEXT" }) });
    assert.equal((await route.POST(request("__proto__"))).status, 400);
    assert.equal(db.calls.length, 0);
    assert.equal((await route.POST(request("whatsapp"))).status, error ? 503 : 200);
    assert.equal(db.calls[0].payload.accion, "CONTACTO_URGENCIA_WHATSAPP");
    assert.equal(JSON.stringify(db.calls[0].payload).includes("PRIVATE CLINICAL TEXT"), false);
  }
});
