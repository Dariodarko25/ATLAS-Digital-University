// ---------------------------------------------------------------------------
// ATLAS voice service: browser-native speech in/out primitives (no React).
//
// META VOICE API SEAM (verified against https://dev.meta.ai/docs/speech-to-text
// and https://dev.meta.ai/docs/models during implementation):
// - Transcription model muse-voice-transcribe-1.0 exists, served at
//   POST https://api.meta.ai/v1/asr/transcribe (multipart + Authorization
//   header) and wss://api.meta.ai/v1/asr/realtime (auth in handshake frame).
// - Both require a SECRET api key, which must NEVER live in frontend code, so
//   this browser build transcribes with the Web Speech API instead. To switch
//   to Meta transcription: add a same-origin server proxy that holds the key
//   and post recorded audio to that proxy from createListener's callers. The
//   transcribed text already flows through askTeacher, the documented
//   Muse Spark seam, so no voice-code changes are needed when the proxy lands.
// - The Meta Model API offers NO speech synthesis ("It does not synthesize
//   speech"), so spoken replies stay browser-native. No TTS endpoint invented.
// ---------------------------------------------------------------------------

export function speechRecognitionSupported() {
  return (
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition) != null
  )
}

export function speechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Map a SpeechRecognition error code to a student-friendly message. */
export function friendlyVoiceError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the microphone in the browser address bar and try again.'
    case 'audio-capture':
      return 'No microphone was found. Check that one is connected and try again.'
    case 'network':
      return 'Speech recognition needs an internet connection. Check the connection or type instead.'
    case 'no-speech':
      return 'Nothing was heard. Try speaking a little louder.'
    case 'aborted':
      return ''
    default:
      return 'Voice input failed. Please type your question instead.'
  }
}

/**
 * One-shot speech listener. Interim transcripts stream via onInterim; the
 * final transcript arrives once via onFinal, then onEnd always runs.
 */
export function createListener({ lang, onInterim, onFinal, onError, onEnd }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new Recognition()
  recognition.lang = lang || window.navigator?.language || 'en-US'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  let settled = false
  recognition.onresult = (event) => {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      if (result.isFinal) final += result[0]?.transcript ?? ''
      else interim += result[0]?.transcript ?? ''
    }
    if (interim) onInterim?.(interim)
    if (final && !settled) {
      settled = true
      onFinal?.(final.trim())
    }
  }
  recognition.onerror = (event) => onError?.(event?.error ?? 'unknown')
  recognition.onend = () => onEnd?.()

  return {
    start() {
      settled = false
      recognition.start()
    },
    stop() {
      recognition.stop()
    },
    abort() {
      try {
        recognition.abort()
      } catch {
        // Already idle.
      }
    },
  }
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang?.startsWith('en') && /google us english/i.test(v.name)) ??
    voices.find((v) => v.lang?.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang?.startsWith('en')) ??
    voices[0] ??
    null
  )
}

/**
 * Speak text. Returns false without side effects when unsupported.
 * onStart/onEnd/onError mirror the utterance lifecycle for status display.
 */
export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!speechSynthesisSupported() || !text?.trim()) return false
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 1
    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onError?.()
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    onError?.()
    return false
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Unsupported or already idle.
  }
}
