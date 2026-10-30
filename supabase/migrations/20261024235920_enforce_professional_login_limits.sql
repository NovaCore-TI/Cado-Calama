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
