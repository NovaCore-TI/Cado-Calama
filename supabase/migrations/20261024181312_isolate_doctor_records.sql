BEGIN;
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
