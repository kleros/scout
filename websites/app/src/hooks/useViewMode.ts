import { useState, useEffect } from 'react'
import { ViewMode } from '../components/ViewSwitcher'
import { BREAKPOINT_LANDSCAPE } from '../styles/landscapeStyle'

const VIEW_MODE_STORAGE_KEY = 'scout-registry-view-mode'

const isMobile = () => window.innerWidth < BREAKPOINT_LANDSCAPE

export const useViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Force card view on mobile
    if (isMobile()) {
      return 'cards'
    }
    // Initialize from localStorage for desktop
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return (stored === 'cards' || stored === 'list') ? stored : 'cards'
  })

  const setViewMode = (mode: ViewMode) => {
    // Don't allow list view on mobile
    if (isMobile() && mode === 'list') {
      return
    }
    setViewModeState(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  // Handle window resize to force card view when switching to mobile
  useEffect(() => {
    const handleResize = () => {
      if (isMobile() && viewMode === 'list') {
        setViewModeState('cards')
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  return [viewMode, setViewMode]
}
