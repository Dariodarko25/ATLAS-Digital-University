import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Atom,
  Binary,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cog,
  Compass,
  Cpu,
  Flame,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Play,
  Sigma,
  Swords,
  Telescope,
  Trophy,
  Zap,
} from 'lucide-react'
import CourseCard from '../components/CourseCard.jsx'
import HoloGlobe from '../components/HoloGlobe.jsx'
import Particles from '../components/Particles.jsx'
import TeacherAvatar from '../components/TeacherAvatar.jsx'
import { categories, challenges, courses, dailyTips, teachers, user } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { ENROLLED_KEY, ONBOARDING_KEY, PROGRESS_KEY, emptyProfile } from '../services/storage.js'

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]))

const quickCards = [
  {
    to: '/explore',
    title: 'Interactive Courses',
    text: 'Learn with modern, dynamic content.',
    icon: BookOpen,
    accent: '#a78bfa',
    cta: 'Browse',
  },
  {
    to: '/lab',
    title: 'Virtual Laboratory',
    text: 'Experiment, simulate, and innovate hands-on.',
    icon: FlaskConical,
    accent: '#34d399',
    cta: 'Enter',
  },
  {
    to: '/classroom',
    title: 'AI Classroom',
    text: 'Talk with your intelligent virtual teachers.',
    icon: GraduationCap,
    accent: '#2e7bff',
    cta: 'Meet them',
  },
  {
    to: '/profile',
    title: 'Achievements',
    text: 'Unlock rewards and track your progress.',
    icon: Trophy,
    accent: '#f5b942',
    cta: 'View',
  },
]

const scienceTiles = [
  { label: 'Physics', icon: Atom, category: 'Science', tint: '#2e7bff' },
  { label: 'Mathematics', icon: Sigma, category: 'Mathematics', tint: '#22d3ee' },
  { label: 'Engineering', icon: Cog, category: 'Engineering', tint: '#a78bfa' },
  { label: 'Technology', icon: Cpu, category: 'Technology', tint: '#6ea8ff' },
  { label: 'Astronomy', icon: Telescope, category: 'Science', tint: '#f5b942' },
  { label: 'Computing', icon: Binary, category: 'Technology', tint: '#34d399' },
]

function ProgressRing({ pct }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`Overall progress ${pct} percent`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#6ea8ff22" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          className="progress-ring-circle"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2e7bff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-3xl font-bold">
        {pct}%
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [profile] = useLocalStorage(ONBOARDING_KEY, emptyProfile)
  const [enrolled, setEnrolled] = useLocalStorage(ENROLLED_KEY, [])
  const [progress, setProgress] = useLocalStorage(PROGRESS_KEY, {})
  const { user: authUser } = useAuth()
  const carouselRef = useRef(null)

  const effectiveName = profile?.name?.trim() || authUser?.email?.split('@')[0] || ''
  const hasProfile = Boolean(effectiveName)
  const [greeting] = useState(() => greetingForHour(new Date().getHours()))
  const xpPct = Math.min(100, Math.round((user.xp / user.xpToNextLevel) * 100))
  const completedCount = Object.values(progress).filter((p) => p >= 100).length
  const [tip] = useState(() => dailyTips[new Date().getDate() % dailyTips.length])

  const toggleEnroll = (courseId) => {
    setEnrolled((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    )
  }

  const logLesson = (course) => {
    const step = Math.ceil(100 / course.lessons)
    setProgress((prev) => ({
      ...prev,
      [course.id]: Math.min(100, (prev[course.id] ?? 0) + step),
    }))
  }

  const enrolledCourses = useMemo(
    () => courses.filter((c) => enrolled.includes(c.id)),
    [enrolled],
  )

  const recommended = useMemo(() => {
    const interests = profile?.interests ?? []
    return courses
      .filter((c) => !enrolled.includes(c.id))
      .map((c) => ({
        course: c,
        score: (interests.includes(c.category) ? 2 : 0) + c.rating / 5,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.course)
  }, [enrolled, profile?.interests])

  const recentSubjects = useMemo(() => {
    const counts = {}
    for (const c of enrolledCourses) counts[c.category] = (counts[c.category] ?? 0) + 1
    for (const interest of profile?.interests ?? []) {
      if (!(interest in counts)) counts[interest] = 0
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [enrolledCourses, profile?.interests])

  const stats = [
    { icon: Trophy, label: 'Level', value: String(user.level) },
    { icon: Flame, label: 'Day streak', value: String(user.streakDays) },
    { icon: BookOpen, label: 'Enrolled', value: String(enrolled.length) },
    { icon: Zap, label: 'Total XP', value: user.xp.toLocaleString() },
  ]

  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div aria-hidden="true" className="dashboard-backdrop" />
      {/* Immersive lab hero */}
      <section className="lab-scene animate-enter card overflow-hidden" aria-label="Welcome">
        <Particles />
        <div className="relative z-10 grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-sm font-medium tracking-wide text-[#6ea8ff]">
              {hasProfile ? greeting : 'Your intelligent digital university'}
            </p>
            <h1 className="font-display mt-1 text-4xl font-bold sm:text-5xl">
              {hasProfile ? (
                <>
                  Welcome back, <span className="text-[#6ea8ff]">{effectiveName}</span>!
                </>
              ) : (
                <>
                  Welcome to <span className="text-[#6ea8ff]">ATLAS</span>!
                </>
              )}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#c6cddd]">
              {hasProfile && profile.interests?.length > 0
                ? `Picking up ${profile.interests.slice(0, 2).join(' and ')}${profile.goal ? ` — working toward: ${profile.goal.toLowerCase()}` : ''}. Your teachers are ready when you are.`
                : 'Your digital university with AI — explore, learn, and innovate alongside your virtual teachers.'}
            </p>
            <Link
              to="/classroom"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#22d3ee44] bg-[#0a1530cc] px-4 py-2 text-sm text-[#c6cddd] transition-colors hover:border-[#22d3ee88] hover:text-white"
            >
              <Zap size={15} className="text-[#f5b942]" aria-hidden="true" />
              Knowledge without limits, powered by artificial intelligence.
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/explore" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                <Play size={16} aria-hidden="true" /> Explore Courses
              </Link>
              <Link to="/lab" className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                <FlaskConical size={16} aria-hidden="true" /> Go to Laboratory
              </Link>
              {!hasProfile && (
                <Link to="/onboarding" className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                  Personalize my path <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <HoloGlobe className="w-60 xl:w-72" />
          </div>
        </div>

        {/* Teacher trio */}
        <div className="relative z-10 grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-3">
          {teachers.map((teacher, i) => (
            <Link
              key={teacher.id}
              to={`/classroom?teacher=${teacher.id}`}
              className="teacher-card card flex items-center gap-4 p-4"
              style={{ '--teacher-accent': teacher.accent, '--teacher-glow': teacher.glow }}
            >
              <TeacherAvatar teacher={teacher} size="lg" delay={`${i * 0.8}s`} className="shrink-0" />
              <span className="min-w-0">
                <span className="font-display block text-xl font-bold">{teacher.name}</span>
                <span className="block text-xs font-medium" style={{ color: teacher.accent }}>
                  {teacher.field}
                </span>
                <span className="mt-1.5 block text-[13px] leading-snug text-[#c6cddd]">
                  {teacher.tagline}
                </span>
                <span className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-white">
                  Enter class <ArrowRight size={14} aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Your stats" className="card mt-6 p-5">
        <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={22} className="shrink-0 text-[#6ea8ff]" aria-hidden="true" />
              <div>
                <dt className="text-xs text-[#9aa3bd]">{label}</dt>
                <dd className="font-display text-2xl leading-tight">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-[#9aa3bd]">
            <span>Level {user.level} progress</span>
            <span>
              {user.xp.toLocaleString()} / {user.xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#6ea8ff22]"
            role="progressbar"
            aria-valuenow={xpPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-[#2e7bff]" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </section>

      {/* Quick access + progress */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
          {quickCards.map(({ to, title, text, icon: Icon, accent, cta }) => (
            <Link
              key={to}
              to={to}
              className="teacher-card card block p-5"
              style={{
                '--teacher-accent': accent,
                '--teacher-glow': `${accent}66`,
                background: `linear-gradient(160deg, ${accent}22, transparent 72%), linear-gradient(180deg, #0f1a3d, #0a1128)`,
              }}
            >
              <Icon size={26} style={{ color: accent }} aria-hidden="true" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#9aa3bd]">{text}</p>
              <span className="mt-3 flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>
                {cta} <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        <section aria-label="Your progress" className="card flex flex-col items-center gap-4 p-5">
          <h2 className="self-start text-sm font-semibold tracking-wide text-[#9aa3bd] uppercase">
            Your progress
          </h2>
          <ProgressRing pct={xpPct} />
          <ul className="w-full space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-[#9aa3bd]">Courses completed</span>
              <span className="font-semibold">{completedCount}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#9aa3bd]">Points</span>
              <span className="font-semibold">{user.xp.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#9aa3bd]">Level</span>
              <span className="font-semibold">Explorer {user.level}</span>
            </li>
          </ul>
          <p className="text-sm font-medium text-[#f5b942]">
            {xpPct >= 80 ? 'You are doing great — keep going!' : 'Every lesson moves the ring forward.'}
          </p>
        </section>
      </div>

      {/* Continue learning */}
      <section aria-label="Continue learning" className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Continue learning</h2>
          <Link to="/explore" className="link-muted flex items-center gap-1 text-sm font-medium">
            All courses <ArrowRight size={15} />
          </Link>
        </div>
        {enrolledCourses.length === 0 ? (
          <div className="card mt-4 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
            <Compass size={26} className="shrink-0 text-[#6ea8ff]" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">Nothing in progress yet</p>
              <p className="mt-0.5 text-sm text-[#9aa3bd]">
                Enroll in a course and it will wait for you here, progress and all.
              </p>
            </div>
            <Link to="/explore" className="btn-primary px-4 py-2 text-sm">
              Explore courses
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                teacherName={teacherById[course.teacherId]?.shortName ?? 'ATLAS'}
                enrolled
                onToggleEnroll={() => toggleEnroll(course.id)}
                progress={progress[course.id] ?? 0}
                onLogLesson={() => logLesson(course)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recommended + recent subjects */}
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <section aria-label="Recommended paths" className="lg:col-span-2">
          <h2 className="font-display text-2xl">Recommended paths</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recommended.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                teacherName={teacherById[course.teacherId]?.shortName ?? 'ATLAS'}
                enrolled={false}
                onToggleEnroll={() => toggleEnroll(course.id)}
              />
            ))}
          </div>
        </section>

        <section aria-label="Recent subjects">
          <h2 className="font-display text-2xl">Recent subjects</h2>
          {recentSubjects.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-[#9aa3bd]">
              Your most-studied subjects will appear here once you enroll or{' '}
              <Link to="/onboarding" className="text-[#6ea8ff] underline underline-offset-2">
                choose interests
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentSubjects.map(([subject, count]) => (
                <li key={subject}>
                  <Link
                    to={`/explore?category=${encodeURIComponent(subject)}`}
                    className="card card-hover flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{subject}</span>
                    <span className="text-xs text-[#9aa3bd]">
                      {count > 0 ? `${count} enrolled` : 'of interest'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-relaxed text-[#9aa3bd]">
            Browsing all {categories.length} disciplines?{' '}
            <Link to="/explore" className="text-[#6ea8ff] underline underline-offset-2">
              Open the catalog
            </Link>
            .
          </p>
        </section>
      </div>

      {/* Science categories + tip of the day */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <section aria-label="Science categories" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Science categories</h2>
            <div className="flex gap-2">
              <button
                onClick={() => scrollCarousel(-1)}
                aria-label="Scroll categories left"
                className="btn-ghost rounded-full p-2"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollCarousel(1)}
                aria-label="Scroll categories right"
                className="btn-ghost rounded-full p-2"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="scroll-row mt-4 flex gap-4 overflow-x-auto pb-1"
          >
            {scienceTiles.map(({ label, icon: Icon, category, tint }) => (
              <Link
                key={label}
                to={`/explore?category=${encodeURIComponent(category)}`}
                className="teacher-card card w-36 shrink-0 overflow-hidden"
                style={{ '--teacher-accent': tint, '--teacher-glow': `${tint}66` }}
              >
                <span
                  className="flex h-28 items-center justify-center"
                  style={{ background: `radial-gradient(circle at 50% 65%, ${tint}44, transparent 75%), #0a1330` }}
                >
                  <Icon size={44} style={{ color: tint }} aria-hidden="true" />
                </span>
                <span className="block px-3 py-2.5 text-center text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <aside aria-label="Tip of the day" className="card flex flex-col justify-center p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#9aa3bd] uppercase">
            Tip of the day <Lightbulb size={16} className="text-[#f5b942]" aria-hidden="true" />
          </h2>
          <p className="font-display mt-3 text-lg leading-relaxed">{tip.text}</p>
          <p className="mt-2 text-sm text-[#9aa3bd]">— {tip.author}</p>
        </aside>
      </div>

      {/* Upcoming challenges */}
      <section aria-label="Upcoming challenges" className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Upcoming challenges</h2>
          <Link to="/lab" className="link-muted flex items-center gap-1 text-sm font-medium">
            Open the lab <ArrowRight size={15} />
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                to="/lab"
                className="card card-hover flex items-center gap-3 px-4 py-3.5"
              >
                <Swords size={20} className="shrink-0 text-[#6ea8ff]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{challenge.title}</span>
                  <span className="block text-xs text-[#9aa3bd]">
                    {challenge.difficulty} · {challenge.xpReward} XP
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[#9aa3bd]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
