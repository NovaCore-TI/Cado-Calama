import test from 'node:test';
import assert from 'node:assert/strict';
import { orientationFixture } from './helpers/orientation-fixture.mjs';

test('RF-23: HTTP derivation records a timestamp, preserves attendance and audits a rectification', async () => {
  const fixture = await orientationFixture();
  try {
    assert.equal((await fixture.patch({ action: 'estado', nuevoEstado: 'Realizada' })).status, 200);
    assert.equal((await fixture.patch({ action: 'derivacion', nuevoEstado: 'Derivada a Dentalink', motivo: 'Coordinación presencial registrada' })).status, 200);
    const derived = await fixture.row();
    assert.equal(derived.estado_atencion, 'Realizada');
    assert.equal(derived.estado_derivacion, 'Derivada a Dentalink');
    assert.ok(Number.isFinite(new Date(derived.fecha_derivacion).getTime()));
    assert.equal(derived.notas_derivacion, 'Coordinación presencial registrada');
    assert.equal((await fixture.patch({ action: 'derivacion', nuevoEstado: 'Sin derivación', motivo: 'Rectificación de registro' })).status, 200);
    const corrected = await fixture.row();
    assert.equal(corrected.estado_atencion, 'Realizada');
    assert.equal(corrected.fecha_derivacion, null);
    assert.equal(corrected.notas_derivacion, 'Rectificación de registro');
    const audit = (await fixture.sql.query(`SELECT detalle::jsonb detail,usuario_id FROM public.logs_auditoria
      WHERE accion='derivacion' AND detalle::jsonb->>'derivation'='Sin derivación'`)).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].usuario_id, fixture.doctor);
    assert.equal(audit[0].detail.previous_derivation, 'Derivada a Dentalink');
    assert.equal(new Date(audit[0].detail.previous_derived_at).getTime(), new Date(derived.fecha_derivacion).getTime());
    assert.equal(audit[0].detail.note, 'Rectificación de registro');
    const row = (await (await fixture.list()).json()).data[0];
    assert.equal(row.estado_atencion, 'Realizada');
    assert.equal(row.estado_derivacion, 'Sin derivación');
    assert.equal((await fixture.patch({ codigo: 'foreign', action: 'derivacion', nuevoEstado: 'Derivada a Dentalink' })).status, 404);
    assert.equal((await fixture.row('foreign')).estado_derivacion, 'Sin derivación');
  } finally { await fixture.close(); }
});
