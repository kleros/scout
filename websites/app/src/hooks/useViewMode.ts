import { useState } from 'react'
import { ViewMode } from '../components/ViewSwitcher'

const VIEW_MODE_STORAGE_KEY = 'scout-registry-view-mode'

// Storage can be unavailable (site data blocked, some private windows): the choice then lasts
// for the visit only, instead of the list page failing to render.
const readStoredViewMode = (): ViewMode => {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return stored === 'cards' || stored === 'list' ? stored : 'list'
  } catch {
    return 'list'
  }
}

export const useViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
  const [viewMode, setViewModeState] = useState<ViewMode>(readStoredViewMode)

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // Not remembered; the view still changes.
    }
  }

  return [viewMode, setViewMode]
}
