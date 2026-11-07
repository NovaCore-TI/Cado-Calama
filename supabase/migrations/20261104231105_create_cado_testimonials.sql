-- Run once against the existing CADO database after it is available again.
-- All access is mediated by the authenticated Next.js API. No direct client grants.
begin;
create table if not exists public.testimonios (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctores(id),
  titulo text not null check (char_length(titulo) between 2 and 120),
  texto_alternativo text not null check (char_length(texto_alternativo) between 10 and 2000),
  source_url text not null check (char_length(source_url) <= 2048),
  object_path text not null unique,
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists testimonios_doctor_created_idx on public.testimonios (doctor_id, created_at desc);
create index if not exists testimonios_public_created_idx on public.testimonios (created_at desc) where publicado;
alter table public.testimonios enable row level security;
revoke all on public.testimonios from anon, authenticated;
grant select, insert, update, delete on public.testimonios to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cado-testimonios', 'cado-testimonios', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
commit;
