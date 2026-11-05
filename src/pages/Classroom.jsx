import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Atom,
  Bot,
  CircuitBoard,
  Cpu,
  Download,
  History,
  Lightbulb,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Target,
  User,
  Volume2,
  VolumeX,
  ImagePlus,
  X,
} from 'lucide-react'
import AtomDisplay from '../components/AtomDisplay.jsx'
import AtlasAvatar3D from '../components/atlas3d/AtlasAvatar3D.jsx'
import StageErrorBoundary from '../components/atlas3d/StageErrorBoundary.jsx'
import TeacherAvatar from '../components/TeacherAvatar.jsx'
import { teachers } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import useAtlasVoice from '../hooks/useAtlasVoice.js'
import { askTeacher } from '../services/aiService.js'
import { diag } from '../services/diag.js'
import { classifyAtlasRequest } from '../services/imageIntent.js'
import {
  speakText,
  speechRecognitionSupported,
  stopSpeaking as cancelSpeechSynthesis,
} from '../services/voiceService.js'
import {
  appendMessages,
  createLesson,
  getLesson,
  getLessonMessages,
  listLessons,
} from '../services/lessons.js'
import { getMemory, recordExchange } from '../services/memory.js'
import { fetchProfile } from '../services/profile.js'
import { listInstitutions, listMyEnrollments, listSubjects } from '../services/academics.js'
import { getMyTranscript } from '../services/grades.js'

const TEACHER_ICONS = {
  orion: Atom,
  lyra: CircuitBoard,
  atlas: Cpu,
}

const SCREEN_META = {
  orion: { title: 'PHYSICS', chips: ['E = mc²', 'g = 9.8 m/s²'] },
  lyra: { title: 'COMPUTING', chips: ['O(log n)', '</> ship it'] },
  atlas: { title: 'ENGINEERING', chips: ['σ ≤ σmax', 'Δx → 0'] },
}

const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function greetingFor(teacherId, firstName = '') {
  const teacher = teachers.find((t) => t.id === teacherId) ?? teachers[0]
  // Atlas addresses a signed-in student by name; no profile name, no guess.
  const text =
    teacher.id === 'atlas' && firstName
      ? `Good to see you, ${firstName}. ${teacher.greeting}`
      : teacher.greeting
  return { teacherId: teacher.id, text }
}

function StatusPill({ status, accent, name }) {
  if (status === 'speaking') {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-[#22d3ee55] bg-[#0a1530cc] px-3.5 py-1.5 text-xs font-semibold text-[#22d3ee]"
        role="status"
      >
        <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="eq-bar w-1 rounded-full"
              style={{ height: '100%', backgroundColor: accent, animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </span>
        Speaking
      </span>
    )
  }
  if (status === 'hearing') {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-[#f8717155] bg-[#0a1530cc] px-3.5 py-1.5 text-xs font-semibold text-[#f87171]"
        role="status"
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f87171] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f87171]" />
        </span>
        Hearing you…
      </span>
    )
  }
  if (status === 'thinking' || status === 'creating') {
    const creating = status === 'creating'
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border bg-[#0a1530cc] px-3.5 py-1.5 text-xs font-semibold ${
          creating ? 'border-[#22d3ee55] text-[#22d3ee]' : 'border-[#f5b94255] text-[#f5b942]'
        }`}
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {creating ? `${name} is creating…` : `${name} is thinking…`}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-[#34d39955] bg-[#0a1530cc] px-3.5 py-1.5 text-xs font-semibold text-[#34d399]"
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#34d399]" />
      </span>
      Listening
    </span>
  )
}

export default function Classroom({ initialTeacherId, initialSubject = '', initialLessonId = null }) {
  const [searchParams, setSearchParams] = useSearchParams()
  // Deep link from the Journey subjects (?subject=CODE): the lesson is filed
  // under the subject code so per-subject counts stay real.
  const subjectCode = searchParams.get('subject')?.trim() || ''
  // The route wrapper keys this component by teacher and lesson, so each
  // teacher session is a fresh mount: no stale teacher, no stale conversation.
  const teacherId = initialTeacherId
  const { user: authUser } = useAuth()
  const [messages, setMessages] = useState(() => [
    { role: 'teacher', text: greetingFor(initialTeacherId).text },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [busyKind, setBusyKind] = useState('thinking')
  const [speaking, setSpeaking] = useState(false)
  const [pastLessons, setPastLessons] = useState([])
  const [studentName, setStudentName] = useState('')
  const [academic, setAcademic] = useState(null)
  const [sendError, setSendError] = useState('')
  const [voiceDraft, setVoiceDraft] = useState(null)
  const [voiceLang, setVoiceLang] = useState(() => {
    try {
      return window.localStorage.getItem('atlas-voice-lang') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [attachedImage, setAttachedImage] = useState(null)
  const [lastStats, setLastStats] = useState(null)
  const inputRef = useRef(null)
  const imageRef = useRef(null)
  const chatRef = useRef(null)
  const scrolledOnce = useRef(false)
  const lessonIdRef = useRef(initialLessonId)
  const restoredRef = useRef(false)
  const memoryRef = useRef(null)

  const teacher = useMemo(
    () => teachers.find((t) => t.id === teacherId) ?? teachers[0],
    [teacherId],
  )
  const TeacherIcon = TEACHER_ICONS[teacher.id] ?? Atom
  const voiceEnabled = teacher.id === 'atlas'
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  const { hearing, voiceNotice, toggleListening } = useAtlasVoice({
    enabled: voiceEnabled,
    lang: voiceLang,
    // Transcripts go to a review draft, never straight to send: the student
    // sees the exact recognized text and confirms or corrects it first.
    onTranscript: (text, isFinal) => {
      setVoiceDraft({ text, isFinal })
      if (isFinal) diag('voice.transcript', { text, lang: voiceLang })
    },
  })
  useEffect(() => {
    try {
      window.localStorage.setItem('atlas-voice-lang', voiceLang)
    } catch {
      // Private mode: the selector still works for this session.
    }
  }, [voiceLang])
  const status = speaking
    ? 'speaking'
    : hearing
      ? 'hearing'
      : typing
        ? busyKind
        : 'listening'
  const hasTeacherMessage = messages.some((m) => m.role === 'teacher')

  function stopSpeaking() {
    cancelSpeechSynthesis()
    setSpeaking(false)
  }

  function toggleMuted() {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (next) stopSpeaking()
  }

  function speakReply(text) {
    if (
      speakText(text, {
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      })
    ) {
      setSpeaking(true)
    }
  }

  useEffect(() => () => stopSpeaking(), [])

  function selectTeacher(id) {
    if (id === teacherId || typing) return
    stopSpeaking()
    setSearchParams({ teacher: id })
  }

  useEffect(() => {
    // Scroll the chat pane only (never the page), and not on first paint.
    if (!scrolledOnce.current) {
      scrolledOnce.current = true
      return
    }
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (!authUser || !initialLessonId || restoredRef.current) return
    restoredRef.current = true
    let active = true
    ;(async () => {
      try {
        const lesson = await getLesson(initialLessonId)
        if (!active || !lesson || lesson.teacher_id !== teacherId) return
        const loaded = await getLessonMessages(initialLessonId)
        if (!active || loaded.length === 0) return
        lessonIdRef.current = initialLessonId
        setMessages(loaded.map((m) => ({ role: m.role, text: m.text })))
      } catch {
        // History unavailable: fall through to the greeting, classroom still works.
      }
    })()
    return () => {
      active = false
    }
  }, [authUser, initialLessonId, teacherId])

  useEffect(() => {
    if (!authUser) return
    let active = true
    listLessons({ teacher_id: teacherId })
      .then((rows) => {
        if (active) setPastLessons(rows)
      })
      .catch(() => {})
    getMemory(authUser.id, teacherId)
      .then((row) => {
        if (active) memoryRef.current = row?.context ?? null
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser, teacherId])

  // The student's own display name, for the greeting and the Spark context.
  // Profile value only — never invented, never another student's.
  useEffect(() => {
    if (!authUser) return
    let active = true
    fetchProfile(authUser.id)
      .then((row) => {
        if (active) setStudentName(row?.display_name?.trim() ?? '')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser])

  // The student's current enrollment, for the Spark context and the header.
  // Optional: the classroom works exactly as before when there is none.
  useEffect(() => {
    if (!authUser || teacherId !== 'atlas') return
    let active = true
    ;(async () => {
      try {
        const [enrows, insts] = await Promise.all([listMyEnrollments(), listInstitutions()])
        const first = enrows[0]
        if (!active || !first) return
        const subs = await listSubjects(first.program_id, {
          year: first.current_year,
          semester: first.current_semester,
        }).catch(() => [])
        if (!active) return
        const inst = insts.find((i) => i.id === first.programs?.institution_id)
        // Real progress only: best published ratio per subject, nothing inferred.
        const rows = await getMyTranscript().catch(() => [])
        if (!active) return
        const best = {}
        const names = {}
        for (const row of rows) {
          const code = row.assessments?.subjects?.code
          const max = Number(row.assessments?.max_score ?? 0)
          if (!code || !(max > 0)) continue
          names[code] = row.assessments.subjects.name
          best[code] = Math.max(best[code] ?? 0, Number(row.score) / max)
        }
        setAcademic({
          institution: inst?.short_name || inst?.name || '',
          program: first.programs?.name || '',
          year: first.current_year,
          semester: first.current_semester,
          subjects: subs.map((s) => s.name).filter(Boolean).slice(0, 12),
          progress: {
            subjects_passed: Object.values(best).filter((r) => r >= 0.5).length,
            subjects_graded: Object.keys(best).length,
          },
          needs_work: Object.entries(best)
            .filter(([, r]) => r < 0.5)
            .map(([c]) => names[c] || c)
            .slice(0, 5),
        })
      } catch {
        // Academic context is optional; the chat works without it.
      }
    })()
    return () => {
      active = false
    }
  }, [authUser, teacherId])

  // Upgrade the pristine greeting once the name arrives. Never touches a
  // restored lesson, an in-progress conversation, or another teacher.
  useEffect(() => {
    if (!studentName || teacherId !== 'atlas') return
    if (restoredRef.current || lessonIdRef.current) return
    const firstName = studentName.split(/\s+/)[0]
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === 'teacher'
        ? [{ role: 'teacher', text: greetingFor(teacherId, firstName).text }]
        : prev,
    )
  }, [studentName, teacherId])

  async function persistExchange(learnerText, teacherText, { imageAttached = false, imageGenerated = false } = {}) {
    if (!authUser) return
    if (!lessonIdRef.current) {
      const lesson = await createLesson({
        student_id: authUser.id,
        teacher_id: teacherId,
        subject: subjectCode || initialSubject,
        title: learnerText.slice(0, 60) || 'Image question',
      })
      lessonIdRef.current = lesson.id
    }
    // Image bytes travel only on their own turn; history keeps text markers.
    const savedLearnerText = imageAttached ? `${learnerText}\n[Image attached]` : learnerText
    const savedTeacherText = imageGenerated ? `${teacherText}\n[Atlas generated an image]` : teacherText
    await appendMessages(lessonIdRef.current, [
      { role: 'learner', text: savedLearnerText },
      { role: 'teacher', text: savedTeacherText },
    ])
  }

  const MAX_IMAGE_BYTES = 2 * 1024 * 1024

  const onImageFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setSendError('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSendError('Image must be smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (attachedImage?.objectUrl) URL.revokeObjectURL(attachedImage.objectUrl)
      setAttachedImage({
        name: file.name,
        dataUrl: reader.result,
        objectUrl: URL.createObjectURL(file),
      })
      setSendError('')
    }
    reader.onerror = () => setSendError('Could not read the image file.')
    reader.readAsDataURL(file)
  }

  const clearAttachedImage = () => {
    if (attachedImage?.objectUrl) URL.revokeObjectURL(attachedImage.objectUrl)
    setAttachedImage(null)
  }

  const sendVoiceDraft = () => {
    if (!voiceDraft?.isFinal || typing) return
    const text = voiceDraft.text
    setVoiceDraft(null)
    send(text, { viaVoice: true })
  }

  const editVoiceDraft = () => {
    if (!voiceDraft) return
    const text = voiceDraft.text
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
    setVoiceDraft(null)
    inputRef.current?.focus()
  }

  function playLatest() {
    if (!synthSupported) return
    if (speaking) {
      stopSpeaking()
      return
    }
    const last = [...messages].reverse().find((m) => m.role === 'teacher')
    if (!last) return
    speakReply(last.text)
  }

  async function send(text, { viaVoice = false } = {}) {
    const message = text.trim()
    const image = teacher.id === 'atlas' ? attachedImage : null
    if ((!message && !image) || typing) return
    stopSpeaking()
    setVoiceDraft(null)
    const next = [
      ...messages,
      image ? { role: 'learner', text: message, imagePreview: image.objectUrl } : { role: 'learner', text: message },
    ]
    setMessages(next)
    setInput('')
    setSendError('')
    // Same classifier aiService routes on, so the loading label matches the path.
    const wantsImage =
      teacher.id === 'atlas' && classifyAtlasRequest(message, { hasImage: Boolean(image) }) === 'image'
    setBusyKind(wantsImage ? 'creating' : 'thinking')
    setTyping(true)
    diag('input.submitted', { text: message, viaVoice, hasImage: Boolean(image), imageGen: wantsImage })
    const history = next.map((m) => ({ role: m.role, text: m.text }))
    // The name and the academic context travel with the memory context but
    // are never stored in it: profiles and enrollments stay the sources.
    const modelContext =
      teacher.id === 'atlas'
        ? {
            ...(memoryRef.current ?? {}),
            ...(studentName ? { student_name: studentName } : null),
            ...(academic ? { academic: academic } : null),
          }
        : (memoryRef.current ?? null)
    let reply
    try {
      reply = await askTeacher(
        teacher.id,
        message,
        history,
        modelContext,
        image ? { dataUrl: image.dataUrl } : null,
      )
    } catch (err) {
      // Atlas is live with no simulated fallback: roll the turn back so the
      // question is preserved for retry and history keeps complete exchanges.
      // Either pipeline can fail without disabling the other: all busy state
      // resets here, and the next send reclassifies from scratch.
      setMessages(messages)
      setTyping(false)
      setBusyKind('thinking')
      setInput(message)
      setSendError(err?.message || 'Atlas could not answer right now. Please try again.')
      return
    }
    try {
      setMessages([
        ...next,
        reply.imageUrl
          ? { role: 'teacher', text: reply.text, imageUrl: reply.imageUrl }
          : { role: 'teacher', text: reply.text },
      ])
      setLastStats({
        latencyMs: reply.latencyMs ?? null,
        turns: history.length,
        tokens: reply.usage?.total_tokens ?? null,
      })
      if (image) clearAttachedImage()
      if (viaVoice && !mutedRef.current) speakReply(reply.text)
      try {
        await persistExchange(message, reply.text, {
          imageAttached: Boolean(image),
          imageGenerated: Boolean(reply.imageUrl),
        })
        if (authUser) {
          const saved = await recordExchange(authUser.id, teacher.id, {
            subject: initialSubject,
            learnerText: message,
          }).catch(() => null)
          if (saved?.context) memoryRef.current = saved.context
        }
      } catch {
        // Offline or history unavailable: the conversation still works.
      }
    } finally {
      setTyping(false)
      setBusyKind('thinking')
    }
  }

  // The open lesson (if any) always equals the ?lesson= param: auto-created
  // lessons never appear in the mount-time list, so the prop excludes exactly.
  const visiblePastLessons = pastLessons.filter((l) => l.id !== initialLessonId)

  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <header className="animate-enter mb-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">AI Classroom</h1>
        <p className="mt-1 text-sm text-muted-ink">
          Learn face to face with your virtual teachers.
        </p>
      </header>

      {/* Teacher selector */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Choose a teacher">
        {teachers.map((t) => {
          const Icon = TEACHER_ICONS[t.id] ?? Atom
          const active = t.id === teacher.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => selectTeacher(t.id)}
              className="card teacher-card flex cursor-pointer items-center gap-3 p-4 text-left"
              style={
                active
                  ? { borderColor: t.accent, boxShadow: `0 0 24px -6px ${t.glow}` }
                  : { '--teacher-accent': t.accent, '--teacher-glow': t.glow }
              }
            >
              <TeacherAvatar teacher={t} size="sm" animated={false} ring={active} className="shrink-0" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: t.accent }} />
                  {t.name}
                </span>
                <span className="block truncate text-xs text-muted-ink">{t.field}</span>
                <span className="block truncate text-xs text-muted-ink italic">{t.tagline}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Avatar stage */}
          {/* translate="no": page auto-translators rewrite text nodes into <font>
              wrappers, which breaks React reconciliation (insertBefore crash) in
              this live-updating region. Static page content stays translatable. */}
          <section
            className="classroom-hall card notranslate relative overflow-hidden p-6 sm:p-8"
            aria-label="Teacher stage"
            translate="no"
          >
            <div aria-hidden="true" className="hall-column left-0" />
            <div aria-hidden="true" className="hall-column right-0" />
            <div aria-hidden="true" className="absolute top-4 right-4 bottom-4 hidden w-[42%] lg:block">
              <div className="wall-screen flex h-full flex-col p-4">
                <div
                  className="flex items-center justify-between text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: teacher.accent }}
                >
                  <span>{(SCREEN_META[teacher.id] ?? SCREEN_META.orion).title}</span>
                  <span className="live-dot" />
                </div>
                <div className="min-h-0 flex-1">
                  <AtomDisplay accent={teacher.accent} className="mx-auto h-full w-auto max-w-full" />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-[10px] font-medium text-[#9fd8ff]">
                  {(SCREEN_META[teacher.id] ?? SCREEN_META.orion).chips.map((chip) => (
                    <span key={chip} className="rounded-md border border-[#6ea8ff33] bg-[#0a153088] px-2 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="readability-shade opacity-60" />
            <div
              className={
                teacher.id === 'atlas'
                  ? 'relative z-10 flex flex-col items-center gap-2 text-center'
                  : 'relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left'
              }
            >
              {teacher.id === 'atlas' ? (
                <StageErrorBoundary
                  key={teacher.id}
                  fallback={
                    <TeacherAvatar teacher={teacher} size="xl" animated={false} className="shrink-0" />
                  }
                >
                  <AtlasAvatar3D teacher={teacher} speaking={speaking} />
                </StageErrorBoundary>
              ) : (
                <TeacherAvatar
                  key={teacher.id}
                  teacher={teacher}
                  size="xl"
                  className="animate-enter shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <StatusPill status={status} accent={teacher.accent} name={teacher.shortName} />
                <h2 className="font-display mt-3 text-3xl font-bold">{teacher.name}</h2>
                <p className="mt-1 text-sm font-medium" style={{ color: teacher.accent }}>
                  {teacher.field} · {teacher.subjects.join(' · ')}
                </p>
                {teacher.id === 'atlas' && academic?.program && (
                  <p className="mt-1 text-xs text-muted-ink">
                    {academic.program} · {academic.year}.º ano · {academic.semester}.º semestre
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-muted-ink italic">{teacher.persona}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={playLatest}
                    disabled={typing || !hasTeacherMessage || !synthSupported}
                    title={
                      !synthSupported
                        ? 'Voice playback is not supported in this browser'
                        : speaking
                          ? 'Stop voice playback'
                          : 'Listen to the latest reply'
                    }
                    className="btn-ghost flex cursor-pointer items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {speaking ? <Square size={15} /> : <Volume2 size={15} />}
                    {speaking ? 'Stop' : 'Listen'}
                  </button>
                  {voiceEnabled && speechRecognitionSupported() ? (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={typing}
                      title={hearing ? 'Stop listening' : 'Ask with your voice'}
                      aria-label={hearing ? 'Stop listening' : 'Ask with your voice'}
                      aria-pressed={hearing}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                        hearing
                          ? 'border-[#f8717166] bg-[#f871711a] text-[#f87171]'
                          : 'btn-ghost'
                      }`}
                    >
                      <Mic size={15} />
                      {hearing ? 'Stop' : 'Speak'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={
                        voiceEnabled
                          ? 'Voice input is not supported in this browser'
                          : 'Voice input is not implemented yet'
                      }
                      aria-label="Voice input (not available)"
                      className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-4 py-2 text-sm text-muted-ink opacity-60"
                    >
                      <Mic size={15} />
                      Speak
                    </button>
                  )}
                  {voiceEnabled && speechRecognitionSupported() && (
                    <select
                      value={voiceLang}
                      onChange={(e) => setVoiceLang(e.target.value)}
                      aria-label="Voice input language"
                      title="Voice input language"
                      className="cursor-pointer rounded-xl border border-white/10 bg-navy-950 px-3 py-2 text-sm text-muted-ink outline-none hover:border-electric/50"
                    >
                      <option value="auto">Auto</option>
                      <option value="pt-PT">Português</option>
                      <option value="en-US">English</option>
                    </select>
                  )}
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={toggleMuted}
                      disabled={!synthSupported}
                      title={muted ? 'Unmute Atlas voice' : 'Mute Atlas voice'}
                      aria-label={muted ? 'Unmute Atlas voice' : 'Mute Atlas voice'}
                      aria-pressed={muted}
                      className="btn-ghost flex cursor-pointer items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      {muted ? 'Unmute' : 'Mute'}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-ink">
                  {voiceEnabled
                    ? speechRecognitionSupported()
                      ? 'Speak or type — both work with Atlas.'
                      : 'Voice input is not supported in this browser — typing works today.'
                    : 'Voice input is coming soon — typing works today.'}
                </p>
                {voiceEnabled && voiceNotice && (
                  <p role="status" className="mt-1 text-xs text-[#f5b942]">
                    {voiceNotice}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Conversation */}
          {/* translate="no": chat messages mount/update constantly; keep
              auto-translators from mutating these React-managed nodes. */}
          <section
            className="card notranslate flex min-h-[24rem] flex-col p-4 sm:p-5"
            aria-label="Conversation"
            translate="no"
          >
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <TeacherAvatar teacher={teacher} size="xs" animated={false} ring={false} />
              <div>
                <p className="font-semibold">{teacher.name}</p>
                <p className="text-xs text-muted-ink">{teacher.subjects.join(' · ')}</p>
              </div>
              <TeacherIcon className="ml-auto h-5 w-5" style={{ color: teacher.accent }} />
            </div>

            <div ref={chatRef} className="flex max-h-[24rem] flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${m.role === 'learner' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'teacher' && (
                    <Bot className="mt-1 h-4 w-4 shrink-0" style={{ color: teacher.accent }} />
                  )}
                  {m.role === 'learner' && m.imagePreview && (
                    <img
                      src={m.imagePreview}
                      alt="Attached"
                      className="max-h-24 max-w-[40%] self-center rounded-xl border border-white/10 object-cover"
                    />
                  )}
                  {m.role === 'teacher' && m.imageUrl ? (
                    <div className="max-w-[85%]">
                      <img
                        src={m.imageUrl}
                        alt="Generated image"
                        className="max-h-64 w-auto rounded-xl border border-white/10 object-contain"
                      />
                      <a
                        href={m.imageUrl}
                        download={m.imageUrl.startsWith('data:image/jpeg') ? 'atlas-image.jpg' : 'atlas-image.png'}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-electric-soft hover:text-white"
                      >
                        <Download size={13} aria-hidden="true" />
                        Download image
                      </a>
                      <p className="mt-1.5 rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-sm leading-relaxed text-parchment">
                        {m.text}
                      </p>
                    </div>
                  ) : (
                    <p
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === 'learner'
                          ? 'bg-electric text-white'
                          : 'border border-white/10 bg-navy-800 text-parchment'
                      }`}
                    >
                      {m.text}
                    </p>
                  )}
                  {m.role === 'learner' && <User className="mt-1 h-4 w-4 shrink-0 text-muted-ink" />}
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-2 text-sm text-muted-ink">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: teacher.accent }} />
                  {busyKind === 'creating' ? `${teacher.shortName} is creating…` : `${teacher.shortName} is thinking…`}
                </div>
              )}
            </div>

            {/* Suggested questions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {teacher.questions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={typing}
                  className="cursor-pointer rounded-full border border-white/10 bg-navy-800 px-3 py-1.5 text-xs text-electric-soft transition hover:border-electric/50 disabled:cursor-wait disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Image preview */}
            {attachedImage && teacher.id === 'atlas' && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-navy-950 p-2">
                <img
                  src={attachedImage.objectUrl}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-ink">
                  {attachedImage.name}
                </span>
                <button
                  type="button"
                  onClick={clearAttachedImage}
                  aria-label="Remove attached image"
                  className="rounded-lg border border-[#6ea8ff2e] p-1.5 text-[#9aa3bd] hover:text-white"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Input */}
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              {teacher.id === 'atlas' && (
                <>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/*"
                    onChange={onImageFile}
                    className="hidden"
                    aria-label="Attach an image"
                  />
                  <button
                    type="button"
                    onClick={() => imageRef.current?.click()}
                    disabled={typing}
                    title="Attach an image"
                    aria-label="Attach an image"
                    className="rounded-lg border border-white/10 bg-navy-950 px-3 text-muted-ink transition hover:border-electric/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImagePlus size={17} aria-hidden="true" />
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${teacher.shortName} anything…`}
                aria-label="Message"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-navy-950 px-3 py-2.5 text-sm outline-none placeholder:text-muted-ink/70 focus:border-electric"
              />
              <button
                type="submit"
                disabled={typing || (!input.trim() && !attachedImage)}
                className="btn-primary flex cursor-pointer items-center gap-1.5 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            {voiceDraft && (
              <div
                role="group"
                aria-label="Review voice transcript"
                className="mt-2 rounded-lg border border-[#6ea8ff33] bg-navy-950 p-3"
              >
                <p className="text-xs text-[#9aa3bd]">
                  {voiceDraft.isFinal ? 'Heard:' : 'Listening…'}
                </p>
                <p className="mt-0.5 text-sm">“{voiceDraft.text || '…'}”</p>
                {voiceDraft.isFinal && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={sendVoiceDraft}
                      disabled={typing}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      Send it
                    </button>
                    <button
                      type="button"
                      onClick={editVoiceDraft}
                      className="rounded-[10px] border border-[#6ea8ff2e] px-3 py-1.5 text-xs font-medium text-[#9aa3bd] hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceDraft(null)}
                      className="rounded-[10px] border border-[#6ea8ff2e] px-3 py-1.5 text-xs font-medium text-[#9aa3bd] hover:text-white"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )}
            {sendError && (
              <p role="alert" className="mt-2 text-xs text-[#f87171]">
                {sendError}
              </p>
            )}
            {lastStats && (
              <p className="mt-2 text-[11px] text-muted-ink">
                Last reply: {lastStats.latencyMs != null ? `${(lastStats.latencyMs / 1000).toFixed(1)}s` : '—'}
                {` · ${lastStats.turns} turns`}
                {lastStats.tokens != null && ` · ${lastStats.tokens.toLocaleString()} tokens`}
              </p>
            )}
          </section>
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4" aria-label="Teacher details">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-spark" />
              Specialization
            </h2>
            <p className="mt-2 text-sm text-muted-ink">{teacher.field}</p>
            <p className="mt-2 text-sm leading-relaxed italic">{teacher.persona}</p>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Target className="h-4 w-4 text-pulse" />
              Learning objectives
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-ink">
              {teacher.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4 text-electric-soft" />
              How {teacher.shortName} teaches
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-ink">{teacher.explanation}</p>
            <h3 className="mt-4 text-sm font-semibold">Try this exercise</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-ink">{teacher.exercise}</p>
          </div>
        </aside>
      </div>

      {authUser && visiblePastLessons.length > 0 && (
        <section aria-label={`Past lessons with ${teacher.name}`} className="card mt-6 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4 text-electric-soft" aria-hidden="true" />
            Past lessons with {teacher.name}
          </h2>
          <ul className="mt-3 space-y-2">
            {visiblePastLessons.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/classroom?teacher=${teacher.id}&lesson=${l.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm transition hover:border-electric/50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {l.title || 'Untitled lesson'}
                  </span>
                  {l.subject && (
                    <span className="shrink-0 text-xs text-muted-ink">{l.subject}</span>
                  )}
                  <span className="shrink-0 text-xs text-muted-ink">
                    {new Date(l.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
