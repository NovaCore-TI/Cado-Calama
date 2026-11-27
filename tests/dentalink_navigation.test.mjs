import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTs } from './helpers/load-ts.mjs';

function render(url, props = {}) {
  const { DentalinkLink } = loadTs('src/components/DentalinkLink.tsx', {}, { NEXT_PUBLIC_DENTALINK_URL: url });
  return renderToStaticMarkup(React.createElement(DentalinkLink, props));
}
test('RF-22: absent or unsafe external booking configuration offers WhatsApp and an honest availability message', () => {
  for (const value of [undefined, '', 'http://agenda.example.invalid', 'javascript:alert(1)', 'https://user:password@agenda.example.invalid']) {
    const html = render(value);
    assert.match(html, /La agenda presencial en línea aún no está habilitada/);
    assert.match(html, /href="https:\/\/wa.me\/56944657815\?/);
    assert.match(html, /Coordinar por WhatsApp/);
    assert.doesNotMatch(html, /href="(?:javascript:|http:|https:\/\/user:)/);
  }
});
test('RF-22: a configured HTTPS agenda opens externally with an explicit warning', () => {
  // Fixture only: the official clinic URL has not yet been supplied.
  const html = render('https://agenda.example.invalid/cado');
  assert.match(html, /La reserva presencial se realiza en Dentalink/);
  assert.match(html, /href="https:\/\/agenda.example.invalid\/cado"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/wa.me\/56944657815\?/);
  assert.match(html, /Si la agenda no funciona/);
});

test('RF-22: compact agenda links retain the external warning and the professional WhatsApp contingency', () => {
  const html = render('https://agenda.example.invalid/cado', { compact: true, phone: '56992295910', label: 'Agendar evaluación' });
  assert.match(html, /href="https:\/\/agenda.example.invalid\/cado"/);
  assert.match(html, /Agendar evaluación/);
  assert.match(html, /Agenda externa en Dentalink/);
  assert.match(html, /href="https:\/\/wa.me\/56992295910\?/);
  assert.match(html, /Coordinar por WhatsApp/);
});
test('RF-22: compact professional links keep the correct WhatsApp fallback and accessible external-site notice', () => {
  const html = render('', { compact: true, phone: '56992295910', label: 'Coordinar evaluación' });
  assert.match(html, /href="https:\/\/wa.me\/56992295910\?/);
  assert.match(html, /Coordinar evaluación/);
  assert.match(html, /sitio externo, abre otra pestaña/);
});
