import { supabase } from '../lib/supabaseClient.js'

/**
 * Create a lesson row for the signed-in student (RLS enforces ownership).
 * @returns {Promise<{id: string}>} the new lesson
 */
export async function createLesson({ student_id, teacher_id, subject = '', title = '' }) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({ student_id, teacher_id, subject, title })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function getLesson(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, teacher_id, subject, title, updated_at')
    .eq('id', lessonId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listLessons({ teacher_id, subject } = {}) {
  let query = supabase
    .from('lessons')
    .select('id, teacher_id, subject, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)
  if (teacher_id) query = query.eq('teacher_id', teacher_id)
  if (subject) query = query.eq('subject', subject)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getLessonMessages(lessonId) {
  const { data, error } = await supabase
    .from('lesson_messages')
    .select('role, text, created_at')
    .eq('lesson_id', lessonId)
    .order('created_at')
    // Learner+teacher rows saved in one batch share a timestamp; the role
    // tiebreak restores the true within-exchange order (learner first).
    .order('role')
  if (error) throw error
  return data ?? []
}

/** Append turns and refresh the lesson's updated_at for ordering. */
export async function appendMessages(lessonId, messages) {
  const rows = messages.map((m) => ({ lesson_id: lessonId, role: m.role, text: m.text }))
  const { error } = await supabase.from('lesson_messages').insert(rows)
  if (error) throw error
  await supabase.from('lessons').update({ updated_at: new Date().toISOString() }).eq('id', lessonId)
}
