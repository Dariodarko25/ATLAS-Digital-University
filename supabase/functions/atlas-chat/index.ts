// ATLAS × Meta Model API proxy (Supabase Edge Function, Deno runtime).
//
// Why this exists: the Meta API needs the secret MODEL_API_KEY, which must
// NEVER live in frontend code. This function holds the key server-side
// (Supabase secrets), authenticates the student via their Supabase JWT, and
// forwards classroom chat to Muse Spark 1.3.
//
// Deploy (maintainer runs; never paste the key into chat or frontend code):
//   supabase functions deploy atlas-chat
//   supabase secrets set MODEL_API_KEY=<key from dev.meta.ai or hackathon>
//
// Contract (verified against https://dev.meta.ai/docs/api-reference/responses/create-response
// and https://dev.meta.ai/docs/protocols/responses):
//   POST https://api.meta.ai/v1/responses { model, instructions, input[] }
//   input items: { role: 'user'|'assistant',
//                  content: [{ type: 'input_text'|'output_text', text }] }
//   answer text: data.output[].content[] where type === 'output_text'.
// History is self-managed (ATLAS stores lessons in Supabase per student);
// previous_response_id is intentionally unused.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_URL = 'https://api.meta.ai/v1/responses'
const MODEL = 'muse-spark-1.3'
const MAX_HISTORY_TURNS = 20
const MAX_IMAGE_CHARS = 4 * 1024 * 1024 // ~3MB of image bytes as base64
const IMAGE_ONLY_PROMPT = 'Explain this image step by step for my engineering lesson.'

const ATLAS_INSTRUCTIONS = [
  'You are Professor Atlas, a calm, methodical mentor teaching Engineering and Mathematics at ATLAS digital university.',
  'Explain concepts step by step, building from first principles.',
  'Give practical engineering and mathematics examples.',
  'Adapt explanations to the student level described in the context, if any.',
  'Generate short exercises and carefully correct the student answers.',
  'Address the student by their first name occasionally when it is known.',
  'Use the student academic context, when present, to situate explanations in their program and subjects; never invent grades, approvals, or records.',
  'Encourage understanding over memorization; ask guiding questions.',
  'Keep answers focused and classroom-appropriate; plain text with light markdown.',
].join(' ')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toInputItems(history) {
  return (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) =>
      m.role === 'teacher'
        ? { role: 'assistant', content: [{ type: 'output_text', text: m.text }] }
        : { role: 'user', content: [{ type: 'input_text', text: m.text }] },
    )
}

function contextBlock(context) {
  if (!context || typeof context !== 'object') return ''
  const parts = []
  if (typeof context.student_name === 'string' && context.student_name.trim()) {
    parts.push(`Student name: ${context.student_name.trim().slice(0, 40)}.`)
  }
  const ac = context.academic
  if (ac && typeof ac === 'object') {
    const bits = []
    if (ac.institution) bits.push(`Institution: ${String(ac.institution).slice(0, 60)}.`)
    if (ac.program) bits.push(`Program: ${String(ac.program).slice(0, 80)}.`)
    if (ac.year) bits.push(`Year ${String(ac.year).slice(0, 2)}, semester ${String(ac.semester ?? '').slice(0, 2)}.`)
    if (Array.isArray(ac.subjects) && ac.subjects.length > 0) {
      bits.push(`Current subjects: ${ac.subjects.filter(Boolean).slice(0, 12).join(', ').slice(0, 300)}.`)
    }
    if (ac.progress && typeof ac.progress === 'object') {
      const passed = Number(ac.progress.subjects_passed ?? 0)
      const graded = Number(ac.progress.subjects_graded ?? 0)
      if (graded > 0) bits.push(`Progress: ${passed} of ${graded} graded subjects passed.`)
    }
    if (Array.isArray(ac.needs_work) && ac.needs_work.length > 0) {
      bits.push(`Needs work: ${ac.needs_work.filter(Boolean).slice(0, 5).join(', ').slice(0, 200)}.`)
    }
    if (bits.length > 0) parts.push(`Academic context. ${bits.join(' ')}`)
  }
  if (Array.isArray(context.subjects_studied) && context.subjects_studied.length > 0) {
    parts.push(`Subjects studied: ${context.subjects_studied.filter(Boolean).join(', ')}.`)
  }
  if (context.last_topic) parts.push(`Last topic: ${String(context.last_topic).slice(0, 120)}.`)
  if (Array.isArray(context.difficulties) && context.difficulties.length > 0) {
    const last = context.difficulties[context.difficulties.length - 1]
    const text = typeof last === 'string' ? last : last?.text
    if (text) parts.push(`Recent difficulty: ${String(text).slice(0, 120)}.`)
  }
  if (typeof context.exchanges === 'number' && context.exchanges > 0) {
    parts.push(`Previous exchanges with this student: ${context.exchanges}.`)
  }
  return parts.length > 0 ? `\n\nStudent context. ${parts.join(' ')}` : ''
}

function diagEnabled() {
  try {
    return Deno.env.get('ATLAS_DIAG') === '1'
  } catch {
    return false
  }
}

/** Counts-only server log (never message content): enable with ATLAS_DIAG=1 secret. */
function diag(fields) {
  if (!diagEnabled()) return
  try {
    console.log(`[ATLAS-DIAG] ${JSON.stringify(fields)}`)
  } catch {
    // Diagnostics must never break the function.
  }
}

function extractText(data) {
  const chunks = []
  for (const item of data?.output ?? []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue
    for (const block of item.content) {
      if (block?.type === 'output_text' && typeof block.text === 'string') {
        chunks.push(block.text)
      }
    }
  }
  return chunks.join('').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const modelApiKey = Deno.env.get('MODEL_API_KEY')
    if (!modelApiKey) {
      return json({ error: 'MODEL_API_KEY is not configured on the server.' }, 500)
    }

    // Authenticate the student with their Supabase JWT (auth preserved).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return json({ error: 'Sign in required.' }, 401)
    }

    const { teacherId, message, history, context, image } = await req.json()
    if (teacherId !== 'atlas') {
      return json({ error: 'Phase 1 serves Professor Atlas only.' }, 400)
    }
    const text = String(message ?? '').trim()
    const dataUrl = typeof image?.dataUrl === 'string' ? image.dataUrl : ''
    if (!text && !dataUrl) {
      return json({ error: 'Empty message.' }, 400)
    }
    if (dataUrl && (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_IMAGE_CHARS)) {
      return json({ error: 'Invalid image upload.' }, 400)
    }

    const startedAt = Date.now()
    const currentContent = []
    if (dataUrl) {
      currentContent.push({ type: 'input_image', image_url: dataUrl })
    }
    currentContent.push({ type: 'input_text', text: (text || IMAGE_ONLY_PROMPT).slice(0, 4000) })

    const metaRes = await fetch(META_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${modelApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: ATLAS_INSTRUCTIONS + contextBlock(context),
        input: [...toInputItems(history), { role: 'user', content: currentContent }],
      }),
    })

    if (!metaRes.ok) {
      let detail = ''
      try {
        const errBody = await metaRes.json()
        detail = errBody?.error?.message || errBody?.message || ''
      } catch {
        detail = await metaRes.text().catch(() => '')
      }
      // Never echo credentials; key is not part of any message built here.
      return json(
        { error: `Model API error (HTTP ${metaRes.status}).${detail ? ` ${String(detail).slice(0, 200)}` : ''}` },
        502,
      )
    }

    const data = await metaRes.json()
    const reply = extractText(data)
    if (!reply) {
      return json({ error: 'Empty response from the model.' }, 502)
    }
    diag({
      turns: Array.isArray(history) ? history.length : 0,
      hasImage: Boolean(dataUrl),
      latencyMs: Date.now() - startedAt,
      usage: data?.usage ?? null,
    })
    return json({ text: reply, responseId: data?.id ?? null, usage: data?.usage ?? null })
  } catch (err) {
    return json({ error: err?.message || 'Atlas service failed.' }, 500)
  }
})
