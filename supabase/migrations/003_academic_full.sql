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
