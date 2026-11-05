import { supabase } from '../lib/supabaseClient.js'

// Academic journey v1: read the catalog, manage the student's own enrollment.
// The catalog (institutions/programs/subjects) is read-only for students;
// enrollments are scoped to the signed-in student by RLS.

export async function listInstitutions() {
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, short_name, is_demo')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function listPrograms(institutionId) {
  let query = supabase
    .from('programs')
    .select('id, institution_id, name, field, duration_years, is_demo')
    .order('name')
  if (institutionId) query = query.eq('institution_id', institutionId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listSubjects(programId, { year, semester } = {}) {
  let query = supabase
    .from('subjects')
    .select('id, program_id, name, code, year, semester')
    .order('year')
    .order('semester')
    .order('name')
  if (programId) query = query.eq('program_id', programId)
  if (year) query = query.eq('year', year)
  if (semester) query = query.eq('semester', semester)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** The signed-in student's enrollments, newest first (RLS-scoped). */
export async function listMyEnrollments() {
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      'program_id, current_year, current_semester, status, enrolled_at, programs!inner(name, field, duration_years, institution_id)',
    )
    .order('enrolled_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveEnrollment({ student_id, program_id, current_year, current_semester }) {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert(
      { student_id, program_id, current_year, current_semester, status: 'active' },
      { onConflict: 'student_id,program_id' },
    )
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

/** Real per-subject lesson counts from the student's own lessons. */
export async function countLessonsBySubject() {
  const { data, error } = await supabase.from('lessons').select('subject').limit(1000)
  if (error) throw error
  const counts = {}
  for (const row of data ?? []) {
    const key = (row.subject ?? '').trim()
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}
