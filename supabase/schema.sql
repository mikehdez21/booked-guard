-- Ejecutar en Supabase > SQL Editor > New query > Run.
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists people_name_lower_key on public.people (lower(name));

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (label in ('Día', 'Tarde', 'Noche')),
  position smallint not null unique check (position between 1 and 3),
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

create table if not exists public.shift_times (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  updated_at timestamptz not null default now(),
  unique (shift_id, date)
);

alter table public.people enable row level security;
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;
alter table public.shift_times enable row level security;

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

create policy "public read shift_times" on public.shift_times for select to anon, authenticated using (true);
create policy "public insert shift_times" on public.shift_times for insert to anon, authenticated with check (true);
create policy "public update shift_times" on public.shift_times for update to anon, authenticated using (true) with check (true);
create policy "public delete shift_times" on public.shift_times for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.people, public.shifts, public.assignments, public.shift_times to anon, authenticated;

insert into public.shifts (label, position, start_time, end_time) values
  ('Día', 1, '10:00', '18:00'),
  ('Tarde', 2, '18:30', '23:00'),
  ('Noche', 3, '23:00', '09:30')
on conflict do nothing;

-- Registro de acciones (solo lectura desde el cliente; escribe vía triggers).
create table public.activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('asignacion', 'persona', 'turno')),
  message text not null
);

alter table public.activity_log enable row level security;
create policy "public read activity_log" on public.activity_log
  for select to anon, authenticated using (true);
grant select on public.activity_log to anon, authenticated;

create or replace function public.log_assignment_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift text;
  v_from text;
  v_to text;
  v_date date;
begin
  if tg_op = 'DELETE' then
    v_date := old.date;
    select label into v_shift from public.shifts where id = old.shift_id;
    select name into v_from from public.people where id = old.person_id;
    insert into public.activity_log (kind, message)
    values ('asignacion', format('%s · %s: %s → Sin asignar',
      coalesce(v_shift, 'Turno'), to_char(v_date, 'DD/MM'), coalesce(v_from, 'Alguien')));
    return old;
  end if;

  if tg_op = 'UPDATE' and new.person_id = old.person_id then
    return new;
  end if;

  v_date := new.date;
  select label into v_shift from public.shifts where id = new.shift_id;
  select name into v_to from public.people where id = new.person_id;

  if tg_op = 'UPDATE' then
    select name into v_from from public.people where id = old.person_id;
  end if;

  insert into public.activity_log (kind, message)
  values ('asignacion',
    case when v_from is null
      then format('%s · %s: Se asignó %s', coalesce(v_shift, 'Turno'), to_char(v_date, 'DD/MM'), v_to)
      else format('%s · %s: %s → %s', coalesce(v_shift, 'Turno'), to_char(v_date, 'DD/MM'), v_from, v_to)
    end);
  return new;
end $$;

create trigger assignments_log
  after insert or update or delete on public.assignments
  for each row execute function public.log_assignment_change();

create or replace function public.log_person_added() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (kind, message)
  values ('persona', format('Se agregó una persona %s', new.name));
  return new;
end $$;

create trigger people_log
  after insert on public.people
  for each row execute function public.log_person_added();

create or replace function public.log_shift_added() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (kind, message)
  values ('turno', format('Se agregó un turno %s (%s–%s)',
    new.label, to_char(new.start_time, 'HH24:MI'), to_char(new.end_time, 'HH24:MI')));
  return new;
end $$;

create trigger shifts_log
  after insert on public.shifts
  for each row execute function public.log_shift_added();

-- Ajustes compartidos (días futuros visibles en el carrusel).
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "public read app_settings" on public.app_settings for select to anon, authenticated using (true);
create policy "public insert app_settings" on public.app_settings for insert to anon, authenticated with check (true);
create policy "public update app_settings" on public.app_settings for update to anon, authenticated using (true) with check (true);
grant select, insert, update on public.app_settings to anon, authenticated;

insert into public.app_settings (key, value) values ('future_days', '30')
on conflict (key) do nothing;

-- Tiempo real (websockets) para ver cambios de otros dispositivos.
alter publication supabase_realtime add table public.people, public.shifts, public.assignments, public.shift_times, public.activity_log, public.app_settings;
alter table public.people replica identity full;
alter table public.shifts replica identity full;
alter table public.assignments replica identity full;
