-- Realtime sends revision metadata only. Patient tables are not replicated.
begin;
create schema if not exists cado_private;
revoke all on schema cado_private from public, anon, authenticated;

create table public.app_live_revisions (
  key text primary key,
  audience text not null check (audience in ('public', 'doctor', 'staff')),
  resource text not null check (resource in ('availability', 'appointments', 'blog', 'guides', 'testimonials', 'faq', 'profile')),
  doctor_id uuid references public.doctores(id) on delete cascade,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  check ((audience = 'doctor') = (doctor_id is not null)),
  check (key = audience || ':' || coalesce(doctor_id::text || ':', '') || resource),
  check (audience <> 'public' or resource in ('availability', 'blog', 'guides', 'testimonials', 'faq'))
);
create index app_live_revisions_doctor_idx on public.app_live_revisions(doctor_id) where doctor_id is not null;
alter table public.app_live_revisions enable row level security;
revoke all on public.app_live_revisions from public, anon, authenticated;
grant select on public.app_live_revisions to anon, authenticated;
grant select, insert, update, delete on public.app_live_revisions to service_role;
create policy public_live_revisions on public.app_live_revisions for select to anon, authenticated using (audience = 'public');
create policy professional_live_revisions on public.app_live_revisions for select to authenticated using (
  audience in ('doctor', 'staff') and exists (
    select 1 from public.doctores d where d.auth_user_id = (select auth.uid()) and d.activo
      and (audience = 'staff' or d.id = doctor_id)
  )
);

-- Trigger-only functions in a non-exposed schema. Clients cannot call them.
create function cado_private.touch_live_revision(p_audience text, p_resource text, p_doctor uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.app_live_revisions(key, audience, resource, doctor_id)
  values (p_audience || ':' || coalesce(p_doctor::text || ':', '') || p_resource, p_audience, p_resource, p_doctor)
  on conflict (key) do update set revision = public.app_live_revisions.revision + 1, updated_at = clock_timestamp();
$$;
revoke all on function cado_private.touch_live_revision(text,text,uuid) from public, anon, authenticated;

create function cado_private.notify_app_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_row jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  changed_id uuid;
  owner_id uuid;
  owners uuid[];
  resource_name text;
begin
  -- Ignore telemetry counters and Google sync leases, which are not view data.
  if tg_table_name = 'guias_clinicas' and tg_op = 'UPDATE' and
     (before_row - 'descargas') = (after_row - 'descargas') then return null; end if;
  if tg_table_name = 'orientaciones_citas' and tg_op = 'UPDATE' and
     (before_row - array['updated_at','sync_lock_until','sync_lease_id','intentos_sync']) =
     (after_row - array['updated_at','sync_lock_until','sync_lease_id','intentos_sync']) then return null; end if;
  if tg_table_name = 'doctores' and tg_op = 'UPDATE' and
     (before_row - 'ultimo_acceso') = (after_row - 'ultimo_acceso') then return null; end if;

  if tg_table_name in ('bloques_disponibilidad', 'fechas_bloqueadas', 'orientaciones_citas', 'doctores') then
    if tg_table_name <> 'doctores' or tg_op <> 'UPDATE' or before_row->'activo' is distinct from after_row->'activo' then
      perform cado_private.touch_live_revision('public','availability');
    end if;
  end if;

  if tg_table_name in ('articulos_blog','testimonios') then
    resource_name := case when tg_table_name = 'articulos_blog' then 'blog' else 'testimonials' end;
    if coalesce((before_row->>'publicado')::boolean,false) or coalesce((after_row->>'publicado')::boolean,false) then
      perform cado_private.touch_live_revision('public',resource_name);
    end if;
  elsif tg_table_name = 'guias_clinicas' then
    perform cado_private.touch_live_revision('staff','guides');
    if (coalesce((before_row->>'activo')::boolean,false) and before_row->>'revisado_en' is not null)
       or (coalesce((after_row->>'activo')::boolean,false) and after_row->>'revisado_en' is not null) then
      perform cado_private.touch_live_revision('public','guides');
    end if;
    return null;
  elsif tg_table_name = 'preguntas_frecuentes' then
    if coalesce((before_row->>'activo')::boolean,false) or coalesce((after_row->>'activo')::boolean,false) then
      perform cado_private.touch_live_revision('public','faq');
    end if;
    return null;
  end if;

  if tg_table_name in ('cuestionarios_perfilamiento','preferencias_confort','pacientes') then
    changed_id := coalesce(nullif(after_row->>'id',''),nullif(before_row->>'id',''))::uuid;
    if tg_table_name = 'preferencias_confort' then
      owners := array(select distinct a.doctor_id from public.orientaciones_citas a
        where a.cuestionario_id in (nullif(before_row->>'cuestionario_id','')::uuid,nullif(after_row->>'cuestionario_id','')::uuid));
    elsif tg_table_name = 'cuestionarios_perfilamiento' then
      owners := array(select distinct a.doctor_id from public.orientaciones_citas a where a.cuestionario_id = changed_id);
    else
      owners := array(select distinct a.doctor_id from public.orientaciones_citas a where a.paciente_id = changed_id);
    end if;
    resource_name := 'appointments';
  else
    if tg_table_name = 'articulos_blog' then
      owners := array[nullif(before_row->>'autor_id','')::uuid,nullif(after_row->>'autor_id','')::uuid];
    elsif tg_table_name = 'doctores' then
      owners := array[nullif(before_row->>'id','')::uuid,nullif(after_row->>'id','')::uuid];
      resource_name := 'profile';
    else
      owners := array[nullif(before_row->>'doctor_id','')::uuid,nullif(after_row->>'doctor_id','')::uuid];
    end if;
    if resource_name is null then
      resource_name := case when tg_table_name = 'orientaciones_citas' then 'appointments' else 'availability' end;
    end if;
  end if;
  for owner_id in select distinct value from unnest(owners) value where value is not null loop
    if exists (select 1 from public.doctores where id = owner_id) then
      perform cado_private.touch_live_revision('doctor',resource_name,owner_id);
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function cado_private.notify_app_change() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['orientaciones_citas','bloques_disponibilidad','fechas_bloqueadas','articulos_blog',
    'guias_clinicas','testimonios','preguntas_frecuentes','doctores','pacientes','cuestionarios_perfilamiento','preferencias_confort'] loop
    execute format('create trigger notify_cado_live after insert or update or delete on public.%I for each row execute function cado_private.notify_app_change()', table_name);
  end loop;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.app_live_revisions;
  end if;
end;
$$;
commit;
