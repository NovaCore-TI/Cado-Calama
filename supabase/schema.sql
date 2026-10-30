BEGIN;
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
-- gen_random_uuid is built into supported PostgreSQL versions.

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
  google_email text,
  google_refresh_token text,
  google_calendar_id text DEFAULT 'primary',
  google_conectado boolean DEFAULT false,
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
  doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
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
  token_gestion text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
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
  published_at timestamptz
);

-- First publication is assigned by PostgreSQL, independently of client dates.
CREATE OR REPLACE FUNCTION public.set_article_publication_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.published_at := CASE WHEN NEW.publicado THEN statement_timestamp() ELSE NULL END;
  ELSE
    NEW.published_at := OLD.published_at;
    IF NEW.publicado AND NEW.published_at IS NULL THEN
      NEW.published_at := statement_timestamp();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_article_publication_date() FROM PUBLIC;
DROP TRIGGER IF EXISTS article_publication_date ON public.articulos_blog;
CREATE TRIGGER article_publication_date
BEFORE INSERT OR UPDATE ON public.articulos_blog
FOR EACH ROW EXECUTE FUNCTION public.set_article_publication_date();

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
-- Control Transaccional de Concurrencia (RF-11): Evita duplicidad de citas activas en el mismo horario
CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_activas_fecha_hora ON public.orientaciones_citas (fecha, hora) WHERE estado_atencion = 'Programada';

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

-- Reproducible security rules. Applied by the incremental migration and schema.sql.
-- Upgrade installations created before Google integration and doctor ownership.
ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS google_email text;
ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS google_refresh_token text;
ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS google_calendar_id text DEFAULT 'primary';
ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS google_conectado boolean DEFAULT false;
ALTER TABLE public.orientaciones_citas ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orientaciones_doctor_id ON public.orientaciones_citas(doctor_id);
ALTER FUNCTION public.set_updated_at() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- Dashboard's automatic-RLS event trigger needs no callable Data API endpoint.
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id);
ALTER TABLE public.doctores ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
ALTER TABLE public.cuestionarios_perfilamiento ADD COLUMN IF NOT EXISTS draft_access_token text;
ALTER TABLE public.orientaciones_citas ADD COLUMN IF NOT EXISTS sync_lock_until timestamptz;
ALTER TABLE public.orientaciones_citas ADD COLUMN IF NOT EXISTS sync_lease_id uuid;
ALTER TABLE public.orientaciones_citas ADD COLUMN IF NOT EXISTS consentimiento_privacidad boolean NOT NULL DEFAULT false;
ALTER TABLE public.orientaciones_citas ADD COLUMN IF NOT EXISTS consentimiento_fecha timestamptz;
-- Remove only URLs demonstrably fabricated by the retired fallback.
UPDATE public.orientaciones_citas SET meet_link='',estado_sync='Pendiente_Reintento'
WHERE calendar_event_id IS NULL AND meet_link LIKE 'https://meet.google.com/cado-%';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.orientaciones_citas WHERE estado_atencion='Programada' GROUP BY fecha,hora::time HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Existen citas activas duplicadas. Resolver antes de migrar; no se elimina ninguna cita automáticamente.';
  END IF;
END $$;
UPDATE public.orientaciones_citas SET hora=to_char(hora::time,'HH24:MI') WHERE hora<>to_char(hora::time,'HH24:MI');
CREATE TABLE IF NOT EXISTS public.doctor_google_credentials (
  doctor_id uuid PRIMARY KEY REFERENCES public.doctores(id) ON DELETE CASCADE,
  email text NOT NULL,
  refresh_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.doctor_google_credentials(doctor_id,email,refresh_token)
SELECT id,coalesce(google_email,email),google_refresh_token FROM public.doctores
WHERE google_refresh_token IS NOT NULL AND google_refresh_token <> ''
ON CONFLICT (doctor_id) DO NOTHING;
UPDATE public.doctores SET google_refresh_token = NULL WHERE google_refresh_token IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.fechas_bloqueadas (
  fecha date PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.doctores(id),
  motivo text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_fechas_bloqueadas_doctor ON public.fechas_bloqueadas(doctor_id);

-- Scope cleanup to CADO-owned tables; never remove policies from unrelated tables.
DO $$ DECLARE t text; p text; BEGIN
  FOREACH t IN ARRAY ARRAY['pacientes','cuestionarios_perfilamiento','preferencias_confort','doctores','bloques_disponibilidad','orientaciones_citas','articulos_blog','preguntas_frecuentes','guias_clinicas','logs_auditoria','doctor_google_credentials','fechas_bloqueadas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p,t);
    END LOOP;
  END LOOP;
END $$;
-- Revoke the unsafe defaults installed by the old schema, not unrelated table grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.articulos_blog,public.preguntas_frecuentes,public.guias_clinicas TO anon,authenticated;
CREATE POLICY published_articles ON public.articulos_blog FOR SELECT TO anon,authenticated USING(publicado);
CREATE POLICY active_faq ON public.preguntas_frecuentes FOR SELECT TO anon,authenticated USING(activo);
CREATE POLICY active_guides ON public.guias_clinicas FOR SELECT TO anon,authenticated USING(activo);
-- No client can read credential columns or provision professional membership.
GRANT SELECT(id,nombre,email,rol,auth_user_id,activo,created_at) ON public.doctores TO authenticated;
CREATE POLICY own_doctor_membership ON public.doctores FOR SELECT TO authenticated
USING(auth_user_id=(select auth.uid()) AND activo);
-- Clinical data and mutations are backend-only, even with a valid browser JWT.
-- Every private API additionally checks the expiring HttpOnly professional session.
-- This prevents bypassing inactivity expiry through the Data API.

CREATE OR REPLACE FUNCTION public.reserve_orientation(
  p_date date,p_time time,p_name text,p_email text,p_phone text,p_code text,p_token text,
  p_questionnaire uuid DEFAULT NULL,p_comfort jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bloques_disponibilidad; q public.cuestionarios_perfilamiento;
  patient uuid; appointment public.orientaciones_citas;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
  IF p_time NOT IN ('19:00'::time,'19:15'::time,'19:30'::time,'19:45'::time)
     OR (p_date+p_time) AT TIME ZONE 'America/Santiago' <= now()
     OR length(trim(p_name)) NOT BETWEEN 3 AND 120
     OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR length(p_email)>254 OR p_phone !~ '^[+0-9 ()-]{8,25}$'
     OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid booking' USING ERRCODE='22023'; END IF;
  SELECT * INTO b FROM public.bloques_disponibilidad WHERE fecha=p_date AND hora_inicio=p_time FOR UPDATE;
  IF NOT FOUND OR b.estado<>'Disponible' OR b.doctor_id IS NULL
     OR EXISTS(SELECT 1 FROM public.fechas_bloqueadas WHERE fecha=p_date)
     OR NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=b.doctor_id AND activo AND auth_user_id IS NOT NULL)
  THEN RAISE EXCEPTION 'Block unavailable' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM public.orientaciones_citas WHERE fecha=p_date AND hora::time=p_time AND estado_atencion='Programada')
  THEN RAISE EXCEPTION 'Block occupied' USING ERRCODE='23505'; END IF;
  IF p_questionnaire IS NOT NULL THEN
    SELECT * INTO q FROM public.cuestionarios_perfilamiento WHERE id=p_questionnaire FOR UPDATE;
    IF NOT FOUND OR q.paciente_id IS NOT NULL OR NOT q.consentimiento_privacidad THEN RAISE EXCEPTION 'Invalid questionnaire' USING ERRCODE='22023'; END IF;
  END IF;
  INSERT INTO public.pacientes(nombre_completo,email,telefono) VALUES(trim(p_name),trim(p_email),trim(p_phone)) RETURNING id INTO patient;
  IF p_questionnaire IS NOT NULL THEN UPDATE public.cuestionarios_perfilamiento SET paciente_id=patient,draft_access_token=NULL WHERE id=p_questionnaire; END IF;
  INSERT INTO public.orientaciones_citas(codigo,doctor_id,paciente_id,bloque_id,cuestionario_id,nombre_paciente,email_paciente,telefono_paciente,fecha,hora,preferencias_confort,token_gestion,estado_sync,consentimiento_privacidad,consentimiento_fecha)
  VALUES(p_code,b.doctor_id,patient,b.id,p_questionnaire,trim(p_name),trim(p_email),trim(p_phone),p_date,to_char(p_time,'HH24:MI'),p_comfort,p_token,'Pendiente_Reintento',true,now()) RETURNING * INTO appointment;
  RETURN to_jsonb(appointment);
END $$;
REVOKE ALL ON FUNCTION public.reserve_orientation(date,time,text,text,text,text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_orientation(date,time,text,text,text,text,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_orientation(
 p_code text,p_token text,p_doctor uuid,p_action text,p_date date DEFAULT NULL,
 p_time time DEFAULT NULL,p_state text DEFAULT NULL,p_note text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.orientaciones_citas; b public.bloques_disponibilidad; old_state text;
 old_derivation text; old_derived_at timestamptz;
BEGIN
 SELECT * INTO a FROM public.orientaciones_citas WHERE codigo=p_code
 AND ((p_token IS NOT NULL AND token_gestion=p_token) OR (p_token IS NULL AND p_doctor=doctor_id)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found' USING ERRCODE='P0002'; END IF;
 old_state:=a.estado_atencion;
 old_derivation:=a.estado_derivacion; old_derived_at:=a.fecha_derivacion;
 IF p_action IN ('cancelar','reprogramar') AND a.estado_atencion<>'Programada' THEN
  RAISE EXCEPTION 'Appointment is not scheduled' USING ERRCODE='P0001';
 END IF;
 IF p_action='reprogramar' THEN
  IF p_date IS NULL OR p_time IS NULL OR p_time NOT IN ('19:00'::time,'19:15'::time,'19:30'::time,'19:45'::time) OR (p_date+p_time) AT TIME ZONE 'America/Santiago'<=now() THEN
   RAISE EXCEPTION 'Invalid date' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
  SELECT * INTO b FROM public.bloques_disponibilidad WHERE fecha=p_date AND hora_inicio=p_time FOR UPDATE;
  IF NOT FOUND OR b.estado<>'Disponible' OR b.doctor_id<>a.doctor_id
   OR EXISTS(SELECT 1 FROM public.fechas_bloqueadas WHERE fecha=p_date) THEN
   RAISE EXCEPTION 'Block unavailable' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM public.orientaciones_citas WHERE fecha=p_date AND hora::time=p_time AND estado_atencion='Programada' AND id<>a.id) THEN
   RAISE EXCEPTION 'Block occupied' USING ERRCODE='23505'; END IF;
  UPDATE public.orientaciones_citas SET fecha=p_date,hora=to_char(p_time,'HH24:MI'),bloque_id=b.id,estado_sync='Pendiente_Reintento' WHERE id=a.id RETURNING * INTO a;
 ELSIF p_action='cancelar' THEN
  UPDATE public.orientaciones_citas SET estado_atencion='Cancelada',estado_sync='Pendiente_Reintento' WHERE id=a.id RETURNING * INTO a;
 ELSIF p_doctor IS NOT NULL AND p_action='estado' THEN
  IF p_state NOT IN ('Programada','Realizada','No asistió','Cancelada') OR p_state IS NULL THEN RAISE EXCEPTION 'Invalid state' USING ERRCODE='22023'; END IF;
  IF a.estado_atencion<>'Programada' AND p_state='Programada' THEN RAISE EXCEPTION 'Cannot reopen appointment' USING ERRCODE='P0001'; END IF;
  UPDATE public.orientaciones_citas SET estado_atencion=p_state,estado_sync=CASE WHEN p_state='Cancelada' THEN 'Pendiente_Reintento' ELSE estado_sync END WHERE id=a.id RETURNING * INTO a;
 ELSIF p_doctor IS NOT NULL AND p_action='derivacion' THEN
  IF p_state NOT IN ('Sin derivación','Pendiente presencial','Derivada a Dentalink') OR p_state IS NULL THEN RAISE EXCEPTION 'Invalid state' USING ERRCODE='22023'; END IF;
  UPDATE public.orientaciones_citas SET estado_derivacion=p_state,fecha_derivacion=CASE WHEN p_state='Derivada a Dentalink' THEN now() ELSE NULL END,notas_derivacion=left(p_note,500) WHERE id=a.id RETURNING * INTO a;
 ELSE RAISE EXCEPTION 'Action denied' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.logs_auditoria(usuario_id,accion,entidad,entidad_id,detalle)
 VALUES(p_doctor,p_action,'orientaciones_citas',a.codigo,jsonb_build_object('previous_state',old_state,'state',a.estado_atencion,'previous_derivation',old_derivation,'previous_derived_at',old_derived_at,'derivation',a.estado_derivacion,'date',a.fecha,'time',a.hora,'note',left(p_note,500))::text);
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.manage_orientation(text,text,uuid,text,date,time,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_orientation(text,text,uuid,text,date,time,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.set_date_block(p_date date,p_doctor uuid,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
 IF p_blocked THEN
  INSERT INTO public.fechas_bloqueadas(fecha,doctor_id) VALUES(p_date,p_doctor)
  ON CONFLICT(fecha) DO UPDATE SET doctor_id=excluded.doctor_id;
 ELSE DELETE FROM public.fechas_bloqueadas WHERE fecha=p_date;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_date_block(date,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_date_block(date,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.cado_readiness() RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.doctores WHERE activo AND auth_user_id IS NOT NULL)
 AND to_regprocedure('public.reserve_orientation(date,time without time zone,text,text,text,text,text,uuid,jsonb)') IS NOT NULL
 AND to_regprocedure('public.manage_orientation(text,text,uuid,text,date,time without time zone,text,text)') IS NOT NULL
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_indexes WHERE schemaname='public' AND indexname='uq_citas_activas_fecha_hora')
$$;
REVOKE ALL ON FUNCTION public.cado_readiness() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cado_readiness() TO service_role;

-- 6. DATOS SEMILLA (Seed Data)
-- -----------------------------------------------------------------------------

-- Doctores del Equipo CADO
INSERT INTO public.doctores (nombre, email, rol)
VALUES 
  ('Dr. Javier Beiza Ayala', 'jbeiza@cado.cl', 'Cirujano Dentista Titular - 13 años en Calama')
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





-- Isolation for authenticated professionals via the backend RLS gateway.
-- Professional reads execute as a NOLOGIN role without BYPASSRLS, even though
-- only the backend service can invoke the gateway after validating its session.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='cado_clinical_reader') THEN
    CREATE ROLE cado_clinical_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
GRANT cado_clinical_reader TO postgres;
GRANT USAGE ON SCHEMA public TO cado_clinical_reader;
GRANT SELECT ON public.pacientes, public.orientaciones_citas,
  public.cuestionarios_perfilamiento, public.preferencias_confort TO cado_clinical_reader;
GRANT SELECT(id,auth_user_id,activo) ON public.doctores TO cado_clinical_reader;

DROP POLICY IF EXISTS clinical_membership_check ON public.doctores;
CREATE POLICY clinical_membership_check ON public.doctores FOR SELECT TO cado_clinical_reader USING(activo);
DROP POLICY IF EXISTS doctor_own_appointments ON public.orientaciones_citas;
CREATE POLICY doctor_own_appointments ON public.orientaciones_citas FOR SELECT TO cado_clinical_reader
USING(doctor_id=nullif(current_setting('cado.doctor_id',true),'')::uuid);
DROP POLICY IF EXISTS doctor_own_patients ON public.pacientes;
CREATE POLICY doctor_own_patients ON public.pacientes FOR SELECT TO cado_clinical_reader
USING(EXISTS(SELECT 1 FROM public.orientaciones_citas a WHERE a.paciente_id=pacientes.id));
DROP POLICY IF EXISTS doctor_own_questionnaires ON public.cuestionarios_perfilamiento;
CREATE POLICY doctor_own_questionnaires ON public.cuestionarios_perfilamiento FOR SELECT TO cado_clinical_reader
USING(EXISTS(SELECT 1 FROM public.orientaciones_citas a
  WHERE a.cuestionario_id=cuestionarios_perfilamiento.id
    AND a.paciente_id=cuestionarios_perfilamiento.paciente_id));
DROP POLICY IF EXISTS doctor_own_comfort ON public.preferencias_confort;
CREATE POLICY doctor_own_comfort ON public.preferencias_confort FOR SELECT TO cado_clinical_reader
USING(EXISTS(SELECT 1 FROM public.cuestionarios_perfilamiento q WHERE q.id=preferencias_confort.cuestionario_id));

CREATE OR REPLACE FUNCTION public.read_doctor_clinical(p_doctor uuid,p_resource text,p_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; previous_context text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=p_doctor AND activo AND auth_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Professional access denied' USING ERRCODE='42501';
  END IF;
  previous_context:=current_setting('cado.doctor_id',true);
  PERFORM pg_catalog.set_config('cado.doctor_id',p_doctor::text,true);
  IF p_resource='orientaciones' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT a.id,a.codigo,a.nombre_paciente,a.email_paciente,a.telefono_paciente,a.fecha,a.hora,
        a.estado_atencion,a.estado_derivacion,a.fecha_derivacion,a.notas_derivacion,a.created_at,
        a.preferencias_confort,a.meet_link,a.estado_sync,
        (SELECT to_jsonb(qr) FROM (SELECT q.id,q.motivo_consulta,q.nivel_temor,q.respuestas_adicionales,
          q.consentimiento_privacidad,q.created_at FROM public.cuestionarios_perfilamiento q
          WHERE q.id=a.cuestionario_id) qr) AS cuestionarios_perfilamiento
      FROM public.orientaciones_citas a WHERE p_code IS NULL OR a.codigo=p_code
      ORDER BY a.fecha,a.hora,a.id LIMIT 200
    ) r;
  ELSIF p_resource='cuestionarios' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,motivo_consulta,nivel_temor,respuestas_adicionales,consentimiento_privacidad,created_at
      FROM public.cuestionarios_perfilamiento ORDER BY created_at DESC,id LIMIT 200
    ) r;
  ELSIF p_resource='confort' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,cuestionario_id,ambiente_preferido,solicita_pausas,desea_acompanante,senal_pausa,
        explicacion_paso_a_paso,notas,consent_datos,created_at
      FROM public.preferencias_confort ORDER BY created_at DESC,id LIMIT 200
    ) r;
  ELSIF p_resource='pacientes' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,nombre_completo,email,telefono,created_at FROM public.pacientes ORDER BY nombre_completo,id LIMIT 200
    ) r;
  ELSE RAISE EXCEPTION 'Invalid clinical resource' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.set_config('cado.doctor_id',coalesce(previous_context,''),true);
  RETURN result;
END $$;
-- The function owner cannot log in, write records, access Google secrets, or bypass RLS.
GRANT CREATE ON SCHEMA public TO cado_clinical_reader;
ALTER FUNCTION public.read_doctor_clinical(uuid,text,text) OWNER TO cado_clinical_reader;
REVOKE CREATE ON SCHEMA public FROM cado_clinical_reader;
REVOKE ALL ON FUNCTION public.read_doctor_clinical(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_doctor_clinical(uuid,text,text) TO service_role;

-- Blocking a date affects only the requesting doctor's agenda.
ALTER TABLE public.fechas_bloqueadas DROP CONSTRAINT IF EXISTS fechas_bloqueadas_pkey;
ALTER TABLE public.fechas_bloqueadas ADD PRIMARY KEY(doctor_id,fecha);

CREATE OR REPLACE FUNCTION public.upsert_doctor_block(p_doctor uuid,p_date date,p_time time,p_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bloques_disponibilidad;
BEGIN
  IF p_doctor IS NULL OR NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=p_doctor AND activo AND auth_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Professional access denied' USING ERRCODE='42501';
  END IF;
  IF p_state IS NULL OR p_state NOT IN ('Disponible','Bloqueado') OR p_time IS NULL
    OR p_time NOT IN ('19:00'::time,'19:15'::time,'19:30'::time,'19:45'::time)
    OR p_date IS NULL OR (p_date+p_time) AT TIME ZONE 'America/Santiago'<=now() THEN
    RAISE EXCEPTION 'Invalid block' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
  INSERT INTO public.bloques_disponibilidad(doctor_id,fecha,hora_inicio,hora_fin,estado)
  VALUES(p_doctor,p_date,p_time,p_time+interval '15 minutes',p_state)
  ON CONFLICT(fecha,hora_inicio) DO UPDATE SET estado=excluded.estado,hora_fin=excluded.hora_fin
  WHERE bloques_disponibilidad.doctor_id=excluded.doctor_id RETURNING * INTO b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Block belongs to another professional' USING ERRCODE='23505'; END IF;
  RETURN to_jsonb(b);
END $$;
REVOKE ALL ON FUNCTION public.upsert_doctor_block(uuid,date,time,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_doctor_block(uuid,date,time,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_orientation(
  p_date date,p_time time,p_name text,p_email text,p_phone text,p_code text,p_token text,
  p_questionnaire uuid DEFAULT NULL,p_comfort jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bloques_disponibilidad; q public.cuestionarios_perfilamiento;
  patient uuid; appointment public.orientaciones_citas;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
  IF p_time NOT IN ('19:00'::time,'19:15'::time,'19:30'::time,'19:45'::time)
     OR (p_date+p_time) AT TIME ZONE 'America/Santiago' <= now()
     OR length(trim(p_name)) NOT BETWEEN 3 AND 120
     OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR length(p_email)>254 OR p_phone !~ '^[+0-9 ()-]{8,25}$'
     OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid booking' USING ERRCODE='22023'; END IF;
  SELECT * INTO b FROM public.bloques_disponibilidad WHERE fecha=p_date AND hora_inicio=p_time FOR UPDATE;
  IF NOT FOUND OR b.estado<>'Disponible' OR b.doctor_id IS NULL
     OR EXISTS(SELECT 1 FROM public.fechas_bloqueadas WHERE fecha=p_date AND doctor_id=b.doctor_id)
     OR NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=b.doctor_id AND activo AND auth_user_id IS NOT NULL)
  THEN RAISE EXCEPTION 'Block unavailable' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM public.orientaciones_citas WHERE fecha=p_date AND hora::time=p_time AND estado_atencion='Programada')
  THEN RAISE EXCEPTION 'Block occupied' USING ERRCODE='23505'; END IF;
  IF p_questionnaire IS NOT NULL THEN
    SELECT * INTO q FROM public.cuestionarios_perfilamiento WHERE id=p_questionnaire FOR UPDATE;
    IF NOT FOUND OR q.paciente_id IS NOT NULL OR NOT q.consentimiento_privacidad THEN RAISE EXCEPTION 'Invalid questionnaire' USING ERRCODE='22023'; END IF;
  END IF;
  INSERT INTO public.pacientes(nombre_completo,email,telefono) VALUES(trim(p_name),trim(p_email),trim(p_phone)) RETURNING id INTO patient;
  IF p_questionnaire IS NOT NULL THEN UPDATE public.cuestionarios_perfilamiento SET paciente_id=patient,draft_access_token=NULL WHERE id=p_questionnaire; END IF;
  INSERT INTO public.orientaciones_citas(codigo,doctor_id,paciente_id,bloque_id,cuestionario_id,nombre_paciente,email_paciente,telefono_paciente,fecha,hora,preferencias_confort,token_gestion,estado_sync,consentimiento_privacidad,consentimiento_fecha)
  VALUES(p_code,b.doctor_id,patient,b.id,p_questionnaire,trim(p_name),trim(p_email),trim(p_phone),p_date,to_char(p_time,'HH24:MI'),p_comfort,p_token,'Pendiente_Reintento',true,now()) RETURNING * INTO appointment;
  RETURN to_jsonb(appointment);
END $$;
REVOKE ALL ON FUNCTION public.reserve_orientation(date,time,text,text,text,text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_orientation(date,time,text,text,text,text,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_orientation(
 p_code text,p_token text,p_doctor uuid,p_action text,p_date date DEFAULT NULL,
 p_time time DEFAULT NULL,p_state text DEFAULT NULL,p_note text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.orientaciones_citas; b public.bloques_disponibilidad; old_state text;
 old_derivation text; old_derived_at timestamptz;
BEGIN
 IF p_doctor IS NOT NULL AND (p_token IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=p_doctor AND activo AND auth_user_id IS NOT NULL)) THEN
  RAISE EXCEPTION 'Professional access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.orientaciones_citas WHERE codigo=p_code
 AND ((p_token IS NOT NULL AND token_gestion=p_token) OR (p_token IS NULL AND p_doctor=doctor_id)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found' USING ERRCODE='P0002'; END IF;
 old_state:=a.estado_atencion;
 old_derivation:=a.estado_derivacion; old_derived_at:=a.fecha_derivacion;
 IF p_action IN ('cancelar','reprogramar') AND a.estado_atencion<>'Programada' THEN
  RAISE EXCEPTION 'Appointment is not scheduled' USING ERRCODE='P0001';
 END IF;
 IF p_action='reprogramar' THEN
  IF p_date IS NULL OR p_time IS NULL OR p_time NOT IN ('19:00'::time,'19:15'::time,'19:30'::time,'19:45'::time) OR (p_date+p_time) AT TIME ZONE 'America/Santiago'<=now() THEN
   RAISE EXCEPTION 'Invalid date' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
  SELECT * INTO b FROM public.bloques_disponibilidad WHERE fecha=p_date AND hora_inicio=p_time FOR UPDATE;
  IF NOT FOUND OR b.estado<>'Disponible' OR b.doctor_id IS DISTINCT FROM a.doctor_id
   OR EXISTS(SELECT 1 FROM public.fechas_bloqueadas WHERE fecha=p_date AND doctor_id=b.doctor_id) THEN
   RAISE EXCEPTION 'Block unavailable' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM public.orientaciones_citas WHERE fecha=p_date AND hora::time=p_time AND estado_atencion='Programada' AND id<>a.id) THEN
   RAISE EXCEPTION 'Block occupied' USING ERRCODE='23505'; END IF;
  UPDATE public.orientaciones_citas SET fecha=p_date,hora=to_char(p_time,'HH24:MI'),bloque_id=b.id,estado_sync='Pendiente_Reintento' WHERE id=a.id RETURNING * INTO a;
 ELSIF p_action='cancelar' THEN
  UPDATE public.orientaciones_citas SET estado_atencion='Cancelada',estado_sync='Pendiente_Reintento' WHERE id=a.id RETURNING * INTO a;
 ELSIF p_doctor IS NOT NULL AND p_action='estado' THEN
  IF p_state NOT IN ('Programada','Realizada','No asistió','Cancelada') OR p_state IS NULL THEN RAISE EXCEPTION 'Invalid state' USING ERRCODE='22023'; END IF;
  IF a.estado_atencion<>'Programada' AND p_state='Programada' THEN RAISE EXCEPTION 'Cannot reopen appointment' USING ERRCODE='P0001'; END IF;
  UPDATE public.orientaciones_citas SET estado_atencion=p_state,estado_sync=CASE WHEN p_state='Cancelada' THEN 'Pendiente_Reintento' ELSE estado_sync END WHERE id=a.id RETURNING * INTO a;
 ELSIF p_doctor IS NOT NULL AND p_action='derivacion' THEN
  IF p_state NOT IN ('Sin derivación','Pendiente presencial','Derivada a Dentalink') OR p_state IS NULL THEN RAISE EXCEPTION 'Invalid state' USING ERRCODE='22023'; END IF;
  UPDATE public.orientaciones_citas SET estado_derivacion=p_state,fecha_derivacion=CASE WHEN p_state='Derivada a Dentalink' THEN now() ELSE NULL END,notas_derivacion=left(p_note,500) WHERE id=a.id RETURNING * INTO a;
 ELSE RAISE EXCEPTION 'Action denied' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.logs_auditoria(usuario_id,accion,entidad,entidad_id,detalle)
 VALUES(p_doctor,p_action,'orientaciones_citas',a.codigo,jsonb_build_object('previous_state',old_state,'state',a.estado_atencion,'previous_derivation',old_derivation,'previous_derived_at',old_derived_at,'derivation',a.estado_derivacion,'date',a.fecha,'time',a.hora,'note',left(p_note,500))::text);
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.manage_orientation(text,text,uuid,text,date,time,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_orientation(text,text,uuid,text,date,time,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.set_date_block(p_date date,p_doctor uuid,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_date::text));
 IF NOT EXISTS(SELECT 1 FROM public.doctores WHERE id=p_doctor AND activo AND auth_user_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Professional access denied' USING ERRCODE='42501'; END IF;
 IF p_blocked THEN
  INSERT INTO public.fechas_bloqueadas(fecha,doctor_id) VALUES(p_date,p_doctor)
  ON CONFLICT(doctor_id,fecha) DO NOTHING;
 ELSE DELETE FROM public.fechas_bloqueadas WHERE fecha=p_date AND doctor_id=p_doctor;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_date_block(date,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_date_block(date,uuid,boolean) TO service_role;


CREATE OR REPLACE FUNCTION public.cado_readiness() RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.doctores WHERE activo AND auth_user_id IS NOT NULL)
 AND to_regprocedure('public.reserve_orientation(date,time without time zone,text,text,text,text,text,uuid,jsonb)') IS NOT NULL
 AND to_regprocedure('public.manage_orientation(text,text,uuid,text,date,time without time zone,text,text)') IS NOT NULL
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_indexes WHERE schemaname='public' AND indexname='uq_citas_activas_fecha_hora')
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles r ON r.oid=p.proowner
   WHERE p.oid=to_regprocedure('public.read_doctor_clinical(uuid,text,text)')
     AND r.rolname='cado_clinical_reader' AND NOT r.rolbypassrls AND NOT r.rolcanlogin)
$$;
REVOKE ALL ON FUNCTION public.cado_readiness() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cado_readiness() TO service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Reviewed resource catalogue
-- One editorial source in Postgres. Existing files become reviewed publications only after approval.
ALTER TABLE public.guias_clinicas ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.guias_clinicas ADD COLUMN IF NOT EXISTS contenido jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.guias_clinicas ADD COLUMN IF NOT EXISTS revisado_por uuid REFERENCES public.doctores(id);
ALTER TABLE public.guias_clinicas ADD COLUMN IF NOT EXISTS revisado_en timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS guias_slug_unique ON public.guias_clinicas(slug);
-- Withdraw the legacy unreviewed catalogue instead of inventing medical approval.
UPDATE public.guias_clinicas SET activo=false WHERE revisado_en IS NULL;
DROP POLICY IF EXISTS active_guides ON public.guias_clinicas;
CREATE POLICY active_guides ON public.guias_clinicas FOR SELECT TO anon,authenticated USING(activo AND revisado_en IS NOT NULL);
REVOKE ALL ON public.guias_clinicas FROM anon,authenticated;
GRANT SELECT ON public.guias_clinicas TO anon,authenticated;
UPDATE public.guias_clinicas SET slug='guia-post-exodoncia',contenido='[{"heading":"1. Primeras 2 horas después de la atención","points":["Mantener la gasa estéril mordiendo con presión suave y constante durante 30 a 45 minutos.","No escupir, no enjuagar con fuerza ni succionar la herida para proteger el coágulo sanguíneo.","Descansar y evitar esfuerzos físicos o exposición al calor."]},{"heading":"2. Alimentación e hidratación (Primeras 48 horas)","points":["Preferir alimentos blandos, fríos o tibios (yogur, helado suave, purés tibios, sopas coladas tibias).","No utilizar bombillas (pajitas), ya que la succión puede desprender el coágulo.","Evitar bebidas calientes, alcohol, tabaco y alimentos con semillas pequeñas."]},{"heading":"3. Higiene oral y cuándo contactar a CADO","points":["Cepillar los demás dientes normalmente con cepillo suave, evitando rozar directamente la zona intervenida el primer día.","Si el sangrado no disminuye tras presionar con una gasa limpia por 30 minutos o aparece fiebre, contactar al +56 9 4465 7815."]}]'::jsonb,url_descarga='/api/recursos/download?id=guia-post-exodoncia' WHERE slug IS NULL AND url_descarga='/guias/CADO_Guia_Cuidados_Post_Exodoncia.pdf' AND NOT EXISTS(SELECT 1 FROM public.guias_clinicas WHERE slug='guia-post-exodoncia');
UPDATE public.guias_clinicas SET slug='guia-primeros-auxilios-urgencias',contenido='[{"heading":"1. Dolor dental agudo o inflamación","points":["Realizar enjuagues suaves con agua tibia para limpiar restos de alimentos en la zona.","Aplicar compresas frías por fuera de la mejilla (10 minutos con paño protector) si existe hinchazón.","Nunca colocar ácido acetilsalicílico (aspirina) ni alcohol directamente sobre la encía o el diente."]},{"heading":"2. Fractura o desalojo de un diente por golpe","points":["Si un diente definitivo sale por completo, tomarlo solo por la corona (parte blanca), nunca por la raíz.","Transportarlo en un recipiente con leche fría o suero fisiológico y acudir de inmediato a evaluación odontológica."]},{"heading":"3. Canales de contacto prioritario CADO Calama","points":["Teléfono y WhatsApp directo: +56 9 4465 7815 (Vivar #1580, oficina 203, Edificio Espacio Parque).","Ante dificultad para respirar o tragar por inflamación severa, acudir de inmediato a un servicio de urgencia hospitalaria."]}]'::jsonb,url_descarga='/api/recursos/download?id=guia-primeros-auxilios-urgencias' WHERE slug IS NULL AND url_descarga='/guias/CADO_Guia_Primeros_Auxilios_Urgencias.pdf' AND NOT EXISTS(SELECT 1 FROM public.guias_clinicas WHERE slug='guia-primeros-auxilios-urgencias');
UPDATE public.guias_clinicas SET slug='guia-preparacion-ansiedad-bruxismo',contenido='[{"heading":"1. Antes de tu orientación virtual o consulta","points":["Anota tus dudas principales; ninguna pregunta es pequeña ni será juzgada.","Completa el Test de Confort para elegir música suave, silencio, pausas frecuentes o asistir con acompañante.","Recuerda que en el sillón dental siempre tendrás una señal acordada con tu mano para detener el procedimiento."]},{"heading":"2. Autocuidado básico para tensión mandibular (Bruxismo / TTM)","points":["Postura de descanso mandibular: mantener labios juntos y dientes ligeramente separados durante el día.","Aplicar calor húmedo tibio en las mejillas durante 10 minutos antes de dormir si sientes rigidez."]}]'::jsonb,url_descarga='/api/recursos/download?id=guia-preparacion-ansiedad-bruxismo' WHERE slug IS NULL AND url_descarga='/guias/CADO_Guia_Preparacion_y_Confort_Dental.pdf' AND NOT EXISTS(SELECT 1 FROM public.guias_clinicas WHERE slug='guia-preparacion-ansiedad-bruxismo');
INSERT INTO public.guias_clinicas(slug,titulo,categoria,descripcion,contenido,url_descarga,tamano_kb,activo) VALUES('guia-post-exodoncia','Cuidados Posteriores a una Extracción Dental (Exodoncia)','Postoperatorio','Indicaciones paso a paso para las primeras 48 horas: control del sangrado, alimentación recomendada, higiene suave y señales de alerta.','[{"heading":"1. Primeras 2 horas después de la atención","points":["Mantener la gasa estéril mordiendo con presión suave y constante durante 30 a 45 minutos.","No escupir, no enjuagar con fuerza ni succionar la herida para proteger el coágulo sanguíneo.","Descansar y evitar esfuerzos físicos o exposición al calor."]},{"heading":"2. Alimentación e hidratación (Primeras 48 horas)","points":["Preferir alimentos blandos, fríos o tibios (yogur, helado suave, purés tibios, sopas coladas tibias).","No utilizar bombillas (pajitas), ya que la succión puede desprender el coágulo.","Evitar bebidas calientes, alcohol, tabaco y alimentos con semillas pequeñas."]},{"heading":"3. Higiene oral y cuándo contactar a CADO","points":["Cepillar los demás dientes normalmente con cepillo suave, evitando rozar directamente la zona intervenida el primer día.","Si el sangrado no disminuye tras presionar con una gasa limpia por 30 minutos o aparece fiebre, contactar al +56 9 4465 7815."]}]'::jsonb,'/api/recursos/download?id=guia-post-exodoncia',0,false) ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.guias_clinicas(slug,titulo,categoria,descripcion,contenido,url_descarga,tamano_kb,activo) VALUES('guia-primeros-auxilios-urgencias','Primeros Auxilios ante Urgencias Dentales y Dolor Agudo','Urgencias y Dolor','Qué hacer de inmediato en casa ante fracturas dentales, golpes (traumatismos), dolor nocturno o inflamación antes de llegar a la consulta.','[{"heading":"1. Dolor dental agudo o inflamación","points":["Realizar enjuagues suaves con agua tibia para limpiar restos de alimentos en la zona.","Aplicar compresas frías por fuera de la mejilla (10 minutos con paño protector) si existe hinchazón.","Nunca colocar ácido acetilsalicílico (aspirina) ni alcohol directamente sobre la encía o el diente."]},{"heading":"2. Fractura o desalojo de un diente por golpe","points":["Si un diente definitivo sale por completo, tomarlo solo por la corona (parte blanca), nunca por la raíz.","Transportarlo en un recipiente con leche fría o suero fisiológico y acudir de inmediato a evaluación odontológica."]},{"heading":"3. Canales de contacto prioritario CADO Calama","points":["Teléfono y WhatsApp directo: +56 9 4465 7815 (Vivar #1580, oficina 203, Edificio Espacio Parque).","Ante dificultad para respirar o tragar por inflamación severa, acudir de inmediato a un servicio de urgencia hospitalaria."]}]'::jsonb,'/api/recursos/download?id=guia-primeros-auxilios-urgencias',0,false) ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.guias_clinicas(slug,titulo,categoria,descripcion,contenido,url_descarga,tamano_kb,activo) VALUES('guia-preparacion-ansiedad-bruxismo','Guía de Preparación sin Ansiedad y Alivio Mandibular (TTM)','Bienestar y Confort','Ejercicios de respiración, autocuidado para el bruxismo y cómo aprovechar tu orientación virtual y preferencias de confort en CADO.','[{"heading":"1. Antes de tu orientación virtual o consulta","points":["Anota tus dudas principales; ninguna pregunta es pequeña ni será juzgada.","Completa el Test de Confort para elegir música suave, silencio, pausas frecuentes o asistir con acompañante.","Recuerda que en el sillón dental siempre tendrás una señal acordada con tu mano para detener el procedimiento."]},{"heading":"2. Autocuidado básico para tensión mandibular (Bruxismo / TTM)","points":["Postura de descanso mandibular: mantener labios juntos y dientes ligeramente separados durante el día.","Aplicar calor húmedo tibio en las mejillas durante 10 minutos antes de dormir si sientes rigidez."]}]'::jsonb,'/api/recursos/download?id=guia-preparacion-ansiedad-bruxismo',0,false) ON CONFLICT(slug) DO NOTHING;

ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS logs_event_key_unique ON public.logs_auditoria(event_key);

-- Persistent professional login limits
CREATE SCHEMA IF NOT EXISTS cado_security;
REVOKE ALL ON SCHEMA cado_security FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='cado_auth_limiter') THEN
  CREATE ROLE cado_auth_limiter NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
 END IF;
END $$;
GRANT cado_auth_limiter TO postgres;
CREATE TABLE IF NOT EXISTS cado_security.login_attempts(
 identifier text PRIMARY KEY CHECK(length(identifier) BETWEEN 1 AND 160),
 failures integer NOT NULL DEFAULT 0 CHECK(failures>=0),
 window_start timestamptz NOT NULL DEFAULT now(),
 blocked_until timestamptz
);
ALTER TABLE cado_security.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS login_attempts_window_idx ON cado_security.login_attempts(window_start);
REVOKE ALL ON cado_security.login_attempts FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA cado_security TO cado_auth_limiter;
GRANT SELECT,INSERT,UPDATE,DELETE ON cado_security.login_attempts TO cado_auth_limiter;
CREATE POLICY limiter_only ON cado_security.login_attempts TO cado_auth_limiter USING(true) WITH CHECK(true);

-- Reserve an attempt before calling Auth, so concurrent guesses cannot pass the
-- check together. A successful professional login clears its two counters.
CREATE OR REPLACE FUNCTION public.begin_professional_login(p_keys text[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; r cado_security.login_attempts%ROWTYPE; wait_seconds integer:=0; moment timestamptz:=clock_timestamp();
BEGIN
 IF p_keys IS NULL OR cardinality(p_keys) NOT BETWEEN 1 AND 4 OR EXISTS(SELECT 1 FROM unnest(p_keys) x WHERE x IS NULL OR length(x) NOT BETWEEN 1 AND 160) THEN
  RAISE EXCEPTION 'Invalid login key' USING ERRCODE='22023';
 END IF;
 FOR k IN SELECT DISTINCT x FROM unnest(p_keys) x ORDER BY x LOOP
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cado-login:'||k,0));
 END LOOP;
 FOR k IN SELECT DISTINCT x FROM unnest(p_keys) x LOOP
  SELECT * INTO r FROM cado_security.login_attempts WHERE identifier=k;
  IF r.blocked_until>moment THEN wait_seconds:=greatest(wait_seconds,ceil(extract(epoch FROM r.blocked_until-moment))::integer); END IF;
 END LOOP;
 IF wait_seconds>0 THEN RETURN jsonb_build_object('allowed',false,'retry_after',wait_seconds); END IF;
 FOR k IN SELECT DISTINCT x FROM unnest(p_keys) x LOOP
  INSERT INTO cado_security.login_attempts(identifier,failures,window_start) VALUES(k,0,moment) ON CONFLICT(identifier) DO NOTHING;
  SELECT * INTO r FROM cado_security.login_attempts WHERE identifier=k FOR UPDATE;
  IF r.window_start<=moment-interval '15 minutes' OR r.blocked_until<=moment THEN
   r.failures:=0; r.window_start:=moment;
  END IF;
  UPDATE cado_security.login_attempts SET failures=r.failures+1,window_start=r.window_start,
   blocked_until=CASE WHEN r.failures+1>=5 THEN moment+interval '15 minutes' ELSE NULL END WHERE identifier=k;
 END LOOP;
 -- Prune expired, unrelated counters so public traffic cannot grow this forever.
 DELETE FROM cado_security.login_attempts WHERE identifier IN (SELECT identifier FROM cado_security.login_attempts WHERE window_start<moment-interval '1 day' AND coalesce(blocked_until,'-infinity'::timestamptz)<moment ORDER BY window_start LIMIT 100 FOR UPDATE SKIP LOCKED);
 RETURN jsonb_build_object('allowed',true,'retry_after',0);
END $$;
CREATE OR REPLACE FUNCTION public.complete_professional_login(p_keys text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text;
BEGIN
 IF p_keys IS NULL OR cardinality(p_keys) NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Invalid login keys'; END IF;
 FOR k IN SELECT DISTINCT x FROM unnest(p_keys) x ORDER BY x LOOP
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cado-login:'||k,0));
 END LOOP;
 DELETE FROM cado_security.login_attempts WHERE identifier=ANY(p_keys);
END $$;
GRANT USAGE,CREATE ON SCHEMA public TO cado_auth_limiter;
ALTER FUNCTION public.begin_professional_login(text[]) OWNER TO cado_auth_limiter;
ALTER FUNCTION public.complete_professional_login(text[]) OWNER TO cado_auth_limiter;
REVOKE CREATE ON SCHEMA public FROM cado_auth_limiter;
REVOKE ALL ON FUNCTION public.begin_professional_login(text[]),public.complete_professional_login(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_professional_login(text[]),public.complete_professional_login(text[]) TO service_role;

-- Optional provider enforcement. Activation requires the Supabase Password
-- Verification Hook (Teams/Enterprise). Never claim it is enabled by this SQL.
CREATE OR REPLACE FUNCTION cado_security.password_verification_hook(event jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text:='provider:'||(event->>'user_id'); result jsonb; until_at timestamptz;
BEGIN
 IF event->>'user_id' IS NULL OR jsonb_typeof(event->'valid')<>'boolean' THEN RAISE EXCEPTION 'Invalid auth event'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cado-login:'||k,0));
 SELECT blocked_until INTO until_at FROM cado_security.login_attempts WHERE identifier=k;
 IF until_at>clock_timestamp() THEN
  RETURN jsonb_build_object('decision','reject','message','Acceso temporalmente limitado. Intenta nuevamente en quince minutos.','should_logout_user',false);
 END IF;
 IF (event->>'valid')::boolean THEN
  PERFORM public.complete_professional_login(ARRAY[k]);
 ELSE
  result:=public.begin_professional_login(ARRAY[k]);
 END IF;
 RETURN jsonb_build_object('decision','continue');
END $$;
GRANT CREATE ON SCHEMA cado_security TO cado_auth_limiter;
ALTER FUNCTION cado_security.password_verification_hook(jsonb) OWNER TO cado_auth_limiter;
REVOKE CREATE ON SCHEMA cado_security FROM cado_auth_limiter;
REVOKE ALL ON FUNCTION cado_security.password_verification_hook(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA cado_security TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION cado_security.password_verification_hook(jsonb) TO supabase_auth_admin;
CREATE INDEX IF NOT EXISTS guias_revisado_por_idx ON public.guias_clinicas(revisado_por);
