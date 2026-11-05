import { supabase } from '../lib/supabaseClient.js'

/**
 * Per-student, per-teacher learning context.
 * Shape: { subjects_studied: string[], last_topic: string, difficulties: [{text, at}],
 *          preferences: object, exchanges: number }
 * RLS isolates every row to its own student; teachers consume this later
 * through the server-side Meta AI proxy, never directly from another client.
 */
export const emptyContext = {
  subjects_studied: [],
  last_topic: '',
  difficulties: [],
  preferences: {},
  exchanges: 0,
}

// Explicit learner signals only — no model inference in the browser.
const DIFFICULTY_PATTERNS = [
  /don't understand/i,
  /do not understand/i,
  /still don't get/i,
  /confus/i,
  /too (hard|difficult)/i,
  /\bstuck\b/i,
  /makes no sense/i,
]

export async function getMemory(student_id, teacher_id) {
  const { data, error } = await supabase
    .from('student_memory')
    .select('context, updated_at')
    .eq('student_id', student_id)
    .eq('teacher_id', teacher_id)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function saveMemory(student_id, teacher_id, context) {
  const { data, error } = await supabase
    .from('student_memory')
    .upsert({ student_id, teacher_id, context, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

/** Fold one exchange into stored context. Factual aggregates only. */
export function foldExchangeIntoContext(prev, { subject, learnerText }) {
  const context = { ...emptyContext, ...(prev ?? {}) }
  const subjects = new Set(context.subjects_studied ?? [])
  if (subject) subjects.add(subject)
  context.subjects_studied = [...subjects].slice(-20)
  context.last_topic = (learnerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
  context.exchanges = (context.exchanges ?? 0) + 1
  if (DIFFICULTY_PATTERNS.some((re) => re.test(learnerText ?? ''))) {
    context.difficulties = [
      ...(context.difficulties ?? []),
      { text: context.last_topic, at: new Date().toISOString() },
    ].slice(-10)
  }
  return context
}

/**
 * Delete the student's stored context for one teacher (RLS-scoped).
 * Lessons are untouched; only the teacher's memory of the student is cleared.
 */
export async function clearMemory(student_id, teacher_id) {
  const { error } = await supabase
    .from('student_memory')
    .delete()
    .eq('student_id', student_id)
    .eq('teacher_id', teacher_id)
  if (error) throw error
}

/** Read-modify-write one exchange into the student's memory for a teacher. */
export async function recordExchange(student_id, teacher_id, signal) {
  let prev = null
  try {
    prev = (await getMemory(student_id, teacher_id))?.context ?? null
  } catch {
    prev = null
  }
  return saveMemory(student_id, teacher_id, foldExchangeIntoContext(prev, signal))
}
