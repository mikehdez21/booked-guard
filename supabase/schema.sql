-- Ejecutar en Supabase > SQL Editor > New query > Run.
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

-- Sin login: cualquiera con el enlace puede ver y añadir personas.
create policy "people_select_public" on public.people for select using (true);
create policy "people_insert_public" on public.people for insert with check (true);
