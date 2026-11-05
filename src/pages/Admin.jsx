import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { listInstitutions, listPrograms, listSubjects } from '../services/academics.js'
import {
  deleteGrade,
  listGradesForAssessment,
  listProgramRoster,
  saveGrade,
} from '../services/grades.js'
import {
  createAssessment,
  createDepartment,
  createFaculty,
  createProgram,
  createSlot,
  createSubject,
  deleteAssessment,
  deleteDepartment,
  deleteFaculty,
  deleteProgram,
  deleteSlot,
  deleteSubject,
  getMyStaffRoles,
  listAssessments,
  listDepartments,
  listFaculties,
  listSlots,
  updateSubject,
} from '../services/staff.js'

const inputCls =
  'rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-2 py-1.5 text-sm text-white outline-none'
const btnCls = 'btn-primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50'

function DeleteButton({ onDelete, label = 'Delete' }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-[#6ea8ff2e] px-2 py-1 text-xs text-[#9aa3bd] hover:text-white"
      >
        {label}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setConfirming(false)
          onDelete()
        }}
        className="rounded-lg bg-[#ef4444] px-2 py-1 text-xs font-semibold text-white"
      >
        Sure?
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-[#6ea8ff2e] px-2 py-1 text-xs text-[#9aa3bd]"
      >
        No
      </button>
    </span>
  )
}

const TABS = [
  { id: 'structure', label: 'Structure' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'grades', label: 'Grades' },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Admin() {
  const { user: authUser } = useAuth()
  const [roles, setRoles] = useState(null)
  const [institutions, setInstitutions] = useState([])
  const [institutionId, setInstitutionId] = useState('')
  const [tab, setTab] = useState('structure')
  const [notice, setNotice] = useState('')

  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [programs, setPrograms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [facultyId, setFacultyId] = useState('')
  const [programId, setProgramId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [slots, setSlots] = useState([])
  const [assessments, setAssessments] = useState([])
  const [roster, setRoster] = useState([])
  const [gradeRows, setGradeRows] = useState([])
  const [drafts, setDrafts] = useState({})
  const [syllabusEdits, setSyllabusEdits] = useState({})

  const [fName, setFName] = useState('')
  const [dName, setDName] = useState('')
  const [pName, setPName] = useState('')
  const [pField, setPField] = useState('')
  const [pYears, setPYears] = useState(3)
  const [sName, setSName] = useState('')
  const [sCode, setSCode] = useState('')
  const [sYear, setSYear] = useState(1)
  const [sSem, setSSem] = useState(1)
  const [sSyllabus, setSSyllabus] = useState('')
  const [sDept, setSDept] = useState('')
  const [tDay, setTDay] = useState(1)
  const [tStart, setTStart] = useState('09:00')
  const [tEnd, setTEnd] = useState('11:00')
  const [tRoom, setTRoom] = useState('')
  const [tKind, setTKind] = useState('class')
  const [aTitle, setATitle] = useState('')
  const [aKind, setAKind] = useState('test')
  const [aDue, setADue] = useState('')
  const [aMax, setAMax] = useState(20)

  useEffect(() => {
    if (!authUser) {
      setRoles([])
      return
    }
    let active = true
    getMyStaffRoles()
      .then((rows) => {
        if (active) setRoles(rows)
      })
      .catch(() => {
        if (active) setRoles([])
      })
    listInstitutions()
      .then((rows) => {
        if (active) setInstitutions(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [authUser])

  const myInstitutions = institutions.filter((i) => roles?.some((r) => r.institution_id === i.id))
  const myRole = roles?.find((r) => r.institution_id === institutionId)?.role ?? null
  const isAdmin = myRole === 'admin'

  async function refreshStructure(instId) {
    const [f, p] = await Promise.all([listFaculties(instId), listPrograms(instId)])
    setFaculties(f)
    setPrograms(p)
    setFacultyId((prev) => (f.some((x) => x.id === prev) ? prev : (f[0]?.id ?? '')))
    setProgramId((prev) => (p.some((x) => x.id === prev) ? prev : (p[0]?.id ?? '')))
  }

  useEffect(() => {
    if (!institutionId) return
    refreshStructure(institutionId).catch(() => setNotice('Could not load academic structure.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId])

  useEffect(() => {
    if (!facultyId) {
      setDepartments([])
      return
    }
    listDepartments(facultyId)
      .then(setDepartments)
      .catch(() => {})
  }, [facultyId])

  useEffect(() => {
    if (!programId) {
      setSubjects([])
      return
    }
    listSubjects(programId)
      .then((rows) => {
        setSubjects(rows)
        setSubjectId((prev) => (rows.some((x) => x.id === prev) ? prev : (rows[0]?.id ?? '')))
      })
      .catch(() => {})
  }, [programId])

  useEffect(() => {
    if (!subjectId) {
      setSlots([])
      setAssessments([])
      return
    }
    listSlots(subjectId)
      .then(setSlots)
      .catch(() => {})
    listAssessments(subjectId)
      .then((rows) => {
        setAssessments(rows)
        setAssessmentId((prev) => (rows.some((x) => x.id === prev) ? prev : (rows[0]?.id ?? '')))
      })
      .catch(() => {})
  }, [subjectId])

  useEffect(() => {
    if (!assessmentId || !programId) {
      setRoster([])
      setGradeRows([])
      return
    }
    Promise.all([listProgramRoster(programId), listGradesForAssessment(assessmentId)])
      .then(([r, g]) => {
        setRoster(r)
        setGradeRows(g)
        const prefill = {}
        for (const row of g) prefill[row.student_id] = String(row.score)
        setDrafts(prefill)
      })
      .catch(() => setNotice('Could not load grade roster.'))
  }, [assessmentId, programId])

  async function run(action, okMsg) {
    setNotice('')
    try {
      await action()
      setNotice(okMsg)
    } catch (err) {
      setNotice(err?.message || 'Action failed.')
    }
  }

  if (!authUser || roles === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-[#9aa3bd]">Loading…</p>
      </div>
    )
  }
  if (roles.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="card p-6">
          <p className="flex items-center gap-2 font-medium">
            <ShieldAlert size={18} className="text-[#f5b942]" aria-hidden="true" /> No staff access
          </p>
          <p className="mt-1 text-sm text-[#9aa3bd]">
            This console is for academic staff. Students continue on the{' '}
            <Link to="/journey" className="text-[#6ea8ff] hover:text-white">
              Journey
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  const gradeByStudent = Object.fromEntries(gradeRows.map((g) => [g.student_id, g]))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl">Academic admin</h1>
      <div className="mt-3 flex max-w-md flex-col gap-1 text-xs text-[#9aa3bd]">
        Institution
        <select
          value={institutionId}
          onChange={(e) => setInstitutionId(e.target.value)}
          className={`${inputCls} text-sm`}
          aria-label="Admin institution"
        >
          <option value="">Select…</option>
          {myInstitutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.short_name || i.name} ({roles.find((r) => r.institution_id === i.id)?.role})
            </option>
          ))}
        </select>
      </div>
      {notice && (
        <p role="status" className="card mt-4 border-[#22d3ee55] px-4 py-3 text-sm text-[#22d3ee]">
          {notice}
        </p>
      )}
      {institutionId && (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  tab === t.id
                    ? 'border-[#2e7bff] bg-[#2e7bff26] text-white'
                    : 'border-[#6ea8ff2e] text-[#9aa3bd] hover:border-[#6ea8ff66]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'structure' && !isAdmin && (
            <p className="mt-4 text-sm text-[#9aa3bd]">
              Structure management needs the admin role. Teaching tabs remain available.
            </p>
          )}
          {tab === 'structure' && isAdmin && (
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              <section aria-label="Faculties" className="card p-4">
                <h2 className="font-medium">Faculties</h2>
                <ul className="mt-2 space-y-2">
                  {faculties.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <DeleteButton
                        onDelete={() =>
                          run(async () => {
                            await deleteFaculty(f.id)
                            await refreshStructure(institutionId)
                          }, 'Faculty deleted.')
                        }
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="New faculty name"
                    aria-label="New faculty name"
                    className={`${inputCls} min-w-0 flex-1`}
                  />
                  <button
                    disabled={!fName.trim()}
                    onClick={() =>
                      run(async () => {
                        await createFaculty({ institution_id: institutionId, name: fName })
                        setFName('')
                        await refreshStructure(institutionId)
                      }, 'Faculty created.')
                    }
                    className={btnCls}
                  >
                    Add
                  </button>
                </div>
              </section>

              <section aria-label="Departments" className="card p-4">
                <h2 className="font-medium">Departments</h2>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className={`${inputCls} mt-2 w-full`}
                  aria-label="Department faculty"
                >
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <ul className="mt-2 space-y-2">
                  {departments.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                      <DeleteButton
                        onDelete={() =>
                          run(async () => {
                            await deleteDepartment(d.id)
                            setDepartments(await listDepartments(facultyId))
                          }, 'Department deleted.')
                        }
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    placeholder="New department name"
                    aria-label="New department name"
                    className={`${inputCls} min-w-0 flex-1`}
                  />
                  <button
                    disabled={!dName.trim() || !facultyId}
                    onClick={() =>
                      run(async () => {
                        await createDepartment({ faculty_id: facultyId, name: dName })
                        setDName('')
                        setDepartments(await listDepartments(facultyId))
                      }, 'Department created.')
                    }
                    className={btnCls}
                  >
                    Add
                  </button>
                </div>
              </section>

              <section aria-label="Programs" className="card p-4">
                <h2 className="font-medium">Courses</h2>
                <ul className="mt-2 space-y-2">
                  {programs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {p.name} <span className="text-xs text-[#9aa3bd]">· {p.duration_years}y</span>
                      </span>
                      <DeleteButton
                        onDelete={() =>
                          run(async () => {
                            await deleteProgram(p.id)
                            await refreshStructure(institutionId)
                          }, 'Course deleted.')
                        }
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="New course name"
                    aria-label="New course name"
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <input
                      value={pField}
                      onChange={(e) => setPField(e.target.value)}
                      placeholder="Field"
                      aria-label="Course field"
                      className={`${inputCls} min-w-0 flex-1`}
                    />
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={pYears}
                      onChange={(e) => setPYears(Number(e.target.value))}
                      aria-label="Duration in years"
                      className={`${inputCls} w-16`}
                    />
                  </div>
                  <button
                    disabled={!pName.trim()}
                    onClick={() =>
                      run(async () => {
                        await createProgram({
                          institution_id: institutionId,
                          name: pName,
                          field: pField,
                          duration_years: pYears,
                          faculty_id: facultyId || null,
                        })
                        setPName('')
                        setPField('')
                        await refreshStructure(institutionId)
                      }, 'Course created.')
                    }
                    className={btnCls}
                  >
                    Add course
                  </button>
                </div>
              </section>
            </div>
          )}

          {tab === 'subjects' && (
            <section aria-label="Subjects" className="card mt-4 p-4">
              <h2 className="font-medium">Subjects {isAdmin ? '' : '(read-only: admins manage subjects)'}</h2>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className={`${inputCls} mt-2 w-full max-w-md`}
                aria-label="Subject course"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ul className="mt-3 space-y-3">
                {subjects.map((s) => (
                  <li key={s.id} className="rounded-xl border border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {s.name} <span className="text-xs text-[#9aa3bd]">· {s.code} · Y{s.year} S{s.semester}</span>
                      </p>
                      {isAdmin && (
                        <DeleteButton
                          onDelete={() =>
                            run(async () => {
                              await deleteSubject(s.id)
                              setSubjects(await listSubjects(programId))
                            }, 'Subject deleted.')
                          }
                        />
                      )}
                    </div>
                    {isAdmin &&
                      (syllabusEdits[s.id] !== undefined ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <textarea
                            value={syllabusEdits[s.id]}
                            onChange={(e) =>
                              setSyllabusEdits((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            rows={3}
                            aria-label={`Syllabus for ${s.name}`}
                            className={inputCls}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                run(async () => {
                                  await updateSubject(s.id, { syllabus: syllabusEdits[s.id] })
                                  setSubjects(await listSubjects(programId))
                                  setSyllabusEdits((prev) => {
                                    const next = { ...prev }
                                    delete next[s.id]
                                    return next
                                  })
                                }, 'Syllabus saved.')
                              }
                              className={btnCls}
                            >
                              Save syllabus
                            </button>
                            <button
                              onClick={() =>
                                setSyllabusEdits((prev) => {
                                  const next = { ...prev }
                                  delete next[s.id]
                                  return next
                                })
                              }
                              className="rounded-[10px] border border-[#6ea8ff2e] px-3 py-1.5 text-sm text-[#9aa3bd]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-start justify-between gap-2">
                          <p className="text-xs whitespace-pre-line text-[#9aa3bd]">
                            {s.syllabus || 'No syllabus yet.'}
                          </p>
                          <button
                            onClick={() => setSyllabusEdits((prev) => ({ ...prev, [s.id]: s.syllabus || '' }))}
                            className="shrink-0 rounded-lg border border-[#6ea8ff2e] px-2 py-1 text-xs text-[#9aa3bd] hover:text-white"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <div className="mt-3 grid max-w-2xl gap-2">
                  <div className="flex gap-2">
                    <input
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder="Subject name"
                      aria-label="New subject name"
                      className={`${inputCls} min-w-0 flex-1`}
                    />
                    <input
                      value={sCode}
                      onChange={(e) => setSCode(e.target.value)}
                      placeholder="Code"
                      aria-label="New subject code"
                      className={`${inputCls} w-24`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs text-[#9aa3bd]">
                      Year
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={sYear}
                        onChange={(e) => setSYear(Number(e.target.value))}
                        aria-label="Subject year"
                        className={`${inputCls} w-16`}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-[#9aa3bd]">
                      Semester
                      <select
                        value={sSem}
                        onChange={(e) => setSSem(Number(e.target.value))}
                        aria-label="Subject semester"
                        className={inputCls}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </label>
                    <select
                      value={sDept}
                      onChange={(e) => setSDept(e.target.value)}
                      aria-label="Subject department"
                      className={`${inputCls} min-w-0 flex-1`}
                    >
                      <option value="">No department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={sSyllabus}
                    onChange={(e) => setSSyllabus(e.target.value)}
                    placeholder="Syllabus and contents"
                    aria-label="New subject syllabus"
                    rows={2}
                    className={inputCls}
                  />
                  <button
                    disabled={!sName.trim() || !programId}
                    onClick={() =>
                      run(async () => {
                        await createSubject({
                          program_id: programId,
                          name: sName,
                          code: sCode,
                          year: sYear,
                          semester: sSem,
                          syllabus: sSyllabus,
                          department_id: sDept || null,
                        })
                        setSName('')
                        setSCode('')
                        setSSyllabus('')
                        setSubjects(await listSubjects(programId))
                      }, 'Subject created.')
                    }
                    className={`${btnCls} justify-self-start`}
                  >
                    Add subject
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === 'timetable' && (
            <section aria-label="Timetable" className="card mt-4 p-4">
              <h2 className="font-medium">Timetable</h2>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${inputCls} mt-2 w-full max-w-md`}
                aria-label="Timetable subject"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
              <ul className="mt-3 space-y-2">
                {slots.map((sl) => (
                  <li key={sl.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {WEEKDAYS[sl.weekday]} {String(sl.start_time).slice(0, 5)}–{String(sl.end_time).slice(0, 5)}
                      <span className="text-xs text-[#9aa3bd]">
                        {' '}· {sl.kind}
                        {sl.room && ` · ${sl.room}`}
                      </span>
                    </span>
                    <DeleteButton
                      onDelete={() =>
                        run(async () => {
                          await deleteSlot(sl.id)
                          setSlots(await listSlots(subjectId))
                        }, 'Slot deleted.')
                      }
                    />
                  </li>
                ))}
                {slots.length === 0 && (
                  <li className="text-sm text-[#9aa3bd]">No slots for this subject yet.</li>
                )}
              </ul>
              <div className="mt-3 flex max-w-2xl flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Day
                  <select value={tDay} onChange={(e) => setTDay(Number(e.target.value))} aria-label="Slot day" className={inputCls}>
                    {WEEKDAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Start
                  <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} aria-label="Slot start" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  End
                  <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} aria-label="Slot end" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Room
                  <input value={tRoom} onChange={(e) => setTRoom(e.target.value)} placeholder="B-201" aria-label="Slot room" className={`${inputCls} w-24`} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Kind
                  <select value={tKind} onChange={(e) => setTKind(e.target.value)} aria-label="Slot kind" className={inputCls}>
                    <option value="class">Class</option>
                    <option value="lab">Lab</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </label>
                <button
                  disabled={!subjectId}
                  onClick={() =>
                    run(async () => {
                      await createSlot({ subject_id: subjectId, weekday: tDay, start_time: tStart, end_time: tEnd, room: tRoom, kind: tKind })
                      setSlots(await listSlots(subjectId))
                    }, 'Slot added.')
                  }
                  className={btnCls}
                >
                  Add slot
                </button>
              </div>
            </section>
          )}

          {tab === 'assessments' && (
            <section aria-label="Assessments" className="card mt-4 p-4">
              <h2 className="font-medium">Assessments</h2>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${inputCls} mt-2 w-full max-w-md`}
                aria-label="Assessment subject"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
              <ul className="mt-3 space-y-2">
                {assessments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {a.title}
                      <span className="text-xs text-[#9aa3bd]">
                        {' '}· {a.kind} · max {a.max_score}
                        {a.due_date && ` · due ${a.due_date}`}
                      </span>
                    </span>
                    <DeleteButton
                      onDelete={() =>
                        run(async () => {
                          await deleteAssessment(a.id)
                          setAssessments(await listAssessments(subjectId))
                        }, 'Assessment deleted.')
                      }
                    />
                  </li>
                ))}
                {assessments.length === 0 && (
                  <li className="text-sm text-[#9aa3bd]">No assessments for this subject yet.</li>
                )}
              </ul>
              <div className="mt-3 flex max-w-2xl flex-wrap items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[#9aa3bd]">
                  Title
                  <input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Teste 1" aria-label="Assessment title" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Kind
                  <select value={aKind} onChange={(e) => setAKind(e.target.value)} aria-label="Assessment kind" className={inputCls}>
                    <option value="test">Test</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Due
                  <input type="date" value={aDue} onChange={(e) => setADue(e.target.value)} aria-label="Assessment due date" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#9aa3bd]">
                  Max
                  <input
                    type="number"
                    min={1}
                    value={aMax}
                    onChange={(e) => setAMax(Number(e.target.value))}
                    aria-label="Assessment max score"
                    className={`${inputCls} w-20`}
                  />
                </label>
                <button
                  disabled={!subjectId || !aTitle.trim()}
                  onClick={() =>
                    run(async () => {
                      await createAssessment({ subject_id: subjectId, title: aTitle, kind: aKind, due_date: aDue || null, max_score: aMax })
                      setATitle('')
                      setADue('')
                      setAssessments(await listAssessments(subjectId))
                    }, 'Assessment created.')
                  }
                  className={btnCls}
                >
                  Add
                </button>
              </div>
            </section>
          )}

          {tab === 'grades' && (
            <section aria-label="Grades" className="card mt-4 p-4">
              <h2 className="font-medium">Grade entry</h2>
              <div className="mt-2 flex max-w-2xl flex-wrap gap-2">
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className={`${inputCls} min-w-0 flex-1`}
                  aria-label="Grade subject"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={assessmentId}
                  onChange={(e) => setAssessmentId(e.target.value)}
                  className={`${inputCls} min-w-0 flex-1`}
                  aria-label="Grade assessment"
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} (max {a.max_score})
                    </option>
                  ))}
                </select>
              </div>
              {roster.length === 0 ? (
                <p className="mt-3 text-sm text-[#9aa3bd]">
                  No enrolled students found for this course yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {roster.map((r) => {
                    const existing = gradeByStudent[r.student_id]
                    return (
                      <li key={r.student_id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1">
                          {r.profiles?.display_name || r.student_id.slice(0, 8)}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={drafts[r.student_id] ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [r.student_id]: e.target.value }))
                          }
                          placeholder={existing ? String(existing.score) : '—'}
                          aria-label={`Score for ${r.profiles?.display_name || r.student_id.slice(0, 8)}`}
                          className={`${inputCls} w-24`}
                        />
                        <button
                          disabled={!assessmentId || drafts[r.student_id] === undefined || drafts[r.student_id] === ''}
                          onClick={() =>
                            run(async () => {
                              await saveGrade({
                                assessment_id: assessmentId,
                                student_id: r.student_id,
                                score: Number(drafts[r.student_id]),
                              })
                              setGradeRows(await listGradesForAssessment(assessmentId))
                            }, 'Grade saved.')
                          }
                          className={btnCls}
                        >
                          Save
                        </button>
                        {existing && (
                          <DeleteButton
                            label="Clear"
                            onDelete={() =>
                              run(async () => {
                                await deleteGrade(existing.id)
                                setGradeRows(await listGradesForAssessment(assessmentId))
                                setDrafts((prev) => {
                                  const next = { ...prev }
                                  delete next[r.student_id]
                                  return next
                                })
                              }, 'Grade cleared.')
                            }
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
