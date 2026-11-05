import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createListener,
  friendlyVoiceError,
  speechRecognitionSupported,
  stopSpeaking,
} from '../services/voiceService.js'

/**
 * React binding for one Atlas voice turn. Owns the listener instance,
 * streams interim transcripts, and releases the mic on unmount.
 */
export default function useAtlasVoice({ enabled, lang = 'auto', onTranscript }) {
  const [hearing, setHearing] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const listenerRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  })

  useEffect(
    () => () => {
      listenerRef.current?.abort()
      listenerRef.current = null
      stopSpeaking()
    },
    [],
  )

  const toggleListening = useCallback(() => {
    if (!enabled) return
    if (listenerRef.current) {
      listenerRef.current.stop()
      return
    }
    if (!speechRecognitionSupported()) {
      setVoiceNotice('Voice input is not supported in this browser. Please type instead.')
      return
    }
    setVoiceNotice('')
    const listener = createListener({
      lang: lang === 'auto' ? undefined : lang,
      onInterim: (text) => onTranscriptRef.current?.(text, false),
      onFinal: (text) => {
        if (text) onTranscriptRef.current?.(text, true)
      },
      onError: (code) => {
        const message = friendlyVoiceError(code)
        if (message) setVoiceNotice(message)
      },
      onEnd: () => {
        listenerRef.current = null
        setHearing(false)
      },
    })
    listenerRef.current = listener
    try {
      listener.start()
      setHearing(true)
    } catch {
      listenerRef.current = null
      setVoiceNotice(friendlyVoiceError('unknown'))
    }
  }, [enabled, lang])

  return { hearing, voiceNotice, setVoiceNotice, toggleListening }
}
