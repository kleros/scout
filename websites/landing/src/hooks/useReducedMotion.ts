import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const getMediaQuery = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : undefined

/** True while the visitor asks for reduced motion; follows changes to the setting. */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => getMediaQuery()?.matches ?? false)

  useEffect(() => {
    const mediaQuery = getMediaQuery()
    if (!mediaQuery) return
    const onChange = () => setReduced(mediaQuery.matches)
    onChange()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }
    // Safari before 14
    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return reduced
}

export default useReducedMotion
