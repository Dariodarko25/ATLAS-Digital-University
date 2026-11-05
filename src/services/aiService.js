import { teachers } from '../data/mockData.js'
import { supabase } from '../lib/supabaseClient.js'
import { diag } from './diag.js'
import { classifyAtlasRequest } from './imageIntent.js'

// ---------------------------------------------------------------------------
// ATLAS AI service layer.
//
// All teacher dialogue goes through these async functions so pages never talk
// to a model endpoint directly. Professor Atlas answers via the `atlas-chat`
// Supabase Edge Function (Muse Spark 1.3, key held server-side); prompts that
// ask Atlas to CREATE an image route to the `atlas-image` Edge Function
// (Muse Image 1.0, same server-side key). Orion and Lyra stay simulated
// until their own phase.
//
// TODO: wire Orion/Lyra to the Meta AI API.
//   - Add a server-side proxy route (never call the API with a key from the
//     browser) and read the endpoint + key from server environment config.
//   - In `askTeacher`, replace `simulateTeacherReply` with a fetch to that
//     proxy, passing { teacherId, persona, message, history }.
//   - Keep this module's function signatures stable so pages stay unchanged.
// ---------------------------------------------------------------------------

const SIMULATED_LATENCY_MS = 700

function findTeacher(teacherId) {
  return teachers.find((t) => t.id === teacherId) ?? teachers[0]
}

function simulateTeacherReply(teacher, message, context = null) {
  const openers = {
    orion:
      'Let us reason from first principles. You ask about',
    lyra: 'What a delightful pattern to build — you ask about',
    atlas: 'Good problem. Let us design an answer. You bring me',
  }
  const closer =
    'Work through it step by step, and tell me where your reasoning leads. I will meet you there.'
  const topic = message.trim().replace(/\s+/g, ' ').slice(0, 140) || 'the unknown'
  const subjects = context?.subjects_studied?.filter(Boolean) ?? []
  const memory =
    subjects.length > 0
      ? ` I remember you have been studying ${subjects.slice(-2).join(' and ')} — we will build on that.`
      : ''
  return `${openers[teacher.id] ?? 'Consider'} "${topic}".${memory} ${closer}`
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ask a teacher a question.
 * @param {string} teacherId - 'orion' | 'lyra' | 'atlas'
 * @param {string} message - learner's message
 * @param {Array<{role: string, text: string}>} [history] - prior turns, oldest first
 * @param {object|null} [context] - the student's stored memory for this teacher
 * @param {{dataUrl: string}|null} [image] - attached image (Atlas only)
 * @returns {Promise<{teacherId: string, text: string, imageUrl?: string, revisedPrompt?: string, latencyMs: number, responseId?: string, usage?: object}>}
 */
export async function askTeacher(teacherId, message, history = [], context = null, image = null) {
  const startedAt = Date.now()
  const teacher = findTeacher(teacherId)
  if (image && teacher.id !== 'atlas') {
    throw new Error('Image questions work with Professor Atlas in this phase.')
  }
  if (teacher.id === 'atlas') {
    // Live paths: Supabase Edge Functions holding MODEL_API_KEY server-side.
    // No simulation here by design — failures surface honestly to the chat.
    // Attached-image turns always discuss the image (Spark); only bare prompts
    // asking Atlas to CREATE an image route to Muse Image.
    if (!image && classifyAtlasRequest(message, { hasImage: false }) === 'image') {
      return askAtlasForImage(teacher, message, startedAt)
    }
    return askAtlasViaFunction(teacher, message, history, context, image, startedAt)
  }
  // TODO(Meta-AI): route Orion/Lyra through the proxy in their own phase.
  await wait(SIMULATED_LATENCY_MS)
  return {
    teacherId: teacher.id,
    text: simulateTeacherReply(teacher, message, context),
    latencyMs: Date.now() - startedAt,
  }
}

function friendlyFunctionError(error) {
  const message = error?.message ?? ''
  if (error?.name === 'FunctionsHttpError') {
    const status = error?.context?.status
    if (status === 401) return 'Please sign in to talk to Professor Atlas.'
    if (status === 429) return 'Atlas is receiving too many requests right now. Wait a moment and try again.'
    if (status === 500) return 'Atlas is not configured yet on the server. Try again later.'
    return 'Atlas could not answer right now. Please try again.'
  }
  if (/failed to fetch|failed to send a request|networkerror|load failed/i.test(message)) {
    return 'Atlas service is unreachable. Check the connection and try again.'
  }
  return message || 'Atlas could not answer right now. Please try again.'
}

// Image failures name the image service, so a failed generation is never
// mistaken for a text-chat outage (and vice versa).
function friendlyImageError(error) {
  const message = error?.message ?? ''
  if (error?.name === 'FunctionsHttpError') {
    const status = error?.context?.status
    if (status === 401) return 'Please sign in to create images with Professor Atlas.'
    if (status === 429) {
      return 'Image creation is receiving too many requests right now. Wait a moment and try again.'
    }
    if (status === 500) return 'Image creation is not configured yet on the server. Try again later.'
    return 'Atlas could not create the image. Please try again.'
  }
  if (/failed to fetch|failed to send a request|networkerror|load failed/i.test(message)) {
    return 'Image creation is unreachable. Check the connection and try again.'
  }
  return message || 'Atlas could not create the image. Please try again.'
}

async function askAtlasForImage(teacher, message, startedAt) {
  const prompt = String(message ?? '').trim()
  diag('image.request', { teacherId: teacher.id, promptLength: prompt.length })
  const { data, error } = await supabase.functions.invoke('atlas-image', {
    body: { teacherId: teacher.id, prompt },
  })
  if (error) throw new Error(friendlyImageError(error))
  if (!data?.imageDataUrl || typeof data.imageDataUrl !== 'string' || !data.imageDataUrl.startsWith('data:image/')) {
    throw new Error('Atlas could not create the image. Please try again.')
  }
  const latencyMs = Date.now() - startedAt
  // Caption only: the bytes travel in imageUrl, never in text/history/TTS.
  const text = `I created this image for you: "${prompt.replace(/\s+/g, ' ').slice(0, 160)}"`
  diag('image.response', {
    bytes: data.imageDataUrl.length,
    revisedPrompt: data.revisedPrompt ?? null,
    usage: data.usage ?? null,
    latencyMs,
  })
  return {
    teacherId: teacher.id,
    text,
    imageUrl: data.imageDataUrl,
    revisedPrompt: data.revisedPrompt ?? null,
    latencyMs,
    usage: data.usage ?? null,
  }
}

async function askAtlasViaFunction(teacher, message, history, context, image, startedAt) {
  const turns = (history ?? []).slice(-20)
  diag('meta.request', {
    teacherId: teacher.id,
    message,
    messageLength: String(message ?? '').length,
    historyTurns: turns.length,
    hasImage: Boolean(image?.dataUrl),
    imageChars: image?.dataUrl?.length ?? 0,
  })
  const { data, error } = await supabase.functions.invoke('atlas-chat', {
    body: {
      teacherId: teacher.id,
      message,
      history: turns,
      context: context ?? null,
      image: image?.dataUrl ? { dataUrl: image.dataUrl } : null,
    },
  })
  if (error) throw new Error(friendlyFunctionError(error))
  if (!data?.text || typeof data.text !== 'string') {
    throw new Error('Atlas returned an empty answer. Please try again.')
  }
  const latencyMs = Date.now() - startedAt
  if (data.responseId) {
    // Provenance for verification: Meta response id (see function logs).
    console.info(`Atlas answer via Muse Spark 1.3 (${data.responseId})`)
  }
  diag('meta.response', {
    text: data.text,
    textLength: data.text.length,
    responseId: data.responseId ?? null,
    usage: data.usage ?? null,
    latencyMs,
  })
  return {
    teacherId: teacher.id,
    text: data.text,
    latencyMs,
    responseId: data.responseId ?? null,
    usage: data.usage ?? null,
  }
}

/**
 * Get a teacher's greeting without any model call.
 * @param {string} teacherId
 * @returns {Promise<{teacherId: string, text: string}>}
 */
export async function getTeacherGreeting(teacherId) {
  const teacher = findTeacher(teacherId)
  return { teacherId: teacher.id, text: teacher.greeting }
}

/**
 * List the teachers available for dialogue.
 * @returns {Promise<Array<{id: string, name: string, field: string}>>}
 */
export async function listTeachers() {
  return teachers.map(({ id, name, field }) => ({ id, name, field }))
}
