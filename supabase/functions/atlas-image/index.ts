// ATLAS × Meta Muse Image proxy (Supabase Edge Function, Deno runtime).
//
// Same security shape as the sibling text-chat function: the secret
// MODEL_API_KEY lives only in Supabase secrets, the student authenticates with
// their Supabase JWT, and the browser never sees the key. Forwards
// image-creation prompts to
// muse-image-1.0 and returns the bytes as a data URL the chat can render and
// the student can download.
//
// Deploy (maintainer runs; never paste the key into chat or frontend code):
//   supabase functions deploy atlas-image
// (MODEL_API_KEY secret is already configured; no second key needed.)
//
// Contract (verified against https://dev.meta.ai/docs/api-reference/images/create-image
// and https://dev.meta.ai/docs/api-reference/images/schemas):
//   POST https://api.meta.ai/v1/images/generations
//     { model: 'muse-image-1.0', prompt, n: 1, size: '1024x1024',
//       response_format: 'b64_json' }
//   ImagesResponse: { data: [{ b64_json?, url?, revised_prompt? }], usage? }
// Billing (https://dev.meta.ai/docs/pricing-rate-limits): flat $0.01 per
// generated image; only successfully returned images are billed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_URL = 'https://api.meta.ai/v1/images/generations'
const MODEL = 'muse-image-1.0'
const MAX_PROMPT_CHARS = 1000

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

function diagEnabled() {
  try {
    return Deno.env.get('ATLAS_DIAG') === '1'
  } catch {
    return false
  }
}

/** Counts-only server log (never prompt text or image bytes). */
function diag(fields) {
  if (!diagEnabled()) return
  try {
    console.log(`[ATLAS-DIAG] ${JSON.stringify(fields)}`)
  } catch {
    // Diagnostics must never break the function.
  }
}

/** Detect PNG/JPEG/WebP/GIF from magic bytes so the data URL MIME is exact. */
function sniffMime(b64) {
  try {
    const bytes = Uint8Array.from(atob(b64.slice(0, 24)), (c) => c.charCodeAt(0))
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png'
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return 'image/webp'
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  } catch {
    // Fall through to the default.
  }
  return 'image/png'
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

    const { teacherId, prompt } = await req.json()
    if (teacherId !== 'atlas') {
      return json({ error: 'Image generation serves Professor Atlas only.' }, 400)
    }
    const text = String(prompt ?? '').trim()
    if (!text) {
      return json({ error: 'Empty prompt.' }, 400)
    }
    if (text.length > MAX_PROMPT_CHARS) {
      return json({ error: 'Prompt is too long. Keep it under 1000 characters.' }, 400)
    }

    const startedAt = Date.now()
    const metaRes = await fetch(META_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${modelApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: text,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
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
      const suffix = detail ? ` ${String(detail).slice(0, 200)}` : ''
      if (metaRes.status === 429) {
        return json({ error: `Image generation is rate-limited right now.${suffix}` }, 429)
      }
      return json({ error: `Image API error (HTTP ${metaRes.status}).${suffix}` }, 502)
    }

    const data = await metaRes.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64 || typeof b64 !== 'string') {
      // Fails billed $0: docs bill only images actually returned.
      return json(
        { error: 'The image could not be generated. Try a different prompt.' },
        502,
      )
    }
    diag({
      promptLength: text.length,
      imageBytes: Math.floor((b64.length * 3) / 4),
      latencyMs: Date.now() - startedAt,
      usage: data?.usage ?? null,
    })
    return json({
      imageDataUrl: `data:${sniffMime(b64)};base64,${b64}`,
      revisedPrompt: data?.data?.[0]?.revised_prompt ?? null,
      usage: data?.usage ?? null,
    })
  } catch (err) {
    return json({ error: err?.message || 'Atlas image service failed.' }, 500)
  }
})
