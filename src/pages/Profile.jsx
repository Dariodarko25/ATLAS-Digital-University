import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  Compass,
  Download,
  Flame,
  History,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  ScrollText,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { achievements, categories, courses, teachers, user } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { fetchProfile, friendlyProfileError, uploadAvatar, upsertProfile } from '../services/profile.js'
import { clearMemory, getMemory } from '../services/memory.js'
import {
  ENROLLED_KEY,
  ONBOARDING_KEY,
  PROGRESS_KEY,
  emptyProfile,
} from '../services/storage.js'

const achievementIcons = {
  flame: Flame,
  scroll: ScrollText,
  moon: Moon,
  sparkles: Sparkles,
}

const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

// Realistic sample learning history tied to real courses.
const sampleHistory = [
  { date: '2026-11-01', text: 'Completed “Plotting a Hohmann transfer” in Gravity: From Apples to Orbits', xp: 60 },
  { date: '2026-10-30', text: 'Completed “Quicksort, traced by hand” in Algorithms with Lyra', xp: 55 },
  { date: '2026-10-28', text: 'Completed “The derivative as a velocity” in Calculus of Motion', xp: 50 },
  { date: '2026-10-25', text: 'Passed the 500 kg truss load test in Bridges That Hold', xp: 80 },
  { date: '2026-10-22', text: 'Finished “Linear perspective study” in Renaissance: Art Meets Science', xp: 45 },
  { date: '2026-10-20', text: 'Unlocked achievement “Week of Fire” — 7-day streak', xp: 100 },
  { date: '2026-10-19', text: 'Completed “Osmosis lab visualization” in The Living Cell', xp: 50 },
]

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function Profile() {
  const [profile, setProfile] = useLocalStorage(ONBOARDING_KEY, emptyProfile)
  const [enrolled] = useLocalStorage(ENROLLED_KEY, [])
  const [progress, setProgress] = useLocalStorage(PROGRESS_KEY, {})
  const { user: authUser, signOut } = useAuth()

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftInterests, setDraftInterests] = useState([])
  const [remote, setRemote] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [memories, setMemories] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(null)
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!authUser) return
    let active = true
    fetchProfile(authUser.id)
      .then((row) => {
        if (active) setRemote(row)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser])

  useEffect(() => {
    // Logged-out visitors see the sign-in hint, never stale memory rows.
    if (!authUser) return
    let active = true
    Promise.all(
      teachers.map((t) =>
        getMemory(authUser.id, t.id)
          .then((row) => ({ teacherId: t.id, context: row?.context ?? null }))
          .catch(() => ({ teacherId: t.id, context: null })),
      ),
    ).then((rows) => {
      if (active) setMemories({ userId: authUser.id, rows })
    })
    return () => {
      active = false
    }
  }, [authUser])

  const displayName =
    profile?.name?.trim() ||
    remote?.display_name?.trim() ||
    authUser?.email?.split('@')[0] ||
    user.name
  const bio = remote?.bio?.trim() || ''
  const avatarUrl = remote?.avatar_url?.trim() || ''
  const shownInterests =
    profile?.interests?.length > 0
      ? profile.interests
      : remote?.interests?.length > 0
        ? remote.interests
        : user.interests
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const completedCourses = useMemo(
    () => courses.filter((c) => (progress[c.id] ?? 0) >= 100),
    [progress],
  )
  const unlocked = useMemo(
    () => achievements.filter((a) => a.unlockedAt !== null),
    [],
  )
  const xpPct = Math.min(100, Math.round((user.xp / user.xpToNextLevel) * 100))

  const history = useMemo(() => {
    const live = Object.entries(progress)
      .filter(([, pct]) => pct >= 100)
      .map(([courseId]) => ({
        date: '2026-11-02',
        text: `Finished all lessons in ${courseById[courseId]?.title ?? courseId}`,
        xp: 150,
      }))
    return [...live, ...sampleHistory]
  }, [progress])

  const stats = [
    { icon: Trophy, label: 'Level', value: String(user.level) },
    { icon: Zap, label: 'Total XP', value: user.xp.toLocaleString() },
    { icon: Flame, label: 'Day streak', value: String(user.streakDays) },
    { icon: BookOpen, label: 'Enrolled', value: String(enrolled.length) },
    { icon: CheckCircle2, label: 'Completed', value: String(completedCourses.length) },
    { icon: Award, label: 'Achievements', value: `${unlocked.length}/${achievements.length}` },
  ]

  const startEditing = () => {
    setDraftName(displayName)
    setDraftBio(remote?.bio ?? '')
    setDraftInterests(
      profile?.interests?.length > 0 ? profile.interests : (remote?.interests ?? []),
    )
    setEditing(true)
    setNotice('')
  }

  const toggleDraftInterest = (category) => {
    setDraftInterests((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const saveProfile = async () => {
    const next = draftName.trim()
    if (!next) {
      setNotice('Name cannot be empty.')
      return
    }
    setProfile((prev) => ({
      ...(prev ?? emptyProfile),
      name: next,
      interests: draftInterests,
      completedAt: prev?.completedAt || new Date().toISOString(),
    }))
    if (authUser) {
      try {
        const row = await upsertProfile({
          id: authUser.id,
          display_name: next,
          bio: draftBio.trim(),
          interests: draftInterests,
          goal: profile?.goal ?? '',
        })
        setRemote(row)
      } catch {
        setEditing(false)
        setNotice('Saved on this device; online sync failed.')
        return
      }
    }
    setEditing(false)
    setNotice('Profile updated.')
  }

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !authUser) return
    setUploading(true)
    try {
      const publicUrl = await uploadAvatar(authUser.id, file)
      const row = await upsertProfile({ id: authUser.id, avatar_url: publicUrl })
      setRemote(row)
      setNotice('Profile photo updated.')
    } catch (err) {
      setNotice(friendlyProfileError(err))
    } finally {
      setUploading(false)
    }
  }

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profile ?? emptyProfile,
      enrolled,
      progress,
      sample: { xp: user.xp, level: user.level, streakDays: user.streakDays },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'atlas-learning-data.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setNotice('Learning data downloaded as JSON.')
  }

  const clearTeacherMemory = async (teacherId, teacherName) => {
    if (!authUser) return
    try {
      await clearMemory(authUser.id, teacherId)
      setMemories((prev) =>
        prev ? { ...prev, rows: prev.rows.map((m) => (m.teacherId === teacherId ? { ...m, context: null } : m)) } : prev,
      )
      setNotice(`What ${teacherName} remembered about you was cleared. Your lessons are untouched.`)
    } catch {
      setNotice('Could not clear that memory. Please try again.')
    } finally {
      setConfirmingClear(null)
    }
  }

  const resetProgress = () => {
    setProgress({})
    try {
      window.localStorage.removeItem(ENROLLED_KEY)
      window.localStorage.removeItem(PROGRESS_KEY)
    } catch {
      // Storage unavailable: in-memory state is already cleared.
    }
    setConfirmingReset(false)
    setNotice('Enrollments and course progress were cleared.')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {notice && (
        <p role="status" className="card mb-5 border-[#22d3ee55] px-4 py-3 text-sm text-[#22d3ee]">
          {notice}
        </p>
      )}

      {/* Identity */}
      <section aria-label="Profile identity" className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="font-display flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {initials}
              </span>
            )}
            {authUser && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarFile}
                  className="hidden"
                  aria-label="Upload profile photo"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="link-muted flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50"
                >
                  <Camera size={13} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Photo'}
                </button>
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex max-w-md flex-col gap-3">
                <div>
                  <label htmlFor="display-name" className="text-xs font-semibold tracking-wide text-[#9aa3bd] uppercase">
                    Display name
                  </label>
                  <input
                    id="display-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveProfile()
                      if (e.key === 'Escape') setEditing(false)
                    }}
                    maxLength={40}
                    className="mt-1 w-full rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-3 py-2 text-sm text-white focus:border-[#6ea8ff88] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="text-xs font-semibold tracking-wide text-[#9aa3bd] uppercase">
                    Biography
                  </label>
                  <textarea
                    id="bio"
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    rows={3}
                    maxLength={300}
                    disabled={!authUser}
                    placeholder={authUser ? 'A few words about you…' : 'Sign in to add a biography'}
                    className="mt-1 w-full rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-3 py-2 text-sm text-white placeholder:text-[#9aa3bd88] focus:border-[#6ea8ff88] focus:outline-none disabled:opacity-60"
                  />
                </div>
                <fieldset>
                  <legend className="text-xs font-semibold tracking-wide text-[#9aa3bd] uppercase">
                    Academic interests
                  </legend>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const active = draftInterests.includes(category)
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleDraftInterest(category)}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'border-[#2e7bff] bg-[#2e7bff26] text-white'
                              : 'border-[#6ea8ff2e] text-[#9aa3bd] hover:border-[#6ea8ff66]'
                          }`}
                        >
                          {category}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
                <div className="flex gap-2">
                  <button onClick={saveProfile} className="btn-primary px-4 py-2 text-sm">
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    aria-label="Cancel editing profile"
                    className="rounded-[10px] border border-[#6ea8ff2e] px-3 py-2 text-[#9aa3bd] hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl">{displayName}</h1>
                <button
                  onClick={startEditing}
                  className="link-muted flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
                >
                  <Pencil size={14} aria-hidden="true" /> Edit
                </button>
              </div>
            )}
            <p className="mt-1 text-sm text-[#9aa3bd]">
              {user.handle} · <CalendarDays size={13} className="inline -mt-0.5" aria-hidden="true" /> Joined {formatDate(user.joinedAt)}
            </p>
            {bio && <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c6cddd]">{bio}</p>}
            {shownInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {shownInterests.map((interest) => (
                  <Link
                    key={interest}
                    to={`/explore?category=${encodeURIComponent(interest)}`}
                    className="rounded-full border border-[#6ea8ff2e] px-3 py-1 text-xs font-medium text-[#9aa3bd] hover:border-[#6ea8ff66] hover:text-white"
                  >
                    {interest}
                  </Link>
                ))}
              </div>
            )}
            {profile?.goal && (
              <p className="mt-2 text-sm text-[#9aa3bd]">
                Goal: <span className="text-white">{profile.goal}</span>
              </p>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={20} className="shrink-0 text-[#6ea8ff]" aria-hidden="true" />
              <div>
                <dt className="text-xs text-[#9aa3bd]">{label}</dt>
                <dd className="font-display text-xl leading-tight">{value}</dd>
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

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {/* Completed courses */}
        <section aria-label="Completed courses">
          <h2 className="font-display text-2xl">Completed courses</h2>
          {completedCourses.length === 0 ? (
            <div className="card mt-4 p-6">
              <p className="font-medium">No completed courses yet</p>
              <p className="mt-1 text-sm text-[#9aa3bd]">
                Finish every lesson in a course and it will earn its place here.
              </p>
              <Link
                to="/explore"
                className="btn-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <Compass size={15} aria-hidden="true" /> Find a course
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {completedCourses.map((c) => (
                <li key={c.id} className="card card-hover p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4ade80] uppercase">
                    <CheckCircle2 size={14} aria-hidden="true" /> Complete
                  </p>
                  <p className="mt-1 font-medium">{c.title}</p>
                  <p className="mt-0.5 text-sm text-[#9aa3bd]">
                    {c.category} · {c.lessons} lessons
                  </p>
                  <Link
                    to={`/classroom?course=${c.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#6ea8ff] hover:text-white"
                  >
                    Review lessons <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Achievements */}
        <section aria-label="Achievements">
          <h2 className="font-display text-2xl">Achievements</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {achievements.map((a) => {
              const Icon = achievementIcons[a.icon] ?? Award
              const isUnlocked = a.unlockedAt !== null
              return (
                <li
                  key={a.id}
                  className={`card p-4 ${isUnlocked ? '' : 'opacity-70'}`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isUnlocked
                        ? 'bg-[#2e7bff26] text-[#6ea8ff]'
                        : 'bg-[#6ea8ff14] text-[#9aa3bd]'
                    }`}
                  >
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-2.5 font-medium">{a.title}</p>
                  <p className="mt-0.5 text-sm text-[#9aa3bd]">{a.description}</p>
                  <p className="mt-1.5 text-xs text-[#9aa3bd]">
                    {isUnlocked ? `Unlocked ${formatDate(a.unlockedAt)}` : 'Locked — keep learning'}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* Learning history */}
      <section aria-label="Learning history" className="mt-10">
        <h2 className="font-display flex items-center gap-2 text-2xl">
          <History size={22} className="text-[#6ea8ff]" aria-hidden="true" /> Learning history
        </h2>
        <ul className="card mt-4 divide-y divide-[#6ea8ff14]">
          {history.map(({ date, text, xp }) => (
            <li
              key={`${date}-${text}`}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <span className="w-24 shrink-0 text-xs text-[#9aa3bd]">{formatDate(date)}</span>
              <p className="min-w-0 flex-1 text-sm">{text}</p>
              <span className="shrink-0 text-xs font-semibold text-[#22d3ee]">+{xp} XP</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Teacher memories */}
      <section aria-label="Teacher memories" className="mt-10">
        <h2 className="font-display text-2xl">What your teachers remember</h2>
        <p className="mt-1 text-sm text-[#9aa3bd]">
          Each teacher keeps a private summary of your progress — subjects studied, recent
          topics and difficulties. Clearing a memory never deletes your lessons.
        </p>
        {!authUser ? (
          <div className="card mt-4 p-6">
            <p className="text-sm text-[#9aa3bd]">
              Sign in to see what your teachers remember about you.
            </p>
          </div>
        ) : memories?.userId !== authUser.id ? (
          <div className="card mt-4 p-6">
            <p className="text-sm text-[#9aa3bd]">Loading memories…</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((t) => {
              const ctx = memories.rows.find((m) => m.teacherId === t.id)?.context
              const exchanges = ctx?.exchanges ?? 0
              const subjects = (ctx?.subjects_studied ?? []).filter(Boolean)
              const difficulties = ctx?.difficulties ?? []
              return (
                <li key={t.id} className="card p-4">
                  <p className="font-medium">{t.name}</p>
                  {exchanges === 0 ? (
                    <p className="mt-1 text-sm text-[#9aa3bd]">No memories saved yet.</p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-[#9aa3bd]">
                        {exchanges} exchange{exchanges === 1 ? '' : 's'}
                      </p>
                      {subjects.length > 0 && (
                        <p className="mt-1.5 text-sm">
                          <span className="text-[#9aa3bd]">Subjects: </span>
                          {subjects.join(', ')}
                        </p>
                      )}
                      {ctx?.last_topic && (
                        <p className="mt-1 text-sm">
                          <span className="text-[#9aa3bd]">Last topic: </span>
                          {ctx.last_topic}
                        </p>
                      )}
                      {difficulties.length > 0 && (
                        <p className="mt-1 text-sm">
                          <span className="text-[#9aa3bd]">Difficulties: </span>
                          {difficulties.length}
                        </p>
                      )}
                      {confirmingClear === t.id ? (
                        <span className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          <button
                            onClick={() => clearTeacherMemory(t.id, t.name)}
                            className="rounded-[10px] bg-[#ef4444] px-3 py-1.5 font-semibold text-white hover:bg-[#f87171]"
                          >
                            Yes, forget it
                          </button>
                          <button
                            onClick={() => setConfirmingClear(null)}
                            className="rounded-[10px] border border-[#6ea8ff2e] px-3 py-1.5 font-medium text-[#9aa3bd] hover:text-white"
                          >
                            Keep
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingClear(t.id)}
                          aria-label={`Clear what ${t.name} remembers`}
                          className="mt-3 flex items-center gap-1.5 rounded-[10px] border border-[#6ea8ff2e] px-3 py-1.5 text-sm font-medium text-[#9aa3bd] hover:text-white"
                        >
                          <Trash2 size={14} aria-hidden="true" /> Clear memory
                        </button>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Account */}
      <section aria-label="Account" className="card mt-10 p-5 sm:p-6">
        <h2 className="font-display text-xl">Account</h2>
        {authUser ? (
          <>
            <p className="mt-1 text-sm text-[#9aa3bd]">
              Signed in as <span className="text-white">{authUser.email}</span>
              {authUser.created_at && (
                <> · Member since {formatDate(authUser.created_at.slice(0, 10))}</>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => signOut().catch(() => setNotice('Sign out failed. Please try again.'))}
                className="flex items-center gap-1.5 rounded-[10px] border border-[#6ea8ff2e] px-4 py-2 text-sm font-medium text-[#9aa3bd] hover:text-white"
              >
                <LogOut size={15} aria-hidden="true" /> Sign out
              </button>
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-[10px] border border-[#6ea8ff2e] px-4 py-2 text-sm font-medium text-[#9aa3bd] hover:text-white"
              >
                Academic staff? Open admin
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-[#9aa3bd]">
              You are browsing as a guest. Sign in to sync your student profile.
            </p>
            <div className="mt-4">
              <Link to="/login" className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
                <LogIn size={15} aria-hidden="true" /> Sign in
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Data actions */}
      <section aria-label="Your data" className="card mt-10 p-5 sm:p-6">
        <h2 className="font-display text-xl">Your data</h2>
        <p className="mt-1 text-sm text-[#9aa3bd]">
          Your enrollments and progress live in this browser. Export a copy or start fresh.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={exportData}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Download size={15} aria-hidden="true" /> Export learning data
          </button>
          {confirmingReset ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#9aa3bd]">Clear enrollments and progress?</span>
              <button
                onClick={resetProgress}
                className="rounded-[10px] bg-[#ef4444] px-4 py-2 font-semibold text-white hover:bg-[#f87171]"
              >
                Yes, clear it
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-[10px] border border-[#6ea8ff2e] px-4 py-2 font-medium text-[#9aa3bd] hover:text-white"
              >
                Keep my data
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingReset(true)}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#6ea8ff2e] px-4 py-2 text-sm font-medium text-[#9aa3bd] hover:text-white"
            >
              <Trash2 size={15} aria-hidden="true" /> Reset progress
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
