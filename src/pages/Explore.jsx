import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import CourseCard from '../components/CourseCard.jsx'
import { categories, courses, teachers } from '../data/mockData.js'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { ENROLLED_KEY } from '../services/storage.js'

const difficulties = ['Beginner', 'Intermediate', 'Advanced']
const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]))

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = categories.includes(searchParams.get('category'))
    ? searchParams.get('category')
    : 'All'

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [difficulty, setDifficulty] = useState('All')
  const [enrolled, setEnrolled] = useLocalStorage(ENROLLED_KEY, [])

  const pickCategory = (next) => {
    setCategory(next)
    setSearchParams(next === 'All' ? {} : { category: next }, { replace: true })
  }

  const toggleEnroll = (courseId) => {
    setEnrolled((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    )
  }

  const clearFilters = () => {
    setQuery('')
    setDifficulty('All')
    pickCategory('All')
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((course) => {
      if (category !== 'All' && course.category !== category) return false
      if (difficulty !== 'All' && course.difficulty !== difficulty) return false
      if (!q) return true
      const teacher = teacherById[course.teacherId]?.name ?? ''
      return [course.title, course.description, teacher, course.category]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, category, difficulty])

  const hasActiveFilters = query.trim() !== '' || category !== 'All' || difficulty !== 'All'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl sm:text-4xl">Explore courses</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#9aa3bd]">
        {courses.length} courses across {categories.length} disciplines, each taught by a legend.
        Enroll to pin a course to your dashboard.
      </p>

      {/* Search */}
      <div className="relative mt-6 max-w-xl">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#9aa3bd]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses, teachers, topics…"
          aria-label="Search courses"
          className="w-full rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-[#9aa3bd88] focus:border-[#6ea8ff88] focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-4">
        <div aria-label="Filter by category">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#9aa3bd] uppercase">
            <SlidersHorizontal size={13} aria-hidden="true" /> Category
          </p>
          <div className="flex flex-wrap gap-2">
            {['All', ...categories].map((option) => (
              <button
                key={option}
                onClick={() => pickCategory(option)}
                aria-pressed={category === option}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  category === option
                    ? 'border-[#2e7bff] bg-[#2e7bff26] text-white'
                    : 'border-[#6ea8ff2e] text-[#9aa3bd] hover:border-[#6ea8ff66] hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div aria-label="Filter by difficulty">
          <p className="mb-2 text-xs font-semibold tracking-wide text-[#9aa3bd] uppercase">
            Difficulty
          </p>
          <div className="flex flex-wrap gap-2">
            {['All', ...difficulties].map((option) => (
              <button
                key={option}
                onClick={() => setDifficulty(option)}
                aria-pressed={difficulty === option}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  difficulty === option
                    ? 'border-[#22d3ee] bg-[#22d3ee1f] text-white'
                    : 'border-[#6ea8ff2e] text-[#9aa3bd] hover:border-[#6ea8ff66] hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <p className="mt-6 text-sm text-[#9aa3bd]" role="status">
        {results.length} {results.length === 1 ? 'course' : 'courses'}
        {enrolled.length > 0 && ` · ${enrolled.length} enrolled`}
      </p>

      {results.length === 0 ? (
        <div className="card mt-3 p-8 text-center">
          <p className="font-display text-xl">No courses match those filters</p>
          <p className="mt-1.5 text-sm text-[#9aa3bd]">
            Try a different search term or widen the category and difficulty.
          </p>
          <button
            onClick={clearFilters}
            className="btn-primary mt-5 px-5 py-2 text-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              teacherName={teacherById[course.teacherId]?.shortName ?? 'ATLAS'}
              enrolled={enrolled.includes(course.id)}
              onToggleEnroll={() => toggleEnroll(course.id)}
            />
          ))}
        </div>
      )}

      {hasActiveFilters && results.length > 0 && (
        <button
          onClick={clearFilters}
          className="link-muted mt-6 text-sm font-medium underline underline-offset-4"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
