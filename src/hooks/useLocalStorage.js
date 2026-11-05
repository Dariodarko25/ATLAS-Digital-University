import { useState } from 'react'

/** useState persisted to localStorage. Scaffold utility for later steps. */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  const set = (next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved))
      } catch {
        // Storage unavailable (private mode, quota): keep in-memory value.
      }
      return resolved
    })
  }

  return [value, set]
}
