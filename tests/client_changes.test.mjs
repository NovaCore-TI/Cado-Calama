import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { loadTs, database } from './helpers/load-ts.mjs';

const doctor = { id: '11111111-1111-4111-8111-111111111111' };
const id = '22222222-2222-4222-8222-222222222222';
const jsonRequest = (method, body) => new NextRequest('https://cado.example/api/testimonios', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('search canonicals remain public when OAuth uses a local development URL', () => {
  const { resolveSiteUrl } = loadTs('src/lib/site.ts');
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }), 'https://www.cadoodontologia.cl');
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://localhost:3000' }), 'https://www.cadoodontologia.cl');
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://cadoodontologia.cl/' }), 'https://cadoodontologia.cl');
});

test('sitemap retains real public pages when the article database is unavailable', async () => {
  const db = database(() => ({ data: null, error: { code: '08006' } }));
  const { default: sitemap } = loadTs('src/app/sitemap.ts', { '@/lib/supabase': { supabase: db } });
  const entries = await sitemap();
  assert.ok(entries.some(entry => entry.url === 'https://www.cadoodontologia.cl/equipo/dr-oscar-albanes-hidalgo'));
  assert.ok(entries.some(entry => entry.url === 'https://www.cadoodontologia.cl/endodoncia-calama'));
  assert.ok(entries.every(entry => !entry.url.includes('localhost') && !entry.url.includes('/cuestionario')));
});

test('SAV never exposes an unsafe or unpriced checkout link', () => {
  const { savPaymentConfiguration: config } = loadTs('src/lib/sav-payment.ts');
  assert.equal(config({}).priceClp, 15000);
  for (const env of [
    {},
    { CADO_SAV_PAYMENT_URL: 'https://checkout.example' },
    { CADO_SAV_PRICE_CLP: '0', CADO_SAV_PAYMENT_URL: 'https://checkout.example' },
    { CADO_SAV_PRICE_CLP: '15000', CADO_SAV_PAYMENT_URL: 'javascript:alert(1)' },
    { CADO_SAV_PRICE_CLP: '15000', CADO_SAV_PAYMENT_URL: 'https://user:secret@checkout.example' },
  ]) assert.equal(config(env).paymentUrl, null);
  assert.equal(config({ CADO_SAV_PRICE_CLP: '15000', CADO_SAV_PAYMENT_URL: 'https://checkout.example/sav' }).paymentUrl, 'https://checkout.example/sav');
});

test('testimonial sources reject deceptive hosts, credentials and script URLs', () => {
  const { googleReviewUrl } = loadTs('src/lib/testimonials.ts');
  for (const url of ['https://google.com.evil.example/review', 'https://google.com@evil.example', 'javascript:alert(1)', 'http://google.com', 'https://user:secret@google.com']) assert.equal(googleReviewUrl(url), null);
  assert.equal(googleReviewUrl('https://share.google/Af4IcUf6FfpfVmbTX'), 'https://share.google/Af4IcUf6FfpfVmbTX');
});

test('public testimonials only query published records; admin queries are owner-scoped', async () => {
  const db = database(() => ({ data: [], error: null }));
  let authCalls = 0;
  const api = loadTs('src/app/api/testimonios/route.ts', {
    '@/lib/server-db': { getServerDatabase: () => db },
    '@/lib/doctor-auth': { ...loadTs('src/lib/doctor-auth.ts'), requireDoctor: async () => { authCalls++; return { doctor }; } },
  });
  assert.equal((await api.GET(new NextRequest('https://cado.example/api/testimonios'))).status, 200);
  assert.equal(authCalls, 0);
  assert.ok(db.calls[0].filters.some(filter => filter[0] === 'eq' && filter[1] === 'publicado' && filter[2] === true));
  assert.equal((await api.GET(new NextRequest('https://cado.example/api/testimonios?admin=1'))).status, 200);
  assert.equal(authCalls, 1);
  assert.ok(db.calls[1].filters.some(filter => filter[0] === 'eq' && filter[1] === 'doctor_id' && filter[2] === doctor.id));
});

test('a professional cannot publish or delete a different owner testimonial', async () => {
  const db = database(() => ({ data: null, error: null }));
  const auth = loadTs('src/lib/doctor-auth.ts');
  const api = loadTs('src/app/api/testimonios/route.ts', {
    '@/lib/server-db': { getServerDatabase: () => db },
    '@/lib/doctor-auth': { ...auth, requireDoctor: async () => ({ doctor }) },
  });
  assert.equal((await api.PATCH(jsonRequest('PATCH', { id, publicado: true }))).status, 404);
  assert.equal((await api.DELETE(jsonRequest('DELETE', { id }))).status, 404);
  for (const call of db.calls) assert.ok(call.filters.some(filter => filter[0] === 'eq' && filter[1] === 'doctor_id' && filter[2] === doctor.id));
});

test('unpublished review images are inaccessible through the public image route', async () => {
  const db = database(() => ({ data: null, error: null }));
  const api = loadTs('src/app/api/testimonios/[id]/imagen/route.ts', { '@/lib/server-db': { getServerDatabase: () => db } });
  const response = await api.GET(new NextRequest(`https://cado.example/api/testimonios/${id}/imagen`), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
  assert.ok(db.calls[0].filters.some(filter => filter[0] === 'eq' && filter[1] === 'publicado' && filter[2] === true));
});

test('testimonial upload rejects non-image bytes before storage writes', async () => {
  let writes = 0;
  const api = loadTs('src/app/api/testimonios/route.ts', {
    '@/lib/server-db': { getServerDatabase: () => { writes++; throw Error('Must not reach storage'); } },
    '@/lib/doctor-auth': { ...loadTs('src/lib/doctor-auth.ts'), requireDoctor: async () => ({ doctor }) },
  }, {}, { File });
  const form = new FormData();
  form.set('imagen', new File(['<svg onload="alert(1)"></svg>'], 'review.png', { type: 'image/png' }));
  form.set('titulo', 'Reseña de prueba');
  form.set('texto_alternativo', 'Transcripción de reseña de prueba.');
  form.set('source_url', 'https://share.google/Af4IcUf6FfpfVmbTX');
  const response = await api.POST(new NextRequest('https://cado.example/api/testimonios', { method: 'POST', body: form }));
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test('an unauthenticated testimonial upload never parses a file or reaches storage', async () => {
  const api = loadTs('src/app/api/testimonios/route.ts');
  const response = await api.POST(new NextRequest('https://cado.example/api/testimonios', { method: 'POST', body: 'invalid multipart' }));
  assert.equal(response.status, 401);
});
