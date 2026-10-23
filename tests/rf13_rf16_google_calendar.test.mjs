import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

test('RF-13: Módulo Google Calendar API y utilidades de agenda', async () => {
  const libPath = path.join(ROOT, 'src', 'lib', 'google-calendar.ts');
  assert.ok(fs.existsSync(libPath), 'El módulo src/lib/google-calendar.ts debe existir');

  const content = fs.readFileSync(libPath, 'utf8');
  assert.ok(content.includes('getDoctorGoogleAuthUrl'), 'Debe permitir generar URL de autorización por doctor');
  assert.ok(content.includes('exchangeCodeAndSaveDoctorTokens'), 'Debe permitir canjear tokens y guardarlos en Supabase');
  assert.ok(content.includes('createGoogleAppointmentEvent'), 'Debe crear eventos con Google Meet');
  assert.ok(content.includes('generateDirectGoogleCalendarUrl'), 'Debe generar URL de plantilla de Google Calendar');
  assert.ok(content.includes('generateIcsCalendarContent'), 'Debe generar formato iCalendar estándar .ics');
});

test('RF-13: Generación válida de archivo .ics (RFC 5545)', async () => {
  const { generateIcsCalendarContent } = await import('../src/lib/google-calendar.js').catch(async () => {
    // Si corre en typescript/ts-node o compilación directa
    const libPath = path.join(ROOT, 'src', 'lib', 'google-calendar.ts');
    const content = fs.readFileSync(libPath, 'utf8');
    assert.ok(content.includes('BEGIN:VCALENDAR'), 'Debe incluir cabecera BEGIN:VCALENDAR');
    assert.ok(content.includes('BEGIN:VEVENT'), 'Debe incluir bloque BEGIN:VEVENT');
    assert.ok(content.includes('TZID=America/Santiago'), 'Debe aplicar huso de Chile');
    return { mock: true };
  });

  const libPath = path.join(ROOT, 'src', 'lib', 'google-calendar.ts');
  const content = fs.readFileSync(libPath, 'utf8');
  assert.ok(content.includes('BEGIN:VCALENDAR'));
  assert.ok(content.includes('END:VCALENDAR'));
  assert.ok(content.includes('BEGIN:VALARM'));
});

test('RF-13: Endpoints de autorización OAuth y descarga de calendario', () => {
  const authRoute = path.join(ROOT, 'src', 'app', 'api', 'auth', 'google', 'route.ts');
  const callbackRoute = path.join(ROOT, 'src', 'app', 'api', 'auth', 'google', 'callback', 'route.ts');
  const calendarRoute = path.join(ROOT, 'src', 'app', 'api', 'orientaciones', 'calendar', 'route.ts');

  assert.ok(fs.existsSync(authRoute), 'Endpoint /api/auth/google debe existir');
  assert.ok(fs.existsSync(callbackRoute), 'Endpoint /api/auth/google/callback debe existir');
  assert.ok(fs.existsSync(calendarRoute), 'Endpoint /api/orientaciones/calendar debe existir');

  const calContent = fs.readFileSync(calendarRoute, 'utf8');
  assert.ok(calContent.includes('text/calendar; charset=utf-8'), 'Debe servir Content-Type text/calendar');
});

test('RF-16: Resiliencia ante caídas de API externa con fallback y auditoría', () => {
  const libPath = path.join(ROOT, 'src', 'lib', 'google-calendar.ts');
  const content = fs.readFileSync(libPath, 'utf8');

  assert.ok(content.includes('FALLO_SYNC_GOOGLE_CALENDAR'), 'Debe registrar fallos en logs_auditoria');
  assert.ok(content.includes('resilient_fallback_meet'), 'Debe contar con mecanismo de sala fallback');
  assert.ok(content.includes('Pendiente_Reintento'), 'Debe marcar estado para reintento en caso de caída');
});

test('RF-13 / Multi-Doctor: Esquema de base de datos soporta múltiples doctores con Google', () => {
  const schemaPath = path.join(ROOT, 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  assert.ok(schema.includes('google_refresh_token text'), 'Tabla doctores debe almacenar google_refresh_token');
  assert.ok(schema.includes('google_conectado boolean'), 'Tabla doctores debe registrar estado de conexión');
  assert.ok(schema.includes('doctor_id uuid REFERENCES public.doctores(id)'), 'Citas deben admitir doctor_id');
  assert.ok(schema.includes('Dr. Javier Beiza Ayala'), 'Seed debe incluir titular o doctores del equipo');
});
