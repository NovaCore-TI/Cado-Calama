import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

test('RF-12: Minimización estricta de datos (prohibición de solicitar/almacenar RUT)', () => {
  const orientacionesPath = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'route.ts');
  const content = fs.readFileSync(orientacionesPath, 'utf8');

  assert.ok(content.includes("'rut' in body || 'RUT' in body"), 'Debe detectar si se envía campo rut o RUT');
  assert.ok(content.includes('status: 400'), 'Debe retornar error 400 ante presencia de RUT');
  assert.ok(content.includes('minimización de datos'), 'Debe citar política de minimización de datos');
});

test('RF-12: Estado inicial obligatorio de la cita es "Programada"', () => {
  const orientacionesPath = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'route.ts');
  const content = fs.readFileSync(orientacionesPath, 'utf8');

  assert.ok(content.includes("estado_atencion: 'Programada'"), 'Debe asignar estado_atencion = Programada');
});

test('RF-12: Interfaz /agendar implementa flujo de etapas con confirmación y sin RUT', () => {
  const agendarPath = path.join(ROOT, 'src', 'app', 'agendar', 'page.tsx');
  const content = fs.readFileSync(agendarPath, 'utf8');

  assert.ok(content.includes('currentStep === 1'), 'Debe contener etapa 1');
  assert.ok(content.includes('currentStep === 2'), 'Debe contener etapa 2');
  assert.ok(content.includes('currentStep === 3'), 'Debe contener etapa 3');
  assert.ok(content.includes('currentStep === 4'), 'Debe contener etapa de confirmación');
  assert.ok(!content.includes('placeholder="RUT"'), 'No debe tener campos de solicitud de RUT');
});
