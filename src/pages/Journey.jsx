import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  FlaskConical,
  GraduationCap,
  Lock,
  Milestone,
  Sparkles,
} from 'lucide-react'
import { categories, challenges, courses, milestones, user } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { ENROLLED_KEY, PROGRESS_KEY } from '../services/storage.js'
import {
  countLessonsBySubject,
  listInstitutions,
  listMyEnrollments,
  listPrograms,
  listSubjects,
  saveEnrollment,
} from '../services/academics.js'
import { getMyTranscript } from '../services/grades.js'
import { listAssessmentsBySubjects, listSlotsBySubjects } from '../services/staff.js'

// Realistic sample skill baselines per category (XP earned in sample history).
const skillBaseline = {
  Science: { xp: 840, lessonsDone: 14 },
  Technology: { xp: 620, lessonsDone: 11 },
  Engineering: { xp: 410, lessonsDone: 7 },
  Mathematics: { xp: 530, lessonsDone: 9 },
  'Arts & Humanities': { xp: 260, lessonsDone: 5 },
}

const skillAccent = {
  Science: '#2e7bff',
  Technology: '#22d3ee',
  Engineering: '#a78bfa',
  Mathematics: '#4ade80',
  'Arts & Humanities': '#f472b6',
}

function levelForXp(xp) {
  if (xp >= 1200) return { name: 'Expert', floor: 1200, ceiling: 2000 }
  if (xp >= 700) return { name: 'Scholar', floor: 700, ceiling: 1200 }
  if (xp >= 350) return { name: 'Apprentice', floor: 350, ceiling: 700 }
  return { name: 'Novice', floor: 0, ceiling: 350 }
}

// Realistic sample of recently completed lessons tied to real courses.
const sampleCompletions = [
  { courseId: 'sci-gravity', lesson: 'Plotting a Hohmann transfer', date: '2026-11-01', xp: 60 },
  { courseId: 'tech-algorithms', lesson: 'Quicksort, traced by hand', date: '2026-10-30', xp: 55 },
  { courseId: 'math-calculus', lesson: 'The derivative as a velocity', date: '2026-10-28', xp: 50 },
  { courseId: 'eng-bridges', lesson: 'Truss load test: 500 kg hold', date: '2026-10-25', xp: 80 },
  { courseId: 'arts-renaissance', lesson: 'Linear perspective study', date: '2026-10-22', xp: 45 },
  { courseId: 'sci-cells', lesson: 'Osmosis lab visualization', date: '2026-10-19', xp: 50 },
]

const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

export default function Journey() {
  const [enrolled] = useLocalStorage(ENROLLED_KEY, [])
  const [progress] = useLocalStorage(PROGRESS_KEY, {})
  const { user: authUser } = useAuth()

  // Academic journey v1: the student's own enrollment over the shared catalog.
  const [institutions, setInstitutions] = useState([])
  const [programs, setPrograms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [lessonCounts, setLessonCounts] = useState({})
  const [acadForm, setAcadForm] = useState({ institutionId: '', programId: '', year: 1, semester: 1 })
  const [acadStatus, setAcadStatus] = useState('')

  useEffect(() => {
    if (!authUser) return
    let active = true
    listInstitutions()
      .then((rows) => {
        if (active) setInstitutions(rows)
      })
      .catch(() => {})
    listPrograms()
      .then((rows) => {
        if (active) setPrograms(rows)
      })
      .catch(() => {})
    listMyEnrollments()
      .then((rows) => {
        if (!active) return
        setEnrollments(rows)
        const first = rows[0]
        if (first) {
          setAcadForm((prev) =>
            prev.programId
              ? prev
              : {
                  institutionId: first.programs?.institution_id ?? '',
                  programId: first.program_id,
                  year: first.current_year,
                  semester: first.current_semester,
                },
          )
        }
      })
      .catch(() => {})
    countLessonsBySubject()
      .then((counts) => {
        if (active) setLessonCounts(counts)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser || !acadForm.programId) return
    let active = true
    listSubjects(acadForm.programId)
      .then((rows) => {
        if (active) setSubjects(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser, acadForm.programId])

  const currentEnrollment = enrollments[0] ?? null
  const formPrograms = programs.filter((p) => !acadForm.institutionId || p.institution_id === acadForm.institutionId)
  const formProgram = programs.find((p) => p.id === acadForm.programId) ?? null
  const formInstitution = institutions.find((i) => i.id === acadForm.institutionId) ?? null
  const termSubjects = subjects.filter(
    (s) => s.program_id === acadForm.programId && s.year === Number(acadForm.year) && s.semester === Number(acadForm.semester),
  )
  const durationYears = formProgram?.duration_years ?? 3

  const saveAcadForm = () => {
    if (!authUser || !acadForm.programId) return
    setAcadStatus('saving')
    saveEnrollment({
      student_id: authUser.id,
      program_id: acadForm.programId,
      current_year: Number(acadForm.year),
      current_semester: Number(acadForm.semester),
    })
      .then(() => listMyEnrollments())
      .then((rows) => {
        setEnrollments(rows)
        setAcadStatus('saved')
      })
      .catch(() => setAcadStatus('error'))
  }

  // Full journey data for the enrolled program: curricular plan, weekly
  // timetable, assessment dates, and the student's own transcript.
  const [planSubjects, setPlanSubjects] = useState([])
  const [weekSlots, setWeekSlots] = useState([])
  const [termAssessments, setTermAssessments] = useState([])
  const [transcript, setTranscript] = useState([])
  const enrolledProgramId = currentEnrollment?.program_id ?? ''

  useEffect(() => {
    if (!authUser || !enrolledProgramId) return
    let active = true
    listSubjects(enrolledProgramId)
      .then((rows) => {
        if (!active) return
        setPlanSubjects(rows)
        const ids = rows.map((s) => s.id)
        listSlotsBySubjects(ids)
          .then((sl) => {
            if (active) setWeekSlots(sl)
          })
          .catch(() => {})
        listAssessmentsBySubjects(ids)
          .then((a) => {
            if (active) setTermAssessments(a)
          })
          .catch(() => {})
      })
      .catch(() => {})
    getMyTranscript()
      .then((rows) => {
        if (active) setTranscript(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser, enrolledProgramId])

  const subjectById = useMemo(
    () => Object.fromEntries(planSubjects.map((s) => [s.id, s])),
    [planSubjects],
  )
  const bestRatioByCode = useMemo(() => {
    const best = {}
    for (const row of transcript) {
      const code = row.assessments?.subjects?.code
      const max = Number(row.assessments?.max_score ?? 0)
      if (!code || !(max > 0)) continue
      best[code] = Math.max(best[code] ?? 0, Number(row.score) / max)
    }
    return best
  }, [transcript])

  function subjectStatus(s) {
    if ((bestRatioByCode[s.code] ?? 0) >= 0.5) return 'completed'
    if (
      currentEnrollment &&
      s.year === currentEnrollment.current_year &&
      s.semester === currentEnrollment.current_semester
    ) {
      return 'ongoing'
    }
    return 'pending'
  }

  const planTerms = useMemo(() => {
    const groups = new Map()
    for (const s of planSubjects) {
      const key = `${s.year}-${s.semester}`
      if (!groups.has(key)) groups.set(key, { year: s.year, semester: s.semester, items: [] })
      groups.get(key).items.push(s)
    }
    return [...groups.values()].sort((a, b) => a.year - b.year || a.semester - b.semester)
  }, [planSubjects])

  const currentTermIds = useMemo(
    () =>
      new Set(
        planSubjects
          .filter(
            (s) =>
              currentEnrollment &&
              s.year === currentEnrollment.current_year &&
              s.semester === currentEnrollment.current_semester,
          )
          .map((s) => s.id),
      ),
    [planSubjects, currentEnrollment],
  )
  const termSlots = useMemo(
    () =>
      weekSlots
        .filter((sl) => currentTermIds.has(sl.subject_id))
        .sort((a, b) => a.weekday - b.weekday || String(a.start_time).localeCompare(String(b.start_time))),
    [weekSlots, currentTermIds],
  )
  const datedAssessments = useMemo(
    () =>
      termAssessments
        .filter((a) => a.due_date && subjectById[a.subject_id])
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))),
    [termAssessments, subjectById],
  )
  const transcriptSummary = useMemo(() => {
    const codes = new Set(planSubjects.map((s) => s.code))
    const passed = [...codes].filter((c) => (bestRatioByCode[c] ?? 0) >= 0.5).length
    const ratios = transcript
      .map((row) => {
        const max = Number(row.assessments?.max_score ?? 0)
        return max > 0 ? Number(row.score) / max : null
      })
      .filter((r) => r !== null)
    const avg = ratios.length > 0 ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : null
    return { passed, total: codes.size, avg }
  }, [planSubjects, transcript, bestRatioByCode])

  const statusStyle = {
    completed: 'bg-[#4ade801f] text-[#4ade80]',
    ongoing: 'bg-[#22d3ee1f] text-[#22d3ee]',
    pending: 'bg-[#6ea8ff14] text-[#9aa3bd]',
  }
  const statusLabel = { completed: 'Concluída', ongoing: 'Em curso', pending: 'Pendente' }

  const currentMilestoneIndex = milestones.findIndex((m) => !m.completed)
  const nextMilestone =
    currentMilestoneIndex === -1 ? null : milestones[currentMilestoneIndex]
  const prevXp =
    currentMilestoneIndex <= 0 ? 0 : (milestones[currentMilestoneIndex - 1]?.xpRequired ?? 0)

  const milestonePct = useMemo(() => {
    if (!nextMilestone) return 100
    const span = Math.max(1, nextMilestone.xpRequired - prevXp)
    return Math.min(100, Math.max(0, Math.round(((user.xp - prevXp) / span) * 100)))
  }, [nextMilestone, prevXp])

  const xpPct = Math.min(100, Math.round((user.xp / user.xpToNextLevel) * 100))

  const skills = useMemo(
    () =>
      categories.map((category) => {
        const base = skillBaseline[category] ?? { xp: 0, lessonsDone: 0 }
        // Fold live per-course progress into the sample baseline so the bars move as you learn.
        const liveLessons = courses
          .filter((c) => c.category === category)
          .reduce(
            (sum, c) => sum + Math.round(((progress[c.id] ?? 0) / 100) * c.lessons),
            0,
          )
        const xp = base.xp + liveLessons * 12
        const level = levelForXp(xp)
        const pct = Math.min(
          100,
          Math.round(((xp - level.floor) / Math.max(1, level.ceiling - level.floor)) * 100),
        )
        return { category, xp, lessons: base.lessonsDone + liveLessons, level, pct }
      }),
    [progress],
  )

  const completedCourses = useMemo(
    () => courses.filter((c) => (progress[c.id] ?? 0) >= 100),
    [progress],
  )

  const inProgress = useMemo(
    () =>
      courses.filter((c) => {
        const pct = progress[c.id] ?? 0
        return enrolled.includes(c.id) && pct > 0 && pct < 100
      }),
    [enrolled, progress],
  )

  const notStarted = useMemo(
    () => courses.filter((c) => !enrolled.includes(c.id) && (progress[c.id] ?? 0) === 0),
    [enrolled, progress],
  )

  const nextSteps = useMemo(() => {
    const steps = []
    if (inProgress.length > 0) {
      const c = inProgress[0]
      steps.push({
        icon: GraduationCap,
        title: `Continue “${c.title}”`,
        detail: `${progress[c.id] ?? 0}% complete · ${courseById[c.id]?.lessons ?? ''} lessons total`,
        to: `/classroom?course=${c.id}`,
        cta: 'Resume lesson',
      })
    }
    if (nextMilestone) {
      steps.push({
        icon: Milestone,
        title: `Reach “${nextMilestone.title}”`,
        detail: `${nextMilestone.description} · ${Math.max(0, nextMilestone.xpRequired - user.xp).toLocaleString()} XP to go`,
        to: '/lab',
        cta: 'Earn XP in the Lab',
      })
    }
    const challenge = challenges[0]
    if (challenge) {
      steps.push({
        icon: FlaskConical,
        title: `Try challenge: ${challenge.title}`,
        detail: `${challenge.difficulty} · +${challenge.xpReward} XP`,
        to: '/lab',
        cta: 'Open the Lab',
      })
    }
    if (notStarted.length > 0) {
      steps.push({
        icon: Compass,
        title: `Start something new: ${notStarted[0].title}`,
        detail: `${notStarted[0].category} · ${notStarted[0].difficulty} · ${notStarted[0].duration}`,
        to: '/explore',
        cta: 'Explore courses',
      })
    }
    return steps.slice(0, 4)
  }, [inProgress, nextMilestone, notStarted, progress])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-[#9aa3bd]">Level {user.level} · {user.xp.toLocaleString()} XP</p>
      <h1 className="font-display mt-1 text-3xl sm:text-4xl">Your Journey</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#9aa3bd]">
        Milestones, skills, and everything you have completed — plus the next steps
        that will move you forward.
      </p>

      {/* Academic journey */}
      <section aria-label="Percurso académico" className="card mt-6 p-5 sm:p-6">
        <h2 className="font-display flex items-center gap-2 text-xl">
          <GraduationCap size={20} className="text-[#6ea8ff]" aria-hidden="true" /> Percurso académico
        </h2>
        {!authUser ? (
          <p className="mt-2 text-sm text-[#9aa3bd]">
            Inicia sessão para veres a tua matrícula e as tuas disciplinas.
          </p>
        ) : (
          <>
            {currentEnrollment ? (
              <p className="mt-2 text-sm">
                <span className="font-medium">{currentEnrollment.programs?.name}</span>
                <span className="text-[#9aa3bd]">
                  {' '}· {currentEnrollment.current_year}.º ano · {currentEnrollment.current_semester}.º semestre
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#9aa3bd]">
                Ainda não tens matrícula. Escolhe o teu curso para começar.
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                Instituição
                <select
                  value={acadForm.institutionId}
                  onChange={(e) =>
                    setAcadForm((prev) => ({ ...prev, institutionId: e.target.value, programId: '' }))
                  }
                  className="rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-2 py-2 text-sm text-white outline-none"
                >
                  <option value="">Escolher…</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.short_name || i.name}{i.is_demo ? ' (demo)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                Curso
                <select
                  value={acadForm.programId}
                  onChange={(e) => setAcadForm((prev) => ({ ...prev, programId: e.target.value }))}
                  className="rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-2 py-2 text-sm text-white outline-none"
                >
                  <option value="">Escolher…</option>
                  {formPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                Ano
                <select
                  value={acadForm.year}
                  onChange={(e) => setAcadForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  className="rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-2 py-2 text-sm text-white outline-none"
                >
                  {Array.from({ length: durationYears }, (_, i) => i + 1).map((y) => (
                    <option key={y} value={y}>
                      {y}.º ano
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                Semestre
                <select
                  value={acadForm.semester}
                  onChange={(e) => setAcadForm((prev) => ({ ...prev, semester: Number(e.target.value) }))}
                  className="rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-2 py-2 text-sm text-white outline-none"
                >
                  <option value={1}>1.º semestre</option>
                  <option value={2}>2.º semestre</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={saveAcadForm}
                disabled={!acadForm.programId || acadStatus === 'saving'}
                className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acadStatus === 'saving' ? 'A gravar…' : 'Gravar matrícula'}
              </button>
              {(formProgram?.is_demo || formInstitution?.is_demo) && (
                <span className="rounded-full bg-[#f5b9421f] px-2.5 py-0.5 text-xs font-semibold text-[#f5b942]">
                  Dados demonstrativos
                </span>
              )}
              {acadStatus === 'saved' && (
                <span role="status" className="text-sm text-[#4ade80]">
                  Matrícula gravada.
                </span>
              )}
              {acadStatus === 'error' && (
                <span role="alert" className="text-sm text-[#f87171]">
                  Não foi possível gravar. Verifica a ligação e a migração 002.
                </span>
              )}
            </div>
            {acadForm.programId && (
              <>
                <h3 className="mt-5 font-medium">
                  Disciplinas — {acadForm.year}.º ano, {acadForm.semester}.º semestre
                </h3>
                {termSubjects.length === 0 ? (
                  <p className="mt-1 text-sm text-[#9aa3bd]">
                    Sem disciplinas neste semestre.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#6ea8ff14] rounded-xl border border-white/10">
                    {termSubjects.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-[#9aa3bd]">
                            {s.code} · {lessonCounts[s.code] ?? 0} aulas tuas
                          </p>
                        </div>
                        <Link
                          to={`/classroom?teacher=atlas&subject=${encodeURIComponent(s.code)}`}
                          className="shrink-0 text-sm font-medium text-[#6ea8ff] hover:text-white"
                        >
                          Estudar
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* Curricular plan */}
      {authUser && currentEnrollment && planSubjects.length > 0 && (
        <section aria-label="Plano curricular" className="card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-xl">Plano curricular</h2>
          <p className="mt-1 text-sm text-[#9aa3bd]">
            {transcriptSummary.passed} de {transcriptSummary.total} disciplinas concluídas
            {transcriptSummary.avg !== null && ` · média ${transcriptSummary.avg}%`} — só conta
            classificações reais lançadas pelos docentes.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {planTerms.map((term) => (
              <div key={`${term.year}-${term.semester}`} className="rounded-xl border border-white/10 p-3">
                <p className="text-sm font-medium">
                  {term.year}.º ano · {term.semester}.º semestre
                </p>
                <ul className="mt-2 space-y-2">
                  {term.items.map((s) => {
                    const st = subjectStatus(s)
                    return (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          {s.name} <span className="text-xs text-[#9aa3bd]">· {s.code}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[st]}`}>
                          {statusLabel[st]}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timetable */}
      {authUser && currentEnrollment && (
        <section aria-label="Horário semanal" className="card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-xl">Horário semanal</h2>
          {termSlots.length === 0 ? (
            <p className="mt-1 text-sm text-[#9aa3bd]">
              Sem aulas marcadas para este semestre.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[#6ea8ff14]">
              {termSlots.map((sl) => (
                <li key={sl.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-10 shrink-0 font-medium">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][sl.weekday]}
                  </span>
                  <span className="w-24 shrink-0 text-[#9aa3bd]">
                    {String(sl.start_time).slice(0, 5)}–{String(sl.end_time).slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {subjectById[sl.subject_id]?.name ?? sl.subject_id}
                  </span>
                  {sl.room && <span className="shrink-0 text-xs text-[#9aa3bd]">{sl.room}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Assessments and transcript */}
      {authUser && currentEnrollment && (
        <section aria-label="Avaliações e histórico" className="card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-xl">Avaliações e histórico</h2>
          <h3 className="mt-4 font-medium">Próximas avaliações</h3>
          {datedAssessments.length === 0 ? (
            <p className="mt-1 text-sm text-[#9aa3bd]">Sem avaliações marcadas.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {datedAssessments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {a.title} <span className="text-xs text-[#9aa3bd]">· {subjectById[a.subject_id]?.code}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[#9aa3bd]">{a.due_date}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 font-medium">Histórico académico</h3>
          {transcript.length === 0 ? (
            <p className="mt-1 text-sm text-[#9aa3bd]">
              Sem classificações publicadas. Nada aqui é inventado: as notas aparecem quando os docentes as lançam.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#6ea8ff14]">
              {transcript.map((row, i) => (
                <li key={`${row.assessments?.title}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {row.assessments?.subjects?.name} — {row.assessments?.title}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {row.score}/{row.assessments?.max_score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Overall progress */}
      <section aria-label="Overall progress" className="card mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">
            {nextMilestone ? `Next milestone: ${nextMilestone.title}` : 'All milestones complete'}
          </h2>
          <span className="text-sm text-[#9aa3bd]">{milestonePct}% there</span>
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#6ea8ff22]"
          role="progressbar"
          aria-valuenow={milestonePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next milestone"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2e7bff] to-[#22d3ee]"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9aa3bd]">
          <span>Level {user.level} · {xpPct}% to level {user.level + 1}</span>
          {nextMilestone && (
            <span>
              {user.xp.toLocaleString()} / {nextMilestone.xpRequired.toLocaleString()} XP
            </span>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        {/* Milestones timeline */}
        <section aria-label="Milestones" className="lg:col-span-3">
          <h2 className="font-display flex items-center gap-2 text-2xl">
            <Award size={22} className="text-[#6ea8ff]" aria-hidden="true" /> Milestones
          </h2>
          <ol className="mt-5 space-y-0">
            {milestones.map((m, index) => {
              const isCurrent = index === currentMilestoneIndex
              const done = m.completed
              return (
                <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < milestones.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-9 left-[15px] h-[calc(100%-2rem)] w-0.5 ${
                        done ? 'bg-[#2e7bff66]' : 'bg-[#6ea8ff22]'
                      }`}
                    />
                  )}
                  <span
                    className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? 'border-[#2e7bff] bg-[#2e7bff] text-white'
                        : isCurrent
                          ? 'border-[#22d3ee] bg-[#22d3ee1f] text-[#22d3ee]'
                          : 'border-[#6ea8ff33] bg-[#0a1128] text-[#9aa3bd]'
                    }`}
                  >
                    {done ? (
                      <Check size={16} aria-hidden="true" />
                    ) : isCurrent ? (
                      <Circle size={14} aria-hidden="true" />
                    ) : (
                      <Lock size={14} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{m.title}</p>
                      {isCurrent && (
                        <span className="rounded-full bg-[#22d3ee1f] px-2.5 py-0.5 text-xs font-semibold text-[#22d3ee]">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[#9aa3bd]">{m.description}</p>
                    <p className="mt-1 text-xs text-[#9aa3bd]">
                      {m.xpRequired.toLocaleString()} XP required
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* Next steps */}
        <section aria-label="Next steps" className="lg:col-span-2">
          <h2 className="font-display flex items-center gap-2 text-2xl">
            <Sparkles size={22} className="text-[#6ea8ff]" aria-hidden="true" /> Next steps
          </h2>
          <div className="mt-5 space-y-3">
            {nextSteps.map(({ icon: Icon, title, detail, to, cta }) => (
              <div key={title} className="card card-hover p-4">
                <div className="flex items-start gap-3">
                  <Icon size={20} className="mt-0.5 shrink-0 text-[#6ea8ff]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-sm text-[#9aa3bd]">{detail}</p>
                    <Link
                      to={to}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#6ea8ff] hover:text-white"
                    >
                      {cta} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Skills */}
      <section aria-label="Skills" className="mt-10">
        <h2 className="font-display text-2xl">Skills</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map(({ category, xp, lessons, level, pct }) => (
            <div key={category} className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{category}</p>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: skillAccent[category],
                    backgroundColor: `${skillAccent[category]}1f`,
                  }}
                >
                  {level.name}
                </span>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-[#6ea8ff22]"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${category} progress to next level`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: skillAccent[category] }}
                />
              </div>
              <p className="mt-2 text-xs text-[#9aa3bd]">
                {xp.toLocaleString()} XP · {lessons} lessons · {pct}% to next level
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Completed activities */}
      <section aria-label="Completed activities" className="mt-10">
        <h2 className="font-display flex items-center gap-2 text-2xl">
          <CheckCircle2 size={22} className="text-[#6ea8ff]" aria-hidden="true" /> Completed activities
        </h2>
        {completedCourses.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((c) => (
              <div key={c.id} className="card border-[#4ade8055] p-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4ade80] uppercase">
                  <Check size={14} aria-hidden="true" /> Course complete
                </p>
                <p className="mt-1.5 font-medium">{c.title}</p>
                <p className="mt-0.5 text-sm text-[#9aa3bd]">
                  {c.category} · {c.lessons} lessons
                </p>
                <Link
                  to={`/classroom?course=${c.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#6ea8ff] hover:text-white"
                >
                  Review lessons <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        )}
        <ul className="card mt-4 divide-y divide-[#6ea8ff14]">
          {sampleCompletions.map(({ courseId, lesson, date, xp }) => (
            <li key={`${courseId}-${lesson}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <CheckCircle2 size={18} className="shrink-0 text-[#4ade80]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lesson}</p>
                <p className="truncate text-xs text-[#9aa3bd]">
                  {courseById[courseId]?.title ?? courseId} · {date}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#22d3ee]">+{xp} XP</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
