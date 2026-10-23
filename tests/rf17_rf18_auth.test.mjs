import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

test('RF-17: Autenticación 100% con Supabase Auth y mitigación de fuerza bruta', () => {
  const contextPath = path.join(ROOT, 'src', 'context', 'CadoContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf8');

  // 1. Debe autenticar directamente contra Supabase Auth
  assert.ok(
    content.includes('supabase.auth.signInWithPassword'),
    'Debe llamar a supabase.auth.signInWithPassword'
  );

  // 2. Debe mitigar fuerza bruta bloqueando tras 5 intentos (RF-17)
  assert.ok(
    content.includes('failedAttempts >= 5'),
    'Debe detectar 5 intentos fallidos'
  );
  assert.ok(
    content.includes('15 * 60 * 1000'),
    'Debe aplicar bloqueo temporal estricto de 15 minutos'
  );

  // 3. Credenciales demo eliminadas
  assert.ok(
    !content.includes("email.trim().toLowerCase() === 'demo@cado.local' && pass === 'DEMO'"),
    'Las credenciales de demo fijas deben haber sido eliminadas'
  );
});

test('RF-18: Expiración por inactividad de 30 min y cierre voluntario', () => {
  const contextPath = path.join(ROOT, 'src', 'context', 'CadoContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf8');

  // 1. Debe caducar tras 30 minutos continuos de inactividad
  assert.ok(
    content.includes('30 * 60 * 1000'),
    'Debe configurar temporizador de inactividad de 30 minutos'
  );

  // 2. Cierre de sesión voluntario con Supabase
  assert.ok(
    content.includes('supabase.auth.signOut()'),
    'Debe cerrar sesión en Supabase Auth'
  );

  // 3. Sincronización de sesión activa
  assert.ok(
    content.includes('supabase.auth.getSession()'),
    'Debe comprobar sesión activa de Supabase'
  );
});

test('RF-17 & RF-18: Vista de Login en /admin sin credenciales mock', () => {
  const adminPath = path.join(ROOT, 'src', 'app', 'admin', 'page.tsx');
  const content = fs.readFileSync(adminPath, 'utf8');

  assert.ok(
    !content.includes('usuario demo@cado.local · clave DEMO'),
    'No debe mostrar credenciales mock en pantalla'
  );
  assert.ok(
    content.includes('Supabase'),
    'Debe indicar autenticación con Supabase'
  );
  assert.ok(
    content.includes('isLoggingIn'),
    'Debe implementar feedback de carga durante la autenticación'
  );
});
