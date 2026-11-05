import { Link } from 'react-router-dom'
import { BookOpen, Check, Clock, Play, Plus, Star } from 'lucide-react'

const difficultyStyles = {
  Beginner: 'border-[#22d3ee55] text-[#22d3ee]',
  Intermediate: 'border-[#6ea8ff55] text-[#6ea8ff]',
  Advanced: 'border-[#f0a35e55] text-[#f0a35e]',
}

export default function CourseCard({
  course,
  teacherName,
  enrolled,
  onToggleEnroll,
  progress = null,
  onLogLesson = null,
}) {
  return (
    <article className="card card-hover flex flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="text-[#9aa3bd]">{course.category}</span>
        <span aria-hidden="true" className="text-[#9aa3bd66]">
          •
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 ${difficultyStyles[course.difficulty] ?? 'border-[#6ea8ff33] text-[#9aa3bd]'}`}
        >
          {course.difficulty}
        </span>
      </div>

      <h3 className="font-display mt-2 text-xl leading-snug">{course.title}</h3>
      <p className="mt-1 text-sm text-[#9aa3bd]">with {teacherName}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[#c6cddd]">{course.description}</p>

      <div className="mt-4 flex items-center gap-4 text-xs text-[#9aa3bd]">
        <span className="flex items-center gap-1">
          <Clock size={13} /> {course.duration}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={13} /> {course.lessons} lessons
        </span>
        <span className="flex items-center gap-1">
          <Star size={13} /> {course.rating.toFixed(1)}
        </span>
      </div>

      {progress !== null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#9aa3bd]">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#6ea8ff22]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-[#2e7bff]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {enrolled ? (
          <>
            <Link
              to={`/classroom?course=${course.id}`}
              className="btn-primary flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-sm"
            >
              <Play size={15} /> Start
            </Link>
            {onLogLesson && progress < 100 ? (
              <button
                onClick={onLogLesson}
                title="Log a completed lesson"
                className="flex items-center gap-1 rounded-[10px] border border-[#6ea8ff33] px-3 py-2 text-sm font-medium text-[#c6cddd] transition-colors hover:border-[#6ea8ff66] hover:text-white"
              >
                <Plus size={15} /> Lesson
              </button>
            ) : (
              <button
                onClick={onToggleEnroll}
                title="Unenroll"
                className="flex items-center gap-1 rounded-[10px] border border-[#22d3ee44] px-3 py-2 text-sm font-medium text-[#22d3ee] transition-colors hover:border-[#22d3ee88]"
              >
                <Check size={15} /> Enrolled
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onToggleEnroll}
            className="btn-primary w-full px-4 py-2 text-sm"
          >
            Enroll
          </button>
        )}
      </div>
    </article>
  )
}
