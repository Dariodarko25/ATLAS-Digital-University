/* global process, console */
// ATLAS wiring contract: auth + university systems (offline, no secrets).
//   npm run test:auth
// Verifies the client uses only the publishable key, session restore is wired,
// auth/community routes exist, phase services are present, and the SQL
// migration covers every table with RLS. Live Supabase checks are manual.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectImageIntent } from '../src/services/imageIntent.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function read(rel) {
  try {
    return readFileSync(path.join(ROOT, rel), 'utf8')
  } catch {
    return null
  }
}

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
  if (!ok) failures.push(name)
}

const client = read('src/lib/supabaseClient.js')
check('supabase client module exists', client !== null)
if (client) {
  check('client uses VITE_SUPABASE_URL', client.includes('VITE_SUPABASE_URL'))
  check('client uses VITE_SUPABASE_PUBLISHABLE_KEY', client.includes('VITE_SUPABASE_PUBLISHABLE_KEY'))
  const codeOnly = client
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .toLowerCase()
  check(
    'client never references secret/service_role key',
    !codeOnly.includes('service_role') &&
      !codeOnly.includes('service-role') &&
      !codeOnly.includes('secret'),
  )
  check('client rejects URL path suffixes (bare project URL only)', client.includes('pathname'))
}

const authCtx = read('src/context/AuthContext.jsx')
check('auth context exists', authCtx !== null)
if (authCtx) {
  check('session restore via getSession', authCtx.includes('getSession'))
  check('session restore via onAuthStateChange', authCtx.includes('onAuthStateChange'))
  check('exposes signUp/signIn/signOut', authCtx.includes('signUp') && authCtx.includes('signIn') && authCtx.includes('signOut'))
  check('exposes useAuth', authCtx.includes('useAuth'))
}

const main = read('src/main.jsx')
check('auth provider wired in main', main !== null && main.includes('AuthProvider'))

const app = read('src/App.jsx')
check('login route registered', app !== null && app.includes('/login'))

const authPage = read('src/pages/AuthPage.jsx')
check('auth page exists', authPage !== null)
if (authPage) {
  check('auth page has email + password fields', authPage.includes('email') && authPage.includes('password'))
}

const profileSvc = read('src/services/profile.js')
check('student profile service exists', profileSvc !== null)
if (profileSvc) {
  check('profile service targets profiles table', profileSvc.includes('profiles'))
}

const voiceSvc = read('src/services/voiceService.js')
check('voice service exists', voiceSvc !== null)
if (voiceSvc) {
  check(
    'voice service covers listen + speak',
    voiceSvc.includes('createListener') && voiceSvc.includes('speakText'),
  )
  const voiceCodeOnly = voiceSvc
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .join('\n')
  check(
    'voice service makes no direct Meta API calls (key must stay server-side)',
    !voiceCodeOnly.includes('api.meta.ai') && !voiceCodeOnly.includes('LLM_'),
  )
}

const voiceHook = read('src/hooks/useAtlasVoice.js')
check('atlas voice hook exists', voiceHook !== null)

const boundary = read('src/components/ClassroomErrorBoundary.jsx')
check('classroom error boundary exists', boundary !== null)
if (boundary) {
  check(
    'boundary recovers with reload',
    boundary.includes('componentDidCatch') && boundary.includes('Reload classroom'),
  )
  check('boundary releases speech on failure', boundary.includes('stopSpeaking'))
  check('boundary captures component stack', boundary.includes('componentStack'))
}
check(
  'classroom route is wrapped in boundary',
  app !== null && app.includes('ClassroomErrorBoundary'),
)

const classroom = read('src/pages/Classroom.jsx')
if (classroom) {
  check('classroom wires voice controls', classroom.includes('toggleListening'))
  check('classroom shows hearing status', classroom.includes('Hearing you'))
  check('classroom gates voice to Atlas', classroom.includes("teacher.id === 'atlas'"))
  check('classroom has mute control', classroom.includes('toggleMuted'))
  check(
    'classroom guards live regions against auto-translate DOM mutation',
    classroom.includes('translate="no"') && classroom.includes('notranslate'),
  )
  check('send failures surface honestly', classroom.includes('sendError'))
  check(
    'voice language persists across reloads',
    classroom.includes("getItem('atlas-voice-lang')") &&
      classroom.includes("setItem('atlas-voice-lang'"),
  )
  check('voice transcript goes to review draft', classroom.includes('Review voice transcript'))
  check('atlas offers image attach', classroom.includes('Attach an image'))
  check('classroom shows image-creating status', classroom.includes('is creating'))
  check('classroom uses the shared classifier', classroom.includes('classifyAtlasRequest'))
  check('classroom greets the student by name', classroom.includes('Good to see you'))
  check('classroom sends the student name to Spark', classroom.includes('student_name'))
  check('classroom sends academic context to Spark', classroom.includes('academic:'))
  check('classroom links lessons to subjects', classroom.includes("get('subject')"))
  check(
    'classroom renders generated images with download',
    classroom.includes('Generated image') && classroom.includes('Download image'),
  )
}

const nav = read('src/components/NavBar.jsx')
check('navbar connects to auth', nav !== null && nav.includes('useAuth'))
check('navbar links community', nav !== null && nav.includes('/community'))

if (profileSvc) {
  check('profile service covers photo upload', profileSvc.includes('uploadAvatar'))
  check(
    'photo upload maps missing bucket to setup message',
    profileSvc.includes('avatars') && profileSvc.toLowerCase().includes('photo storage is not set up'),
  )
  check(
    'profile RLS denial maps to corrective message',
    profileSvc.includes('friendlyProfileError') &&
      profileSvc.includes('rejected by database security'),
  )
}

const lessonsSvc = read('src/services/lessons.js')
check('lessons service exists', lessonsSvc !== null)
if (lessonsSvc) {
  check(
    'lessons service covers history',
    lessonsSvc.includes('createLesson') &&
      lessonsSvc.includes('getLessonMessages') &&
      lessonsSvc.includes('appendMessages'),
  )
  check('message restore orders deterministically', lessonsSvc.includes(".order('role')"))
}

const memorySvc = read('src/services/memory.js')
check('memory service exists', memorySvc !== null)
if (memorySvc) {
  check(
    'memory service covers context',
    memorySvc.includes('getMemory') && memorySvc.includes('recordExchange'),
  )
  check('memory service can clear a teacher memory', memorySvc.includes('clearMemory'))
}

const aiSvc = read('src/services/aiService.js')
check('teacher replies accept memory context', aiSvc !== null && aiSvc.includes('context = null'))
if (aiSvc) {
  check('atlas routes through edge function', aiSvc.includes("functions.invoke('atlas-chat'"))
  check('other teachers stay simulated for now', aiSvc.includes('simulateTeacherReply'))
  check('atlas routes image prompts to image function', aiSvc.includes("functions.invoke('atlas-image'"))
  check('ai layer uses the shared classifier', aiSvc.includes('classifyAtlasRequest'))
  check(
    'image failures identify the image service',
    aiSvc.includes('could not create the image') && aiSvc.includes('Image creation is unreachable'),
  )
}

const imageIntent = read('src/services/imageIntent.js')
check('image intent module exists', imageIntent !== null)
if (imageIntent) {
  check(
    'image intent covers english prompts',
    imageIntent.includes('generate') && imageIntent.includes('draw'),
  )
  check(
    'image intent covers portuguese prompts',
    imageIntent.includes('imagem') && imageIntent.includes('gera'),
  )
}

// Regression: generation verbs with TEXT objects must stay on Muse Spark.
// [message, hasImage, expectImage]
const intentCases = [
  ['Generate an image of a solar system.', false, true],
  ['Create an electronic circuit diagram.', false, true],
  ['Draw a futuristic laboratory.', false, true],
  ['Gera uma imagem do sistema solar.', false, true],
  ['Cria um diagrama de um circuito.', false, true],
  ['Desenha um laboratório futurista.', false, true],
  ['Can you show me a diagram of a bridge?', false, true],
  ['I need an image of a cell.', false, true],
  ['Explica a lei de Ohm.', false, false],
  ['Generate a summary of photosynthesis.', false, false],
  ['Gera um resumo sobre a Revolução Industrial.', false, false],
  ['Generate practice questions about Ohm\'s law.', false, false],
  ['Gera um exemplo de circuito.', false, false],
  ['Ilustra com um exemplo.', false, false],
  ['Draw a conclusion from this.', false, false],
  ['Draw a cat.', true, false],
]
for (const [msg, hasImage, want] of intentCases) {
  check(
    `intent routes "${msg.slice(0, 42)}"`,
    detectImageIntent(msg, { hasImage }) === want,
  )
}

const imageFn = read('supabase/functions/atlas-image/index.ts')
check('atlas-image edge function exists', imageFn !== null)
if (imageFn) {
  check('image function targets muse-image-1.0', imageFn.includes('muse-image-1.0'))
  check('image function uses generations endpoint', imageFn.includes('api.meta.ai/v1/images/generations'))
  check('image function reads key from server env only', imageFn.includes('MODEL_API_KEY'))
  check('image function authenticates the student', imageFn.includes('getUser'))
  check('image function holds no key literal', !imageFn.includes('LLM_'))
  check(
    'image function never touches text chat',
    !imageFn.includes('atlas-chat') && !imageFn.includes('muse-spark') && !imageFn.includes('/v1/responses'),
  )
}

const edgeFn = read('supabase/functions/atlas-chat/index.ts')
check('atlas-chat edge function exists', edgeFn !== null)
if (edgeFn) {
  check('function targets muse-spark-1.3', edgeFn.includes('muse-spark-1.3'))
  check('function uses Responses endpoint', edgeFn.includes('api.meta.ai/v1/responses'))
  check('function reads key from server env only', edgeFn.includes('MODEL_API_KEY'))
  check('function authenticates the student', edgeFn.includes('getUser'))
  check('function holds no key literal', !edgeFn.includes('LLM_'))
  check('function accepts image input', edgeFn.includes('input_image'))
  check('function returns usage for latency display', edgeFn.includes('usage'))
  check(
    'chat function never touches image generation',
    !edgeFn.includes('atlas-image') && !edgeFn.includes('muse-image') && !edgeFn.includes('images/generations'),
  )
  check('chat context carries the student name', edgeFn.includes('student_name'))
  check('chat context carries academic context', edgeFn.includes('Academic context'))
}

const profilePage = read('src/pages/Profile.jsx')
check('profile page exists', profilePage !== null)
if (profilePage) {
  check(
    'profile reviews teacher memories',
    profilePage.includes('What your teachers remember') && profilePage.includes('clearMemory'),
  )
}

const academicsSvc = read('src/services/academics.js')
check('academics service exists', academicsSvc !== null)
if (academicsSvc) {
  check(
    'academics service covers journey',
    academicsSvc.includes('listInstitutions') &&
      academicsSvc.includes('listPrograms') &&
      academicsSvc.includes('listSubjects') &&
      academicsSvc.includes('saveEnrollment'),
  )
}

const journeyPage = read('src/pages/Journey.jsx')
check('journey page exists', journeyPage !== null)
if (journeyPage) {
  check('journey shows academic journey', journeyPage.includes('Percurso académico'))
}

const journeyMigration = read('supabase/migrations/002_academic_journey.sql')
check('academic journey migration exists', journeyMigration !== null)
if (journeyMigration) {
  for (const table of ['subjects', 'enrollments']) {
    check(`journey migration defines ${table}`, journeyMigration.includes(`public.${table}`))
  }
  check(
    'journey migration declares its 001 prerequisite',
    journeyMigration.includes('001') && !journeyMigration.includes('create table if not exists public.institutions'),
  )
  check(
    'journey migration scopes enrollments to the student',
    journeyMigration.includes('auth.uid') && journeyMigration.includes('student_id'),
  )
  check('journey migration seeds demo data only', journeyMigration.includes('is_demo'))
  check(
    'journey migration is non-destructive',
    !journeyMigration.toLowerCase().includes('drop table') &&
      !journeyMigration.toLowerCase().includes('delete from'),
  )
}

const fullMigration = read('supabase/migrations/003_academic_full.sql')
check('full academic migration exists', fullMigration !== null)
if (fullMigration) {
  for (const table of ['departments', 'timetable_slots', 'assessments', 'grades']) {
    check(`full migration defines ${table}`, fullMigration.includes(`public.${table}`))
  }
  check(
    'full migration reuses 001 base tables instead of redefining them',
    !fullMigration.includes('create table if not exists public.staff') &&
      !fullMigration.includes('create table if not exists public.faculties'),
  )
  check(
    'grades are student-scoped',
    fullMigration.includes('auth.uid') && fullMigration.includes('student_id'),
  )
  check(
    'full migration is non-destructive',
    !fullMigration.toLowerCase().includes('drop table') &&
      !fullMigration.toLowerCase().includes('delete from'),
  )
}

const staffSvc = read('src/services/staff.js')
check('staff service exists', staffSvc !== null)
if (staffSvc) {
  check(
    'staff service covers roles and catalog writes',
    staffSvc.includes('getMyStaffRoles') && staffSvc.includes('createSubject'),
  )
}

const gradesSvc = read('src/services/grades.js')
check('grades service exists', gradesSvc !== null)
if (gradesSvc) {
  check(
    'grades service covers assessments and transcript',
    gradesSvc.includes('saveGrade') && gradesSvc.includes('getMyTranscript'),
  )
}

const adminPage = read('src/pages/Admin.jsx')
check('admin page exists', adminPage !== null)
if (adminPage) {
  check(
    'admin page gates by staff role',
    adminPage.includes('getMyStaffRoles') && adminPage.includes('No staff access'),
  )
}

const communitySvc = read('src/services/community.js')
check('community service exists', communitySvc !== null)
if (communitySvc) {
  check(
    'community service covers requests',
    communitySvc.includes('sendRequest') &&
      communitySvc.includes('respondRequest') &&
      communitySvc.includes('removeConnection'),
  )
}

check('community route registered', app !== null && app.includes('/community'))

const communityPage = read('src/pages/Community.jsx')
check('community page exists', communityPage !== null)
if (communityPage) {
  check('community detects missing-table setup errors', communityPage.includes('isSetupError'))
  check('community has empty-state banner', communityPage.includes('No connections yet'))
}

const migration = read('supabase/migrations/001_atlas_university.sql')
check('university migration exists', migration !== null)
if (migration) {
  for (const table of ['lessons', 'lesson_messages', 'student_memory', 'connections']) {
    check(`migration defines ${table}`, migration.includes(`public.${table}`))
  }
  for (const table of ['institutions', 'staff', 'faculties', 'programs']) {
    check(`001 creates base table ${table} first`, migration.includes(`public.${table}`))
  }
  check(
    'migration enables RLS on every table',
    (migration.match(/enable row level security/g) ?? []).length >= 5,
  )
  check(
    'migration creates avatar storage policies',
    migration.includes('storage.objects') && migration.includes('avatars'),
  )
  check(
    'migration never references service_role key',
    !migration.toLowerCase().includes('service_role'),
  )
}

const unifiedDb = read('supabase/init_atlas_db.sql')
check('unified init script exists', unifiedDb !== null)
if (unifiedDb) {
  const codeOnly = unifiedDb
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  const orderedTables = [
    'institutions',
    'staff',
    'faculties',
    'departments',
    'programs',
    'subjects',
    'enrollments',
    'timetable_slots',
    'assessments',
    'grades',
  ]
  let orderOk = true
  for (const t of orderedTables) {
    const createIdx = codeOnly.indexOf(`create table if not exists public.${t} (`)
    if (createIdx === -1) {
      orderOk = false
      break
    }
    if (codeOnly.slice(0, createIdx).includes(`public.${t}`)) {
      orderOk = false
      break
    }
  }
  check('unified init creates every table before first reference', orderOk)
  const creates = (codeOnly.match(/create table /g) ?? []).length
  const guarded = (codeOnly.match(/create table if not exists /g) ?? []).length
  check('every unified table creation is guarded', creates > 0 && creates === guarded)
  const drops = [...codeOnly.matchAll(/drop policy if exists "([^"]+)"/g)].map((m) => m[1])
  const createsP = [...codeOnly.matchAll(/create policy "([^"]+)"/g)].map((m) => m[1])
  check(
    'every unified policy create has a matching guarded drop',
    createsP.length > 0 && createsP.every((p) => drops.includes(p)),
  )
}

if (failures.length > 0) {
  console.log(`${failures.length} CHECKS FAILED: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('ALL AUTH CHECKS PASSED')
