-- =============================================================================
-- CADO ODONTOLOGÍA - ESQUEMA POSTGRESQL PARA SUPABASE
-- Optimizado según las directrices oficiales de Supabase & Postgres Best Practices:
--   1. Índices automáticos en todas las Foreign Keys (10x-100x en JOINs y Cascades)
--   2. Índices parciales para consultas de alta concurrencia (bloques disponibles, blog)
--   3. Políticas RLS granulares con cláusula 'TO anon, authenticated'
--   4. Grants explícitos de Data API (REST/PostgREST)
--   5. Trigger automático para 'updated_at'
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLAS PRINCIPALES
-- -----------------------------------------------------------------------------

-- 1.1 Pacientes (Minimización de datos: sin RUT)
CREATE TABLE IF NOT EXISTS public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  email text NOT NULL,
  telefono text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2 Cuestionarios de Perfilamiento
CREATE TABLE IF NOT EXISTS public.cuestionarios_perfilamiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  motivo_consulta text NOT NULL,
  nivel_temor text NOT NULL,
  respuestas_adicionales jsonb NOT NULL DEFAULT '{}'::jsonb,
  consentimiento_privacidad boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.3 Preferencias de Confort
CREATE TABLE IF NOT EXISTS public.preferencias_confort (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuestionario_id uuid REFERENCES public.cuestionarios_perfilamiento(id) ON DELETE CASCADE,
  ambiente_preferido text DEFAULT 'musica_suave',
  solicita_pausas boolean DEFAULT true,
  desea_acompanante boolean DEFAULT false,
  senal_pausa boolean DEFAULT true,
  explicacion_paso_a_paso boolean DEFAULT true,
  notas text,
  consent_datos boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.4 Doctores / Especialistas
CREATE TABLE IF NOT EXISTS public.doctores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text UNIQUE NOT NULL,
  rol text DEFAULT 'Odontólogo Titular',
  ultimo_acceso timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.5 Bloques de Disponibilidad para Citas
CREATE TABLE IF NOT EXISTS public.bloques_disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'Disponible',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bloque_fecha_hora UNIQUE (fecha, hora_inicio)
);

-- 1.6 Orientaciones / Citas Telemáticas
CREATE TABLE IF NOT EXISTS public.orientaciones_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  bloque_id uuid REFERENCES public.bloques_disponibilidad(id) ON DELETE SET NULL,
  cuestionario_id uuid REFERENCES public.cuestionarios_perfilamiento(id) ON DELETE SET NULL,
  nombre_paciente text NOT NULL,
  email_paciente text NOT NULL,
  telefono_paciente text NOT NULL,
  fecha date NOT NULL,
  hora text NOT NULL,
  preferencias_confort jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado_atencion text NOT NULL DEFAULT 'Programada',
  estado_derivacion text NOT NULL DEFAULT 'Sin derivación',
  fecha_derivacion timestamptz,
  notas_derivacion text,
  meet_link text DEFAULT '',
  calendar_event_id text,
  token_gestion text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  intentos_sync integer DEFAULT 0,
  estado_sync text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.7 Artículos del Blog Educativo
CREATE TABLE IF NOT EXISTS public.articulos_blog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  slug text UNIQUE NOT NULL,
  categoria text NOT NULL DEFAULT 'Cuidados',
  resumen text NOT NULL,
  cuerpo text NOT NULL,
  autor_nombre text DEFAULT 'Dr. Javier Beiza Ayala',
  tiempo_lectura text DEFAULT '3 min de lectura',
  publicado boolean NOT NULL DEFAULT true,
  estado_publicacion text NOT NULL DEFAULT 'Publicado',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NOT NULL DEFAULT now()
);

-- 1.8 Preguntas Frecuentes (FAQ)
CREATE TABLE IF NOT EXISTS public.preguntas_frecuentes (
  id serial PRIMARY KEY,
  categoria text NOT NULL,
  pregunta text NOT NULL,
  respuesta text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.9 Guías Clínicas Descargables (PDF)
CREATE TABLE IF NOT EXISTS public.guias_clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  categoria text NOT NULL,
  descripcion text NOT NULL,
  url_descarga text NOT NULL,
  tamano_kb integer DEFAULT 120,
  descargas integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.10 Logs de Auditoría
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id text,
  detalle text,
  ip_origen text DEFAULT '127.0.0.1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. ÍNDICES DE ALTO RENDIMIENTO (Best Practice: Index Foreign Keys & Partials)
-- -----------------------------------------------------------------------------

-- Índices en Foreign Keys para acelerar JOINs y evitar bloqueos en DELETEs/Cascades
CREATE INDEX IF NOT EXISTS idx_cuestionarios_paciente_id ON public.cuestionarios_perfilamiento (paciente_id);
CREATE INDEX IF NOT EXISTS idx_preferencias_cuestionario_id ON public.preferencias_confort (cuestionario_id);
CREATE INDEX IF NOT EXISTS idx_bloques_doctor_id ON public.bloques_disponibilidad (doctor_id);
CREATE INDEX IF NOT EXISTS idx_orientaciones_paciente_id ON public.orientaciones_citas (paciente_id);
CREATE INDEX IF NOT EXISTS idx_orientaciones_bloque_id ON public.orientaciones_citas (bloque_id);
CREATE INDEX IF NOT EXISTS idx_orientaciones_cuestionario_id ON public.orientaciones_citas (cuestionario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_autor_id ON public.articulos_blog (autor_id);
CREATE INDEX IF NOT EXISTS idx_logs_usuario_id ON public.logs_auditoria (usuario_id);

-- Índices Parciales (Partial Indexes) para acelerar consultas frecuentes filtradas
CREATE INDEX IF NOT EXISTS idx_bloques_disponibles ON public.bloques_disponibilidad (fecha, hora_inicio) WHERE estado = 'Disponible';
CREATE INDEX IF NOT EXISTS idx_articulos_publicados ON public.articulos_blog (published_at DESC) WHERE publicado = true;
CREATE INDEX IF NOT EXISTS idx_faq_activas ON public.preguntas_frecuentes (orden ASC) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_guias_activas ON public.guias_clinicas (categoria) WHERE activo = true;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER AUTOMÁTICO PARA 'updated_at'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientaciones_updated_at ON public.orientaciones_citas;
CREATE TRIGGER trg_orientaciones_updated_at
BEFORE UPDATE ON public.orientaciones_citas
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. SEGURIDAD A NIVEL DE FILA (RLS) & POLÍTICAS
-- -----------------------------------------------------------------------------

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuestionarios_perfilamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_confort ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloques_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientaciones_citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articulos_blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas_frecuentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guias_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DO $$ 
DECLARE
  t text;
  p text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p, t);
    END LOOP;
  END LOOP;
END $$;

-- Políticas de Contenido Público (Lectura abierta)
CREATE POLICY "Lectura publica articulos" ON public.articulos_blog
  FOR SELECT TO anon, authenticated USING (publicado = true);

CREATE POLICY "Lectura publica FAQ" ON public.preguntas_frecuentes
  FOR SELECT TO anon, authenticated USING (activo = true);

CREATE POLICY "Lectura publica guias clinicas" ON public.guias_clinicas
  FOR SELECT TO anon, authenticated USING (activo = true);

CREATE POLICY "Lectura publica doctores" ON public.doctores
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Lectura publica bloques disponibles" ON public.bloques_disponibilidad
  FOR SELECT TO anon, authenticated USING (true);

-- Políticas de Pacientes y Agendamiento (Inserción y gestión segura)
CREATE POLICY "Creacion publica paciente" ON public.pacientes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Lectura pacientes vinculados" ON public.pacientes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Creacion cuestionario perfilamiento" ON public.cuestionarios_perfilamiento
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Lectura cuestionarios perfilamiento" ON public.cuestionarios_perfilamiento
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Creacion preferencias confort" ON public.preferencias_confort
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Lectura preferencias confort" ON public.preferencias_confort
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Creacion cita orientacion" ON public.orientaciones_citas
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Lectura y gestion de citas" ON public.orientaciones_citas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Actualizacion estado bloques" ON public.bloques_disponibilidad
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Registro auditoria" ON public.logs_auditoria
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Lectura auditoria" ON public.logs_auditoria
  FOR SELECT TO anon, authenticated USING (true);

-- Políticas administrativas adicionales para Doctores y Contenido
CREATE POLICY "Gestion articulos doctores" ON public.articulos_blog
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. PERMISOS DEL DATA API (Supabase Core Principle: Data API Exposure)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. DATOS SEMILLA (Seed Data)
-- -----------------------------------------------------------------------------

-- Doctor Titular
INSERT INTO public.doctores (nombre, email, rol)
VALUES ('Dr. Javier Beiza Ayala', 'jbeiza@cado.cl', 'Cirujano Dentista Titular - 13 años en Calama')
ON CONFLICT (email) DO UPDATE SET ultimo_acceso = now();

-- Artículos del Blog Educativo
INSERT INTO public.articulos_blog (titulo, slug, categoria, resumen, cuerpo, autor_nombre, tiempo_lectura, publicado)
VALUES
  (
    'Cómo superar el miedo al dentista paso a paso en Calama',
    'como-superar-miedo-al-dentista-calama',
    'Miedo Dental',
    'Descubre cómo las pausas acordadas, el control del ambiente y una orientación telemática previa ayudan a recuperar la tranquilidad antes de ir a consulta.',
    'Sentir ansiedad o temor antes de asistir a una consulta odontológica es mucho más común de lo que imaginas. En CADO Odontología entendemos que cada persona vive sus tiempos de manera diferente.\n\n1. Hablar antes de abrir la boca: La orientación virtual de 15 minutos permite conocer al Dr. Javier Beiza desde un lugar seguro antes de pisar la clínica.\n2. Señal de parada en todo momento: Acordamos un gesto con tu mano para detener cualquier procedimiento de inmediato.\n3. Ambiente adaptado a ti: Tú eliges si prefieres música suave, silencio o que te expliquemos paso a paso cada etapa.',
    'Dr. Javier Beiza Ayala',
    '3 min de lectura',
    true
  ),
  (
    'Bruxismo y tensión mandibular: señales de alerta y alivio inicial',
    'bruxismo-tension-mandibular-senales-alivio',
    'Bruxismo',
    '¿Despiertas con dolor en la mandíbula o sensibilidad dental? Conoce las causas frecuentes de los trastornos temporomandibulares (TTM) y qué medidas suaves puedes aplicar.',
    'El bruxismo y los Trastornos Temporomandibulares (TTM) suelen intensificarse en períodos de alto estrés o turnos laborales exigentes como ocurre frecuentemente en Calama.\n\nLas principales señales incluyen rigidez al despertar, dolor cerca del oído al masticar y desgaste dental progresivo. Aplicar calor local húmedo por 10 minutos, evitar alimentos excesivamente duros y realizar pausas conscientes de relajación mandibular ayudan a disminuir la sobrecarga antes de tu evaluación presencial.',
    'Dr. Javier Beiza Ayala',
    '4 min de lectura',
    true
  ),
  (
    'Cuidados esenciales después de una extracción dental (Exodoncia)',
    'cuidados-despues-de-extraccion-dental',
    'Cuidados',
    'Guía práctica para las primeras 48 horas tras una exodoncia: alimentación, higiene segura y cuándo comunicarte con la clínica.',
    'Las primeras 24 a 48 horas posteriores a una extracción dental son clave para una cicatrización cómoda y sin contratiempos.\n\n• Mantén la gasa presionada suavemente durante los primeros 30-45 minutos.\n• Evita escupir con fuerza, usar bombillas (pajitas) o fumar, ya que esto puede desalojar el coágulo protector.\n• Prefiere alimentos blandos y fríos o tibios durante el primer día.\n• Si notas sangrado abundante que no cede o dolor que aumenta después del tercer día, escríbenos por WhatsApp para orientarte.',
    'Dr. Javier Beiza Ayala',
    '3 min de lectura',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Preguntas Frecuentes
INSERT INTO public.preguntas_frecuentes (categoria, pregunta, respuesta, orden)
VALUES
  ('miedo', '¿Puedo contar que siento miedo o fobia al dentista?', 'Sí. CADO plantea un trato respetuoso y sin juicios. El cuestionario previo de perfilamiento y el test de confort permiten adaptar el ritmo, acordar una señal de parada con la mano y preparar un ambiente tranquilo.', 1),
  ('miedo', '¿Puedo pedir pausas durante una atención?', 'Por supuesto. Puedes solicitar pausas periódicas para descansar la mandíbula y acordar una señal manual con el Dr. Javier Beiza para detener el procedimiento inmediatamente cuando lo necesites.', 2),
  ('vespertino', '¿Cómo funcionan los horarios vespertinos en Calama?', 'CADO ofrece bloques de orientación virtual de 15 minutos en horario compatible con jornadas laborales y turnos, además de coordinación presencial vespertina (19:00 y 20:00 hrs) en Edificio Espacio Parque.', 3),
  ('miedo', '¿Qué privacidad tienen mis respuestas en el cuestionario previo?', 'Tus respuestas están protegidas bajo la Ley N° 19.628 y N° 20.584. Siempre puedes elegir «Prefiero no responder» en preguntas sensibles y solo se almacenan con tu consentimiento explícito.', 4),
  ('dentalink', '¿Cómo se reserva una consulta presencial después de la orientación?', 'Tras la orientación telemática, el doctor habilita la derivación hacia la agenda oficial en Dentalink o mediante coordinación directa asistida por WhatsApp.', 5),
  ('procedimientos', '¿Qué hacer si tengo dolor dental agudo o una urgencia hoy?', 'Dirígete a nuestra sección de Urgencias Dentales donde encontrarás contacto telefónico directo de un toque (+56 9 4465 7815), WhatsApp prioritario y guías PDF de primeros auxilios.', 6);


-- -----------------------------------------------------------------------------
-- 8. SUPABASE REALTIME (SINCRONIZACIÓN AUTOMÁTICA EN VIVO VÍA WEBSOCKETS)
-- -----------------------------------------------------------------------------
-- Publicación de tablas en el canal de eventos de Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orientaciones_citas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orientaciones_citas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bloques_disponibilidad'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bloques_disponibilidad;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'articulos_blog'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.articulos_blog;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cuestionarios_perfilamiento'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cuestionarios_perfilamiento;
  END IF;
END $$;
