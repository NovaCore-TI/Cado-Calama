import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

test('RF-10: Configuración y cálculo de franja vespertina oficial (19:00 - 20:00)', () => {
  const bloquesRoutePath = path.join(ROOT, 'src', 'app', 'api', 'bloques', 'route.ts');
  assert.ok(fs.existsSync(bloquesRoutePath), 'El endpoint /api/bloques/route.ts debe existir');

  const content = fs.readFileSync(bloquesRoutePath, 'utf8');
  assert.ok(content.includes("HORARIOS_VESPERTINOS = ['19:00', '19:15', '19:30', '19:45']"), 'Debe fijar bloques vespertinos de 15 min');
  assert.ok(content.includes('America/Santiago'), 'Debe usar huso horario oficial de Chile');
  assert.ok(content.includes('duracionMinutos: 15'), 'Debe reportar duración de 15 minutos');
  assert.ok(content.includes('hora_fin'), 'Debe calcular hora_fin de cada bloque');
});

test('RF-10: Exclusión automática de bloques ocupados y bloqueados por el doctor', () => {
  const bloquesRoutePath = path.join(ROOT, 'src', 'app', 'api', 'bloques', 'route.ts');
  const content = fs.readFileSync(bloquesRoutePath, 'utf8');

  assert.ok(content.includes("eq('estado_atencion', 'Programada')"), 'Debe filtrar citas activas programadas');
  assert.ok(content.includes("neq('estado', 'Disponible')"), 'Debe filtrar bloques bloqueados por el doctor');
  assert.ok(content.includes('occupiedSet.has(slotKey)'), 'Debe excluir los bloques ocupados de la lista pública');
});

test('RF-11: Validación anti-colisión en POST /api/orientaciones', () => {
  const orientacionesPath = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'route.ts');
  const content = fs.readFileSync(orientacionesPath, 'utf8');

  assert.ok(content.includes("eq('estado_atencion', 'Programada')"), 'Debe verificar si ya existe cita programada');
  assert.ok(content.includes('status: 409'), 'Debe responder con HTTP 409 ante colisión de horario');
  assert.ok(content.includes('El bloque horario seleccionado acaba de ser reservado'), 'Debe advertir al segundo paciente');
});

test('RF-11: Índice único parcial en PostgreSQL para prevenir duplicidad a nivel de motor', () => {
  const schemaPath = path.join(ROOT, 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  assert.ok(
    schema.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_activas_fecha_hora') &&
    schema.includes("WHERE estado_atencion = 'Programada'"),
    'Debe definir índice único parcial uq_citas_activas_fecha_hora en orientaciones_citas'
  );
});

test('RF-10 / RF-11: Integración en vista cliente /agendar/page.tsx', () => {
  const agendarPath = path.join(ROOT, 'src', 'app', 'agendar', 'page.tsx');
  const content = fs.readFileSync(agendarPath, 'utf8');

  assert.ok(content.includes('availableSlots'), 'Debe consultar y mapear los bloques horarios disponibles');
  assert.ok(content.includes('/api/orientaciones'), 'Debe enviar agendamiento a /api/orientaciones');
  assert.ok(content.includes('setErrorMsg(json.error'), 'Debe capturar colisión 409 y mostrar advertencia');
  assert.ok(content.includes('Orientación Virtual de 15 Minutos'), 'Debe mostrar distintivo de orientación');
});
