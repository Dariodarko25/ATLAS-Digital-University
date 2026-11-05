// TEMPORARY diagnostic logging for input-quality testing (Phase 1).
// Enable in the browser console on the test machine:
//   localStorage.setItem('atlas-diagnostics', '1')
// Disable: localStorage.removeItem('atlas-diagnostics').
// Previews stay in the local browser console only. Never logs keys, tokens,
// emails, or user ids. Remove this module before production.

const PREVIEW_CHARS = 300

export function diagEnabled() {
  try {
    return (
      typeof window !== 'undefined' && window.localStorage?.getItem('atlas-diagnostics') === '1'
    )
  } catch {
    return false
  }
}

function preview(value) {
  if (typeof value !== 'string') return value
  return value.length > PREVIEW_CHARS ? `${value.slice(0, PREVIEW_CHARS)}…` : value
}

/** Log one pipeline stage as a collapsed console group. Never throws. */
export function diag(stage, fields = {}) {
  if (!diagEnabled()) return
  try {
    console.groupCollapsed(`[ATLAS-DIAG] ${stage}`)
    for (const [key, value] of Object.entries(fields)) {
      console.log(key, preview(value))
    }
    console.groupEnd()
  } catch {
    // Diagnostics must never break the app.
  }
}
