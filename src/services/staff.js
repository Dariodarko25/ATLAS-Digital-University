import { supabase } from '../lib/supabaseClient.js'

// Staff academic management. Every write is enforced by RLS: catalog
// structure requires the admin role at the owning institution, teaching
// data requires any staff role there. Reads below are the shared catalog.

export async function getMyStaffRoles() {
  const { data, error } = await supabase.from('staff').select('institution_id, role')
  if (error) throw error
  return data ?? []
}

export async function listFaculties(institutionId) {
  let query = supabase.from('faculties').select('id, institution_id, name, is_demo').order('name')
  if (institutionId) query = query.eq('institution_id', institutionId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listDepartments(facultyId) {
  let query = supabase.from('departments').select('id, faculty_id, name, is_demo').order('name')
  if (facultyId) query = query.eq('faculty_id', facultyId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createFaculty({ institution_id, name }) {
  const { data, error } = await supabase
    .from('faculties')
    .insert({ institution_id, name: name.trim() })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteFaculty(id) {
  const { error } = await supabase.from('faculties').delete().eq('id', id)
  if (error) throw error
}

export async function createDepartment({ faculty_id, name }) {
  const { data, error } = await supabase
    .from('departments')
    .insert({ faculty_id, name: name.trim() })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteDepartment(id) {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

export async function createProgram({ institution_id, name, field = '', duration_years = 3, faculty_id = null }) {
  const { data, error } = await supabase
    .from('programs')
    .insert({ institution_id, name: name.trim(), field, duration_years, faculty_id: faculty_id || null })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateProgram(id, fields) {
  const { data, error } = await supabase
    .from('programs')
    .update(fields)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteProgram(id) {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
}

export async function createSubject({ program_id, name, code = '', year = 1, semester = 1, syllabus = '', department_id = null }) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      program_id,
      name: name.trim(),
      code: code.trim(),
      year,
      semester,
      syllabus,
      department_id: department_id || null,
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateSubject(id, fields) {
  const { data, error } = await supabase
    .from('subjects')
    .update(fields)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}

export async function listSlots(subjectId) {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('id, subject_id, weekday, start_time, end_time, room, kind')
    .eq('subject_id', subjectId)
    .order('weekday')
    .order('start_time')
  if (error) throw error
  return data ?? []
}

export async function listSlotsBySubjects(subjectIds) {
  if (!subjectIds?.length) return []
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('id, subject_id, weekday, start_time, end_time, room, kind')
    .in('subject_id', subjectIds)
    .order('weekday')
    .order('start_time')
  if (error) throw error
  return data ?? []
}

export async function createSlot({ subject_id, weekday, start_time, end_time, room = '', kind = 'class' }) {
  const { data, error } = await supabase
    .from('timetable_slots')
    .insert({ subject_id, weekday, start_time, end_time, room, kind })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteSlot(id) {
  const { error } = await supabase.from('timetable_slots').delete().eq('id', id)
  if (error) throw error
}

export async function listAssessments(subjectId) {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, subject_id, title, kind, due_date, max_score')
    .eq('subject_id', subjectId)
    .order('due_date', { nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function listAssessmentsBySubjects(subjectIds) {
  if (!subjectIds?.length) return []
  const { data, error } = await supabase
    .from('assessments')
    .select('id, subject_id, title, kind, due_date, max_score')
    .in('subject_id', subjectIds)
    .order('due_date', { nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function createAssessment({ subject_id, title, kind = 'test', due_date = null, max_score = 20 }) {
  const { data, error } = await supabase
    .from('assessments')
    .insert({ subject_id, title: title.trim(), kind, due_date: due_date || null, max_score })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteAssessment(id) {
  const { error } = await supabase.from('assessments').delete().eq('id', id)
  if (error) throw error
}
