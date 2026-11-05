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
