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

COMMIT;
