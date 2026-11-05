import { courses, teachers } from '../data/mockData.js'

function resolveTeacherId(value) {
  if (value && teachers.some((t) => t.id === value)) return value
  return 'orion'
}

function courseTeacherId(courseId) {
  if (!courseId) return undefined
  return courses.find((c) => c.id === courseId)?.teacherId
}

// Classroom deep-link resolution: ?teacher= wins, ?course= maps to its
// teacher, anything else falls back to Orion.
export function resolveClassroomTeacher(teacherParam, courseParam) {
  return resolveTeacherId(teacherParam ?? courseTeacherId(courseParam))
}
