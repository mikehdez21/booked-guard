-- Ejecutar en Supabase > SQL Editor > New query > Run.
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists people_name_lower_key on public.people (lower(name));

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) between 1 and 40),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (shift_id, date)
);

alter table public.people enable row level security;
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;

create policy "public read people" on public.people for select to anon, authenticated using (true);
create policy "public insert people" on public.people for insert to anon, authenticated with check (true);
create policy "public delete people" on public.people for delete to anon, authenticated using (true);

create policy "public read shifts" on public.shifts for select to anon, authenticated using (true);
create policy "public insert shifts" on public.shifts for insert to anon, authenticated with check (true);
create policy "public update shifts" on public.shifts for update to anon, authenticated using (true) with check (true);
create policy "public delete shifts" on public.shifts for delete to anon, authenticated using (true);

create policy "public read assignments" on public.assignments for select to anon, authenticated using (true);
create policy "public insert assignments" on public.assignments for insert to anon, authenticated with check (true);
create policy "public update assignments" on public.assignments for update to anon, authenticated using (true) with check (true);
create policy "public delete assignments" on public.assignments for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.people, public.shifts, public.assignments to anon, authenticated;

insert into public.shifts (label, start_time, end_time) values
  ('Día', '10:00', '18:00'),
  ('Tarde', '18:30', '23:00'),
  ('Noche', '23:00', '09:30');
