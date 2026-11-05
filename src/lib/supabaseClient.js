import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!url || !publishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.',
  )
}

let parsed
try {
  parsed = new URL(url)
} catch {
  throw new Error('Invalid VITE_SUPABASE_URL: not a parseable URL.')
}
if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
  throw new Error('Invalid VITE_SUPABASE_URL: must be an http(s) URL.')
}
// The client appends /auth/v1, /rest/v1, ... itself. A path suffix here
// doubles the endpoint (…/rest/v1/auth/v1/signup) and every auth call fails
// with PostgREST PGRST125 "Invalid path specified in request URL".
if (parsed.pathname !== '/') {
  throw new Error(
    'Invalid VITE_SUPABASE_URL: use the bare project URL (https://<ref>.supabase.co) with no path suffix such as /rest/v1 or /auth/v1.',
  )
}

// Frontend client: publishable key only. Never use the secret/service_role key here.
export const supabase = createClient(url, publishableKey)
