import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NextRequest } from 'next/server.js';
import { PDFDocument } from 'pdf-lib';
import { loadTs, database } from './helpers/load-ts.mjs';

const guides = JSON.parse(fs.readFileSync('content/guides.json', 'utf8'));
for (const seed of guides) {
  test(`RF-04: ${seed.slug} supports inline preview, a consistent download and immediate withdrawal`, async () => {
    let published = true, auditUnavailable = false;
    const guide = { ...seed, id: '11111111-1111-4111-8111-111111111111', activo: true, revisado_en: '2026-11-12T10:00:00Z' };
    const db = database(({ table }) => table === 'guias_clinicas'
      ? { data: published ? [guide] : [], error: null }
      : { data: null, error: auditUnavailable ? { message: 'audit unavailable' } : null });
    const route = loadTs('src/app/api/recursos/download/route.ts', {
      '@/lib/server-db': { getServerDatabase: () => db }, './server-db': { getServerDatabase: () => db },
    });
    const url = 'https://cado.example/api/recursos/download?id=' + seed.slug;
    const preview = await route.GET(new NextRequest(url + '&preview=1'));
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get('content-disposition'), /^inline;/);
    assert.equal(db.calls.filter(call => call.table === 'logs_auditoria').length, 0);
    const expected = new Uint8Array(await preview.arrayBuffer());
    const downloaded = await route.GET(new NextRequest(url));
    assert.equal(downloaded.status, 200);
    assert.match(downloaded.headers.get('content-disposition'), /^attachment; filename="[^"/]+\.pdf"$/);
    assert.equal(downloaded.headers.get('content-type'), 'application/pdf');
    assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff');
    const actual = new Uint8Array(await downloaded.arrayBuffer());
    assert.deepEqual(actual, expected);
    assert.equal(Number(downloaded.headers.get('content-length')), actual.length);
    assert.ok((await PDFDocument.load(actual)).getPageCount() >= 1);
    auditUnavailable = true;
    assert.equal((await route.GET(new NextRequest(url))).status, 503);
    published = false;
    assert.equal((await route.GET(new NextRequest(url))).status, 404);
    assert.equal((await route.GET(new NextRequest(url + '&preview=1'))).status, 404);
  });
}
test('RF-04: long guides keep all pages and expose the correct page count', async () => {
  const { generateGuidePdf } = loadTs('src/lib/guide-pdf.ts');
  const document = { ...guides[0], revisado_en: '2026-11-12T10:00:00Z', contenido: Array.from({ length: 12 }, (_, i) => ({
    heading: 'Sección de validación ' + (i + 1), points: Array.from({ length: 4 }, () => 'Texto de validación de la distribución del documento. '.repeat(3)),
  })) };
  const generated = await generateGuidePdf(document);
  const pdf = await PDFDocument.load(generated.bytes);
  assert.ok(pdf.getPageCount() > 1);
  assert.equal(pdf.getPageCount(), generated.pages);
  assert.equal(pdf.getTitle(), document.titulo);
});
