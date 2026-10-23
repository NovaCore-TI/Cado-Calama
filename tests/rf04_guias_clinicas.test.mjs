import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const EXPECTED_GUIDES = [
  {
    id: 'guia-post-exodoncia',
    fileName: 'CADO_Guia_Cuidados_Post_Exodoncia.pdf',
    category: 'Postoperatorio',
  },
  {
    id: 'guia-primeros-auxilios-urgencias',
    fileName: 'CADO_Guia_Primeros_Auxilios_Urgencias.pdf',
    category: 'Urgencias y Dolor',
  },
  {
    id: 'guia-preparacion-ansiedad-bruxismo',
    fileName: 'CADO_Guia_Preparacion_y_Confort_Dental.pdf',
    category: 'Bienestar y Confort',
  },
];

test('RF-04: Verificación física de archivos PDF generados', () => {
  for (const guide of EXPECTED_GUIDES) {
    const filePath = path.join(ROOT, 'public', 'guias', guide.fileName);
    assert.ok(fs.existsSync(filePath), `El archivo ${guide.fileName} debe existir en public/guias/`);

    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 2000, `El archivo ${guide.fileName} debe tener tamaño > 2KB (tiene ${stats.size} bytes)`);

    const buffer = fs.readFileSync(filePath);
    const header = buffer.subarray(0, 5).toString('ascii');
    assert.equal(header, '%PDF-', `El archivo ${guide.fileName} debe tener cabecera PDF válida (%PDF-)`);

    const tail = buffer.subarray(buffer.length - 15).toString('ascii');
    assert.ok(tail.includes('%%EOF'), `El archivo ${guide.fileName} debe finalizar con EOF válido`);
  }
});

test('RF-04: Catálogo y rutas de API backend en código', async () => {
  const routePath = path.join(ROOT, 'src', 'app', 'api', 'recursos', 'route.ts');
  assert.ok(fs.existsSync(routePath), 'El endpoint /api/recursos/route.ts debe existir');

  const content = fs.readFileSync(routePath, 'utf8');
  assert.ok(content.includes('CADO_Guia_Cuidados_Post_Exodoncia.pdf'), 'Debe incluir guía post-exodoncia');
  assert.ok(content.includes('CADO_Guia_Primeros_Auxilios_Urgencias.pdf'), 'Debe incluir guía primeros auxilios');
  assert.ok(content.includes('CADO_Guia_Preparacion_y_Confort_Dental.pdf'), 'Debe incluir guía preparación y confort');
  assert.ok(content.includes('DESCARGA_GUIA_PDF'), 'Debe registrar logs de auditoría');
});

test('RF-04: Endpoint de descarga forzada con mitigación de Path Traversal', async () => {
  const downloadRoutePath = path.join(ROOT, 'src', 'app', 'api', 'recursos', 'download', 'route.ts');
  assert.ok(fs.existsSync(downloadRoutePath), 'El endpoint /api/recursos/download/route.ts debe existir');

  const content = fs.readFileSync(downloadRoutePath, 'utf8');
  assert.ok(content.includes('ALLOWED_FILES'), 'Debe implementar allowlist estricto de archivos');
  assert.ok(content.includes('Content-Disposition'), 'Debe configurar cabeceras de descarga attachment');
  assert.ok(content.includes('application/pdf'), 'Debe configurar cabecera de tipo de contenido application/pdf');
});

test('RF-04: Esquema Supabase incluye tabla y seed de guías clínicas', () => {
  const schemaPath = path.join(ROOT, 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS public.guias_clinicas'), 'Tabla guias_clinicas debe estar definida');
  assert.ok(schema.includes('INSERT INTO public.guias_clinicas'), 'Debe existir seed inicial para guías clínicas');
  assert.ok(schema.includes('/guias/CADO_Guia_Cuidados_Post_Exodoncia.pdf'), 'Seed debe incluir URL de exodoncia');
  assert.ok(schema.includes('/guias/CADO_Guia_Primeros_Auxilios_Urgencias.pdf'), 'Seed debe incluir URL de primeros auxilios');
  assert.ok(schema.includes('/guias/CADO_Guia_Preparacion_y_Confort_Dental.pdf'), 'Seed debe incluir URL de confort');
});
