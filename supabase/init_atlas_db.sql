-- ============================================================================
-- ATLAS unified database init: run this ONE file in the Supabase SQL editor.
-- It contains 001 + 002 + 003 in strict dependency order. Fully idempotent:
-- safe on fresh projects and safe to re-run on existing ones (guarded
-- creates, guarded drops, conflict-ignored seeds). Nothing is deleted.
-- Tables are created before any foreign key, policy, or insert references
-- them, so 42P01 "relation does not exist" cannot occur from ordering.
-- ============================================================================
-- ==================== FILE 1/3: 001_atlas_university.sql ====================
-- ATLAS digital university: base academic tables + profiles/lessons/memory/connections/avatars.
-- Run FIRST in the Supabase dashboard SQL editor, then 002, then 003 — or run
-- the unified supabase/init_atlas_db.sql once instead (same statements).
-- Safe to re-run (guarded). Tables reference auth.users with cascade delete;
-- every table has RLS enabled with minimal grants (anon revoked, authenticated
-- scoped by policy).
--
-- Base tables (institutions, staff, faculties, programs) are created HERE, in
-- dependency order, so no later file can hit "relation does not exist" (42P01)
-- on foreign keys, policies, or seed inserts that reference them.

-- ------------------------------------------------------------ institutions
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.institutions enable row level security;
revoke all on public.institutions from anon;
grant select on public.institutions to authenticated;

drop policy if exists "Authenticated users can view institutions" on public.institutions;
create policy "Authenticated users can view institutions" on public.institutions
  for select to authenticated
  using (true);

-- ------------------------------------------------------------------- staff
-- No write policies: staff rows are created via the dashboard only, so no
-- authenticated user can self-grant a role. First row example:
--   insert into public.staff (user_id, institution_id, role)
--   values ('<user-uuid>', '11111111-1111-1111-1111-111111111111', 'admin');
create table if not exists public.staff (
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now(),
  primary key (user_id, institution_id)
);

alter table public.staff enable row level security;
revoke all on public.staff from anon;
grant select on public.staff to authenticated;

drop policy if exists "Users can view their own staff roles" on public.staff;
create policy "Users can view their own staff roles" on public.staff
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- --------------------------------------------------------------- faculties
create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists faculties_institution_idx
  on public.faculties (institution_id);

alter table public.faculties enable row level security;
revoke all on public.faculties from anon;
grant select, insert, update, delete on public.faculties to authenticated;

drop policy if exists "Authenticated users can view faculties" on public.faculties;
create policy "Authenticated users can view faculties" on public.faculties
  for select to authenticated
  using (true);

drop policy if exists "Institution admins manage faculties" on public.faculties;
create policy "Institution admins manage faculties" on public.faculties
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.institution_id = institution_id
      and s.role = 'admin'
  ))
  with check (exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.institution_id = institution_id
      and s.role = 'admin'
  ));

-- ---------------------------------------------------------------- programs
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  field text not null default '',
  duration_years int not null default 3 check (duration_years between 1 and 6),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists programs_institution_idx
  on public.programs (institution_id);

alter table public.programs enable row level security;
revoke all on public.programs from anon;
grant select on public.programs to authenticated;

drop policy if exists "Authenticated users can view programs" on public.programs;
create policy "Authenticated users can view programs" on public.programs
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------- profiles
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text not null default '';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

-- Invariant: profiles holds no email (stays in auth.users), so community reads leak nothing.
drop policy if exists "Students manage their own profile" on public.profiles;
create policy "Students manage their own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles" on public.profiles
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------- lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id text not null check (teacher_id in ('orion', 'lyra', 'atlas')),
  subject text not null default '',
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_student_teacher_idx
  on public.lessons (student_id, teacher_id, updated_at desc);

alter table public.lessons enable row level security;
revoke all on public.lessons from anon;
grant select, insert, update, delete on public.lessons to authenticated;

drop policy if exists "Students manage their own lessons" on public.lessons;
create policy "Students manage their own lessons" on public.lessons
  for all to authenticated
  using ((select auth.uid()) = student_id)
  with check ((select auth.uid()) = student_id);

-- ---------------------------------------------------------------- lesson_messages
create table if not exists public.lesson_messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  role text not null check (role in ('learner', 'teacher')),
  text text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lesson_messages_lesson_idx
  on public.lesson_messages (lesson_id, created_at);

alter table public.lesson_messages enable row level security;
revoke all on public.lesson_messages from anon;
grant select, insert, update, delete on public.lesson_messages to authenticated;

drop policy if exists "Students manage messages of their own lessons" on public.lesson_messages;
create policy "Students manage messages of their own lessons" on public.lesson_messages
  for all to authenticated
  using (exists (
    select 1 from public.lessons l
    where l.id = lesson_id and l.student_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.lessons l
    where l.id = lesson_id and l.student_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------- student_memory
create table if not exists public.student_memory (
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id text not null check (teacher_id in ('orion', 'lyra', 'atlas')),
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (student_id, teacher_id)
);

alter table public.student_memory enable row level security;
revoke all on public.student_memory from anon;
grant select, insert, update, delete on public.student_memory to authenticated;

drop policy if exists "Students manage their own memory" on public.student_memory;
create policy "Students manage their own memory" on public.student_memory
  for all to authenticated
  using ((select auth.uid()) = student_id)
  with check ((select auth.uid()) = student_id);

-- ---------------------------------------------------------------- connections
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One row per pair in either direction.
create unique index if not exists connections_pair_uidx on public.connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.connections enable row level security;
revoke all on public.connections from anon;
grant select, insert, update, delete on public.connections to authenticated;

drop policy if exists "Students view their own connections" on public.connections;
create policy "Students view their own connections" on public.connections
  for select to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "Students send connection requests" on public.connections;
create policy "Students send connection requests" on public.connections
  for insert to authenticated
  with check ((select auth.uid()) = requester_id);

drop policy if exists "Addressees respond to requests" on public.connections;
create policy "Addressees respond to requests" on public.connections
  for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id);

drop policy if exists "Students remove their own connections" on public.connections;
create policy "Students remove their own connections" on public.connections
  for delete to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

-- ---------------------------------------------------------------- avatars bucket (public read, owner writes)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Students manage their own avatar" on storage.objects;
create policy "Students manage their own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ==================== FILE 2/3: 002_academic_journey.sql =====================
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

-- ==================== FILE 3/3: 003_academic_full.sql ========================
-- ATLAS full academic system: departments, timetable, assessments, grades.
-- Run in the Supabase dashboard SQL editor AFTER 001 and 002. Safe to re-run
-- (guarded). Additive only: new tables plus nullable columns; no existing row
-- is modified except linking the DEMO programs/subjects (guarded by id + null).
--
-- Base tables (institutions, staff, faculties, programs) live in 001 and
-- subjects/enrollments in 002, which MUST run first: this file's foreign keys,
-- policies, and seed reference them.
--
-- Roles: `staff` links a user to an institution as admin/teacher. Students
-- read the catalog and manage only their own enrollments/grades reads.
-- Staff of an institution manage its catalog (admins) and its teaching
-- data (admins + teachers). The FIRST staff row must be inserted via the
-- dashboard (authenticated users cannot self-grant):
--   insert into public.staff (user_id, institution_id, role)
--   values ('<user-uuid>', '11111111-1111-1111-1111-111111111111', 'admin');

-- ------------------------------------------------------------- departments
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists departments_faculty_idx
  on public.departments (faculty_id);

alter table public.departments enable row level security;
revoke all on public.departments from anon;
grant select, insert, update, delete on public.departments to authenticated;

drop policy if exists "Authenticated users can view departments" on public.departments;
create policy "Authenticated users can view departments" on public.departments
  for select to authenticated
  using (true);

drop policy if exists "Institution admins manage departments" on public.departments;
create policy "Institution admins manage departments" on public.departments
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    join public.faculties f on f.id = faculty_id
    where s.user_id = (select auth.uid())
      and s.institution_id = f.institution_id
      and s.role = 'admin'
  ))
  with check (exists (
    select 1 from public.staff s
    join public.faculties f on f.id = faculty_id
    where s.user_id = (select auth.uid())
      and s.institution_id = f.institution_id
      and s.role = 'admin'
  ));

-- ------------------------------------------- programs/departments linkage
alter table public.programs add column if not exists faculty_id uuid references public.faculties(id) on delete set null;
alter table public.subjects add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.subjects add column if not exists syllabus text not null default '';

-- Staff admins of the owning institution manage programs and subjects.
drop policy if exists "Institution admins manage programs" on public.programs;
create policy "Institution admins manage programs" on public.programs
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.institution_id = institution_id
      and s.role = 'admin'
  ))
  with check (exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.institution_id = institution_id
      and s.role = 'admin'
  ));

-- Programs/subjects need write grants for the policies above to take effect.
grant insert, update, delete on public.programs to authenticated;
grant insert, update, delete on public.subjects to authenticated;

drop policy if exists "Institution admins manage subjects" on public.subjects;
create policy "Institution admins manage subjects" on public.subjects
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    join public.programs p on p.id = program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
      and s.role = 'admin'
  ))
  with check (exists (
    select 1 from public.staff s
    join public.programs p on p.id = program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
      and s.role = 'admin'
  ));

-- ---------------------------------------------------------- timetable_slots
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text not null default '',
  kind text not null default 'class' check (kind in ('class', 'lab', 'tutorial')),
  check (start_time < end_time),
  created_at timestamptz not null default now()
);
create index if not exists timetable_subject_idx
  on public.timetable_slots (subject_id, weekday, start_time);
create unique index if not exists timetable_no_overlap_uidx
  on public.timetable_slots (subject_id, weekday, start_time);

alter table public.timetable_slots enable row level security;
revoke all on public.timetable_slots from anon;
grant select, insert, update, delete on public.timetable_slots to authenticated;

drop policy if exists "Authenticated users can view timetable" on public.timetable_slots;
create policy "Authenticated users can view timetable" on public.timetable_slots
  for select to authenticated
  using (true);

drop policy if exists "Institution staff manage timetable" on public.timetable_slots;
create policy "Institution staff manage timetable" on public.timetable_slots
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    join public.subjects su on su.id = subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ))
  with check (exists (
    select 1 from public.staff s
    join public.subjects su on su.id = subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ));

-- --------------------------------------------------------------- assessments
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  kind text not null default 'test' check (kind in ('test', 'exam', 'assignment')),
  due_date date,
  max_score numeric not null default 20 check (max_score > 0),
  created_at timestamptz not null default now()
);
create index if not exists assessments_subject_idx
  on public.assessments (subject_id, due_date);
create unique index if not exists assessments_subject_title_uidx
  on public.assessments (subject_id, title);

alter table public.assessments enable row level security;
revoke all on public.assessments from anon;
grant select, insert, update, delete on public.assessments to authenticated;

drop policy if exists "Authenticated users can view assessments" on public.assessments;
create policy "Authenticated users can view assessments" on public.assessments
  for select to authenticated
  using (true);

drop policy if exists "Institution staff manage assessments" on public.assessments;
create policy "Institution staff manage assessments" on public.assessments
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    join public.subjects su on su.id = subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ))
  with check (exists (
    select 1 from public.staff s
    join public.subjects su on su.id = subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ));

-- ------------------------------------------------------------------- grades
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null check (score >= 0),
  graded_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index if not exists grades_student_idx
  on public.grades (student_id);

alter table public.grades enable row level security;
revoke all on public.grades from anon;
grant select, insert, update, delete on public.grades to authenticated;

-- Students read ONLY their own grades.
drop policy if exists "Students can view their own grades" on public.grades;
create policy "Students can view their own grades" on public.grades
  for select to authenticated
  using ((select auth.uid()) = student_id);

-- Staff of the assessment's institution manage grades.
drop policy if exists "Institution staff manage grades" on public.grades;
create policy "Institution staff manage grades" on public.grades
  for all to authenticated
  using (exists (
    select 1 from public.staff s
    join public.assessments a on a.id = assessment_id
    join public.subjects su on su.id = a.subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ))
  with check (exists (
    select 1 from public.staff s
    join public.assessments a on a.id = assessment_id
    join public.subjects su on su.id = a.subject_id
    join public.programs p on p.id = su.program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ));

-- Staff need to see enrollments of their own institution (grade-entry roster).
drop policy if exists "Institution staff view enrollments" on public.enrollments;
create policy "Institution staff view enrollments" on public.enrollments
  for select to authenticated
  using (exists (
    select 1 from public.staff s
    join public.programs p on p.id = program_id
    where s.user_id = (select auth.uid())
      and s.institution_id = p.institution_id
  ));

-- ------------------------------------------------------- demonstrative seed
insert into public.faculties (id, institution_id, name, is_demo)
values ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Faculdade de Engenharia (Demo)', true)
on conflict (id) do nothing;

insert into public.departments (id, faculty_id, name, is_demo)
values
  ('d0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'Departamento de Eletrotecnia (Demo)', true),
  ('d0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001',
   'Departamento de Informática (Demo)', true)
on conflict (id) do nothing;

-- Link DEMO programs only; never touches other rows.
update public.programs set faculty_id = 'f0000000-0000-0000-0000-000000000001'
where id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
  and faculty_id is null;

update public.subjects set department_id = 'd0000000-0000-0000-0000-000000000001'
where id in ('a1010000-0000-0000-0000-000000000001', 'a1010000-0000-0000-0000-000000000002',
             'a1010000-0000-0000-0000-000000000003')
  and department_id is null;

update public.subjects set department_id = 'd0000000-0000-0000-0000-000000000002'
where id in ('b1010000-0000-0000-0000-000000000001', 'b1010000-0000-0000-0000-000000000002',
             'b1010000-0000-0000-0000-000000000003')
  and department_id is null;

insert into public.timetable_slots (subject_id, weekday, start_time, end_time, room, kind)
values
  ('a1010000-0000-0000-0000-000000000001', 1, '09:00', '11:00', 'B-201', 'class'),
  ('a1010000-0000-0000-0000-000000000001', 3, '14:00', '16:00', 'Lab-3', 'lab'),
  ('a1010000-0000-0000-0000-000000000002', 2, '09:00', '11:00', 'B-202', 'class'),
  ('b1010000-0000-0000-0000-000000000001', 1, '11:00', '13:00', 'C-101', 'class'),
  ('b1010000-0000-0000-0000-000000000002', 4, '09:00', '11:00', 'C-102', 'class')
on conflict do nothing;

insert into public.assessments (subject_id, title, kind, max_score)
values
  ('a1010000-0000-0000-0000-000000000001', 'Teste 1', 'test', 20),
  ('a1010000-0000-0000-0000-000000000002', 'Teste 1', 'test', 20),
  ('b1010000-0000-0000-0000-000000000001', 'Projeto 1', 'assignment', 20)
on conflict do nothing;
-- No grades are seeded: classifications come only from real staff entry.
