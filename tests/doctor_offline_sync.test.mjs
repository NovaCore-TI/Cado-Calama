import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const signal = new AbortController().signal;
const headers = { 'x-cado-offline-owner': 'doctor-fixture' };
const draft = {
  id: null, baseline: null, title: 'Consejos de cuidado',
  slug: '', excerpt: '', content: 'Texto para pacientes.', category: 'Cuidados',
};

function fixture(responses) {
  const calls = [];
  const api = loadTs('src/lib/doctor-offline-sync.ts', {}, {}, {
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      const [status, body] = responses.shift();
      return Response.json(body, { status });
    },
  });
  return { api, calls };
}

test('offline article is sent as an unpublished draft and a confirmed retry does not create another', async () => {
  const { api, calls } = fixture([[200, { data: [] }], [201, {}]]);
  assert.equal(await api.syncOfflineArticle(draft, headers, signal, () => true), 'confirmed');
  assert.equal(calls[1].method, 'POST');
  const saved = JSON.parse(calls[1].body);
  assert.equal(saved.publicado, false);
  const retry = fixture([[200, { data: [{ ...saved, id: 'saved-id' }] }]]);
  assert.equal(await retry.api.syncOfflineArticle(draft, headers, signal, () => true), 'confirmed');
  assert.equal(retry.calls.length, 1);
});

test('offline derivation keeps a conflict or a superseded local entry out of the write path', async () => {
  const change = { previous: 'Sin derivación', next: 'Pendiente presencial' };
  const conflict = fixture([[200, { data: [{ codigo: 'fixture', estado_derivacion: 'Derivada a Dentalink' }] }]]);
  assert.equal(await conflict.api.syncOfflineDerivation('fixture', change, headers, signal, () => true), 'review');
  assert.equal(conflict.calls.length, 1);

  const superseded = fixture([[200, { data: [{ codigo: 'fixture', estado_derivacion: change.previous }] }]]);
  assert.equal(await superseded.api.syncOfflineDerivation('fixture', change, headers, signal, () => false), 'retry');
  assert.equal(superseded.calls.length, 1);
});
