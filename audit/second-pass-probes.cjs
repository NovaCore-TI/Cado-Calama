/* Audit characterization probes. All DB, Google and HTTP dependencies are local fakes.
 * These probes document current behavior, not successful acceptance of requirements.
 * Run from repository root: node audit/second-pass-probes.cjs
 */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const results = [];
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React }
  }).outputText;
  const module = { exports: {} };
  const context = { exports: module.exports, module, require: id => id in mocks ? mocks[id] : require(id),
    process: { cwd: () => process.cwd(), env: {} }, console, URL, Buffer, Response, performance,
    setTimeout, clearTimeout, Date, Blob };
  vm.runInNewContext(compiled, context, { filename: file });
  return module.exports;
}
const next = { NextResponse: class extends Response {
  static json(body, init = {}) { return Response.json(body, init); }
  static redirect(url) { return Response.redirect(url); }
}};
function database(resolve) {
  const history = [];
  return { history, from(table) {
    const state = { table, operation: 'select', filters: [], payload: null };
    const query = new Proxy({}, { get(_, prop) {
      if (prop === 'then') return (yes, no) => { history.push(structuredClone(state)); return Promise.resolve(resolve(state)).then(yes, no); };
      return (...args) => {
        if (['insert', 'update', 'upsert', 'delete'].includes(prop)) { state.operation = prop; state.payload = args[0]; }
        else if (prop !== 'select' && prop !== 'single' && prop !== 'maybeSingle') state.filters.push([prop, ...args]);
        return query;
      };
    }});
    return query;
  }};
}
const request = (body = {}, url = 'http://audit.invalid/api') => ({ url, json: async () => body, headers: new Headers() });
const googleFake = {
  createGoogleAppointmentEvent: async () => ({ meetLink: 'https://example.invalid/meet', eventId: null, status: 'Pendiente' }),
  generateDirectGoogleCalendarUrl: () => 'https://example.invalid/calendar',
  cancelGoogleAppointmentEvent: async () => ({ ok: true }),
  rescheduleGoogleAppointmentEvent: async () => ({ ok: true }),
};
const base = { patientName: 'Paciente ficticio', email: 'test@example.invalid', phone: '12345678', date: '2026-12-01', time: '19:00', consent: true };
function route(file, db, extra = {}) { return load(file, { 'next/server': next, '@/lib/supabase': { supabase: db }, '@/lib/google-calendar': googleFake, ...extra }); }
async function probe(name, fn) { const observation = await fn(); results.push({ name, observation }); }
async function main() {
  await probe('P01: insert conflict still confirms booking', async () => {
    const db = database(s => s.operation === 'insert' && s.table === 'orientaciones_citas'
      ? { data: null, error: { code: '23505', message: 'simulated unique conflict' } }
      : { data: s.table === 'pacientes' ? { id: 'patient-fake' } : null, error: null });
    const r = await route('src/app/api/orientaciones/route.ts', db).POST(request(base));
    const b = await r.json(); assert.equal(r.status, 201); assert.equal(b.ok, true); assert.equal(b.syncedToSupabase, false);
    return { status: r.status, ok: b.ok, persisted: b.syncedToSupabase };
  });
  await probe('P02: database lookup error does not stop booking and Google side effect', async () => {
    let googleCalls = 0;
    const db = database(() => ({ data: null, error: { message: 'simulated DB unavailable' } }));
    const api = route('src/app/api/orientaciones/route.ts', db, { '@/lib/google-calendar': {
      ...googleFake, createGoogleAppointmentEvent: async () => { googleCalls++; return { meetLink: '', eventId: null }; }
    }});
    const r = await api.POST(request(base)); assert.equal(r.status, 201); assert.equal(googleCalls, 1);
    return { status: r.status, googleCalls };
  });
  await probe('P03: invalid contact and past unconfigured time accepted by handler', async () => {
    const db = database(s => ({ data: s.operation === 'insert' ? { id: 'fake', ...s.payload } : null, error: null }));
    const r = await route('src/app/api/orientaciones/route.ts', db).POST(request({ ...base, email: 'bad', phone: 'x', date: '2000-01-01', time: '03:00' }));
    assert.equal(r.status, 201);
    return { status: r.status, queriedAvailability: db.history.some(s => s.table === 'bloques_disponibilidad') };
  });
  await probe('P04: wrong token ignored when code supplied; completed appointment reopened', async () => {
    const db = database(s => ({ data: s.operation === 'update' ? { ...s.payload } : s.filters.some(f => f[0] === 'neq') ? null : { id: 'fake', codigo: 'CADO-2026-100', estado_atencion: 'Realizada' }, error: null }));
    const r = await route('src/app/api/orientaciones/route.ts', db).PATCH(request({ codigo: 'CADO-2026-100', tokenGestion: 'WRONG', action: 'reprogramar', nuevaFecha: '2000-01-01', nuevaHora: '03:00' }));
    const b = await r.json(); assert.equal(r.status, 200); assert.equal(b.data.estado_atencion, 'Programada');
    return { status: r.status, state: b.data.estado_atencion, filters: db.history[0].filters };
  });
  await probe('P05: no-auth listing returns sensitive row and management token', async () => {
    const db = database(() => ({ data: [{ nombre_paciente: 'Ficticio', token_gestion: 'fake-management-token', cuestionarios_perfilamiento: { motivo_consulta: 'fixture' } }], error: null }));
    const r = await route('src/app/api/orientaciones/route.ts', db).GET(request()); const b = await r.json();
    assert.equal(r.status, 200); assert.equal(b.data[0].token_gestion, 'fake-management-token');
    return { status: r.status, returnsToken: true, returnsQuestionnaire: !!b.data[0].cuestionarios_perfilamiento };
  });
  await probe('P06: comfort consent absent still persists true', async () => {
    const db = database(s => ({ data: s.payload, error: null }));
    const r = await route('src/app/api/confort/route.ts', db).POST(request({ notes: 'fixture' }));
    assert.equal(r.status, 201); assert.equal(db.history[0].payload.consent_datos, true);
    return { status: r.status, consentSaved: true };
  });
  await probe('P07: availability database failure offers unconfigured historic Sunday', async () => {
    const db = database(() => ({ data: null, error: { message: 'fixture DB down' } }));
    const r = await route('src/app/api/bloques/route.ts', db).GET(request({}, 'http://audit.invalid/api/bloques?fecha=2000-01-02'));
    const b = await r.json(); assert.equal(r.status, 200); assert.equal(b.slots.length, 4);
    return { status: r.status, offeredSlots: b.slots.length, date: b.slots[0].fecha };
  });
  await probe('P08: profile serializes secret field returned by database', async () => {
    const db = database(() => ({ data: [{ nombre: 'Doctor ficticio', google_refresh_token: 'FAKE_SECRET' }], error: null }));
    const r = await route('src/app/api/perfil/route.ts', db).GET(); const b = await r.json(); assert.equal(b.data.doctorDb.google_refresh_token, 'FAKE_SECRET');
    return { status: r.status, returnsRefreshToken: true };
  });
  await probe('P09: no-auth doctor disconnect calls credential mutation', async () => {
    let calls = 0;
    const api = route('src/app/api/doctores/route.ts', database(() => ({})), {
      '@/lib/doctors-catalog': { OFFICIAL_CADO_DOCTORS: [] },
      '@/lib/google-tokens-store': { removeDoctorGoogleCredentials: async () => { calls++; }, getAllConnectedDoctorTokens: () => ({}) }
    });
    const r = await api.POST(request({ action: 'desconectar', doctorId: 'fake' })); assert.equal(r.status, 200); assert.equal(calls, 1);
    return { status: r.status, credentialMutationCalls: calls };
  });
  const calendar = load('src/lib/google-calendar.ts', {
    googleapis: { google: {} }, '@/lib/supabase': { supabase: database(() => ({})) },
    '@/lib/doctors-catalog': { OFFICIAL_CADO_DOCTORS: [{ nombre: 'Ficticio', email: 'test@example.invalid' }] },
    '@/lib/google-tokens-store': { getDoctorGoogleCredentials: async () => null, getAllConnectedDoctorTokens: () => ({}), saveDoctorGoogleCredentials: async () => {} }
  });
  await probe('P10: no Google credentials reports synchronized and fabricated URL', async () => {
    const r = await calendar.createGoogleAppointmentEvent({ codigo: 'FAKE', fecha: base.date, hora: base.time, patientName: base.patientName });
    assert.equal(r.eventId, null); assert.equal(r.status, 'Sincronizado');
    return { eventId: r.eventId, status: r.status, source: r.source, link: r.meetLink };
  });
  await probe('P11: calendar text permits injected ICS property and hour 24', async () => {
    const s = calendar.generateIcsCalendarContent({ codigo: 'FAKE', fecha: base.date, hora: '23:55', patientName: 'Ficticio\r\nATTENDEE:mailto:injected@example.invalid', meetLink: '' });
    assert.ok(s.includes('\r\nATTENDEE:mailto:injected@example.invalid')); assert.ok(s.includes('T241000'));
    return { injectedProperty: true, endHour24: true };
  });
  await probe('P12: actual Supabase query discarded with void does not issue request', async () => {
    const { createClient } = require('@supabase/supabase-js'); let requests = 0;
    const client = createClient('https://audit.invalid', 'fake-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async () => { requests++; return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }); } }
    });
    const q = client.from('orientaciones_citas').update({ estado_atencion: 'Realizada' }).eq('codigo', 'FAKE');
    void q; await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(requests, 0);
    await q; assert.equal(requests, 1);
    return { callsAfterVoid: 0, callsAfterAwait: requests };
  });
  // Extract the real context function to verify questionnaire inheritance and missing FK.
  await probe('P13: omitting questionnaire inherits previous response; fallback insert omits FK', async () => {
    const source = fs.readFileSync('src/context/CadoContext.tsx', 'utf8');
    const start = source.indexOf('  const addAppointment = ('); const end = source.indexOf('  const updateAppointmentStatus', start);
    const db = database(s => ({ data: s.table === 'pacientes' ? { id: 'fake' } : null, error: null }));
    const out = {};
    const code = source.slice(start, end) + '\nresult.fn = addAppointment;';
    const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(js, { result: out, activeQuestionnaire: { id: 'previous-patient', reason: 'fixture' }, supabase: db,
      setAppointments: fn => fn([]), setAvailableSlots: fn => fn([]), localStorage: { setItem() {} }, Date });
    const app = out.fn({ ...base, date: base.date, time: base.time, comfortProfile: {}, questionnaire: undefined, meetLink: '' });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(app.questionnaire.id, 'previous-patient');
    const insert = db.history.find(s => s.table === 'orientaciones_citas' && s.operation === 'insert'); assert.ok(insert); assert.equal('cuestionario_id' in insert.payload, false);
    return { inheritedPreviousQuestionnaire: true, savedQuestionnaireForeignKey: false };
  });
  await probe('P14: unified questionnaire vocabulary is rejected by questionnaire API', async () => {
    const db = database(s => ({ data: s.payload, error: null }));
    const r = await route('src/app/api/cuestionario/route.ts', db).POST(request({ reason: 'Motivo ficticio', feeling: 'nervioso', consent: true }));
    assert.equal(r.status, 400); assert.equal(db.history.length, 0);
    return { status: r.status, unifiedValue: 'nervioso' };
  });
  await probe('P15: health reports HTTP success for complete DB outage', async () => {
    const api = load('src/app/api/health/route.ts', { 'next/server': next, '@/lib/supabase': {
      checkSupabaseConnection: async () => ({ connected: false, tablesReady: false, message: 'fixture outage' })
    }});
    const r = await api.GET(); const b = await r.json(); assert.equal(r.status, 200); assert.equal(b.ok, true); assert.equal(b.connection.connected, false);
    return { status: r.status, ok: b.ok, dbConnected: b.connection.connected };
  });
  console.log(JSON.stringify({ probes: results.length, scope: 'isolated local dependencies; no external writes', results }, null, 2));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
