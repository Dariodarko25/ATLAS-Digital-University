import { useSearchParams } from 'react-router-dom'
import Classroom from './Classroom.jsx'
import { courses } from '../data/mockData.js'
import { resolveClassroomTeacher } from '../services/classroom.js'

// Keyed remount: same-route navigation to another teacher (?teacher=,
// back/forward, course links) or another lesson (?lesson=) always mounts a
// fresh classroom, so the displayed teacher can never disagree with the URL.
export default function ClassroomPage() {
  const [searchParams] = useSearchParams()
  const teacherId = resolveClassroomTeacher(searchParams.get('teacher'), searchParams.get('course'))
  const lessonId = searchParams.get('lesson')
  const subject = courses.find((c) => c.id === searchParams.get('course'))?.category ?? ''
  return (
    <Classroom
      key={`${teacherId}:${lessonId ?? 'new'}`}
      initialTeacherId={teacherId}
      initialSubject={subject}
      initialLessonId={lessonId}
    />
  )
}
