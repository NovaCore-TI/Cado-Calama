import test from 'node:test';
import assert from 'node:assert/strict';
import { orientationFixture } from './helpers/orientation-fixture.mjs';

test('RF-21: HTTP updates persist every attendance state without changing the independent derivation', async () => {
  const fixture = await orientationFixture();
  try {
    assert.equal((await fixture.patch({ action: 'derivacion', nuevoEstado: 'Pendiente presencial' })).status, 200);
    for (const state of ['Programada', 'Realizada', 'No asistió', 'Cancelada']) {
      const response = await fixture.patch({ action: 'estado', nuevoEstado: state });
      assert.equal(response.status, 200);
      const stored = await fixture.row();
      assert.equal(stored.estado_atencion, state);
      assert.equal(stored.estado_derivacion, 'Pendiente presencial');
      const rows = (await (await fixture.list()).json()).data;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].estado_atencion, state);
    }
    assert.equal((await fixture.patch({ action: 'estado', nuevoEstado: 'Programada' })).status, 409);
    assert.equal((await fixture.patch({ action: 'estado', nuevoEstado: 'Derivada a Dentalink' })).status, 400);
    assert.equal((await fixture.patch({ codigo: 'foreign', action: 'estado', nuevoEstado: 'Cancelada' })).status, 404);
    assert.equal((await fixture.row('foreign')).estado_atencion, 'Programada');
  } finally { await fixture.close(); }
});
