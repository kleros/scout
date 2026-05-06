import { useEffect, useState } from 'react'
import { BREAKPOINT_LANDSCAPE } from 'styles/landscapeStyle'

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.innerWidth < BREAKPOINT_LANDSCAPE,
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT_LANDSCAPE - 1}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isMobile
}
