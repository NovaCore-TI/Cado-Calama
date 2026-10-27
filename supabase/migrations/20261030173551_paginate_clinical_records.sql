BEGIN;
CREATE OR REPLACE FUNCTION public.read_doctor_clinical_page(p_doctor uuid,p_resource text,p_code text DEFAULT NULL,p_limit integer DEFAULT 200,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; previous_context text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 200 OR p_offset IS NULL OR p_offset < 0 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
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
      ORDER BY a.fecha,a.hora,a.id LIMIT p_limit OFFSET p_offset
    ) r;
  ELSIF p_resource='cuestionarios' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,motivo_consulta,nivel_temor,respuestas_adicionales,consentimiento_privacidad,created_at
      FROM public.cuestionarios_perfilamiento ORDER BY created_at DESC,id LIMIT p_limit OFFSET p_offset
    ) r;
  ELSIF p_resource='confort' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,cuestionario_id,ambiente_preferido,solicita_pausas,desea_acompanante,senal_pausa,
        explicacion_paso_a_paso,notas,consent_datos,created_at
      FROM public.preferencias_confort ORDER BY created_at DESC,id LIMIT p_limit OFFSET p_offset
    ) r;
  ELSIF p_resource='pacientes' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM (
      SELECT id,nombre_completo,email,telefono,created_at FROM public.pacientes ORDER BY nombre_completo,id LIMIT p_limit OFFSET p_offset
    ) r;
  ELSE RAISE EXCEPTION 'Invalid clinical resource' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.set_config('cado.doctor_id',coalesce(previous_context,''),true);
  RETURN result;
END $$;
-- The function owner cannot log in, write records, access Google secrets, or bypass RLS.
GRANT CREATE ON SCHEMA public TO cado_clinical_reader;
ALTER FUNCTION public.read_doctor_clinical_page(uuid,text,text,integer,integer) OWNER TO cado_clinical_reader;
REVOKE CREATE ON SCHEMA public FROM cado_clinical_reader;
REVOKE ALL ON FUNCTION public.read_doctor_clinical_page(uuid,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_doctor_clinical_page(uuid,text,text,integer,integer) TO service_role;

COMMIT;
