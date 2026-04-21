import { useCallback, useEffect, useState } from 'react'
import { useIsMobile } from './useIsMobile'

const STORAGE_KEY = 'preferNewTabSubmission'

type StoredValue = boolean | null
type Listener = (value: StoredValue) => void
const listeners = new Set<Listener>()

const readStored = (): StoredValue => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

const writeStored = (value: StoredValue) => {
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
  } catch {
    // ignore
  }
  listeners.forEach((l) => l(value))
}

/**
 * Returns the effective preference at read time, applying the platform default
 * (mobile → new tab, desktop → modal) when the user has not made an explicit
 * choice. Safe to call from event handlers (no stale React state).
 */
export const getEffectivePreference = (isMobile: boolean): boolean => {
  const stored = readStored()
  return stored ?? isMobile
}

export const useSubmissionPreference = (): {
  preferNewTab: boolean
  setPreferNewTab: (value: boolean) => void
} => {
  const isMobile = useIsMobile()
  const [stored, setLocal] = useState<StoredValue>(readStored)

  useEffect(() => {
    const onChange: Listener = (v) => setLocal(v)
    listeners.add(onChange)

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocal(readStored())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setPreferNewTab = useCallback((value: boolean) => {
    writeStored(value)
  }, [])

  return {
    preferNewTab: stored ?? isMobile,
    setPreferNewTab,
  }
}
