-- ATLAS academic journey v1: subjects, enrollments, demo seed.
-- Run in the Supabase dashboard SQL editor AFTER 001. Safe to re-run
-- (guarded). Purely additive: no existing table is altered, no row is
-- modified or deleted. Students read the academic catalog but manage ONLY
-- their own enrollments.
--
-- Base tables (institutions, staff, faculties, programs) live in 001, which
-- MUST run first: this file's foreign keys and seed reference them.
--
-- v1 scope (hackathon): student journey over a demonstrative catalog.
-- Out of scope: admin CRUD, grades tables. Programs carry a free-text
-- `field` until the admin phase.

-- ---------------------------------------------------------------- subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  code text not null default '',
  year int not null default 1 check (year between 1 and 6),
  semester int not null default 1 check (semester in (1, 2)),
  created_at timestamptz not null default now()
);
create index if not exists subjects_program_term_idx
  on public.subjects (program_id, year, semester);

alter table public.subjects enable row level security;
revoke all on public.subjects from anon;
grant select on public.subjects to authenticated;

drop policy if exists "Authenticated users can view subjects" on public.subjects;
create policy "Authenticated users can view subjects" on public.subjects
  for select to authenticated
  using (true);

-- -------------------------------------------------------------- enrollments
create table if not exists public.enrollments (
  student_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  current_year int not null default 1 check (current_year between 1 and 6),
  current_semester int not null default 1 check (current_semester in (1, 2)),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  enrolled_at timestamptz not null default now(),
  primary key (student_id, program_id)
);
create index if not exists enrollments_student_idx
  on public.enrollments (student_id);

alter table public.enrollments enable row level security;
revoke all on public.enrollments from anon;
grant select, insert, update, delete on public.enrollments to authenticated;

drop policy if exists "Students manage their own enrollments" on public.enrollments;
create policy "Students manage their own enrollments" on public.enrollments
  for all to authenticated
  using ((select auth.uid()) = student_id)
  with check ((select auth.uid()) = student_id);

-- ------------------------------------------------------- demonstrative seed
-- Fixed ids keep the demo catalog stable across re-runs; conflicts are
-- ignored so existing rows (demo or real) are never overwritten.
insert into public.institutions (id, name, short_name, is_demo)
values ('11111111-1111-1111-1111-111111111111', 'Instituto Demo ATLAS', 'IDA', true)
on conflict (id) do nothing;

insert into public.programs (id, institution_id, name, field, duration_years, is_demo)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Engenharia Eletrotécnica (Demo)', 'Engineering', 3, true),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Ciência de Computadores (Demo)', 'Technology', 3, true)
on conflict (id) do nothing;

insert into public.subjects (id, program_id, name, code, year, semester)
values
  ('a1010000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Circuitos Elétricos I', 'ENG101', 1, 1),
  ('a1010000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Cálculo I', 'ENG102', 1, 1),
  ('a1010000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   'Física I', 'ENG103', 1, 2),
  ('b1010000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
   'Programação I', 'CS101', 1, 1),
  ('b1010000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
   'Matemática Discreta', 'CS102', 1, 1),
  ('b1010000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   'Arquitetura de Computadores', 'CS103', 1, 2)
on conflict (id) do nothing;
