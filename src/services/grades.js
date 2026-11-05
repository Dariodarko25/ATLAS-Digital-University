import { supabase } from '../lib/supabaseClient.js'

// Grades: students read ONLY their own (RLS); staff of the owning
// institution write. Nothing here fabricates classifications — every row is
// an explicit staff entry.

export async function saveGrade({ assessment_id, student_id, score }) {
  const { data, error } = await supabase
    .from('grades')
    .upsert(
      { assessment_id, student_id, score, graded_at: new Date().toISOString() },
      { onConflict: 'assessment_id,student_id' },
    )
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteGrade(id) {
  const { error } = await supabase.from('grades').delete().eq('id', id)
  if (error) throw error
}

/** Staff roster view: grades recorded for one assessment. */
export async function listGradesForAssessment(assessmentId) {
  const { data, error } = await supabase
    .from('grades')
    .select('id, assessment_id, student_id, score, graded_at')
    .eq('assessment_id', assessmentId)
  if (error) throw error
  return data ?? []
}

/** Staff roster: students enrolled in a program, with display names. */
export async function listProgramRoster(programId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('student_id, current_year, current_semester, status, profiles!enrollments_student_id_fkey(display_name)')
    .eq('program_id', programId)
    .eq('status', 'active')
  if (error) throw error
  return data ?? []
}

/** The signed-in student's full transcript rows (own grades only, RLS). */
export async function getMyTranscript() {
  const { data, error } = await supabase
    .from('grades')
    .select(
      'score, graded_at, assessments!inner(title, kind, max_score, due_date, subjects!inner(name, code, year, semester, programs!inner(name)))',
    )
    .order('graded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
