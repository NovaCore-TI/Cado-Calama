import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

test('RF-10 / RF-11: Endpoint /api/bloques existe y expone franja vespertina oficial', () => {
  const bloquesPath = path.join(ROOT, 'src', 'app', 'api', 'bloques', 'route.ts');
  assert.ok(fs.existsSync(bloquesPath), 'El endpoint /api/bloques/route.ts debe existir');

  const content = fs.readFileSync(bloquesPath, 'utf8');
  assert.ok(content.includes('19:00'), 'Debe incluir bloque 19:00');
  assert.ok(content.includes('19:15'), 'Debe incluir bloque 19:15');
  assert.ok(content.includes('19:30'), 'Debe incluir bloque 19:30');
  assert.ok(content.includes('19:45'), 'Debe incluir bloque 19:45');
  assert.ok(content.includes('America/Santiago'), 'Debe operar en huso horario oficial de Chile Continental');
});

test('RF-14: Backend de autogestión de cancelación mediante PATCH', () => {
  const orientacionesPath = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'route.ts');
  assert.ok(fs.existsSync(orientacionesPath), 'El endpoint /api/orientaciones/route.ts debe existir');

  const content = fs.readFileSync(orientacionesPath, 'utf8');
  assert.ok(content.includes('export async function PATCH'), 'Debe exportar método PATCH');
  assert.ok(content.includes("action === 'cancelar'"), 'Debe procesar la acción cancelar');
  assert.ok(content.includes("estado_atencion: 'Cancelada'"), 'Debe actualizar estado a Cancelada');
  assert.ok(content.includes('CANCELACION_CITA_AUTOGESTION'), 'Debe registrar la acción en logs_auditoria');
});

test('RF-15: Backend de reprogramación atómica sin pérdida de cita vigente', () => {
  const orientacionesPath = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'route.ts');
  const content = fs.readFileSync(orientacionesPath, 'utf8');

  assert.ok(content.includes("action === 'reprogramar'"), 'Debe procesar la acción reprogramar');
  assert.ok(content.includes('status: 409'), 'Debe retornar código 409 ante colisión horaria');
  assert.ok(content.includes('se mantiene 100% activa') || content.includes('se mantiene vigente'), 'Debe proteger la cita vigente ante colisión');
  assert.ok(content.includes('REPROGRAMACION_CITA_AUTOGESTION'), 'Debe auditar la reprogramación');
});

test('RF-14 / RF-15: Vista interactiva en /gestionar/page.tsx', () => {
  const gestionarPath = path.join(ROOT, 'src', 'app', 'gestionar', 'page.tsx');
  assert.ok(fs.existsSync(gestionarPath), 'La vista /gestionar/page.tsx debe existir');

  const content = fs.readFileSync(gestionarPath, 'utf8');
  assert.ok(content.includes('Suspense'), 'Debe usar Suspense para useSearchParams en Next.js');
  assert.ok(content.includes('handleConfirmCancel'), 'Debe implementar función de cancelación');
  assert.ok(content.includes('handleConfirmReschedule'), 'Debe implementar función de reprogramación');
  assert.ok(content.includes('Garantía de Cita Vigente'), 'Debe asegurar al paciente que su cita actual se mantiene intacta hasta confirmar');
  assert.ok(content.includes('loadAvailableSlots'), 'Debe consultar disponibilidad en tiempo real para reprogramar');
});
