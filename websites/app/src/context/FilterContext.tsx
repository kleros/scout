import React, { createContext, useContext, useState, useCallback } from 'react'

export type DateRangeOption = 'all' | '7d' | '30d' | '90d' | '1y' | 'custom'

export interface FilterState {
  status: string[]
  disputed: string[]
  hasEverBeenDisputed: boolean
  page: number
  orderDirection: string
  text: string
  dateRange: DateRangeOption
  customDateFrom: string | null
  customDateTo: string | null
}

export interface FilterActions {
  setStatus: (status: string[]) => void
  toggleStatus: (status: string) => void
  setDisputed: (disputed: string[]) => void
  toggleDisputed: (disputed: string) => void
  toggleHasEverBeenDisputed: () => void
  setChallengeFilters: (disputed: string[], hasEverBeenDisputed: boolean) => void
  setPage: (page: number) => void
  setOrderDirection: (dir: string) => void
  setText: (text: string) => void
  setDateRange: (range: DateRangeOption) => void
  setCustomDateRange: (from: string | null, to: string | null) => void
}

export type FilterSlice = FilterState & FilterActions

const REGISTRY_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
  customDateFrom: null,
  customDateTo: null,
}

const PROFILE_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
  customDateFrom: null,
  customDateTo: null,
}

function useFilterSlice(defaults: FilterState): FilterSlice {
  const [state, setState] = useState<FilterState>(defaults)

  const setStatus = useCallback((status: string[]) => {
    setState(prev => ({ ...prev, status, page: 1 }))
  }, [])

  const toggleStatus = useCallback((s: string) => {
    setState(prev => ({
      ...prev,
      status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s],
      page: 1,
    }))
  }, [])

  const setDisputed = useCallback((disputed: string[]) => {
    setState(prev => ({
      ...prev,
      // Prevent removing 'false' (Unchallenged) while "Previously Disputed" is active
      disputed: prev.hasEverBeenDisputed && !disputed.includes('false')
        ? [...disputed, 'false']
        : disputed,
      page: 1,
    }))
  }, [])

  const toggleDisputed = useCallback((d: string) => {
    setState(prev => {
      // Prevent unchecking 'false' (Unchallenged) while "Previously Disputed" is active
      if (d === 'false' && prev.hasEverBeenDisputed && prev.disputed.includes('false')) {
        return prev
      }
      return {
        ...prev,
        disputed: prev.disputed.includes(d) ? prev.disputed.filter(x => x !== d) : [...prev.disputed, d],
        page: 1,
      }
    })
  }, [])

  const toggleHasEverBeenDisputed = useCallback(() => {
    setState(prev => {
      const next = !prev.hasEverBeenDisputed
      return {
        ...prev,
        hasEverBeenDisputed: next,
        // When enabling "Previously Disputed", ensure "Unchallenged" is selected
        // since resolved disputes have disputed=false
        disputed: next && !prev.disputed.includes('false')
          ? [...prev.disputed, 'false']
          : prev.disputed,
        page: 1,
      }
    })
  }, [])

  const setChallengeFilters = useCallback((disputed: string[], hasEverBeenDisputed: boolean) => {
    setState(prev => ({
      ...prev,
      disputed: hasEverBeenDisputed && !disputed.includes('false')
        ? [...disputed, 'false']
        : disputed,
      hasEverBeenDisputed,
      page: 1,
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }))
  }, [])

  const setOrderDirection = useCallback((orderDirection: string) => {
    setState(prev => ({ ...prev, orderDirection, page: 1 }))
  }, [])

  const setText = useCallback((text: string) => {
    setState(prev => ({ ...prev, text, page: 1 }))
  }, [])

  const setDateRange = useCallback((dateRange: DateRangeOption) => {
    setState(prev => ({
      ...prev,
      dateRange,
      // Clear custom dates when switching to a preset
      customDateFrom: dateRange === 'custom' ? prev.customDateFrom : null,
      customDateTo: dateRange === 'custom' ? prev.customDateTo : null,
      page: 1,
    }))
  }, [])

  const setCustomDateRange = useCallback((from: string | null, to: string | null) => {
    setState(prev => ({ ...prev, dateRange: 'custom' as DateRangeOption, customDateFrom: from, customDateTo: to, page: 1 }))
  }, [])

  return {
    ...state,
    setStatus, toggleStatus,
    setDisputed, toggleDisputed,
    toggleHasEverBeenDisputed, setChallengeFilters,
    setPage, setOrderDirection, setText,
    setDateRange, setCustomDateRange,
  }
}

interface FilterContextValue {
  registry: FilterSlice
  profile: FilterSlice
}

const FilterContext = createContext<FilterContextValue | null>(null)

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registry = useFilterSlice(REGISTRY_DEFAULTS)
  const profile = useFilterSlice(PROFILE_DEFAULTS)

  return (
    <FilterContext.Provider value={{ registry, profile }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = (scope: 'registry' | 'profile'): FilterSlice => {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider')
  return scope === 'registry' ? ctx.registry : ctx.profile
}

export const useRegistryFilters = (): FilterSlice => useFilters('registry')
export const useProfileFilters = (): FilterSlice => useFilters('profile')

export const DATE_RANGE_PRESETS: { value: DateRangeOption; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom' },
]

const DATE_RANGE_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
}

/** Returns ISO date strings (e.g. '2025-01-15') for a preset range, or null for 'all'/'custom'. */
export const getPresetDates = (preset: DateRangeOption): { from: string | null; to: string | null } => {
  if (preset === 'all' || preset === 'custom') return { from: null, to: null }
  const fromDate = new Date(Date.now() - DATE_RANGE_MS[preset])
  return { from: fromDate.toISOString().split('T')[0], to: null }
}

/** Returns a Unix timestamp (seconds) for the start of the given date range, or 0 for 'all'/'custom'. */
export const getDateRangeTimestamp = (range: DateRangeOption): number => {
  if (range === 'all' || range === 'custom') return 0
  return Math.floor((Date.now() - DATE_RANGE_MS[range]) / 1000)
}

/** Returns Unix timestamps (seconds) for custom date range boundaries. */
export const getCustomDateTimestamps = (from: string | null, to: string | null): { fromTs: number; toTs: number } => {
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : 0
  // Set "to" to end of day (23:59:59) so the selected date is inclusive
  const toTs = to ? Math.floor((new Date(to).getTime() + 86400000 - 1000) / 1000) : 0
  return { fromTs, toTs }
}
