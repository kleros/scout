import { useState } from 'react'
import { ViewMode } from '../components/ViewSwitcher'

const VIEW_MODE_STORAGE_KEY = 'scout-registry-view-mode'

export const useViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return (stored === 'cards' || stored === 'list') ? stored : 'list'
  })

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  return [viewMode, setViewMode]
}
